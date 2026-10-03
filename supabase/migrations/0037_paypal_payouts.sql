-- Revenue Release B: activate the PayPal Payouts API rail only with the payout worker deployment.

insert into public.provider_integrations(provider_key,provider_type,display_name,mode,status,config)
values(
 'paypal-payouts','PAYOUT','PayPal Payouts','API','ACTIVE',
 '{"api":"v1/payments/payouts","reconciliation":"webhook","recipient_type":"EMAIL"}'::jsonb
)
on conflict(provider_key) do update
set provider_type='PAYOUT',display_name=excluded.display_name,mode='API',status='ACTIVE',config=excluded.config;

-- New payout attempts use PayPal while historical manual attempts remain untouched.
create or replace function public.create_payout_attempt(
 p_payout_id uuid,p_idempotency_key text,p_actor_user_id uuid,p_actor_label text
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_payout payouts%rowtype; v_existing uuid; v_attempt uuid;
begin
 select id into v_existing from provider_payout_attempts where idempotency_key=p_idempotency_key;
 if found then return v_existing; end if;

 select * into v_payout from payouts where id=p_payout_id for update;
 if not found then raise exception 'payout_not_found'; end if;
 if v_payout.state not in('REQUESTED','FAILED') then raise exception 'payout_not_ready_for_attempt'; end if;
 if v_payout.state='FAILED' then raise exception 'failed_payout_requires_new_request'; end if;

 insert into provider_payout_attempts(payout_id,provider,state,idempotency_key,request_metadata)
 values(
  p_payout_id,'paypal-payouts','PROCESSING',p_idempotency_key,
  jsonb_build_object('amount_cents',v_payout.amount_cents,'currency',v_payout.currency)
 ) returning id into v_attempt;

 update payouts
 set state='PROCESSING',provider='paypal-payouts',failure_reason=null
 where id=p_payout_id;

 insert into audit_events(actor_user_id,actor_label,operation,resource_type,resource_id,after_data)
 values(p_actor_user_id,p_actor_label,'PAYOUT_ATTEMPT_CREATED','PAYOUT',p_payout_id,
        jsonb_build_object('attempt_id',v_attempt,'provider','paypal-payouts'));
 return v_attempt;
end $$;
revoke all on function public.create_payout_attempt(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.create_payout_attempt(uuid,text,uuid,text) to service_role;
