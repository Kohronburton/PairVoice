-- Provider-neutral payout execution and reconciliation.
-- Initial rail is controlled/manual until a real provider API is separately integrated and verified.

create table provider_payout_attempts(
 id uuid primary key default gen_random_uuid(),
 payout_id uuid not null references payouts(id),
 provider text not null,
 state text not null default 'INTENT' check(state in('INTENT','PROCESSING','SUCCEEDED','FAILED','UNKNOWN','MANUAL_REVIEW')),
 provider_reference text,
 idempotency_key text not null unique,
 request_metadata jsonb not null default '{}'::jsonb,
 result_metadata jsonb not null default '{}'::jsonb,
 last_error text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 resolved_at timestamptz
);
create index provider_payout_attempts_payout_idx on provider_payout_attempts(payout_id,created_at desc);
create unique index provider_payout_one_unresolved_idx on provider_payout_attempts(payout_id)
 where state in('INTENT','PROCESSING','UNKNOWN','MANUAL_REVIEW');
create trigger provider_payout_attempts_updated before update on provider_payout_attempts for each row execute function set_updated_at();

alter table provider_payout_attempts enable row level security;
revoke all on provider_payout_attempts from anon,authenticated;

insert into provider_integrations(provider_key,provider_type,display_name,mode,status,config)
values('manual-payout','PAYOUT','Controlled Manual Payout','MANUAL','ACTIVE','{"reconciliation_required":true}'::jsonb)
on conflict(provider_key) do update set provider_type='PAYOUT',display_name=excluded.display_name,mode='MANUAL',config=excluded.config;

create or replace function participant_available_balance(p_participant_id uuid,p_currency text)
returns integer language sql stable security definer set search_path=public as $$
 select
  coalesce((select sum(amount_cents) from ledger_entries
    where participant_id=p_participant_id and currency=upper(p_currency)),0)
  -
  coalesce((select sum(amount_cents) from payouts
    where participant_id=p_participant_id and currency=upper(p_currency)
      and state in('REQUESTED','PROCESSING')),0)
$$;
revoke all on function participant_available_balance(uuid,text) from public,anon,authenticated;
grant execute on function participant_available_balance(uuid,text) to service_role;

create or replace function request_participant_payout(
 p_participant_id uuid,p_amount_cents integer,p_currency text,p_idempotency_key text
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_existing uuid; v_method participant_payout_methods%rowtype; v_available integer; v_payout uuid;
begin
 if p_amount_cents<=0 then raise exception 'invalid_payout_amount'; end if;
 if char_length(upper(trim(p_currency)))<>3 then raise exception 'invalid_currency'; end if;
 select id into v_existing from payouts where idempotency_key=p_idempotency_key;
 if found then return v_existing; end if;

 perform 1 from participants where id=p_participant_id for update;
 if not found then raise exception 'participant_not_found'; end if;

 select * into v_method from participant_payout_methods
 where participant_id=p_participant_id and status='VERIFIED' and is_default=true
 order by created_at desc limit 1;
 if not found then raise exception 'verified_default_payout_method_required'; end if;

 v_available:=participant_available_balance(p_participant_id,upper(p_currency));
 if v_available<p_amount_cents then raise exception 'insufficient_available_balance'; end if;

 insert into payouts(participant_id,amount_cents,currency,state,provider,idempotency_key)
 values(p_participant_id,p_amount_cents,upper(p_currency),'REQUESTED',v_method.provider,p_idempotency_key)
 returning id into v_payout;

 insert into activity_events(actor_type,actor_participant_id,action,entity_type,entity_id,metadata)
 values('PARTICIPANT',p_participant_id,'PAYOUT_REQUESTED','PAYOUT',v_payout,
  jsonb_build_object('currency',upper(p_currency)));

 return v_payout;
end $$;
revoke all on function request_participant_payout(uuid,integer,text,text) from public,anon,authenticated;
grant execute on function request_participant_payout(uuid,integer,text,text) to service_role;

create or replace function create_payout_attempt(
 p_payout_id uuid,p_idempotency_key text,p_actor_user_id uuid,p_actor_label text
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_payout payouts%rowtype; v_existing uuid; v_attempt uuid;
begin
 select id into v_existing from provider_payout_attempts where idempotency_key=p_idempotency_key;
 if found then return v_existing; end if;

 select * into v_payout from payouts where id=p_payout_id for update;
 if not found then raise exception 'payout_not_found'; end if;
 if v_payout.state not in('REQUESTED','FAILED') then raise exception 'payout_not_ready_for_attempt'; end if;
 if exists(select 1 from provider_payout_attempts where payout_id=p_payout_id and state in('INTENT','PROCESSING','UNKNOWN','MANUAL_REVIEW')) then
  select id into v_existing from provider_payout_attempts where payout_id=p_payout_id and state in('INTENT','PROCESSING','UNKNOWN','MANUAL_REVIEW') order by created_at desc limit 1;
  return v_existing;
 end if;

 insert into provider_payout_attempts(payout_id,provider,state,idempotency_key,request_metadata)
 values(p_payout_id,coalesce(v_payout.provider,'manual-payout'),'PROCESSING',p_idempotency_key,
  jsonb_build_object('amount_cents',v_payout.amount_cents,'currency',v_payout.currency))
 returning id into v_attempt;

 update payouts set state='PROCESSING',failure_reason=null where id=p_payout_id;

 insert into audit_events(actor_user_id,actor_label,operation,resource_type,resource_id,reason,after_data)
 values(p_actor_user_id,p_actor_label,'PAYOUT_ATTEMPT_STARTED','PAYOUT',p_payout_id,'Payout execution started',
  jsonb_build_object('attempt_id',v_attempt,'provider',coalesce(v_payout.provider,'manual-payout')));

 return v_attempt;
end $$;
revoke all on function create_payout_attempt(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function create_payout_attempt(uuid,text,uuid,text) to service_role;

create or replace function reconcile_payout_attempt(
 p_attempt_id uuid,p_outcome text,p_provider_reference text,p_result_metadata jsonb,
 p_last_error text,p_actor_user_id uuid,p_actor_label text,p_reason text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_attempt provider_payout_attempts%rowtype; v_payout payouts%rowtype; v_state text; v_response jsonb;
begin
 if upper(p_outcome) not in('SUCCEEDED','FAILED','UNKNOWN','MANUAL_REVIEW') then raise exception 'invalid_payout_outcome'; end if;
 if trim(coalesce(p_reason,''))='' then raise exception 'reconciliation_reason_required'; end if;

 select * into v_attempt from provider_payout_attempts where id=p_attempt_id for update;
 if not found then raise exception 'payout_attempt_not_found'; end if;
 select * into v_payout from payouts where id=v_attempt.payout_id for update;
 if not found then raise exception 'payout_not_found'; end if;

 if v_attempt.state='SUCCEEDED' then
  return jsonb_build_object('ok',true,'attemptId',v_attempt.id,'payoutId',v_payout.id,'state','SUCCEEDED');
 end if;

 v_state:=upper(p_outcome);
 update provider_payout_attempts set
  state=v_state,
  provider_reference=coalesce(nullif(trim(coalesce(p_provider_reference,'')),''),provider_reference),
  result_metadata=coalesce(result_metadata,'{}'::jsonb)||coalesce(p_result_metadata,'{}'::jsonb),
  last_error=p_last_error,
  resolved_at=case when v_state in('SUCCEEDED','FAILED') then now() else null end
 where id=p_attempt_id;

 if v_state='SUCCEEDED' then
  if nullif(trim(coalesce(p_provider_reference,'')),'') is null and nullif(trim(coalesce(v_attempt.provider_reference,'')),'') is null then
   raise exception 'provider_reference_required_for_success'; end if;

  insert into ledger_entries(participant_id,payout_id,entry_type,amount_cents,currency,idempotency_key,metadata)
  values(v_payout.participant_id,v_payout.id,'PAYOUT',-v_payout.amount_cents,v_payout.currency,
   'payout-ledger:'||v_payout.id,jsonb_build_object('provider',v_attempt.provider))
  on conflict(idempotency_key) do nothing;

  update payouts set state='PAID',
   external_reference=coalesce(nullif(trim(coalesce(p_provider_reference,'')),''),external_reference),
   failure_reason=null
  where id=v_payout.id;
 elsif v_state='FAILED' then
  update payouts set state='FAILED',failure_reason=coalesce(nullif(trim(coalesce(p_last_error,'')),''),'Provider reported failure') where id=v_payout.id;
 else
  -- UNKNOWN and MANUAL_REVIEW intentionally stay PROCESSING. Do not retry externally until reconciled.
  update payouts set state='PROCESSING',failure_reason=coalesce(nullif(trim(coalesce(p_last_error,'')),''),failure_reason) where id=v_payout.id;
 end if;

 insert into audit_events(actor_user_id,actor_label,operation,resource_type,resource_id,reason,after_data)
 values(p_actor_user_id,p_actor_label,'PAYOUT_RECONCILED','PAYOUT',v_payout.id,p_reason,
  jsonb_build_object('attempt_id',p_attempt_id,'outcome',v_state,'has_provider_reference',
   coalesce(nullif(trim(coalesce(p_provider_reference,'')),''),v_attempt.provider_reference) is not null));

 v_response:=jsonb_build_object('ok',true,'attemptId',p_attempt_id,'payoutId',v_payout.id,'state',v_state);
 return v_response;
end $$;
revoke all on function reconcile_payout_attempt(uuid,text,text,jsonb,text,uuid,text,text) from public,anon,authenticated;
grant execute on function reconcile_payout_attempt(uuid,text,text,jsonb,text,uuid,text,text) to service_role;
