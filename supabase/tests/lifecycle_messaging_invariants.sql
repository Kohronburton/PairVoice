\set ON_ERROR_STOP on
begin;
do $$
declare c uuid; v uuid; a uuid; b uuid; ea uuid; eb uuid; p uuid; ev uuid; claimed integer;
begin
 insert into campaigns(slug,name,active) values('message-test','Message Test',true) returning id into c;
 insert into campaign_versions(campaign_id,version,status,market_code,country_code,language_code,sessions_required,target_seconds_min,target_seconds_max,hard_seconds_min,hard_seconds_max,pair_compensation_cents,currency)
 values(c,1,'DRAFT','US','US','en',1,60,120,30,180,6000,'USD') returning id into v;
 insert into participants(first_name,email,country_code,primary_language_code) values('A','message-a@example.test','US','en') returning id into a;
 insert into participants(first_name,email,country_code,primary_language_code) values('B','message-b@example.test','US','en') returning id into b;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state) values(c,v,a,'QUALIFIED') returning id into ea;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state) values(c,v,b,'QUALIFIED') returning id into eb;
 insert into pairs(campaign_id,campaign_version_id,state) values(c,v,'PARTNER_PENDING') returning id into p;
 insert into pair_members(pair_id,enrollment_id,role,share_basis_points) values(p,ea,'A',5000),(p,eb,'B',5000);

 update pairs set state='PAIRED' where id=p;
 if (select count(*) from outbox_events where event_type='PAIR_LIFECYCLE_EMAIL' and payload->>'pair_id'=p::text)<>2 then raise exception 'pair_message_count_wrong'; end if;

 perform set_subsystem_control('MESSAGING',false,'test pause',null,'TEST');
 select count(*) into claimed from claim_message_outbox(20);
 if claimed<>0 then raise exception 'messaging_pause_did_not_stop_claims'; end if;

 perform set_subsystem_control('MESSAGING',true,'test resume',null,'TEST');
 select id into ev from claim_message_outbox(20) limit 1;
 if ev is null then raise exception 'message_not_claimed_after_resume'; end if;
 perform finish_message_outbox(ev,false,'simulated failure');
 if (select status from outbox_events where id=ev)<>'FAILED' then raise exception 'message_failure_not_recorded'; end if;

 update outbox_events set next_attempt_at=now()-interval '1 minute' where id=ev;
 if not exists(select 1 from claim_message_outbox(20) where id=ev) then raise exception 'failed_message_not_retryable'; end if;
 perform finish_message_outbox(ev,true,null);
 if (select status from outbox_events where id=ev)<>'DELIVERED' then raise exception 'message_delivery_not_recorded'; end if;
end $$;
rollback;
select 'lifecycle messaging invariants passed' result;
