\set ON_ERROR_STOP on
begin;
do $$
declare c uuid; v uuid; a uuid; b uuid; ea uuid; eb uuid; p uuid; prompt uuid; result jsonb;
begin
 insert into campaigns(slug,name,active) values('phase2-test','Phase 2 Test',true) returning id into c;
 insert into campaign_versions(campaign_id,version,status,market_code,country_code,language_code,sessions_required,target_seconds_min,target_seconds_max,hard_seconds_min,hard_seconds_max,pair_compensation_cents)
 values(c,1,'DRAFT','US','US','en',1,60,120,30,180,6000) returning id into v;
 insert into participants(first_name,email,country_code,primary_language_code) values('A','phase2-a@example.test','US','en') returning id into a;
 insert into participants(first_name,email,country_code,primary_language_code) values('B','phase2-b@example.test','US','en') returning id into b;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state) values(c,v,a,'QUALIFIED') returning id into ea;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state) values(c,v,b,'QUALIFIED') returning id into eb;
 insert into pairs(campaign_id,campaign_version_id,state) values(c,v,'PAIRED') returning id into p;
 insert into pair_members(pair_id,enrollment_id,role) values(p,ea,'A'),(p,eb,'B');
 insert into voice_sample_prompts(campaign_version_id,language_code,version,prompt_text) values(v,'en',1,'PairVoice test prompt') returning id into prompt;
 insert into voice_samples(participant_id,campaign_id,campaign_version_id,prompt_id,version,status) values(a,c,v,prompt,1,'PASSED');
 insert into voice_samples(participant_id,campaign_id,campaign_version_id,prompt_id,version,status) values(a,c,v,prompt,2,'RETEST_REQUIRED');
 if (select count(*) from voice_samples where participant_id=a and prompt_id=prompt)<>2 then raise exception 'sample_version_history_lost'; end if;

 insert into pair_readiness_gates(pair_id,gate_key,status)
 select p,x,'PASSED' from unnest(array['PARTNER_ACCEPTED','ELIGIBILITY_A','ELIGIBILITY_B','SAMPLE_A','SAMPLE_B','CONSENT_A','CONSENT_B','PARTICIPATION_HISTORY','CAPACITY']) x;
 result:=evaluate_pair_readiness(p);
 if (result->>'ready')::boolean then raise exception 'pair_ready_without_credential'; end if;
 if (select state from pairs where id=p)<>'READINESS_PENDING' then raise exception 'pair_not_waiting_for_missing_gate'; end if;
 insert into pair_readiness_gates(pair_id,gate_key,status) values(p,'CREDENTIAL','PASSED');
 result:=evaluate_pair_readiness(p);
 if not (result->>'ready')::boolean then raise exception 'pair_failed_all_gates'; end if;
 if (select state from pairs where id=p)<>'READY' then raise exception 'pair_not_advanced_to_ready'; end if;
end $$;
rollback;
select 'phase2 readiness invariants passed' result;
