-- Launch instrumentation + authoritative business funnel events.
-- Keeps browser telemetry anonymous while recording trusted server milestones separately.

alter table funnel_events drop constraint if exists funnel_events_event_name_check;
alter table funnel_events add constraint funnel_events_event_name_check check(event_name in(
 'landing_view','opportunity_view','campaign_view','campaign_cta_click',
 'signup_started','signup_submitted','signup_completed','email_queued',
 'invite_created','partner_invite_created','invite_view','partner_signup_started','partner_signup_completed',
 'partner_choice_have','partner_choice_need_match','partner_matching_requested','partner_matching_joined',
 'partner_invite_share_clicked','partner_invite_opened','partner_invite_accepted',
 'pair_created','pair_qualified','gig_instructions_viewed','gig_started',
 'submission_started','submission_completed','submission_approved','submission_rejected',
 'earning_available','payout_requested','payout_completed',
 'referral_shared','referral_clicked','referral_signup','referral_pair_completed',
 'share_clicked'
));

create table business_funnel_events(
 id uuid primary key default gen_random_uuid(),
 event_name text not null check(event_name in(
  'partner_invite_accepted','pair_created','pair_qualified','gig_started',
  'submission_completed','submission_approved','submission_rejected',
  'earning_available','payout_requested','payout_completed','referral_pair_completed'
 )),
 campaign_id uuid references campaigns(id),
 pair_id uuid references pairs(id),
 participant_id uuid references participants(id),
 idempotency_key text not null unique,
 metadata jsonb not null default '{}'::jsonb,
 occurred_at timestamptz not null default now()
);
create index business_funnel_event_time_idx on business_funnel_events(event_name,occurred_at desc);
create index business_funnel_pair_idx on business_funnel_events(pair_id,occurred_at desc);
create index business_funnel_campaign_idx on business_funnel_events(campaign_id,occurred_at desc);
alter table business_funnel_events enable row level security;
revoke all on business_funnel_events from anon,authenticated;

create or replace function record_business_funnel_event(
 p_event_name text,
 p_campaign_id uuid,
 p_pair_id uuid,
 p_participant_id uuid,
 p_idempotency_key text,
 p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if p_event_name not in(
  'partner_invite_accepted','pair_created','pair_qualified','gig_started',
  'submission_completed','submission_approved','submission_rejected',
  'earning_available','payout_requested','payout_completed','referral_pair_completed'
 ) then raise exception 'unsupported_business_funnel_event'; end if;
 if trim(coalesce(p_idempotency_key,''))='' then raise exception 'idempotency_key_required'; end if;
 insert into business_funnel_events(event_name,campaign_id,pair_id,participant_id,idempotency_key,metadata)
 values(p_event_name,p_campaign_id,p_pair_id,p_participant_id,p_idempotency_key,coalesce(p_metadata,'{}'::jsonb))
 on conflict(idempotency_key) do update set idempotency_key=excluded.idempotency_key
 returning id into v_id;
 return v_id;
end $$;
revoke all on function record_business_funnel_event(text,uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function record_business_funnel_event(text,uuid,uuid,uuid,text,jsonb) to service_role;

create or replace function capture_pair_business_funnel_event() returns trigger language plpgsql security definer set search_path=public as $$
declare v_event text;
begin
 if old.state=new.state then return new; end if;
 v_event:=case new.state
  when 'PAIRED' then 'pair_created'
  when 'READY' then 'pair_qualified'
  when 'RECORDING' then 'gig_started'
  when 'SUBMITTED' then 'submission_completed'
  when 'APPROVED' then 'submission_approved'
  when 'PAYABLE' then 'earning_available'
  when 'REJECTED' then 'submission_rejected'
  when 'PAID' then 'payout_completed'
  else null end;
 if v_event is not null then
  perform record_business_funnel_event(
   v_event,new.campaign_id,new.id,null,
   'pair:'||new.id||':state:'||new.state,
   jsonb_build_object('from_state',old.state,'to_state',new.state)
  );
 end if;
 return new;
end $$;
create trigger pair_business_funnel_after_state
 after update of state on pairs
 for each row execute function capture_pair_business_funnel_event();

create or replace function capture_payout_business_funnel_event() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='INSERT' and new.state='REQUESTED' then
  perform record_business_funnel_event('payout_requested',null,null,new.participant_id,
   'payout:'||new.id||':requested',jsonb_build_object('currency',new.currency));
 elsif tg_op='UPDATE' and old.state<>new.state and new.state='PAID' then
  perform record_business_funnel_event('payout_completed',null,null,new.participant_id,
   'payout:'||new.id||':paid',jsonb_build_object('currency',new.currency));
 end if;
 return new;
end $$;
create trigger payout_business_funnel_after_insert
 after insert on payouts for each row execute function capture_payout_business_funnel_event();
create trigger payout_business_funnel_after_state
 after update of state on payouts for each row execute function capture_payout_business_funnel_event();

create or replace function transition_work_provider_run(
 p_run_id uuid,
 p_to_state text,
 p_external_reference text,
 p_result_metadata jsonb,
 p_last_error text,
 p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_run work_provider_runs%rowtype; v_response jsonb;
begin
 select response into v_response from idempotency_records where key=p_idempotency_key and operation='WORK_PROVIDER_TRANSITION';
 if found then return v_response; end if;

 select * into v_run from work_provider_runs where id=p_run_id for update;
 if not found then raise exception 'work_run_not_found'; end if;

 if not (
  (v_run.state='READY' and p_to_state in('LAUNCHING','IN_PROGRESS','CANCELLED','MANUAL_REVIEW')) or
  (v_run.state='LAUNCHING' and p_to_state in('IN_PROGRESS','FAILED','MANUAL_REVIEW')) or
  (v_run.state='IN_PROGRESS' and p_to_state in('SUBMITTED','FAILED','MANUAL_REVIEW')) or
  (v_run.state='SUBMITTED' and p_to_state in('COMPLETED','REWORK_REQUIRED','MANUAL_REVIEW')) or
  (v_run.state='REWORK_REQUIRED' and p_to_state in('IN_PROGRESS','CANCELLED','MANUAL_REVIEW')) or
  (v_run.state='FAILED' and p_to_state in('LAUNCHING','MANUAL_REVIEW')) or
  v_run.state=p_to_state
 ) then raise exception 'invalid_work_transition:%->%',v_run.state,p_to_state; end if;

 update work_provider_runs set
  state=p_to_state,
  external_reference=coalesce(nullif(trim(coalesce(p_external_reference,'')),''),external_reference),
  result_metadata=coalesce(result_metadata,'{}'::jsonb)||coalesce(p_result_metadata,'{}'::jsonb),
  last_error=p_last_error,
  started_at=case when p_to_state='IN_PROGRESS' then coalesce(started_at,now()) else started_at end,
  submitted_at=case when p_to_state='SUBMITTED' then coalesce(submitted_at,now()) else submitted_at end,
  completed_at=case when p_to_state='COMPLETED' then coalesce(completed_at,now()) else completed_at end
 where id=p_run_id returning * into v_run;

 if p_to_state='IN_PROGRESS' then
  update pairs set state='RECORDING' where id=v_run.pair_id and state in('READY','REWORK_REQUIRED');
 elsif p_to_state='SUBMITTED' then
  update pairs set state='SUBMITTED',submitted_at=coalesce(submitted_at,now()) where id=v_run.pair_id and state='RECORDING';
 end if;

 insert into activity_events(actor_type,action,entity_type,entity_id,campaign_id,pair_id,metadata)
 values('SYSTEM','WORK_PROVIDER_'||p_to_state,'WORK_PROVIDER_RUN',p_run_id,v_run.campaign_id,v_run.pair_id,
  jsonb_build_object('provider_id',v_run.provider_id,'state',p_to_state));

 v_response:=jsonb_build_object('ok',true,'runId',v_run.id,'state',v_run.state,'pairId',v_run.pair_id);
 insert into idempotency_records(key,operation,response)
 values(p_idempotency_key,'WORK_PROVIDER_TRANSITION',v_response)
 on conflict(key) do nothing;
 return v_response;
end $$;
revoke all on function transition_work_provider_run(uuid,text,text,jsonb,text,text) from public,anon,authenticated;
grant execute on function transition_work_provider_run(uuid,text,text,jsonb,text,text) to service_role;
