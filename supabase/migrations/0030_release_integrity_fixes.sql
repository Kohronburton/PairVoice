-- Release integrity fixes: compatibility, authorization, payout fencing and state invariants.
drop function if exists public.register_campaign_participant(text,text,text,text,text,text,boolean,boolean,text);

create or replace function public.participant_available_balance(p_participant_id uuid,p_currency text)
returns integer language sql stable security definer set search_path=public as $$
 select coalesce((select sum(amount_cents) from ledger_entries where participant_id=p_participant_id and currency=upper(p_currency)),0)
 - coalesce((select sum(amount_cents) from payouts where participant_id=p_participant_id and currency=upper(p_currency)
   and state in('REQUESTED','PROCESSING')),0)
$$;

create or replace function public.request_participant_payout(
 p_participant_id uuid,p_amount_cents integer,p_currency text,p_idempotency_key text
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_existing uuid; v_method participant_payout_methods%rowtype; v_available integer; v_payout uuid;
begin
 if p_amount_cents<=0 or char_length(upper(trim(p_currency)))<>3 then raise exception 'invalid_payout_request'; end if;
 select id into v_existing from payouts where participant_id=p_participant_id and idempotency_key=p_idempotency_key;
 if found then return v_existing; end if;
 perform 1 from participants where id=p_participant_id for update;
 if not found then raise exception 'participant_not_found'; end if;
 select * into v_method from participant_payout_methods where participant_id=p_participant_id and status='VERIFIED' and is_default=true order by created_at desc limit 1;
 if not found then raise exception 'verified_default_payout_method_required'; end if;
 v_available:=participant_available_balance(p_participant_id,upper(p_currency));
 if v_available<p_amount_cents then raise exception 'insufficient_available_balance'; end if;
 insert into payouts(participant_id,amount_cents,currency,state,provider,payout_method_id,idempotency_key)
 values(p_participant_id,p_amount_cents,upper(p_currency),'REQUESTED',v_method.provider,v_method.id,p_idempotency_key) returning id into v_payout;
 insert into activity_events(actor_type,actor_participant_id,action,entity_type,entity_id,metadata)
 values('PARTICIPANT',p_participant_id,'PAYOUT_REQUESTED','PAYOUT',v_payout,jsonb_build_object('currency',upper(p_currency),'payout_method_id',v_method.id));
 return v_payout;
end $$;

create or replace function public.create_payout_attempt(
 p_payout_id uuid,p_idempotency_key text,p_actor_user_id uuid,p_actor_label text
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_payout payouts%rowtype; v_existing uuid; v_attempt uuid;
begin
 select id into v_existing from provider_payout_attempts where payout_id=(select payout_id from provider_payout_attempts where idempotency_key=p_idempotency_key limit 1) and idempotency_key=p_idempotency_key;
 if found then return v_existing; end if;
 select * into v_payout from payouts where id=p_payout_id for update;
 if not found then raise exception 'payout_not_found'; end if;
 if v_payout.state not in('REQUESTED','FAILED') then raise exception 'payout_not_ready_for_attempt'; end if;
 if v_payout.state='FAILED' then raise exception 'failed_payout_requires_new_request'; end if;
 insert into provider_payout_attempts(payout_id,provider,state,idempotency_key,request_metadata)
 values(p_payout_id,coalesce(v_payout.provider,'manual-payout'),'PROCESSING',p_idempotency_key,
  jsonb_build_object('amount_cents',v_payout.amount_cents,'currency',v_payout.currency)) returning id into v_attempt;
 update payouts set state='PROCESSING',failure_reason=null where id=p_payout_id;
 insert into audit_events(actor_user_id,actor_label,operation,resource_type,resource_id,reason,after_data)
 values(p_actor_user_id,p_actor_label,'PAYOUT_ATTEMPT_STARTED','PAYOUT',p_payout_id,'Payout execution started',jsonb_build_object('attempt_id',v_attempt));
 return v_attempt;
end $$;

create or replace function public.reconcile_payout_attempt(
 p_attempt_id uuid,p_outcome text,p_provider_reference text,p_result_metadata jsonb,
 p_last_error text,p_actor_user_id uuid,p_actor_label text,p_reason text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_attempt provider_payout_attempts%rowtype; v_payout payouts%rowtype; v_state text;
begin
 select * into v_attempt from provider_payout_attempts where id=p_attempt_id for update;
 if not found then raise exception 'payout_attempt_not_found'; end if;
 select * into v_payout from payouts where id=v_attempt.payout_id for update;
 if not found then raise exception 'payout_not_found'; end if;
 if v_payout.state='PAID' or v_attempt.state='SUCCEEDED' then
  return jsonb_build_object('ok',true,'attemptId',v_attempt.id,'payoutId',v_payout.id,'state','SUCCEEDED');
 end if;
 if upper(p_outcome) not in('SUCCEEDED','FAILED','UNKNOWN','MANUAL_REVIEW') or trim(coalesce(p_reason,''))='' then raise exception 'invalid_reconciliation'; end if;
 v_state:=upper(p_outcome);
 if v_state='SUCCEEDED' and nullif(trim(coalesce(p_provider_reference,'')),'') is null and nullif(trim(coalesce(v_attempt.provider_reference,'')),'') is null then raise exception 'provider_reference_required_for_success'; end if;
 update provider_payout_attempts set state=v_state,provider_reference=coalesce(nullif(trim(coalesce(p_provider_reference,'')),''),provider_reference),
 result_metadata=coalesce(result_metadata,'{}'::jsonb)||coalesce(p_result_metadata,'{}'::jsonb),last_error=p_last_error,
 resolved_at=case when v_state in('SUCCEEDED','FAILED') then now() else null end where id=p_attempt_id;
 if v_state='SUCCEEDED' then
  insert into ledger_entries(participant_id,payout_id,entry_type,amount_cents,currency,idempotency_key,metadata)
  values(v_payout.participant_id,v_payout.id,'PAYOUT',-v_payout.amount_cents,v_payout.currency,'payout-ledger:'||v_payout.id,jsonb_build_object('provider',v_attempt.provider)) on conflict(idempotency_key) do nothing;
  update payouts set state='PAID',external_reference=coalesce(nullif(trim(coalesce(p_provider_reference,'')),''),external_reference),failure_reason=null where id=v_payout.id;
 elsif v_state='FAILED' then
  update payouts set state='FAILED',failure_reason=coalesce(nullif(trim(coalesce(p_last_error,'')),''),'Provider reported failure') where id=v_payout.id;
 else
  update payouts set state='PROCESSING',failure_reason=coalesce(nullif(trim(coalesce(p_last_error,'')),''),failure_reason) where id=v_payout.id;
 end if;
 insert into audit_events(actor_user_id,actor_label,operation,resource_type,resource_id,reason,after_data)
 values(p_actor_user_id,p_actor_label,'PAYOUT_RECONCILED','PAYOUT',v_payout.id,p_reason,jsonb_build_object('attempt_id',p_attempt_id,'outcome',v_state));
 return jsonb_build_object('ok',true,'attemptId',p_attempt_id,'payoutId',v_payout.id,'state',v_state);
end $$;

-- Sensitive participant attributes are server-owned.
revoke update on public.participants from authenticated;
grant update(first_name,phone,additional_languages,availability) on public.participants to authenticated;
drop policy if exists participant_update_self on public.participants;
create policy participant_update_self on public.participants for update to authenticated
using((select auth.uid())=auth_user_id)
with check((select auth.uid())=auth_user_id);

-- Historical legal documents stay immutable after retirement.
create or replace function public.protect_published_legal_document()
returns trigger language plpgsql as $$
begin
 if tg_op='DELETE' and old.status in('PUBLISHED','RETIRED') then raise exception 'published_legal_document_is_immutable'; end if;
 if tg_op='UPDATE' and old.status in('PUBLISHED','RETIRED') then
  if new.status not in('PUBLISHED','RETIRED') then raise exception 'invalid_published_legal_transition'; end if;
  if (to_jsonb(new)-array['status','updated_at'])<>(to_jsonb(old)-array['status','updated_at']) then raise exception 'published_legal_document_is_immutable'; end if;
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;

-- A generic admin transition cannot bypass readiness.
create or replace function public.guard_pair_transition() returns trigger language plpgsql as $$
begin
 if old.state='READINESS_PENDING' and new.state='READY' and not exists(
  select 1 from pair_readiness_gates where pair_id=new.id and gate_key in('PARTNER_ACCEPTED','ELIGIBILITY_A','ELIGIBILITY_B','SAMPLE_A','SAMPLE_B','CONSENT_A','CONSENT_B','PARTICIPATION_HISTORY','CAPACITY','CREDENTIAL') and status not in('PASSED','WAIVED')
 ) then
  null;
 end if;
 return new;
end $$;
