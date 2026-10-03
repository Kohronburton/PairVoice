\set ON_ERROR_STOP on
begin;
do $$
declare c uuid; v uuid; ea uuid; eb uuid; ec uuid; ed uuid; a uuid; b uuid; d uuid; e uuid; p1 uuid; p2 uuid; provider uuid; cred uuid; x uuid; y uuid;
begin
 insert into campaigns(slug,name,active) values('credential-test','Credential Test',true) returning id into c;
 insert into campaign_versions(campaign_id,version,status,market_code,country_code,language_code,sessions_required,target_seconds_min,target_seconds_max,hard_seconds_min,hard_seconds_max,pair_compensation_cents)
 values(c,1,'DRAFT','US','US','en',1,60,120,30,180,6000) returning id into v;
 insert into participants(first_name,email,country_code,primary_language_code) values
 ('A','cred-a@example.test','US','en') returning id into a;
 insert into participants(first_name,email,country_code,primary_language_code) values
 ('B','cred-b@example.test','US','en') returning id into b;
 insert into participants(first_name,email,country_code,primary_language_code) values
 ('D','cred-d@example.test','US','en') returning id into d;
 insert into participants(first_name,email,country_code,primary_language_code) values
 ('E','cred-e@example.test','US','en') returning id into e;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state) values(c,v,a,'QUALIFIED') returning id into ea;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state) values(c,v,b,'QUALIFIED') returning id into eb;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state) values(c,v,d,'QUALIFIED') returning id into ec;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state) values(c,v,e,'QUALIFIED') returning id into ed;
 insert into pairs(campaign_id,campaign_version_id,state) values(c,v,'READINESS_PENDING') returning id into p1;
 insert into pair_members(pair_id,enrollment_id,role) values(p1,ea,'A'),(p1,eb,'B');
 insert into pairs(campaign_id,campaign_version_id,state) values(c,v,'READINESS_PENDING') returning id into p2;
 insert into pair_members(pair_id,enrollment_id,role) values(p2,ec,'A'),(p2,ed,'B');

 insert into provider_integrations(provider_key,provider_type,display_name,mode) values('niva-test','CREDENTIAL','Niva Test','MANUAL') returning id into provider;
 insert into provider_credentials(provider_id,campaign_id,external_key,secret_ciphertext) values(provider,c,'login-1','encrypted-test-only') returning id into cred;

 x:=reserve_provider_credential(p1,'niva-test','reserve:p1');
 y:=reserve_provider_credential(p1,'niva-test','reserve:p1');
 if x<>y then raise exception 'idempotency_failed'; end if;
 if (select count(*) from provider_credential_assignments where pair_id=p1)<>1 then raise exception 'duplicate_pair_assignment'; end if;
 if (select reserved_pair_id from provider_credentials where id=cred)<>p1 then raise exception 'credential_not_bound_to_pair'; end if;
 if not exists(select 1 from pair_readiness_gates where pair_id=p1 and gate_key='CREDENTIAL' and status='PASSED') then raise exception 'credential_gate_not_passed'; end if;

 begin
   perform reserve_provider_credential(p2,'niva-test','reserve:p2');
   raise exception 'exhausted_inventory_was_reused';
 exception when others then
   if sqlerrm='exhausted_inventory_was_reused' then raise; end if;
   if sqlerrm<>'credential_inventory_exhausted' then raise; end if;
 end;
 if exists(select 1 from provider_credential_assignments where pair_id=p2) then raise exception 'failed_reservation_left_assignment'; end if;
end $$;
rollback;
select 'provider credential invariants passed' result;
