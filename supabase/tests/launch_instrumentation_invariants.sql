\set ON_ERROR_STOP on
begin;
do $$
declare
 c uuid; v uuid; a uuid; b uuid; ea uuid; eb uuid; p uuid;
 wp uuid; run_id uuid; r jsonb; payout_id uuid;
begin
 insert into campaigns(slug,name,active) values('launch-telemetry-test','Launch Telemetry Test',true) returning id into c;
 insert into campaign_versions(campaign_id,version,status,market_code,country_code,language_code,sessions_required,target_seconds_min,target_seconds_max,hard_seconds_min,hard_seconds_max,pair_compensation_cents,currency)
 values(c,1,'DRAFT','US','US','en',1,60,120,30,180,6000,'USD') returning id into v;
 insert into participants(first_name,email,country_code,primary_language_code) values('A','telemetry-a@example.test','US','en') returning id into a;
 insert into participants(first_name,email,country_code,primary_language_code) values('B','telemetry-b@example.test','US','en') returning id into b;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state) values(c,v,a,'QUALIFIED') returning id into ea;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state) values(c,v,b,'QUALIFIED') returning id into eb;
 insert into pairs(campaign_id,campaign_version_id,state) values(c,v,'PARTNER_PENDING') returning id into p;
 insert into pair_members(pair_id,enrollment_id,role,share_basis_points) values(p,ea,'A',5000),(p,eb,'B',5000);

 perform record_business_funnel_event('partner_invite_accepted',c,p,b,'pair:'||p||':invite-accepted','{"source":"invite"}');
 perform record_business_funnel_event('partner_invite_accepted',c,p,b,'pair:'||p||':invite-accepted','{"source":"invite"}');
 if (select count(*) from business_funnel_events where idempotency_key='pair:'||p||':invite-accepted')<>1 then raise exception 'invite_event_not_idempotent'; end if;

 update pairs set state='PAIRED',paired_at=now() where id=p;
 update pairs set state='READINESS_PENDING' where id=p;
 update pairs set state='READY' where id=p;
 if not exists(select 1 from business_funnel_events where pair_id=p and event_name='pair_created') then raise exception 'pair_created_missing'; end if;
 if not exists(select 1 from business_funnel_events where pair_id=p and event_name='pair_qualified') then raise exception 'pair_qualified_missing'; end if;

 insert into provider_integrations(provider_key,provider_type,display_name,mode) values('work-telemetry-test','WORK','Work Telemetry Test','MANUAL') returning id into wp;
 run_id:=create_work_provider_run(p,'work-telemetry-test','work:create:telemetry');
 r:=transition_work_provider_run(run_id,'IN_PROGRESS',null,'{}',null,'work:transition:start');
 r:=transition_work_provider_run(run_id,'IN_PROGRESS',null,'{}',null,'work:transition:start');
 if (select state from pairs where id=p)<>'RECORDING' then raise exception 'pair_not_recording'; end if;
 if not exists(select 1 from business_funnel_events where pair_id=p and event_name='gig_started') then raise exception 'gig_started_missing'; end if;

 r:=transition_work_provider_run(run_id,'SUBMITTED','external-1','{"submitted":true}',null,'work:transition:submit');
 if (select state from pairs where id=p)<>'SUBMITTED' then raise exception 'pair_not_submitted'; end if;
 if not exists(select 1 from business_funnel_events where pair_id=p and event_name='submission_completed') then raise exception 'submission_event_missing'; end if;

 update pairs set state='INTERNAL_QA' where id=p;
 update pairs set state='CLIENT_QA' where id=p;
 r:=approve_pair_and_create_earnings(p,'approve:telemetry','TEST');
 if (select state from pairs where id=p)<>'PAYABLE' then raise exception 'pair_not_payable'; end if;
 if not exists(select 1 from business_funnel_events where pair_id=p and event_name='submission_approved') then raise exception 'approval_event_missing'; end if;
 if not exists(select 1 from business_funnel_events where pair_id=p and event_name='earning_available') then raise exception 'earning_event_missing'; end if;

 insert into payouts(participant_id,amount_cents,currency,idempotency_key) values(a,3000,'USD','payout:telemetry') returning id into payout_id;
 if not exists(select 1 from business_funnel_events where participant_id=a and event_name='payout_requested') then raise exception 'payout_request_event_missing'; end if;
 update payouts set state='PROCESSING' where id=payout_id;
 update payouts set state='PAID' where id=payout_id;
 if not exists(select 1 from business_funnel_events where participant_id=a and event_name='payout_completed') then raise exception 'payout_complete_event_missing'; end if;
end $$;
rollback;
select 'launch instrumentation invariants passed' result;
