-- Release-blocker quick fixes from PR #9 production-readiness pass.
-- Keeps the current product shape, but removes false consent/audit writes and
-- records the readiness gates that the real signup/join workflow actually proves.

create or replace function public.upsert_public_lead_v4(
  p_email text,p_first_name text,p_phone text,p_market_code text,p_language_code text,p_consent boolean,p_marketing_consent boolean default false,
  p_detected_locale text default null,p_detected_languages text[] default '{}',p_source text default null,p_campaign_key text default 'organic',
  p_campaign_slug text default null,p_source_external_id text default null,p_landing_path text default null,p_referrer text default null,
  p_referral_code text default null,p_fbclid text default null,p_gclid text default null,p_utm_source text default null,p_utm_medium text default null,
  p_utm_campaign text default null,p_utm_content text default null,p_utm_term text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb; v_email text:=lower(trim(coalesce(p_email,'')));
begin
  if nullif(trim(coalesce(p_phone,'')),'') is null then raise exception 'phone_required'; end if;
  if p_consent is not true then raise exception 'operational_consent_required'; end if;

  v_result:=public.upsert_public_lead_v3(
    p_email,p_first_name,p_market_code,p_language_code,p_consent,
    p_detected_locale,p_detected_languages,p_source,p_campaign_key,
    p_campaign_slug,p_source_external_id,p_landing_path,p_referrer,
    p_referral_code,p_fbclid,p_gclid,p_utm_source,p_utm_medium,
    p_utm_campaign,p_utm_content,p_utm_term
  );

  update public.leads
  set phone=trim(p_phone),marketing_consent=coalesce(p_marketing_consent,false),updated_at=now()
  where email=v_email;

  return v_result||jsonb_build_object('phoneCaptured',true,'marketingConsent',coalesce(p_marketing_consent,false));
end $$;

revoke all on function public.upsert_public_lead_v4(
 text,text,text,text,text,boolean,boolean,text,text[],text,text,text,text,text,text,text,text,text,text,text,text,text,text
) from public,anon,authenticated;
grant execute on function public.upsert_public_lead_v4(
 text,text,text,text,text,boolean,boolean,text,text[],text,text,text,text,text,text,text,text,text,text,text,text,text,text
) to service_role;

create or replace function public.register_campaign_participant(
 p_campaign_slug text,p_first_name text,p_email text,p_phone text,p_country_code text,p_language_code text,
 p_is_18_plus boolean,p_consent boolean,p_referral_code text default null,p_marketing_consent boolean default false
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_campaign campaigns%rowtype; v_version campaign_versions%rowtype; v_participant participants%rowtype;
 v_enrollment campaign_enrollments%rowtype; v_pair pairs%rowtype; v_referrer uuid;
begin
 if trim(coalesce(p_first_name,''))='' then raise exception 'first_name_required'; end if;
 if lower(trim(coalesce(p_email,''))) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'invalid_email'; end if;
 if p_is_18_plus is not true then raise exception 'age_requirement'; end if;
 if p_consent is not true then raise exception 'operational_consent_required'; end if;
 select * into v_campaign from campaigns where slug=p_campaign_slug and active=true;
 if not found then raise exception 'campaign_unavailable'; end if;
 select * into v_version from campaign_versions where campaign_id=v_campaign.id and status='PUBLISHED';
 if not found then raise exception 'campaign_not_published'; end if;
 if upper(p_country_code)<>upper(v_version.country_code) or lower(p_language_code)<>lower(v_version.language_code) then raise exception 'campaign_eligibility_mismatch'; end if;
 insert into participants(first_name,email,phone,country_code,primary_language_code,marketing_consent)
 values(trim(p_first_name),lower(trim(p_email)),nullif(trim(coalesce(p_phone,'')),''),upper(p_country_code),lower(p_language_code),coalesce(p_marketing_consent,false))
 on conflict(email) do update set first_name=excluded.first_name,phone=coalesce(excluded.phone,participants.phone),country_code=excluded.country_code,
 primary_language_code=excluded.primary_language_code,marketing_consent=participants.marketing_consent or excluded.marketing_consent returning * into v_participant;
 if exists(select 1 from campaign_enrollments where campaign_id=v_campaign.id and participant_id=v_participant.id) then raise exception 'already_enrolled_in_campaign'; end if;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state,eligibility)
 values(v_campaign.id,v_version.id,v_participant.id,'QUALIFIED',jsonb_build_object('age18Plus',true,'countryCode',upper(p_country_code),'languageCode',lower(p_language_code),'operationalConsent',true))
 returning * into v_enrollment;
 insert into pairs(campaign_id,campaign_version_id,state) values(v_campaign.id,v_version.id,'PARTNER_PENDING') returning * into v_pair;
 insert into pair_members(pair_id,enrollment_id,role,share_basis_points) values(v_pair.id,v_enrollment.id,'A',5000);
 insert into pair_readiness_gates(pair_id,gate_key,status,evidence,checked_at) values
  (v_pair.id,'ELIGIBILITY_A','PASSED',jsonb_build_object('countryCode',upper(p_country_code),'languageCode',lower(p_language_code),'age18Plus',true),now()),
  (v_pair.id,'PARTICIPATION_HISTORY','PENDING',jsonb_build_object('repeatParticipationAllowed',v_version.repeat_participation_allowed,'source','signup'),now()),
  (v_pair.id,'CAPACITY','PENDING',jsonb_build_object('source','signup_no_capacity_limit_enforced'),now())
 on conflict(pair_id,gate_key) do update set status=excluded.status,evidence=excluded.evidence,checked_at=excluded.checked_at,updated_at=now();
 if nullif(trim(coalesce(p_referral_code,'')),'') is not null then
  select id into v_referrer from participants where public_code=upper(trim(p_referral_code));
  if v_referrer is not null and v_referrer<>v_participant.id then
   insert into referral_relationships(referrer_participant_id,referred_participant_id,code)
   values(v_referrer,v_participant.id,upper(trim(p_referral_code))) on conflict(referred_participant_id) do nothing;
  end if;
 end if;
 insert into leads(email,market_code,country_code,preferred_language_code,marketing_consent,status,converted_participant_id,converted_at)
 values(v_participant.email,v_version.market_code,v_version.country_code,v_version.language_code,coalesce(p_marketing_consent,false),'CONVERTED',v_participant.id,now())
 on conflict(email) do update set status='CONVERTED',converted_participant_id=v_participant.id,converted_at=now(),marketing_consent=leads.marketing_consent or excluded.marketing_consent;
 insert into activity_events(actor_type,actor_participant_id,action,entity_type,entity_id,campaign_id,pair_id)
 values('PARTICIPANT',v_participant.id,'CAMPAIGN_REGISTERED','PAIR',v_pair.id,v_campaign.id,v_pair.id);
 return jsonb_build_object('ok',true,'participantCode',v_participant.public_code,'pairCode',v_pair.public_code,'inviteCode',v_pair.invite_code);
end $$;

revoke all on function public.register_campaign_participant(text,text,text,text,text,text,boolean,boolean,text,boolean) from public,anon,authenticated;
grant execute on function public.register_campaign_participant(text,text,text,text,text,text,boolean,boolean,text,boolean) to service_role;

create or replace function public.join_pair_invite(
 p_invite_code text,p_first_name text,p_email text,p_phone text,p_country_code text,p_language_code text,p_is_18_plus boolean,p_consent boolean
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_pair pairs%rowtype; v_version campaign_versions%rowtype; v_participant participants%rowtype;
 v_enrollment campaign_enrollments%rowtype; v_a_participant uuid;
begin
 if p_is_18_plus is not true or p_consent is not true then raise exception 'eligibility_confirmation_required'; end if;
 select * into v_pair from pairs where invite_code=upper(trim(p_invite_code)) for update;
 if not found or v_pair.state<>'PARTNER_PENDING' then raise exception 'invite_unavailable'; end if;
 select * into v_version from campaign_versions where id=v_pair.campaign_version_id;
 if upper(p_country_code)<>upper(v_version.country_code) or lower(p_language_code)<>lower(v_version.language_code) then raise exception 'campaign_eligibility_mismatch'; end if;
 select e.participant_id into v_a_participant from pair_members pm join campaign_enrollments e on e.id=pm.enrollment_id
 where pm.pair_id=v_pair.id and pm.role='A' and pm.active=true;
 insert into participants(first_name,email,phone,country_code,primary_language_code,marketing_consent)
 values(trim(p_first_name),lower(trim(p_email)),nullif(trim(coalesce(p_phone,'')),''),upper(p_country_code),lower(p_language_code),false)
 on conflict(email) do update set first_name=excluded.first_name,phone=coalesce(excluded.phone,participants.phone),country_code=excluded.country_code,
 primary_language_code=excluded.primary_language_code returning * into v_participant;
 if v_participant.id=v_a_participant then raise exception 'participant_cannot_pair_with_self'; end if;
 if exists(select 1 from campaign_enrollments where campaign_id=v_pair.campaign_id and participant_id=v_participant.id) then raise exception 'already_enrolled_in_campaign'; end if;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state,eligibility)
 values(v_pair.campaign_id,v_pair.campaign_version_id,v_participant.id,'QUALIFIED',jsonb_build_object('age18Plus',true,'countryCode',upper(p_country_code),'languageCode',lower(p_language_code),'operationalConsent',true))
 returning * into v_enrollment;
 insert into pair_members(pair_id,enrollment_id,role,share_basis_points) values(v_pair.id,v_enrollment.id,'B',5000);
 update pairs set state='PAIRED',paired_at=now() where id=v_pair.id;
 insert into pair_readiness_gates(pair_id,gate_key,status,evidence,checked_at) values
  (v_pair.id,'PARTNER_ACCEPTED','PASSED',jsonb_build_object('inviteCode',upper(trim(p_invite_code)),'acceptedBy',v_participant.id),now()),
  (v_pair.id,'ELIGIBILITY_B','PASSED',jsonb_build_object('countryCode',upper(p_country_code),'languageCode',lower(p_language_code),'age18Plus',true),now())
 on conflict(pair_id,gate_key) do update set status=excluded.status,evidence=excluded.evidence,checked_at=excluded.checked_at,updated_at=now();
 perform evaluate_pair_readiness(v_pair.id,'PARTNER_INVITE_ACCEPTED');
 insert into activity_events(actor_type,actor_participant_id,action,entity_type,entity_id,campaign_id,pair_id)
 values('PARTICIPANT',v_participant.id,'PAIR_FORMED','PAIR',v_pair.id,v_pair.campaign_id,v_pair.id);
 return jsonb_build_object('ok',true,'participantCode',v_participant.public_code,'pairCode',v_pair.public_code);
end $$;

revoke all on function public.join_pair_invite(text,text,text,text,text,text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.join_pair_invite(text,text,text,text,text,text,boolean,boolean) to service_role;

create or replace function public.claim_pairvoice_identity(p_auth_user_id uuid,p_email text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_participant public.participants%rowtype; v_lead public.leads%rowtype; v_email citext;
begin
  v_email:=lower(trim(p_email))::citext;
  select * into v_participant from public.participants where email=v_email for update;
  if found then
    if v_participant.auth_user_id is not null and v_participant.auth_user_id<>p_auth_user_id then
      raise exception 'identity_already_claimed';
    end if;
    update public.participants
    set auth_user_id=p_auth_user_id,
        phone=coalesce(phone,nullif(trim(coalesce((select l.phone from public.leads l where l.email=v_email order by l.updated_at desc,l.created_at desc limit 1),'')),'')),
        updated_at=now()
    where id=v_participant.id;
    return v_participant.id;
  end if;

  select * into v_lead from public.leads where email=v_email order by updated_at desc,created_at desc limit 1;
  if not found then raise exception 'early_access_identity_not_found'; end if;

  insert into public.participants(auth_user_id,first_name,email,phone,country_code,primary_language_code,marketing_consent)
  values(
    p_auth_user_id,v_lead.first_name,v_email,nullif(trim(coalesce(v_lead.phone,'')),''),
    case when char_length(coalesce(v_lead.market_code,''))=2 then upper(v_lead.market_code) else 'ZZ' end,
    lower(coalesce(nullif(v_lead.language_code,''),'en')),
    coalesce(v_lead.marketing_consent,false)
  )
  returning * into v_participant;

  update public.leads set status='CONVERTED',converted_participant_id=v_participant.id,converted_at=now() where id=v_lead.id;
  return v_participant.id;
end $$;

revoke all on function public.claim_pairvoice_identity(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_pairvoice_identity(uuid,text) to service_role;
