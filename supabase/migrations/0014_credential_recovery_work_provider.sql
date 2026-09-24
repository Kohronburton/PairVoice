-- Phase 2: credential replacement/revocation and provider-independent work lifecycle.

create table work_provider_runs(
 id uuid primary key default gen_random_uuid(),
 pair_id uuid not null references pairs(id),
 campaign_id uuid not null references campaigns(id),
 provider_id uuid not null references provider_integrations(id),
 external_reference text,
 state text not null default 'READY' check(state in('READY','LAUNCHING','IN_PROGRESS','SUBMITTED','REWORK_REQUIRED','COMPLETED','FAILED','MANUAL_REVIEW','CANCELLED')),
 idempotency_key text not null unique,
 launch_metadata jsonb not null default '{}'::jsonb,
 result_metadata jsonb not null default '{}'::jsonb,
 last_error text,
 started_at timestamptz,
 submitted_at timestamptz,
 completed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(provider_id,external_reference)
);
create index work_provider_runs_pair_idx on work_provider_runs(pair_id,created_at desc);
create trigger work_provider_runs_updated before update on work_provider_runs for each row execute function set_updated_at();

create or replace function replace_provider_credential(
 p_pair_id uuid,p_provider_key text,p_reason text,p_idempotency_key text
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_old provider_credential_assignments%rowtype; v_cred uuid; v_provider uuid; v_pair pairs%rowtype; v_new uuid;
begin
 if trim(coalesce(p_reason,''))='' then raise exception 'replacement_reason_required'; end if;
 select * into v_pair from pairs where id=p_pair_id for update;
 if not found then raise exception 'pair_not_found'; end if;

 select * into v_old from provider_credential_assignments
  where pair_id=p_pair_id and status in('RESERVED','RELEASED','IN_USE','SUBMITTED')
  order by assigned_at desc limit 1 for update;
 if found then
   update provider_credential_assignments set status='REPLACED',ended_at=now() where id=v_old.id;
   update provider_credentials set status='REVOKED',released_at=now(),reserved_pair_id=null where id=v_old.credential_id;
 end if;

 select id into v_provider from provider_integrations
  where provider_key=p_provider_key and provider_type='CREDENTIAL' and status='ACTIVE';
 if not found then raise exception 'credential_provider_unavailable'; end if;
 select id into v_cred from provider_credentials
  where provider_id=v_provider and campaign_id=v_pair.campaign_id and status='AVAILABLE'
  order by created_at,id for update skip locked limit 1;
 if not found then
   insert into pair_readiness_gates(pair_id,gate_key,status,evidence,checked_at)
   values(p_pair_id,'CREDENTIAL','BLOCKED',jsonb_build_object('reason','inventory_exhausted'),now())
   on conflict(pair_id,gate_key) do update set status='BLOCKED',evidence=excluded.evidence,checked_at=excluded.checked_at,updated_at=now();
   raise exception 'credential_inventory_exhausted';
 end if;
 update provider_credentials set status='RESERVED',reserved_pair_id=p_pair_id,reserved_at=now() where id=v_cred;
 insert into provider_credential_assignments(credential_id,pair_id,campaign_id,idempotency_key)
 values(v_cred,p_pair_id,v_pair.campaign_id,p_idempotency_key) returning id into v_new;
 insert into pair_readiness_gates(pair_id,gate_key,status,evidence,checked_at)
 values(p_pair_id,'CREDENTIAL','PASSED',jsonb_build_object('assignment_id',v_new,'provider_key',p_provider_key,'replacement',true),now())
 on conflict(pair_id,gate_key) do update set status='PASSED',evidence=excluded.evidence,checked_at=excluded.checked_at,updated_at=now();
 insert into recovery_actions(entity_type,entity_id,action,reason,before_snapshot,after_snapshot,status,idempotency_key,applied_at,verified_at)
 values('PAIR',p_pair_id,'REPLACE_CREDENTIAL',p_reason,
        jsonb_build_object('old_assignment_id',v_old.id),
        jsonb_build_object('new_assignment_id',v_new),
        'VERIFIED',p_idempotency_key||':recovery',now(),now())
 on conflict(idempotency_key) do nothing;
 return v_new;
end $$;

create or replace function create_work_provider_run(
 p_pair_id uuid,p_provider_key text,p_idempotency_key text
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_pair pairs%rowtype; v_provider uuid; v_existing uuid; v_run uuid;
begin
 select id into v_existing from work_provider_runs where idempotency_key=p_idempotency_key;
 if found then return v_existing; end if;
 select * into v_pair from pairs where id=p_pair_id for update;
 if not found then raise exception 'pair_not_found'; end if;
 if v_pair.state<>'READY' then raise exception 'pair_not_ready_for_work'; end if;
 select id into v_provider from provider_integrations where provider_key=p_provider_key and provider_type='WORK' and status='ACTIVE';
 if not found then raise exception 'work_provider_unavailable'; end if;
 if exists(select 1 from work_provider_runs where pair_id=p_pair_id and state in('READY','LAUNCHING','IN_PROGRESS','SUBMITTED','REWORK_REQUIRED','MANUAL_REVIEW')) then
   select id into v_existing from work_provider_runs where pair_id=p_pair_id and state in('READY','LAUNCHING','IN_PROGRESS','SUBMITTED','REWORK_REQUIRED','MANUAL_REVIEW') order by created_at desc limit 1;
   return v_existing;
 end if;
 insert into work_provider_runs(pair_id,campaign_id,provider_id,idempotency_key) values(p_pair_id,v_pair.campaign_id,v_provider,p_idempotency_key) returning id into v_run;
 return v_run;
end $$;

alter table work_provider_runs enable row level security;
revoke all on work_provider_runs from anon,authenticated;
revoke all on function replace_provider_credential(uuid,text,text,text) from public,anon,authenticated;
revoke all on function create_work_provider_run(uuid,text,text) from public,anon,authenticated;
