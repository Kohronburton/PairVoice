-- Lightweight demand analytics. No email, phone, IP, or payment data is stored.
create table if not exists public.funnel_events(
 id uuid primary key default gen_random_uuid(),
 event_name text not null check(event_name in('landing_view','opportunity_view','signup_started','signup_submitted','signup_completed','email_queued','invite_created','invite_view','partner_signup_started','partner_signup_completed','share_clicked')),
 session_id text not null,
 page_path text,
 language_code text,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists funnel_events_event_created_idx on public.funnel_events(event_name,created_at desc);
create index if not exists funnel_events_session_idx on public.funnel_events(session_id,created_at desc);
alter table public.funnel_events enable row level security;
revoke all on public.funnel_events from anon,authenticated;
