\set ON_ERROR_STOP on
begin;
do $$
declare
 p uuid; payout1 uuid; payout1_retry uuid; attempt uuid; r jsonb; balance integer;
begin
 insert into participants(first_name,email,country_code,primary_language_code)
 values('Payout','payout-test@example.test','US','en') returning id into p;

 insert into participant_payout_methods(participant_id,provider,provider_recipient_reference,label,status,is_default)
 values(p,'MANUAL','recipient-test','Test payout','VERIFIED',true);

 insert into ledger_entries(participant_id,entry_type,amount_cents,currency,idempotency_key)
 values(p,'CAMPAIGN_EARNING',6000,'USD','earning:payout-test');

 balance:=participant_available_balance(p,'USD');
 if balance<>6000 then raise exception 'initial_available_balance_wrong:%',balance; end if;

 payout1:=request_participant_payout(p,3000,'USD','payout-request:test-1');
 payout1_retry:=request_participant_payout(p,3000,'USD','payout-request:test-1');
 if payout1<>payout1_retry then raise exception 'payout_request_not_idempotent'; end if;
 if (select count(*) from payouts where participant_id=p)<>1 then raise exception 'duplicate_payout_request'; end if;
 if (select payout_method_id from payouts where id=payout1) is null then raise exception 'payout_method_not_frozen'; end if;
 if (select provider from participant_payout_methods where id=(select payout_method_id from payouts where id=payout1))<>'MANUAL' then raise exception 'wrong_frozen_payout_method'; end if;

 balance:=participant_available_balance(p,'USD');
 if balance<>3000 then raise exception 'pending_payout_not_reserved:%',balance; end if;

 begin
  perform request_participant_payout(p,4000,'USD','payout-request:too-much');
  raise exception 'overdraw_was_allowed';
 exception when others then
  if sqlerrm='overdraw_was_allowed' then raise; end if;
  if sqlerrm<>'insufficient_available_balance' then raise; end if;
 end;

 attempt:=create_payout_attempt(payout1,'payout-attempt:test-1',null,'TEST');
 if (select state from payouts where id=payout1)<>'PROCESSING' then raise exception 'payout_not_processing'; end if;

 r:=reconcile_payout_attempt(attempt,'UNKNOWN',null,'{"timeout":true}','provider timeout',null,'TEST','Provider response lost');
 if (select state from payouts where id=payout1)<>'PROCESSING' then raise exception 'unknown_outcome_marked_final'; end if;
 if exists(select 1 from ledger_entries where payout_id=payout1 and entry_type='PAYOUT') then raise exception 'unknown_outcome_created_ledger'; end if;

 r:=reconcile_payout_attempt(attempt,'SUCCEEDED','provider-transaction-123','{"reconciled":true}',null,null,'TEST','Confirmed in provider records');
 if (select state from payouts where id=payout1)<>'PAID' then raise exception 'reconciled_success_not_paid'; end if;
 if (select count(*) from ledger_entries where payout_id=payout1 and entry_type='PAYOUT')<>1 then raise exception 'payout_ledger_count_wrong'; end if;
 if (select amount_cents from ledger_entries where payout_id=payout1 and entry_type='PAYOUT')<>-3000 then raise exception 'payout_ledger_amount_wrong'; end if;
 if not exists(select 1 from business_funnel_events where participant_id=p and event_name='payout_completed') then raise exception 'payout_completed_telemetry_missing'; end if;

 r:=reconcile_payout_attempt(attempt,'SUCCEEDED','provider-transaction-123','{"reconciled":true}',null,null,'TEST','Repeat reconciliation');
 if (select count(*) from ledger_entries where payout_id=payout1 and entry_type='PAYOUT')<>1 then raise exception 'repeat_reconcile_duplicated_ledger'; end if;

 balance:=participant_available_balance(p,'USD');
 if balance<>3000 then raise exception 'post_payout_balance_wrong:%',balance; end if;
end $$;
rollback;
select 'payout reconciliation invariants passed' result;
