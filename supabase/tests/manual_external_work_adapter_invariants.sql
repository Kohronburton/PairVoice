\set ON_ERROR_STOP on
begin;
do $$
declare
 c uuid; v uuid; a uuid; b uuid; ea uuid; eb uuid; p uuid;
 provider uuid; run1 uuid; run2 uuid; access1 jsonb; access2 jsonb; r jsonb;
begin
 insert into campaigns(slug,name,active,provider) values('manual-work-test','Manual Work Test',true,'FUNCROWD') returning id into c;
 insert into campaign_versions(campaign_id,version,status,market_code,country_code,language_code,sessions_required,target_seconds_min,target_seconds_max,hard_seconds_min,hard_seconds_max,pair_compensation_cents,currency)
 values(c,1,'DRAFT','US','US','en',1,60,120,30,180,6000,'USD') returning id into v;
 insert into participants(first_name,email,country_code,primary_language_code) values('A','manual-a@example.test','US','en') returning id into a;
 insert into participants(first_name,email,country_code,primary_language_code) values('B','manual-b@example.test','US','en') returning id into b;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state) values(c,v,a,'QUALIFIED') returning id into ea;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state) values(c,v,b,'QUALIFIED') returning id into eb;
 insert into pairs(campaign_id,campaign_version_id,state) values(c,v,'READINESS_PENDING') returning id into p;
 insert into pair_members(pair_id,enrollment_id,role,share_basis_points) values(p,ea,'A',5000),(p,eb,'B',5000);
 insert into pair_readiness_gates(pair_id,gate_key,status,evidence,checked_at) values
  (p,'PARTNER_ACCEPTED','PASSED','{}'::jsonb,now()),(p,'ELIGIBILITY_A','PASSED','{}'::jsonb,now()),(p,'ELIGIBILITY_B','PASSED','{}'::jsonb,now()),
  (p,'SAMPLE_A','PASSED','{}'::jsonb,now()),(p,'SAMPLE_B','PASSED','{}'::jsonb,now()),(p,'CONSENT_A','PASSED','{}'::jsonb,now()),
  (p,'CONSENT_B','PASSED','{}'::jsonb,now()),(p,'PARTICIPATION_HISTORY','PASSED','{}'::jsonb,now()),(p,'CAPACITY','PASSED','{}'::jsonb,now()),(p,'CREDENTIAL','PASSED','{}'::jsonb,now());
 update pairs set state='READY' where id=p;

 select id into provider from provider_integrations where provider_key='funcrowd';
 if provider is null then raise exception 'funcrowd_provider_missing'; end if;

 insert into campaign_provider_bindings(campaign_id,campaign_version_id,provider_id,purpose,active,settings)
 values(c,v,provider,'WORK',true,'{"adapter":"manual_external"}');
 insert into campaign_access(campaign_id,provider,invitation_code,launch_url,reveal_state)
 values(c,'FUNCROWD','CODE-123','https://example.test/work','READY');

 access1:=prepare_pair_work_access(p,'work:prepare:manual-test');
 access2:=prepare_pair_work_access(p,'work:prepare:manual-test');

 run1:=(access1->>'runId')::uuid;
 run2:=(access2->>'runId')::uuid;
 if run1<>run2 then raise exception 'manual_access_not_idempotent'; end if;
 if (select count(*) from work_provider_runs where pair_id=p)<>1 then raise exception 'duplicate_manual_work_run'; end if;
 if access1->>'providerName'<>'FunCrowd' then raise exception 'provider_name_wrong'; end if;
 if access1->>'launchUrl'<>'https://example.test/work' then raise exception 'launch_url_wrong'; end if;
 if access1->>'invitationCode'<>'CODE-123' then raise exception 'invite_code_wrong'; end if;

 r:=transition_work_provider_run(run1,'IN_PROGRESS',null,'{"source":"manual-test"}',null,'manual:start');
 if (select state from pairs where id=p)<>'RECORDING' then raise exception 'manual_work_not_recording'; end if;
 if not exists(select 1 from business_funnel_events where pair_id=p and event_name='gig_started') then raise exception 'manual_gig_started_missing'; end if;

 r:=transition_work_provider_run(run1,'SUBMITTED','external-ref-1','{"submitted":true}',null,'manual:submit');
 if (select state from pairs where id=p)<>'SUBMITTED' then raise exception 'manual_work_not_submitted'; end if;
 if not exists(select 1 from business_funnel_events where pair_id=p and event_name='submission_completed') then raise exception 'manual_submission_event_missing'; end if;
end $$;
rollback;
select 'manual external work adapter invariants passed' result;
