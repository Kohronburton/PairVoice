-- Phase 2 provider registry + credential inventory.
create table provider_integrations(
 id uuid primary key default gen_random_uuid(),
 provider_key text not null unique,
 provider_type text not null check(provider_type in('WORK','CREDENTIAL','PAYOUT','MESSAGING','STORAGE')),
 display_name text not null,
 mode text not null default 'MANUAL' check(mode in('MANUAL','API','NATIVE')),
 status text not null default 'ACTIVE' check(status in('ACTIVE','PAUSED','DEGRADED','DISABLED')),
 config jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create trigger provider_integrations_updated before update on provider_integrations for each row execute function set_updated_at();

create table campaign_provider_bindings(
 id uuid primary key default gen_random_uuid(),
 campaign_id uuid not null references campaigns(id),
 campaign_version_id uuid not null references campaign_versions(id),
 provider_id uuid not null references provider_integrations(id),
 purpose text not null check(purpose in('WORK','CREDENTIAL','PAYOUT')),
 active boolean not null default true,
 settings jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 unique(campaign_version_id,purpose)
);

create table provider_credentials(
 id uuid primary key default gen_random_uuid(),
 provider_id uuid not null references provider_integrations(id),
 campaign_id uuid references campaigns(id),
 external_key text not null,
 secret_ciphertext text not null,
 metadata jsonb not null default '{}'::jsonb,
 status text not null default 'AVAILABLE' check(status in('AVAILABLE','RESERVED','RELEASED','IN_USE','SUBMITTED','CLOSED','REVOKED','INVALID')),
 reserved_pair_id uuid references pairs(id),
 reserved_at timestamptz,
 released_at timestamptz,
 closed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(provider_id,external_key)
);
create index provider_credentials_inventory_idx on provider_credentials(provider_id,campaign_id,status,created_at);
create unique index provider_credentials_one_active_pair_idx on provider_credentials(reserved_pair_id)
 where reserved_pair_id is not null and status in('RESERVED','RELEASED','IN_USE','SUBMITTED');
create trigger provider_credentials_updated before update on provider_credentials for each row execute function set_updated_at();

create table provider_credential_assignments(
 id uuid primary key default gen_random_uuid(),
 credential_id uuid not null references provider_credentials(id),
 pair_id uuid not null references pairs(id),
 campaign_id uuid not null references campaigns(id),
 status text not null default 'RESERVED' check(status in('RESERVED','RELEASED','IN_USE','SUBMITTED','CLOSED','REPLACED','REVOKED')),
 idempotency_key text not null unique,
 assigned_at timestamptz not null default now(),
 released_at timestamptz,
 ended_at timestamptz
);
create unique index provider_assignment_active_pair_idx on provider_credential_assignments(pair_id)
 where status in('RESERVED','RELEASED','IN_USE','SUBMITTED');
create unique index provider_assignment_active_credential_idx on provider_credential_assignments(credential_id)
 where status in('RESERVED','RELEASED','IN_USE','SUBMITTED');

create or replace function reserve_provider_credential(
 p_pair_id uuid,p_provider_key text,p_idempotency_key text
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_pair pairs%rowtype; v_provider uuid; v_existing uuid; v_credential uuid; v_assignment uuid;
begin
 select id into v_existing from provider_credential_assignments where idempotency_key=p_idempotency_key;
 if found then return v_existing; end if;

 select * into v_pair from pairs where id=p_pair_id for update;
 if not found then raise exception 'pair_not_found'; end if;
 if v_pair.state not in('PAIRED','READINESS_PENDING') then raise exception 'pair_not_eligible_for_credential_reservation'; end if;

 select id into v_existing from provider_credential_assignments
  where pair_id=p_pair_id and status in('RESERVED','RELEASED','IN_USE','SUBMITTED') limit 1;
 if found then return v_existing; end if;

 select id into v_provider from provider_integrations
  where provider_key=p_provider_key and provider_type='CREDENTIAL' and status='ACTIVE';
 if not found then raise exception 'credential_provider_unavailable'; end if;

 select id into v_credential from provider_credentials
  where provider_id=v_provider and campaign_id=v_pair.campaign_id and status='AVAILABLE'
  order by created_at,id
  for update skip locked limit 1;
 if not found then raise exception 'credential_inventory_exhausted'; end if;

 update provider_credentials set status='RESERVED',reserved_pair_id=p_pair_id,reserved_at=now() where id=v_credential;
 insert into provider_credential_assignments(credential_id,pair_id,campaign_id,idempotency_key)
 values(v_credential,p_pair_id,v_pair.campaign_id,p_idempotency_key) returning id into v_assignment;

 insert into pair_readiness_gates(pair_id,gate_key,status,evidence,checked_at)
 values(p_pair_id,'CREDENTIAL','PASSED',jsonb_build_object('assignment_id',v_assignment,'provider_key',p_provider_key),now())
 on conflict(pair_id,gate_key) do update set status='PASSED',evidence=excluded.evidence,checked_at=excluded.checked_at,updated_at=now();

 insert into activity_events(actor_type,action,entity_type,entity_id,campaign_id,pair_id,metadata)
 values('SYSTEM','PROVIDER_CREDENTIAL_RESERVED','PAIR',p_pair_id,v_pair.campaign_id,p_pair_id,
 jsonb_build_object('assignment_id',v_assignment,'provider_key',p_provider_key));
 return v_assignment;
end $$;

alter table provider_integrations enable row level security;
alter table campaign_provider_bindings enable row level security;
alter table provider_credentials enable row level security;
alter table provider_credential_assignments enable row level security;
revoke all on provider_integrations,campaign_provider_bindings,provider_credentials,provider_credential_assignments from anon,authenticated;
revoke all on function reserve_provider_credential(uuid,text,text) from public,anon,authenticated;
