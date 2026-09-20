\set ON_ERROR_STOP on

do $$
declare
 v_reg jsonb;
 v_join jsonb;
 v_pair uuid;
 v_bundle uuid;
 v_assignment uuid;
 v_assignment_repeat uuid;
 v_count integer;
 v_total integer;
 v_state pair_state;
begin
 v_reg:=register_campaign_participant(
  'es-spain-v1','CI Alpha','ci-alpha@example.com',null,'ES','es',true,true,null
 );
 if coalesce(v_reg->>'inviteCode','')='' then raise exception 'registration_did_not_return_invite'; end if;

 v_join:=join_pair_invite(
  v_reg->>'inviteCode','CI Bravo','ci-bravo@example.com',null,'ES','es',true,true
 );
 if coalesce(v_join->>'pairCode','')='' then raise exception 'join_did_not_return_pair'; end if;

 select id into v_pair from pairs where public_code=v_reg->>'pairCode';
 if v_pair is null then raise exception 'pair_not_created'; end if;

 update pairs set state='READINESS_PENDING' where id=v_pair;
 update pairs set state='READY' where id=v_pair;

 select count(*) into v_count from conversation_sessions where pair_id=v_pair;
 if v_count<>7 then raise exception 'expected_7_sessions_got_%',v_count; end if;

 v_bundle:=create_credential_bundle(
  (select campaign_id from pairs where id=v_pair),
  'CI-SPAIN-0001','ci-user-a','ciphertext-a','ci-user-b','ciphertext-b',null,'CI bundle','CI'
 );
 if v_bundle is null then raise exception 'credential_bundle_not_created'; end if;

 v_assignment:=assign_next_credential_bundle(v_pair,'CI');
 v_assignment_repeat:=assign_next_credential_bundle(v_pair,'CI');
 if v_assignment is null or v_assignment_repeat<>v_assignment then raise exception 'credential_assignment_not_idempotent'; end if;

 perform release_credential_bundle(v_pair,'CI');
 select state into v_state from pairs where id=v_pair;
 if v_state<>'RECORDING' then raise exception 'release_did_not_start_recording'; end if;

 update pairs set state='SUBMITTED',submitted_at=now() where id=v_pair;
 update pairs set state='INTERNAL_QA' where id=v_pair;
 update pairs set state='CLIENT_QA' where id=v_pair;

 perform approve_pair_and_create_earnings(v_pair,'ci-approve-1','CI');
 perform approve_pair_and_create_earnings(v_pair,'ci-approve-1','CI');

 select count(*),coalesce(sum(amount_cents),0) into v_count,v_total
 from ledger_entries where pair_id=v_pair and entry_type='CAMPAIGN_EARNING';
 if v_count<>2 or v_total<>5000 then raise exception 'approval_not_idempotent_count_%_total_%',v_count,v_total; end if;

 begin
  update ledger_entries set amount_cents=amount_cents+1 where pair_id=v_pair;
  raise exception 'ledger_update_was_allowed';
 exception when others then
  if sqlerrm='ledger_update_was_allowed' then raise; end if;
 end;

 begin
  update pairs set state='RECORDING' where id=v_pair;
  raise exception 'invalid_pair_transition_was_allowed';
 exception when others then
  if sqlerrm='invalid_pair_transition_was_allowed' then raise; end if;
 end;

 if (select count(*) from audit_events where resource_id=v_pair)<2 then
  raise exception 'expected_audit_evidence';
 end if;
end $$;

select 'core invariants passed' as result;
