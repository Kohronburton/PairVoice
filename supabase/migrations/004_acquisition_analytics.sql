-- Acquisition analytics: campaign spend + lead/customer attribution.
create table if not exists acquisition_campaigns (
 id uuid primary key default gen_random_uuid(),
 campaign_key text unique not null,
 name text not null,
 channel text not null,
 market text,
 active boolean not null default true,
 created_at timestamptz not null default now()
);

create table if not exists acquisition_spend (
 id uuid primary key default gen_random_uuid(),
 campaign_key text not null references acquisition_campaigns(campaign_key) on update cascade on delete restrict,
 spend_date date not null,
 amount_cents integer not null check(amount_cents >= 0),
 impressions integer check(impressions is null or impressions >= 0),
 clicks integer check(clicks is null or clicks >= 0),
 notes text,
 created_at timestamptz not null default now(),
 unique(campaign_key,spend_date)
);

alter table leads add column if not exists campaign_key text;
alter table leads add column if not exists landing_path text;
alter table leads add column if not exists referrer text;
alter table leads add column if not exists fbclid text;
alter table leads add column if not exists gclid text;
alter table leads add column if not exists converted_at timestamptz;

create index if not exists leads_campaign_key_idx on leads(campaign_key);
create index if not exists acquisition_spend_campaign_date_idx on acquisition_spend(campaign_key,spend_date desc);

alter table acquisition_campaigns enable row level security;
alter table acquisition_spend enable row level security;
