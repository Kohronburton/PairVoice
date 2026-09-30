\set ON_ERROR_STOP on
begin;
do $$
declare c uuid; v uuid; a uuid; b uuid; ea uuid; eb uuid; p uuid; r1 jsonb; r2 jsonb;
begin
 insert into campaigns(slug,name,active) values('qa-test','QA Test',true) returning id into c;
 insert into campaign_versions(campaign_id,version,status,market_code,country_code,language_code,sessions_required,target_seconds_min,target_seconds_max,hard_seconds_min,hard_seconds_max,pair_compensation_cents,currency)
 values(c,1,'DRAFT','US','US','en',1,60,120,30,180,6000,'USD') returning id into v;
 insert into participants(first_name,email,country_code,primary_language_code) values('A','qa-a@example.test','US','en') returning id into a;
 insert into participants(first_name,email,country_code,primary_language_code) values('B','qa-b@example.test','US','en') returning id into b;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state) values(c,v,a,'QUALIFIED') returning id into ea;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state) values(c,v,b,'QUALIFIED') returning id into eb;
 insert into pairs(campaign_id,campaign_version_id,state,submitted_at) values(c,v,'SUBMITTED',now()) returning id into p;
 insert into pair_members(pair_id,enrollment_id,role,share_basis_points) values(p,ea,'A',5000),(p,eb,'B',5000);

 r1:=record_pair_review(p,'INTERNAL','REWORK_REQUIRED','audio issue',null,null,'TEST','review:internal:1');
 r2:=record_pair_review(p,'INTERNAL','REWORK_REQUIRED','audio issue',null,null,'TEST','review:internal:1');
 if r1<>r2 then raise exception 'review_idempotency_failed'; end if;
 if (select count(*) from reviews where pair_id=p)<>1 then raise exception 'duplicate_review_created'; end if;
 if (select state from pairs where id=p)<>'REWORK_REQUIRED' then raise exception 'rework_state_missing'; end if;

 update pairs set state='RECORDING' where id=p;
 update pairs set state='SUBMITTED' where id=p;
 r1:=record_pair_review(p,'INTERNAL','APPROVED','internal pass',null,null,'TEST','review:internal:2');
 if (select state from pairs where id=p)<>'CLIENT_QA' then raise exception 'client_qa_state_missing'; end if;

 r1:=record_pair_review(p,'CLIENT','APPROVED','client pass','client-123',null,'TEST','review:client:1');
 if (select state from pairs where id=p)<>'PAYABLE' then raise exception 'client_approval_did_not_create_earnings'; end if;
 if (select count(*) from ledger_entries where pair_id=p and entry_type='CAMPAIGN_EARNING')<>2 then raise exception 'earning_count_wrong'; end if;
 if not exists(select 1 from business_funnel_events where pair_id=p and event_name='submission_approved') then raise exception 'approval_telemetry_missing'; end if;
end $$;
rollback;
select 'qa rework invariants passed' result;
