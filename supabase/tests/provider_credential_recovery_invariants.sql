\set ON_ERROR_STOP on
begin;
do $$
declare
 c uuid; v uuid; a uuid; b uuid; ea uuid; eb uuid; p uuid;
 credential_provider uuid; work_provider uuid;
 cred1 uuid; cred2 uuid; first_assignment uuid; replacement uuid; replacement_retry uuid;
 work_run uuid; work_run_retry uuid;
begin
 insert into campaigns(slug,name,active) values('credential-recovery-test','Credential Recovery Test',true) returning id into c;
 insert into campaign_versions(campaign_id,version,status,market_code,country_code,language_code,sessions_required,target_seconds_min,target_seconds_max,hard_seconds_min,hard_seconds_max,pair_compensation_cents)
 values(c,1,'DRAFT','US','US','en',1,60,120,30,180,6000) returning id into v;
 insert into participants(first_name,email,country_code,primary_language_code) values('A','recovery-a@example.test','US','en') returning id into a;
 insert into participants(first_name,email,country_code,primary_language_code) values('B','recovery-b@example.test','US','en') returning id into b;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state) values(c,v,a,'QUALIFIED') returning id into ea;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state) values(c,v,b,'QUALIFIED') returning id into eb;
 insert into pairs(campaign_id,campaign_version_id,state) values(c,v,'READINESS_PENDING') returning id into p;
 insert into pair_members(pair_id,enrollment_id,role) values(p,ea,'A'),(p,eb,'B');

 insert into provider_integrations(provider_key,provider_type,display_name,mode)
 values('credential-recovery-test','CREDENTIAL','Credential Recovery Test','MANUAL') returning id into credential_provider;
 insert into provider_integrations(provider_key,provider_type,display_name,mode)
 values('work-recovery-test','WORK','Work Recovery Test','MANUAL') returning id into work_provider;

 insert into provider_credentials(provider_id,campaign_id,external_key,secret_ciphertext)
 values(credential_provider,c,'credential-1','encrypted-test-only') returning id into cred1;
 insert into provider_credentials(provider_id,campaign_id,external_key,secret_ciphertext)
 values(credential_provider,c,'credential-2','encrypted-test-only') returning id into cred2;

 first_assignment:=reserve_provider_credential(p,'credential-recovery-test','reserve:recovery-pair');
 replacement:=replace_provider_credential(p,'credential-recovery-test','credential exposed','replace:recovery-pair');
 replacement_retry:=replace_provider_credential(p,'credential-recovery-test','credential exposed','replace:recovery-pair');

 if replacement<>replacement_retry then raise exception 'credential_replacement_not_idempotent'; end if;
 if replacement=first_assignment then raise exception 'credential_replacement_did_not_create_new_assignment'; end if;
 if (select status from provider_credential_assignments where id=first_assignment)<>'REPLACED' then raise exception 'old_assignment_history_not_preserved'; end if;
 if (select status from provider_credentials where id=cred1)<>'REVOKED' then raise exception 'old_credential_not_revoked'; end if;
 if (select count(*) from provider_credential_assignments where pair_id=p)<>2 then raise exception 'replacement_history_count_wrong'; end if;
 if (select count(*) from recovery_actions where entity_type='PAIR' and entity_id=p and action='REPLACE_CREDENTIAL')<>1 then raise exception 'replacement_recovery_not_idempotent'; end if;

 update pairs set state='READY' where id=p;
 work_run:=create_work_provider_run(p,'work-recovery-test','work:recovery-pair');
 work_run_retry:=create_work_provider_run(p,'work-recovery-test','work:recovery-pair');
 if work_run<>work_run_retry then raise exception 'work_run_not_idempotent'; end if;
 if (select count(*) from work_provider_runs where pair_id=p)<>1 then raise exception 'duplicate_work_run_created'; end if;
end $$;
rollback;
select 'provider credential recovery invariants passed' result;
