-- Harden participant identity resolution during campaign signup and invite join.
-- Never merge identities based on an unauthenticated phone/email mismatch.

create or replace function public.register_campaign_participant(
 p_campaign_slug text,p_first_name text,p_email text,p_phone text,p_country_code text,p_language_code text,
 p_is_18_plus boolean,p_consent boolean,p_referral_code text default null,p_marketing_consent boolean default false
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
 v_campaign campaigns%rowtype; v_version campaign_versions%rowtype; v_participant participants%rowtype;
 v_phone_participant participants%rowtype; v_enrollment campaign_enrollments%rowtype; v_pair pairs%rowtype; v_referrer uuid;
 v_email citext:=lower(trim(coalesce(p_email,'')))::citext;
 v_phone text:=nullif(trim(coalesce(p_phone,'')),'');
begin
 if trim(coalesce(p_first_name,''))='' then raise exception 'first_name_required'; end if;
 if v_email::text !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'invalid_email'; end if;
 if p_is_18_plus is not true then raise exception 'age_requirement'; end if;
 if p_consent is not true then raise exception 'operational_consent_required'; end if;

 select * into v_campaign from campaigns where slug=p_campaign_slug and active=true;
 if not found then raise exception 'campaign_unavailable'; end if;
 select * into v_version from campaign_versions where campaign_id=v_campaign.id and status='PUBLISHED';
 if not found then raise exception 'campaign_not_published'; end if;
 if upper(p_country_code)<>upper(v_version.country_code) or lower(p_language_code)<>lower(v_version.language_code) then
  raise exception 'campaign_eligibility_mismatch';
 end if;

 select * into v_participant from participants where email=v_email for update;
 if v_phone is not null then
  select * into v_phone_participant from participants where phone=v_phone for update;
 end if;

 if v_participant.id is not null then
  if v_phone_participant.id is not null and v_phone_participant.id<>v_participant.id then
   raise exception 'identity_phone_conflict';
  end if;
  update participants
  set first_name=trim(p_first_name),
      phone=coalesce(v_phone,participants.phone),
      country_code=upper(p_country_code),
      primary_language_code=lower(p_language_code),
      marketing_consent=participants.marketing_consent or coalesce(p_marketing_consent,false),
      updated_at=now()
  where id=v_participant.id
  returning * into v_participant;
 elsif v_phone_participant.id is not null then
  -- A phone match with a different/new email is not sufficient proof to merge identities.
  raise exception 'phone_already_registered';
 else
  insert into participants(first_name,email,phone,country_code,primary_language_code,marketing_consent)
  values(trim(p_first_name),v_email,v_phone,upper(p_country_code),lower(p_language_code),coalesce(p_marketing_consent,false))
  returning * into v_participant;
 end if;

 if exists(select 1 from campaign_enrollments where campaign_id=v_campaign.id and participant_id=v_participant.id) then
  raise exception 'already_enrolled_in_campaign';
 end if;

 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state,eligibility)
 values(v_campaign.id,v_version.id,v_participant.id,'QUALIFIED',
  jsonb_build_object('age18Plus',true,'countryCode',upper(p_country_code),'languageCode',lower(p_language_code),'operationalConsent',true))
 returning * into v_enrollment;

 insert into pairs(campaign_id,campaign_version_id,state)
 values(v_campaign.id,v_version.id,'PARTNER_PENDING') returning * into v_pair;
 insert into pair_members(pair_id,enrollment_id,role,share_basis_points)
 values(v_pair.id,v_enrollment.id,'A',5000);

 insert into pair_readiness_gates(pair_id,gate_key,status,evidence,checked_at) values
  (v_pair.id,'ELIGIBILITY_A','PASSED',jsonb_build_object('countryCode',upper(p_country_code),'languageCode',lower(p_language_code),'age18Plus',true),now()),
  (v_pair.id,'PARTICIPATION_HISTORY','PENDING',jsonb_build_object('repeatParticipationAllowed',v_version.repeat_participation_allowed,'source','signup'),now()),
  (v_pair.id,'CAPACITY','PENDING',jsonb_build_object('source','signup_no_capacity_limit_enforced'),now())
 on conflict(pair_id,gate_key) do update
 set status=excluded.status,evidence=excluded.evidence,checked_at=excluded.checked_at,updated_at=now();

 if nullif(trim(coalesce(p_referral_code,'')),'') is not null then
  select id into v_referrer from participants where public_code=upper(trim(p_referral_code));
  if v_referrer is not null and v_referrer<>v_participant.id then
   insert into referral_relationships(referrer_participant_id,referred_participant_id,code)
   values(v_referrer,v_participant.id,upper(trim(p_referral_code)))
   on conflict(referred_participant_id) do nothing;
  end if;
 end if;

 insert into leads(email,market_code,country_code,preferred_language_code,marketing_consent,status,converted_participant_id,converted_at)
 values(v_participant.email,v_version.market_code,v_version.country_code,v_version.language_code,coalesce(p_marketing_consent,false),'CONVERTED',v_participant.id,now())
 on conflict(email) do update
 set status='CONVERTED',converted_participant_id=v_participant.id,converted_at=now(),
     marketing_consent=leads.marketing_consent or excluded.marketing_consent;

 insert into activity_events(actor_type,actor_participant_id,action,entity_type,entity_id,campaign_id,pair_id)
 values('PARTICIPANT',v_participant.id,'CAMPAIGN_REGISTERED','PAIR',v_pair.id,v_campaign.id,v_pair.id);

 return jsonb_build_object('ok',true,'participantCode',v_participant.public_code,'pairCode',v_pair.public_code,'inviteCode',v_pair.invite_code);
end $$;

revoke all on function public.register_campaign_participant(text,text,text,text,text,text,boolean,boolean,text,boolean) from public,anon,authenticated;
grant execute on function public.register_campaign_participant(text,text,text,text,text,text,boolean,boolean,text,boolean) to service_role;

create or replace function public.join_pair_invite(
 p_invite_code text,p_first_name text,p_email text,p_phone text,p_country_code text,p_language_code text,p_is_18_plus boolean,p_consent boolean
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
 v_pair pairs%rowtype; v_version campaign_versions%rowtype; v_participant participants%rowtype;
 v_phone_participant participants%rowtype; v_enrollment campaign_enrollments%rowtype; v_a_participant uuid;
 v_email citext:=lower(trim(coalesce(p_email,'')))::citext;
 v_phone text:=nullif(trim(coalesce(p_phone,'')),'');
begin
 if p_is_18_plus is not true or p_consent is not true then raise exception 'eligibility_confirmation_required'; end if;

 select * into v_pair from pairs where invite_code=upper(trim(p_invite_code)) for update;
 if not found or v_pair.state<>'PARTNER_PENDING' then raise exception 'invite_unavailable'; end if;
 select * into v_version from campaign_versions where id=v_pair.campaign_version_id;
 if upper(p_country_code)<>upper(v_version.country_code) or lower(p_language_code)<>lower(v_version.language_code) then
  raise exception 'campaign_eligibility_mismatch';
 end if;

 select e.participant_id into v_a_participant
 from pair_members pm join campaign_enrollments e on e.id=pm.enrollment_id
 where pm.pair_id=v_pair.id and pm.role='A' and pm.active=true;

 select * into v_participant from participants where email=v_email for update;
 if v_phone is not null then
  select * into v_phone_participant from participants where phone=v_phone for update;
 end if;

 if v_participant.id is not null then
  if v_phone_participant.id is not null and v_phone_participant.id<>v_participant.id then
   raise exception 'identity_phone_conflict';
  end if;
  update participants
  set first_name=trim(p_first_name),
      phone=coalesce(v_phone,participants.phone),
      country_code=upper(p_country_code),
      primary_language_code=lower(p_language_code),
      updated_at=now()
  where id=v_participant.id
  returning * into v_participant;
 elsif v_phone_participant.id is not null then
  raise exception 'phone_already_registered';
 else
  insert into participants(first_name,email,phone,country_code,primary_language_code,marketing_consent)
  values(trim(p_first_name),v_email,v_phone,upper(p_country_code),lower(p_language_code),false)
  returning * into v_participant;
 end if;

 if v_participant.id=v_a_participant then raise exception 'participant_cannot_pair_with_self'; end if;
 if exists(select 1 from campaign_enrollments where campaign_id=v_pair.campaign_id and participant_id=v_participant.id) then
  raise exception 'already_enrolled_in_campaign';
 end if;

 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state,eligibility)
 values(v_pair.campaign_id,v_pair.campaign_version_id,v_participant.id,'QUALIFIED',
  jsonb_build_object('age18Plus',true,'countryCode',upper(p_country_code),'languageCode',lower(p_language_code),'operationalConsent',true))
 returning * into v_enrollment;

 insert into pair_members(pair_id,enrollment_id,role,share_basis_points)
 values(v_pair.id,v_enrollment.id,'B',5000);
 update pairs set state='PAIRED',paired_at=now() where id=v_pair.id;

 insert into pair_readiness_gates(pair_id,gate_key,status,evidence,checked_at) values
  (v_pair.id,'PARTNER_ACCEPTED','PASSED',jsonb_build_object('inviteCode',upper(trim(p_invite_code)),'acceptedBy',v_participant.id),now()),
  (v_pair.id,'ELIGIBILITY_B','PASSED',jsonb_build_object('countryCode',upper(p_country_code),'languageCode',lower(p_language_code),'age18Plus',true),now())
 on conflict(pair_id,gate_key) do update
 set status=excluded.status,evidence=excluded.evidence,checked_at=excluded.checked_at,updated_at=now();

 perform evaluate_pair_readiness(v_pair.id,'PARTNER_INVITE_ACCEPTED');
 insert into activity_events(actor_type,actor_participant_id,action,entity_type,entity_id,campaign_id,pair_id)
 values('PARTICIPANT',v_participant.id,'PAIR_FORMED','PAIR',v_pair.id,v_pair.campaign_id,v_pair.id);

 return jsonb_build_object('ok',true,'participantCode',v_participant.public_code,'pairCode',v_pair.public_code);
end $$;

revoke all on function public.join_pair_invite(text,text,text,text,text,text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.join_pair_invite(text,text,text,text,text,text,boolean,boolean) to service_role;
