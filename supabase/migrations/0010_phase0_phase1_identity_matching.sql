-- Phase 0/1: permanent identity, matching supply, referral milestones and payout rails.
alter table public.participants
  add column if not exists phone_verified_at timestamptz,
  add column if not exists additional_languages jsonb not null default '[]'::jsonb,
  add column if not exists availability jsonb not null default '{}'::jsonb,
  add column if not exists identity_status text not null default 'ACTIVE'
    check (identity_status in ('ACTIVE','VERIFY','REVIEW','MERGED','BLOCKED')),
  add column if not exists merged_into_participant_id uuid references public.participants(id);

create unique index if not exists participants_phone_unique_idx
  on public.participants(phone) where phone is not null and phone <> '';

create table if not exists public.partner_pool (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  country_code text not null,
  language_code text not null,
  availability jsonb not null default '{}'::jsonb,
  status text not null default 'WAITING' check(status in ('WAITING','OFFERED','MATCHED','PAUSED')),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists partner_pool_match_idx
  on public.partner_pool(status,country_code,language_code,joined_at);

create table if not exists public.potential_partnerships (
  id uuid primary key default gen_random_uuid(),
  participant_a_id uuid not null references public.participants(id),
  participant_b_id uuid not null references public.participants(id),
  status text not null default 'OFFERED' check(status in ('OFFERED','ACCEPTED_A','ACCEPTED_B','CONNECTED','DECLINED','EXPIRED','BLOCKED')),
  source text not null default 'MATCHING' check(source in ('MATCHING','INVITE','EXISTING_USER','ADMIN')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(participant_a_id <> participant_b_id),
  check(participant_a_id::text < participant_b_id::text),
  unique(participant_a_id,participant_b_id)
);

create table if not exists public.referral_programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  qualifying_approved_jobs integer not null default 1 check(qualifying_approved_jobs > 0),
  milestone_referrals integer not null default 10 check(milestone_referrals > 0),
  milestone_bonus_cents integer not null default 0 check(milestone_bonus_cents >= 0),
  currency text not null default 'USD' check(char_length(currency)=3),
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.referral_milestone_awards (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.referral_programs(id),
  participant_id uuid not null references public.participants(id),
  qualified_referral_count integer not null check(qualified_referral_count >= 0),
  ledger_entry_id uuid references public.ledger_entries(id),
  created_at timestamptz not null default now(),
  unique(program_id,participant_id)
);

create table if not exists public.participant_payout_methods (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  provider text not null,
  provider_recipient_reference text,
  label text,
  status text not null default 'PENDING' check(status in ('PENDING','VERIFIED','DISABLED')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists participant_one_default_payout_idx
  on public.participant_payout_methods(participant_id) where is_default and status <> 'DISABLED';

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
    update public.participants set auth_user_id=p_auth_user_id,updated_at=now() where id=v_participant.id;
    return v_participant.id;
  end if;

  select * into v_lead from public.leads where email=v_email order by created_at asc limit 1;
  if not found then raise exception 'early_access_identity_not_found'; end if;

  insert into public.participants(auth_user_id,first_name,email,country_code,primary_language_code,marketing_consent)
  values(p_auth_user_id,v_lead.first_name,v_email,
    case when char_length(coalesce(v_lead.market_code,''))=2 then upper(v_lead.market_code) else 'ZZ' end,
    lower(coalesce(nullif(v_lead.language_code,''),'en')),
    coalesce(v_lead.consent,false))
  returning * into v_participant;

  update public.leads set status='CONVERTED' where id=v_lead.id;
  return v_participant.id;
end $$;

revoke all on function public.claim_pairvoice_identity(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_pairvoice_identity(uuid,text) to service_role;

alter table public.partner_pool enable row level security;
alter table public.potential_partnerships enable row level security;
alter table public.referral_programs enable row level security;
alter table public.referral_milestone_awards enable row level security;
alter table public.participant_payout_methods enable row level security;
