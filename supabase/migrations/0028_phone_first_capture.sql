-- Capture phone at the earliest account/lead stage and preserve it through identity claim.

alter table public.leads add column if not exists phone text;

create or replace function public.upsert_public_lead_v4(
  p_email text,p_first_name text,p_phone text,p_market_code text,p_language_code text,p_consent boolean,
  p_detected_locale text,p_detected_languages text[],p_source text,p_campaign_key text,
  p_campaign_slug text,p_source_external_id text,p_landing_path text,p_referrer text,
  p_referral_code text,p_fbclid text,p_gclid text,p_utm_source text,p_utm_medium text,
  p_utm_campaign text,p_utm_content text,p_utm_term text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb; v_email text:=lower(trim(coalesce(p_email,'')));
begin
  if nullif(trim(coalesce(p_phone,'')),'') is null then raise exception 'phone_required'; end if;

  v_result:=public.upsert_public_lead_v3(
    p_email,p_first_name,p_market_code,p_language_code,p_consent,
    p_detected_locale,p_detected_languages,p_source,p_campaign_key,
    p_campaign_slug,p_source_external_id,p_landing_path,p_referrer,
    p_referral_code,p_fbclid,p_gclid,p_utm_source,p_utm_medium,
    p_utm_campaign,p_utm_content,p_utm_term
  );

  update public.leads
  set phone=trim(p_phone),updated_at=now()
  where email=v_email;

  return v_result||jsonb_build_object('phoneCaptured',true);
end $$;

revoke all on function public.upsert_public_lead_v4(
 text,text,text,text,text,boolean,text,text[],text,text,text,text,text,text,text,text,text,text,text,text,text,text
) from public,anon,authenticated;
grant execute on function public.upsert_public_lead_v4(
 text,text,text,text,text,boolean,text,text[],text,text,text,text,text,text,text,text,text,text,text,text,text,text
) to service_role;

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
        phone=coalesce(phone,nullif(trim(coalesce((select l.phone from public.leads l where l.email=v_email order by l.created_at asc limit 1),'')),'')),
        updated_at=now()
    where id=v_participant.id;
    return v_participant.id;
  end if;

  select * into v_lead from public.leads where email=v_email order by created_at asc limit 1;
  if not found then raise exception 'early_access_identity_not_found'; end if;

  insert into public.participants(auth_user_id,first_name,email,phone,country_code,primary_language_code,marketing_consent)
  values(
    p_auth_user_id,v_lead.first_name,v_email,nullif(trim(coalesce(v_lead.phone,'')),''),
    case when char_length(coalesce(v_lead.market_code,''))=2 then upper(v_lead.market_code) else 'ZZ' end,
    lower(coalesce(nullif(v_lead.language_code,''),'en')),
    coalesce(v_lead.consent,false)
  )
  returning * into v_participant;

  update public.leads set status='CONVERTED' where id=v_lead.id;
  return v_participant.id;
end $$;

revoke all on function public.claim_pairvoice_identity(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_pairvoice_identity(uuid,text) to service_role;
