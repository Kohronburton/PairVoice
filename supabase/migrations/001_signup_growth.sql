create extension if not exists pgcrypto;

create table if not exists campaigns (
 id uuid primary key default gen_random_uuid(), slug text unique not null, name text not null,
 language_target text, accent_target text, country_target text, source text, creative text,
 active boolean not null default true, created_at timestamptz not null default now()
);

create table if not exists profiles (
 id uuid primary key default gen_random_uuid(), first_name text not null, email text not null unique,
 phone text, country text not null, primary_language text not null, accent text not null,
 referral_code text unique not null default upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
 referred_by uuid references profiles(id), campaign_id uuid references campaigns(id),
 is_18_plus boolean not null default false, consent_contact boolean not null default false,
 status text not null default 'registered' check(status in ('registered','qualified','active','suspended')),
 created_at timestamptz not null default now()
);

create table if not exists pairs (
 id uuid primary key default gen_random_uuid(), user_a uuid not null references profiles(id), user_b uuid references profiles(id),
 invite_code text unique not null default upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
 status text not null default 'invited' check(status in ('invited','complete','qualified','active')),
 created_at timestamptz not null default now(), unique(user_a,user_b)
);

create table if not exists gigs (
 id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null,
 compensation_cents integer not null check(compensation_cents >= 0), compensation_unit text not null default 'pair',
 language text, accent text, country text, requires_pair boolean not null default true,
 capacity integer, active boolean not null default true, created_at timestamptz not null default now()
);

create table if not exists gig_completions (
 id uuid primary key default gen_random_uuid(), gig_id uuid not null references gigs(id), profile_id uuid not null references profiles(id),
 pair_id uuid references pairs(id), status text not null default 'started' check(status in ('started','submitted','accepted','rejected','payment_due','paid')),
 created_at timestamptz not null default now(), unique(gig_id,profile_id)
);

create table if not exists referral_commissions (
 id uuid primary key default gen_random_uuid(), referrer_id uuid not null references profiles(id), referred_id uuid not null references profiles(id),
 completion_id uuid not null unique references gig_completions(id), amount_cents integer not null default 25 check(amount_cents >= 0),
 status text not null default 'pending' check(status in ('pending','available','paid','void')),
 created_at timestamptz not null default now()
);

insert into gigs(slug,title,compensation_cents,compensation_unit,requires_pair) values
('intro-pair-50','Introductory Pair Voice Project',5000,'pair',true) on conflict(slug) do nothing;

alter table profiles enable row level security;
alter table pairs enable row level security;
alter table gig_completions enable row level security;
alter table referral_commissions enable row level security;
