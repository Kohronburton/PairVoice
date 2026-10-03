-- Forward-only compatibility and recovery controls.
-- Never reset production data to repair schema drift.

-- Historical Early Access RPCs use marketing_campaign_key while the clean baseline
-- originally named this field campaign_key. Keep both during the compatibility window.
alter table public.leads add column if not exists marketing_campaign_key text;
update public.leads set marketing_campaign_key=coalesce(marketing_campaign_key,campaign_key,'organic')
 where marketing_campaign_key is null;
alter table public.leads alter column marketing_campaign_key set default 'organic';

create or replace function public.sync_lead_campaign_keys() returns trigger language plpgsql as $$
begin
  if new.marketing_campaign_key is null and new.campaign_key is not null then new.marketing_campaign_key:=new.campaign_key; end if;
  if new.campaign_key is null and new.marketing_campaign_key is not null then new.campaign_key:=new.marketing_campaign_key; end if;
  if new.marketing_campaign_key is distinct from old.marketing_campaign_key and new.marketing_campaign_key is not null then
    new.campaign_key:=new.marketing_campaign_key;
  elsif new.campaign_key is distinct from old.campaign_key and new.campaign_key is not null then
    new.marketing_campaign_key:=new.campaign_key;
  end if;
  return new;
end $$;
drop trigger if exists leads_campaign_key_compat on public.leads;
create trigger leads_campaign_key_compat before insert or update on public.leads
 for each row execute function public.sync_lead_campaign_keys();

-- Durable workflow checkpoints let workers resume instead of resetting business state.
create table if not exists public.workflow_checkpoints(
 id uuid primary key default gen_random_uuid(),
 workflow_type text not null,
 entity_type text not null,
 entity_id uuid not null,
 step_key text not null,
 status text not null check(status in('PENDING','RUNNING','SUCCEEDED','RETRY','FAILED','MANUAL_REVIEW')),
 attempt_count integer not null default 0 check(attempt_count>=0),
 idempotency_key text not null unique,
 input_snapshot jsonb not null default '{}'::jsonb,
 result_snapshot jsonb,
 last_error text,
 next_retry_at timestamptz,
 locked_at timestamptz,
 completed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(workflow_type,entity_type,entity_id,step_key)
);
create index if not exists workflow_retry_idx on public.workflow_checkpoints(status,next_retry_at);

create table if not exists public.recovery_actions(
 id uuid primary key default gen_random_uuid(),
 entity_type text not null,
 entity_id uuid not null,
 action text not null,
 reason text not null,
 requested_by uuid references auth.users(id),
 before_snapshot jsonb not null,
 after_snapshot jsonb,
 status text not null default 'PLANNED' check(status in('PLANNED','APPLIED','VERIFIED','FAILED')),
 idempotency_key text not null unique,
 created_at timestamptz not null default now(),
 applied_at timestamptz,
 verified_at timestamptz
);
create index if not exists recovery_entity_idx on public.recovery_actions(entity_type,entity_id,created_at desc);

alter table public.workflow_checkpoints enable row level security;
alter table public.recovery_actions enable row level security;
revoke all on public.workflow_checkpoints,public.recovery_actions from anon,authenticated;

create trigger workflow_checkpoints_updated before update on public.workflow_checkpoints
 for each row execute function public.set_updated_at();

-- Recovery evidence is append-only after verification.
create or replace function public.protect_verified_recovery() returns trigger language plpgsql as $$
begin
 if tg_op='DELETE' then raise exception 'recovery_history_is_immutable'; end if;
 if old.status='VERIFIED' then raise exception 'verified_recovery_is_immutable'; end if;
 return new;
end $$;
drop trigger if exists recovery_history_guard on public.recovery_actions;
create trigger recovery_history_guard before update or delete on public.recovery_actions
 for each row execute function public.protect_verified_recovery();
