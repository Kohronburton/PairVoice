create extension if not exists pgcrypto;

-- PairVoice V2: catalog-first clean schema.
-- This migration intentionally removes the unused first-generation campaign/gig model.
-- Existing lead rows are preserved.

drop function if exists public.upsert_public_lead(
  text,text,boolean,text,text[],text,text,text,text,text,text,text,text,text,text,text
);

alter table if exists public.leads drop constraint if exists leads_converted_profile_id_fkey;
alter table if exists public.leads drop column if exists converted_profile_id;

drop table if exists public.referral_commissions cascade;
drop table if exists public.gig_completions cascade;
drop table if exists public.pairs cascade;
drop table if exists public.profiles cascade;
drop table if exists public.gigs cascade;
drop table if exists public.campaign_external_access cascade;
drop table if exists public.campaigns cascade;
drop table if exists public.acquisition_spend cascade;
drop table if exists public.acquisition_campaigns cascade;

create table if not exists public.job_families (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  recording_mode text not null check (recording_mode in ('CONVERSATION','VOICE_RECORDING','OTHER')),
  requires_pair boolean not null default false,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  job_family_id uuid not null references public.job_families(id) on delete restrict,
  slug text unique not null,
  name text not null,
  country_code text not null check (char_length(country_code)=2),
  language_code text not null,
  locale text,
  accent_target text,
  participant_count integer not null default 1 check (participant_count >= 1),
  session_count integer check (session_count is null or session_count > 0),
  session_minutes_min numeric(6,2) check (session_minutes_min is null or session_minutes_min > 0),
  session_minutes_max numeric(6,2) check (session_minutes_max is null or session_minutes_max > 0),
  device_requirement text,
  provider text,
  one_time_only boolean not null default true,
  participant_payout_cents integer check (participant_payout_cents is null or participant_payout_cents >= 0),
  payout_currency text not null default 'USD',
  payout_unit text not null default 'PAIR' check (payout_unit in ('PAIR','PARTICIPANT','HOURLY','FIXED')),
  client_base_revenue_cents integer check (client_base_revenue_cents is null or client_base_revenue_cents >= 0),
  client_referral_revenue_cents integer check (client_referral_revenue_cents is null or client_referral_revenue_cents >= 0),
  requirements jsonb not null default '{}'::jsonb,
  status text not null default 'OPEN' check (status in ('DRAFT','OPEN','PAUSED','CLOSED')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_postings (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  platform text not null,
  external_job_id text not null,
  url text not null,
  title text not null,
  compensation_type text not null default 'UNKNOWN' check (compensation_type in ('HOURLY','FIXED','UNKNOWN')),
  observed_rate_cents integer check (observed_rate_cents is null or observed_rate_cents >= 0),
  observed_currency text not null default 'USD',
  status text not null default 'OBSERVED' check (status in ('OBSERVED','OPEN','CLOSED','ARCHIVED')),
  first_observed_at date,
  created_at timestamptz not null default now(),
  unique(platform,external_job_id)
);

create table if not exists public.source_contract_observations (
  id uuid primary key default gen_random_uuid(),
  source_posting_id uuid not null references public.source_postings(id) on delete cascade,
  worker_display_name text,
  observed_hours numeric(8,2) check (observed_hours is null or observed_hours >= 0),
  hourly_rate_cents integer check (hourly_rate_cents is null or hourly_rate_cents >= 0),
  observed_month date,
  created_at timestamptz not null default now()
);

create table if not exists public.campaign_access (
  campaign_id uuid primary key references public.campaigns(id) on delete cascade,
  provider text not null,
  invitation_code text,
  reveal_state text not null default 'READY' check (reveal_state in ('PARTNER_PENDING','PAIRED','READY','IN_PROGRESS')),
  updated_at timestamptz not null default now()
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  email text not null unique,
  phone text,
  country_code text check (country_code is null or char_length(country_code)=2),
  primary_language text,
  accent text,
  referral_code text unique not null default upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  referred_by uuid references public.participants(id),
  is_18_plus boolean not null default false,
  consent_contact boolean not null default false,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','SUSPENDED','CLOSED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_enrollments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  source_posting_id uuid references public.source_postings(id) on delete set null,
  status text not null default 'INTERESTED' check (status in (
    'INTERESTED','ELIGIBILITY','QUALIFIED','PARTNER_PENDING','PAIRED','IN_PROGRESS',
    'SUBMITTED','APPROVED','REJECTED','PAID','WITHDRAWN'
  )),
  eligibility jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(campaign_id,participant_id)
);

create table if not exists public.pairs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  enrollment_a_id uuid not null references public.campaign_enrollments(id) on delete restrict,
  enrollment_b_id uuid not null references public.campaign_enrollments(id) on delete restrict,
  pair_code text unique not null default upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
  status text not null default 'FORMING' check (status in (
    'FORMING','READY','RECORDING','SUBMITTED','QA_PENDING','REWORK','APPROVED',
    'PAYMENT_DUE','PAID','CANCELLED'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (enrollment_a_id <> enrollment_b_id)
);

create table if not exists public.recording_sessions (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  session_number integer not null check (session_number > 0),
  status text not null default 'NOT_STARTED' check (status in ('NOT_STARTED','IN_PROGRESS','COMPLETE','PROBLEM','REWORK')),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  provider_reference text,
  updated_at timestamptz not null default now(),
  unique(pair_id,session_number)
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null unique references public.pairs(id) on delete cascade,
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED','QA_PENDING','REWORK','APPROVED','REJECTED')),
  provider_status text,
  notes text,
  submitted_at timestamptz not null default now(),
  decided_at timestamptz
);

create table if not exists public.payment_obligations (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null unique references public.pairs(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'USD',
  status text not null default 'PAYMENT_DUE' check (status in ('PAYMENT_DUE','PROCESSING','PAID','FAILED','VOID')),
  external_reference text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.referral_commissions (
  id uuid primary key default gen_random_uuid(),
  referrer_participant_id uuid not null references public.participants(id) on delete cascade,
  referred_participant_id uuid not null references public.participants(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  status text not null default 'PENDING' check (status in ('PENDING','AVAILABLE','PAID','VOID')),
  created_at timestamptz not null default now(),
  unique(referrer_participant_id,referred_participant_id,campaign_id)
);

create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  campaign_key text unique not null,
  name text not null,
  channel text not null,
  market_code text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.marketing_spend (
  id uuid primary key default gen_random_uuid(),
  campaign_key text not null references public.marketing_campaigns(campaign_key) on update cascade on delete restrict,
  spend_date date not null,
  amount_cents integer not null check (amount_cents >= 0),
  impressions integer check (impressions is null or impressions >= 0),
  clicks integer check (clicks is null or clicks >= 0),
  notes text,
  created_at timestamptz not null default now(),
  unique(campaign_key,spend_date)
);

-- Preserve the email-first lead funnel while removing the old profile/campaign coupling.
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  marketing_consent boolean not null default false,
  market_code text,
  detected_locale text,
  detected_languages text[],
  source text,
  marketing_campaign_key text,
  campaign_id uuid references public.campaigns(id) on delete set null,
  source_posting_id uuid references public.source_postings(id) on delete set null,
  landing_path text,
  referrer text,
  fbclid text,
  gclid text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  status text not null default 'LEAD' check (status in ('LEAD','CONVERTED','UNSUBSCRIBED')),
  converted_participant_id uuid references public.participants(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Clean the pre-V2 lead table in place when upgrading an existing database.
alter table public.leads drop constraint if exists leads_country_check;
alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads drop column if exists country;
alter table public.leads drop column if exists country_code;
alter table public.leads drop column if exists preferred_language;
alter table public.leads drop column if exists language_code;
alter table public.leads drop column if exists region_code;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='leads' and column_name='campaign_key'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='leads' and column_name='marketing_campaign_key'
  ) then
    alter table public.leads rename column campaign_key to marketing_campaign_key;
  end if;
end $$;

alter table public.leads add column if not exists marketing_campaign_key text;
alter table public.leads add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;
alter table public.leads add column if not exists source_posting_id uuid references public.source_postings(id) on delete set null;
alter table public.leads add column if not exists converted_participant_id uuid references public.participants(id) on delete set null;

update public.leads set status=upper(status);
alter table public.leads
  add constraint leads_status_check check (status in ('LEAD','CONVERTED','UNSUBSCRIBED'));

-- RLS: current application access is server-side only.
alter table public.job_families enable row level security;
alter table public.campaigns enable row level security;
alter table public.source_postings enable row level security;
alter table public.source_contract_observations enable row level security;
alter table public.campaign_access enable row level security;
alter table public.participants enable row level security;
alter table public.campaign_enrollments enable row level security;
alter table public.pairs enable row level security;
alter table public.recording_sessions enable row level security;
alter table public.submissions enable row level security;
alter table public.payment_obligations enable row level security;
alter table public.referral_commissions enable row level security;
alter table public.marketing_campaigns enable row level security;
alter table public.marketing_spend enable row level security;
alter table public.leads enable row level security;

create index if not exists campaigns_job_family_idx on public.campaigns(job_family_id);
create index if not exists campaigns_market_idx on public.campaigns(country_code,language_code,status);
create index if not exists source_postings_campaign_idx on public.source_postings(campaign_id);
create index if not exists source_contract_posting_idx on public.source_contract_observations(source_posting_id);
create index if not exists enrollments_campaign_idx on public.campaign_enrollments(campaign_id,status);
create index if not exists enrollments_participant_idx on public.campaign_enrollments(participant_id);
create index if not exists pairs_campaign_idx on public.pairs(campaign_id,status);
create index if not exists sessions_pair_idx on public.recording_sessions(pair_id);
create index if not exists referrals_campaign_idx on public.referral_commissions(campaign_id,status);
create index if not exists marketing_spend_campaign_date_idx on public.marketing_spend(campaign_key,spend_date desc);
create index if not exists leads_market_idx on public.leads(market_code);
create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_marketing_campaign_idx on public.leads(marketing_campaign_key);
create index if not exists leads_campaign_idx on public.leads(campaign_id);

insert into public.job_families(slug,name,recording_mode,requires_pair,description)
values
 ('paired-conversation','Paired Conversation Recording','CONVERSATION',true,'Two eligible speakers complete a structured conversational recording project together.'),
 ('mobile-voice-recording','Mobile Voice Recording','VOICE_RECORDING',false,'Individual mobile voice-recording project with campaign-specific device requirements.')
on conflict(slug) do update set
 name=excluded.name,
 recording_mode=excluded.recording_mode,
 requires_pair=excluded.requires_pair,
 description=excluded.description,
 active=true;

insert into public.campaigns(
  job_family_id,slug,name,country_code,language_code,locale,participant_count,session_count,
  session_minutes_min,session_minutes_max,device_requirement,provider,participant_payout_cents,
  payout_currency,payout_unit,client_base_revenue_cents,client_referral_revenue_cents,requirements,status,active
)
select jf.id,'us-english-7','U.S. English — 7 Conversations','US','en','en-US',2,7,21,22,null,'FUNCROWD',6000,'USD','PAIR',10000,500,
       '{"native_market_speaker":true}'::jsonb,'OPEN',true
from public.job_families jf where jf.slug='paired-conversation'
on conflict(slug) do update set
 job_family_id=excluded.job_family_id,name=excluded.name,country_code=excluded.country_code,
 language_code=excluded.language_code,locale=excluded.locale,participant_count=excluded.participant_count,
 session_count=excluded.session_count,session_minutes_min=excluded.session_minutes_min,
 session_minutes_max=excluded.session_minutes_max,device_requirement=excluded.device_requirement,
 provider=excluded.provider,participant_payout_cents=excluded.participant_payout_cents,
 payout_currency=excluded.payout_currency,payout_unit=excluded.payout_unit,
 client_base_revenue_cents=excluded.client_base_revenue_cents,
 client_referral_revenue_cents=excluded.client_referral_revenue_cents,
 requirements=excluded.requirements,status=excluded.status,active=excluded.active,updated_at=now();

insert into public.campaigns(
  job_family_id,slug,name,country_code,language_code,locale,participant_count,session_count,
  device_requirement,provider,participant_payout_cents,payout_currency,payout_unit,requirements,status,active
)
select jf.id,'ca-english-7','Canada English — 7 Conversations','CA','en','en-CA',2,7,null,'FUNCROWD',null,'USD','PAIR',
       '{"native_market_speaker":true}'::jsonb,'OPEN',true
from public.job_families jf where jf.slug='paired-conversation'
on conflict(slug) do update set
 job_family_id=excluded.job_family_id,name=excluded.name,country_code=excluded.country_code,
 language_code=excluded.language_code,locale=excluded.locale,participant_count=excluded.participant_count,
 session_count=excluded.session_count,device_requirement=excluded.device_requirement,provider=excluded.provider,
 requirements=excluded.requirements,status=excluded.status,active=excluded.active,updated_at=now();

insert into public.campaigns(
  job_family_id,slug,name,country_code,language_code,locale,accent_target,participant_count,session_count,
  session_minutes_min,session_minutes_max,provider,participant_payout_cents,payout_currency,payout_unit,
  client_base_revenue_cents,client_referral_revenue_cents,requirements,status,active
)
select jf.id,'es-spain-7','Spain Spanish — 7 Conversations','ES','es','es-ES','Spain Spanish',2,7,21,22,'FUNCROWD',5000,'USD','PAIR',7500,400,
       '{"native_spain_spanish_required":true}'::jsonb,'OPEN',true
from public.job_families jf where jf.slug='paired-conversation'
on conflict(slug) do update set
 job_family_id=excluded.job_family_id,name=excluded.name,country_code=excluded.country_code,
 language_code=excluded.language_code,locale=excluded.locale,accent_target=excluded.accent_target,
 participant_count=excluded.participant_count,session_count=excluded.session_count,
 session_minutes_min=excluded.session_minutes_min,session_minutes_max=excluded.session_minutes_max,
 provider=excluded.provider,participant_payout_cents=excluded.participant_payout_cents,
 payout_currency=excluded.payout_currency,payout_unit=excluded.payout_unit,
 client_base_revenue_cents=excluded.client_base_revenue_cents,
 client_referral_revenue_cents=excluded.client_referral_revenue_cents,
 requirements=excluded.requirements,status=excluded.status,active=excluded.active,updated_at=now();

insert into public.campaigns(
  job_family_id,slug,name,country_code,language_code,locale,participant_count,session_count,
  device_requirement,provider,participant_payout_cents,payout_currency,payout_unit,requirements,status,active
)
select jf.id,'au-english-iphone','Australia English — iPhone Recording','AU','en','en-AU',1,null,'iPhone',null,null,'USD','PARTICIPANT',
       '{"iphone_required":true}'::jsonb,'OPEN',true
from public.job_families jf where jf.slug='mobile-voice-recording'
on conflict(slug) do update set
 job_family_id=excluded.job_family_id,name=excluded.name,country_code=excluded.country_code,
 language_code=excluded.language_code,locale=excluded.locale,participant_count=excluded.participant_count,
 session_count=excluded.session_count,device_requirement=excluded.device_requirement,provider=excluded.provider,
 requirements=excluded.requirements,status=excluded.status,active=excluded.active,updated_at=now();

-- Source postings supplied from the active Upwork research set.
insert into public.source_postings(campaign_id,platform,external_job_id,url,title,compensation_type,observed_rate_cents,observed_currency,status,first_observed_at)
select c.id,'UPWORK','022093425157779044951','https://www.upwork.com/jobs/~022093425157779044951/','Canada-Based English Speakers Needed | 7 Recorded Conversations','HOURLY',2000,'USD','OBSERVED','2026-09-01'
from public.campaigns c where c.slug='ca-english-7'
on conflict(platform,external_job_id) do update set campaign_id=excluded.campaign_id,url=excluded.url,title=excluded.title,compensation_type=excluded.compensation_type,observed_rate_cents=excluded.observed_rate_cents;

insert into public.source_postings(campaign_id,platform,external_job_id,url,title,compensation_type,observed_rate_cents,observed_currency,status,first_observed_at)
select c.id,'UPWORK','022091973100876027513','https://www.upwork.com/jobs/~022091973100876027513/','Canada-Based English Speakers wanted | 7 Recorded Conversations','HOURLY',2000,'USD','OBSERVED','2026-08-01'
from public.campaigns c where c.slug='ca-english-7'
on conflict(platform,external_job_id) do update set campaign_id=excluded.campaign_id,url=excluded.url,title=excluded.title,compensation_type=excluded.compensation_type,observed_rate_cents=excluded.observed_rate_cents;

insert into public.source_postings(campaign_id,platform,external_job_id,url,title,compensation_type,observed_rate_cents,observed_currency,status,first_observed_at)
select c.id,'UPWORK','022085780900693941621','https://www.upwork.com/jobs/~022085780900693941621/','Canada-Based English Speakers Needed | 7 Recorded Conversations','UNKNOWN',null,'USD','OBSERVED','2026-08-01'
from public.campaigns c where c.slug='ca-english-7'
on conflict(platform,external_job_id) do update set campaign_id=excluded.campaign_id,url=excluded.url,title=excluded.title;

insert into public.source_postings(campaign_id,platform,external_job_id,url,title,compensation_type,observed_rate_cents,observed_currency,status,first_observed_at)
select c.id,'UPWORK','022089576664926364629','https://www.upwork.com/jobs/~022089576664926364629/','Australian Voice Recording Project | iPhone Required','HOURLY',1800,'USD','OBSERVED','2026-08-01'
from public.campaigns c where c.slug='au-english-iphone'
on conflict(platform,external_job_id) do update set campaign_id=excluded.campaign_id,url=excluded.url,title=excluded.title,compensation_type=excluded.compensation_type,observed_rate_cents=excluded.observed_rate_cents;

insert into public.source_postings(campaign_id,platform,external_job_id,url,title,compensation_type,observed_rate_cents,observed_currency,status,first_observed_at)
select c.id,'UPWORK','022087619753139439167','https://www.upwork.com/jobs/~022087619753139439167/','US English Dialogue Collection | 7 Topic-Based Conversations — $100','HOURLY',2000,'USD','OBSERVED','2026-08-01'
from public.campaigns c where c.slug='us-english-7'
on conflict(platform,external_job_id) do update set campaign_id=excluded.campaign_id,url=excluded.url,title=excluded.title,compensation_type=excluded.compensation_type,observed_rate_cents=excluded.observed_rate_cents;

insert into public.source_contract_observations(source_posting_id,worker_display_name,observed_hours,hourly_rate_cents,observed_month)
select sp.id,'Kurtis M.',5,2000,'2026-09-01' from public.source_postings sp
where sp.platform='UPWORK' and sp.external_job_id='022093425157779044951';

insert into public.source_contract_observations(source_posting_id,worker_display_name,observed_hours,hourly_rate_cents,observed_month)
select sp.id,'Rachel Y.',3,2000,'2026-08-01' from public.source_postings sp
where sp.platform='UPWORK' and sp.external_job_id='022091973100876027513';

insert into public.source_contract_observations(source_posting_id,worker_display_name,observed_hours,hourly_rate_cents,observed_month)
select sp.id,'Sharon F.',1,1800,'2026-08-01' from public.source_postings sp
where sp.platform='UPWORK' and sp.external_job_id='022089576664926364629';

insert into public.source_contract_observations(source_posting_id,worker_display_name,observed_hours,hourly_rate_cents,observed_month)
select sp.id,'Fiona F.',1,1800,'2026-08-01' from public.source_postings sp
where sp.platform='UPWORK' and sp.external_job_id='022089576664926364629';

insert into public.source_contract_observations(source_posting_id,worker_display_name,observed_hours,hourly_rate_cents,observed_month)
select sp.id,'Donald W.',5,2000,'2026-08-01' from public.source_postings sp
where sp.platform='UPWORK' and sp.external_job_id='022087619753139439167';

insert into public.campaign_access(campaign_id,provider,invitation_code,reveal_state)
select c.id,'FUNCROWD',null,'READY' from public.campaigns c where c.slug='es-spain-7'
on conflict(campaign_id) do update set provider=excluded.provider,reveal_state=excluded.reveal_state,updated_at=now();
