-- Early-access lead → partner invite flow.
-- Written against the deployed PairVoice schema (not the removed clean-start schema).

alter table public.leads
  add column if not exists first_name text,
  add column if not exists preferred_language_code text,
  add column if not exists invite_code text,
  add column if not exists referred_by_lead_id uuid references public.leads(id) on delete set null,
  add column if not exists partner_joined_at timestamptz,
  add column if not exists marketing_campaign_key text,
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null,
  add column if not exists source_posting_id uuid references public.source_postings(id) on delete set null;

create unique index if not exists leads_invite_code_idx on public.leads(invite_code) where invite_code is not null;
create index if not exists leads_referred_by_idx on public.leads(referred_by_lead_id);

create table if not exists public.early_access_email_outbox (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  event_type text not null check (event_type in ('WELCOME','PARTNER_JOINED')),
  dedupe_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'PENDING' check (status in ('PENDING','SENT','FAILED')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.early_access_email_outbox enable row level security;
revoke all on public.early_access_email_outbox from anon, authenticated;

create or replace function public.upsert_public_lead_v3(
  p_email text, p_first_name text, p_market_code text, p_language_code text, p_consent boolean,
  p_detected_locale text, p_detected_languages text[], p_source text, p_campaign_key text,
  p_campaign_slug text, p_source_external_id text, p_landing_path text, p_referrer text,
  p_referral_code text, p_fbclid text, p_gclid text, p_utm_source text, p_utm_medium text,
  p_utm_campaign text, p_utm_content text, p_utm_term text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_email text := lower(trim(coalesce(p_email,'')));
  v_market text := upper(trim(coalesce(p_market_code,'UNKNOWN')));
  v_language text := lower(left(trim(coalesce(p_language_code,'en')),10));
  v_lead leads%rowtype;
  v_referrer leads%rowtype;
  v_campaign uuid;
  v_posting uuid;
  v_invite text;
begin
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'invalid_email'; end if;
  if trim(coalesce(p_first_name,''))='' then raise exception 'first_name_required'; end if;
  if p_consent is not true then raise exception 'consent_required'; end if;
  if v_language not in ('en','es') then v_language := 'en'; end if;

  select id into v_campaign from campaigns where slug=trim(coalesce(p_campaign_slug,'')) and active=true limit 1;
  if p_source_external_id is not null then
    select id into v_posting from source_postings where external_job_id=trim(p_source_external_id)
      and (v_campaign is null or campaign_id=v_campaign) limit 1;
  end if;

  insert into leads(email,first_name,market_code,detected_locale,detected_languages,preferred_language_code,
    marketing_consent,source,marketing_campaign_key,landing_path,referrer,fbclid,gclid,utm_source,utm_medium,
    utm_campaign,utm_content,utm_term,campaign_id,source_posting_id,status,updated_at)
  values(v_email,left(trim(p_first_name),80),coalesce(nullif(v_market,''),'UNKNOWN'),left(p_detected_locale,40),
    coalesce(p_detected_languages,'{}'),v_language,true,left(p_source,200),left(coalesce(p_campaign_key,'organic'),120),
    left(p_landing_path,500),left(p_referrer,1000),left(p_fbclid,255),left(p_gclid,255),left(p_utm_source,255),
    left(p_utm_medium,255),left(p_utm_campaign,255),left(p_utm_content,255),left(p_utm_term,255),v_campaign,v_posting,'LEAD',now())
  on conflict(email) do update set first_name=excluded.first_name,market_code=excluded.market_code,
    detected_locale=excluded.detected_locale,detected_languages=excluded.detected_languages,
    preferred_language_code=excluded.preferred_language_code,marketing_consent=true,source=excluded.source,
    marketing_campaign_key=excluded.marketing_campaign_key,landing_path=excluded.landing_path,referrer=excluded.referrer,
    fbclid=excluded.fbclid,gclid=excluded.gclid,utm_source=excluded.utm_source,utm_medium=excluded.utm_medium,
    utm_campaign=excluded.utm_campaign,utm_content=excluded.utm_content,utm_term=excluded.utm_term,
    campaign_id=coalesce(excluded.campaign_id,leads.campaign_id),source_posting_id=coalesce(excluded.source_posting_id,leads.source_posting_id),
    status=case when leads.status='CONVERTED' then 'CONVERTED' else 'LEAD' end,updated_at=now();

  select * into v_lead from leads where email=v_email for update;
  if v_lead.invite_code is null then
    loop
      v_invite := upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
      exit when not exists(select 1 from leads where invite_code=v_invite);
    end loop;
    update leads set invite_code=v_invite,updated_at=now() where id=v_lead.id returning * into v_lead;
  end if;

  if nullif(trim(coalesce(p_referral_code,'')),'') is not null then
    select * into v_referrer from leads where invite_code=upper(trim(p_referral_code)) for update;
    if found and v_referrer.id<>v_lead.id and v_lead.referred_by_lead_id is null then
      update leads set referred_by_lead_id=v_referrer.id,updated_at=now() where id=v_lead.id returning * into v_lead;
      update leads set partner_joined_at=coalesce(partner_joined_at,now()),updated_at=now() where id=v_referrer.id;
      insert into early_access_email_outbox(lead_id,event_type,dedupe_key,payload)
      values(v_referrer.id,'PARTNER_JOINED','partner-joined:'||v_referrer.id||':'||v_lead.id,
        jsonb_build_object('referrerLeadId',v_referrer.id,'referrerEmail',v_referrer.email,'partnerLeadId',v_lead.id))
      on conflict(dedupe_key) do nothing;
    end if;
  end if;

  insert into early_access_email_outbox(lead_id,event_type,dedupe_key,payload)
  values(v_lead.id,'WELCOME','welcome:'||v_lead.id,
    jsonb_build_object('leadId',v_lead.id,'email',v_lead.email,'firstName',v_lead.first_name,
      'languageCode',v_lead.preferred_language_code,'inviteCode',v_lead.invite_code))
  on conflict(dedupe_key) do nothing;

  return jsonb_build_object('ok',true,'leadId',v_lead.id,'inviteCode',v_lead.invite_code,
    'partnerJoined',v_lead.partner_joined_at is not null,'languageCode',v_lead.preferred_language_code,
    'referrerEmail',case when v_referrer.id is null then null else v_referrer.email end,
    'referrerFirstName',v_referrer.first_name,'referrerLanguage',v_referrer.preferred_language_code);
end $$;

revoke all on function public.upsert_public_lead_v3(text,text,text,text,boolean,text,text[],text,text,text,text,text,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.upsert_public_lead_v3(text,text,text,text,boolean,text,text[],text,text,text,text,text,text,text,text,text,text,text,text,text,text) to anon,authenticated;
