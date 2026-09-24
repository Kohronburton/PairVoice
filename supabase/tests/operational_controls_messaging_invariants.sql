\set ON_ERROR_STOP on
begin;
do $$
declare
 c uuid; v uuid; a uuid; b uuid; ea uuid; eb uuid; p uuid; claimed integer; evt uuid;
begin
 insert into campaigns(slug,name,active) values('ops-controls-test','Ops Controls Test',true) returning id into c;
 insert into campaign_versions(campaign_id,version,status,market_code,country_code,language_code,sessions_required,target_seconds_min,target_seconds_max,hard_seconds_min,hard_seconds_max,pair_compensation_cents,currency)
 values(c,1,'DRAFT','US','US','en',1,60,120,30,180,6000,'USD') returning id into v;
 insert into participants(first_name,email,country_code,primary_language_code) values('A','ops-a@example.test','US','en') returning id into a;
 insert into participants(first_name,email,country_code,primary_language_code) values('B','ops-b@example.test','US','en') returning id into b;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state) values(c,v,a,'QUALIFIED') returning id into ea;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state) values(c,v,b,'QUALIFIED') returning id into eb;
 insert into pairs(campaign_id,campaign_version_id,state) values(c,v,'PARTNER_PENDING') returning id into p;
 insert into pair_members(pair_id,enrollment_id,role,share_basis_points) values(p,ea,'A',5000),(p,eb,'B',5000);

 update pairs set state='PAIRED' where id=p;
 if (select count(*) from outbox_events where event_type='PAIR_LIFECYCLE_EMAIL' and payload->>'pair_id'=p::text and payload->>'template_key'='PAIR_FORMED')<>2
  then raise exception 'pair_formed_messages_wrong'; end if;

 update pairs set state='READINESS_PENDING' where id=p;
 update pairs set state='READY' where id=p;
 if (select count(*) from outbox_events where event_type='PAIR_LIFECYCLE_EMAIL' and payload->>'pair_id'=p::text and payload->>'template_key'='WORK_READY')<>2
  then raise exception 'work_ready_messages_wrong'; end if;

 perform claim_message_outbox(100);
 select count(*) into claimed from outbox_events
  where status='PROCESSING' and event_type='PAIR_LIFECYCLE_EMAIL' and payload->>'pair_id'=p::text;
 if claimed<>4 then raise exception 'pair_message_claim_count_wrong:%',claimed; end if;
 select id into evt from outbox_events
  where status='PROCESSING' and event_type='PAIR_LIFECYCLE_EMAIL' and payload->>'pair_id'=p::text
  order by created_at,id limit 1;
 perform finish_message_outbox(evt,false,'temporary failure');
 if (select status from outbox_events where id=evt)<>'FAILED' then raise exception 'failed_message_not_retryable'; end if;

 perform set_subsystem_control('MESSAGING',false,'test pause',null,'TEST');
 if subsystem_is_enabled('MESSAGING') then raise exception 'messaging_switch_not_disabled'; end if;
 select count(*) into claimed from claim_message_outbox(20);
 if claimed<>0 then raise exception 'paused_messaging_claimed_events'; end if;

 perform set_subsystem_control('MESSAGING',true,'test resume',null,'TEST');
 if not subsystem_is_enabled('MESSAGING') then raise exception 'messaging_switch_not_enabled'; end if;

 if not subsystem_is_enabled('MATCHING') or not subsystem_is_enabled('WORK') or not subsystem_is_enabled('PAYOUT') or not subsystem_is_enabled('REFERRAL')
  then raise exception 'default_subsystem_control_disabled'; end if;
end $$;
rollback;
select 'operational controls and messaging invariants passed' result;
