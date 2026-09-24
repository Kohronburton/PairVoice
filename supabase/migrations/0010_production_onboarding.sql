-- Production participant onboarding + authenticated self-service dashboard.
-- Converts the existing campaign/pair primitives into the participant-facing production workflow.

alter table public.participants
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists last_seen_at timestamptz;

-- Authenticated users claim the participant record that matches the verified auth email.
create or replace function public.claim_participant_account()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(coalesce(auth.jwt()->>'email','')));
  v_participant participants%rowtype;
begin
  if v_uid is null or v_email='' then
    raise exception 'authentication_required';
  end if;

  select * into v_participant
  from participants
  where lower(email::text)=v_email
  for update;

  if not found then
    return jsonb_build_object('ok',false,'reason','participant_not_found');
  end if;

  if v_participant.auth_user_id is not null and v_participant.auth_user_id<>v_uid then
    raise exception 'participant_account_already_claimed';
  end if;

  update participants
  set auth_user_id=v_uid,
      onboarding_completed_at=coalesce(onboarding_completed_at,now()),
      last_seen_at=now()
  where id=v_participant.id
  returning * into v_participant;

  insert into activity_events(
    actor_type,actor_user_id,actor_participant_id,action,entity_type,entity_id,metadata
  ) values(
    'PARTICIPANT',v_uid,v_participant.id,'ACCOUNT_CLAIMED','PARTICIPANT',v_participant.id,
    jsonb_build_object('email',v_email)
  );

  return jsonb_build_object(
    'ok',true,
    'participantCode',v_participant.public_code,
    'firstName',v_participant.first_name
  );
end $$;

-- One compact, security-definer response powers the participant dashboard.
create or replace function public.get_my_dashboard()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_participant participants%rowtype;
  v_jobs jsonb := '[]'::jsonb;
  v_balance integer := 0;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;

  select * into v_participant
  from participants
  where auth_user_id=v_uid and status='ACTIVE';

  if not found then
    return jsonb_build_object('ok',false,'reason','participant_not_found','jobs','[]'::jsonb);
  end if;

  update participants set last_seen_at=now() where id=v_participant.id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'enrollmentId',e.id,
      'enrollmentState',e.state,
      'campaignSlug',c.slug,
      'campaignName',c.name,
      'countryCode',v.country_code,
      'languageCode',v.language_code,
      'pairCode',pr.public_code,
      'pairState',pr.state,
      'inviteCode',pr.invite_code,
      'role',pm.role,
      'readinessCompleted',pm.readiness_completed_at is not null,
      'pairPayoutCents',v.pair_compensation_cents,
      'participantPayoutCents',
        case when pm.id is null then null
             else round(v.pair_compensation_cents*pm.share_basis_points/10000.0)::int end,
      'currency',v.currency,
      'sessionsRequired',v.sessions_required,
      'targetMinutesMin',round(v.target_seconds_min/60.0),
      'targetMinutesMax',round(v.target_seconds_max/60.0),
      'rules',v.rules,
      'createdAt',e.created_at
    ) order by e.created_at desc
  ),'[]'::jsonb)
  into v_jobs
  from campaign_enrollments e
  join campaigns c on c.id=e.campaign_id
  join campaign_versions v on v.id=e.campaign_version_id
  left join pair_members pm on pm.enrollment_id=e.id and pm.active=true
  left join pairs pr on pr.id=pm.pair_id
  where e.participant_id=v_participant.id;

  select coalesce(sum(amount_cents),0)::int
  into v_balance
  from ledger_entries
  where participant_id=v_participant.id;

  return jsonb_build_object(
    'ok',true,
    'participant',jsonb_build_object(
      'participantCode',v_participant.public_code,
      'firstName',v_participant.first_name,
      'email',v_participant.email,
      'countryCode',v_participant.country_code,
      'languageCode',v_participant.primary_language_code,
      'onboardingCompleted',v_participant.onboarding_completed_at is not null
    ),
    'jobs',v_jobs,
    'ledgerBalanceCents',v_balance
  );
end $$;

-- Each member confirms the recording checklist. The second confirmation moves
-- the pair to READY without allowing a participant to skip workflow states.
create or replace function public.mark_my_pair_ready(p_pair_code text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_participant participants%rowtype;
  v_pair pairs%rowtype;
  v_member pair_members%rowtype;
  v_active_members integer;
  v_ready_members integer;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;

  select * into v_participant
  from participants
  where auth_user_id=v_uid and status='ACTIVE';

  if not found then raise exception 'participant_not_found'; end if;

  select pr.* into v_pair
  from pairs pr
  join pair_members pm on pm.pair_id=pr.id and pm.active=true
  join campaign_enrollments e on e.id=pm.enrollment_id
  where pr.public_code=upper(trim(p_pair_code))
    and e.participant_id=v_participant.id
  for update of pr;

  if not found then raise exception 'pair_not_found'; end if;
  if v_pair.state not in ('PAIRED','READINESS_PENDING','READY') then
    raise exception 'pair_not_ready_for_checklist';
  end if;

  select pm.* into v_member
  from pair_members pm
  join campaign_enrollments e on e.id=pm.enrollment_id
  where pm.pair_id=v_pair.id and pm.active=true and e.participant_id=v_participant.id
  for update of pm;

  if v_pair.state='PAIRED' then
    update pairs set state='READINESS_PENDING' where id=v_pair.id;
    v_pair.state='READINESS_PENDING';
  end if;

  update pair_members
  set readiness_completed_at=coalesce(readiness_completed_at,now())
  where id=v_member.id;

  select count(*),
         count(*) filter(where readiness_completed_at is not null)
  into v_active_members,v_ready_members
  from pair_members
  where pair_id=v_pair.id and active=true;

  if v_pair.state='READINESS_PENDING'
     and v_active_members>=2
     and v_ready_members=v_active_members then
    update pairs set state='READY' where id=v_pair.id;
    v_pair.state='READY';
  end if;

  insert into activity_events(
    actor_type,actor_user_id,actor_participant_id,action,entity_type,entity_id,campaign_id,pair_id,metadata
  ) values(
    'PARTICIPANT',v_uid,v_participant.id,'READINESS_CONFIRMED','PAIR',v_pair.id,v_pair.campaign_id,v_pair.id,
    jsonb_build_object('readyMembers',v_ready_members,'activeMembers',v_active_members,'state',v_pair.state)
  );

  return jsonb_build_object(
    'ok',true,
    'state',v_pair.state,
    'readyMembers',v_ready_members,
    'activeMembers',v_active_members
  );
end $$;

revoke all on function public.claim_participant_account() from public,anon;
revoke all on function public.get_my_dashboard() from public,anon;
revoke all on function public.mark_my_pair_ready(text) from public,anon;
grant execute on function public.claim_participant_account() to authenticated;
grant execute on function public.get_my_dashboard() to authenticated;
grant execute on function public.mark_my_pair_ready(text) to authenticated;

-- Public enrollment now goes through server routes with the service-role key.
revoke execute on function public.register_campaign_participant(text,text,text,text,text,text,boolean,boolean,text) from public,anon,authenticated;
revoke execute on function public.join_pair_invite(text,text,text,text,text,text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.register_campaign_participant(text,text,text,text,text,text,boolean,boolean,text) to service_role;
grant execute on function public.join_pair_invite(text,text,text,text,text,text,boolean,boolean) to service_role;

-- Extend demand/funnel measurement through account activation and workflow readiness.
alter table public.funnel_events drop constraint if exists funnel_events_event_name_check;
alter table public.funnel_events add constraint funnel_events_event_name_check check(event_name in(
  'landing_view','opportunity_view','signup_started','signup_submitted','signup_completed','email_queued',
  'invite_created','invite_view','partner_signup_started','partner_signup_completed','share_clicked',
  'onboarding_view','onboarding_completed','magic_link_sent','login_view','dashboard_view',
  'readiness_started','readiness_completed'
));
