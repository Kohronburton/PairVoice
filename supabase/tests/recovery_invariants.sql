\set ON_ERROR_STOP on
begin;
do $$
declare p uuid; w uuid; r uuid;
begin
 insert into participants(first_name,email,country_code,primary_language_code)
 values('Recovery','recovery-test@example.test','US','en') returning id into p;

 insert into workflow_checkpoints(workflow_type,entity_type,entity_id,step_key,status,idempotency_key,input_snapshot)
 values('PAIRVOICE_TEST','PARTICIPANT',p,'provider_call','PENDING','recovery-test:checkpoint','{"test":true}')
 returning id into w;

 update workflow_checkpoints set status='RETRY',attempt_count=1,last_error='simulated_timeout' where id=w;
 update workflow_checkpoints set status='RUNNING',attempt_count=2,last_error=null where id=w;
 update workflow_checkpoints set status='SUCCEEDED',result_snapshot='{"ok":true}',completed_at=now() where id=w;
 if (select attempt_count from workflow_checkpoints where id=w)<>2 then raise exception 'checkpoint_retry_history_lost'; end if;

 insert into recovery_actions(entity_type,entity_id,action,reason,before_snapshot,status,idempotency_key)
 values('PARTICIPANT',p,'RESUME_WORKFLOW','simulated recovery','{"state":"before"}','PLANNED','recovery-test:action')
 returning id into r;
 update recovery_actions set status='APPLIED',after_snapshot='{"state":"after"}',applied_at=now() where id=r;
 update recovery_actions set status='VERIFIED',verified_at=now() where id=r;

 begin
   update recovery_actions set reason='rewrite history' where id=r;
   raise exception 'verified_recovery_was_mutable';
 exception when others then
   if sqlerrm='verified_recovery_was_mutable' then raise; end if;
 end;

 if not exists(select 1 from leads where false) then null; end if;
end $$;
rollback;
select 'recovery invariants passed' as result;
