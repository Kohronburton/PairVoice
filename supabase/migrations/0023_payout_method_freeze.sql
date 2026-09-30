-- Freeze each payout request to the exact verified payout-method record used at request time.

alter table payouts add column if not exists payout_method_id uuid references participant_payout_methods(id);
create index if not exists payouts_method_idx on payouts(payout_method_id);

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

 insert into payouts(participant_id,amount_cents,currency,state,provider,payout_method_id,idempotency_key)
 values(p_participant_id,p_amount_cents,upper(p_currency),'REQUESTED',v_method.provider,v_method.id,p_idempotency_key)
 returning id into v_payout;

 insert into activity_events(actor_type,actor_participant_id,action,entity_type,entity_id,metadata)
 values('PARTICIPANT',p_participant_id,'PAYOUT_REQUESTED','PAYOUT',v_payout,
  jsonb_build_object('currency',upper(p_currency),'payout_method_id',v_method.id));

 return v_payout;
end $$;
revoke all on function request_participant_payout(uuid,integer,text,text) from public,anon,authenticated;
grant execute on function request_participant_payout(uuid,integer,text,text) to service_role;
