create table if not exists leads (
 id uuid primary key default gen_random_uuid(),
 email text not null unique,
 country text not null check(country in ('United States','Spain')),
 marketing_consent boolean not null default false,
 source text,
 utm_source text,
 utm_medium text,
 utm_campaign text,
 utm_content text,
 utm_term text,
 status text not null default 'lead' check(status in ('lead','converted','unsubscribed')),
 converted_profile_id uuid references profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

alter table leads enable row level security;

create index if not exists leads_country_idx on leads(country);
create index if not exists leads_created_at_idx on leads(created_at desc);
create index if not exists leads_status_idx on leads(status);
