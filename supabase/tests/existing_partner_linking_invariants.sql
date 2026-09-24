\set ON_ERROR_STOP on
begin;
do $$
declare c uuid; v uuid; a uuid; b uuid; ea uuid; eb uuid; pa uuid; pb uuid; req uuid; result jsonb;
begin
 insert into campaigns(slug,name,active) values('existing-link-test','Existing Link Test',true) returning id into c;
 insert into campaign_versions(campaign_id,version,status,market_code,country_code,language_code,sessions_required,target_seconds_min,target_seconds_max,hard_seconds_min,hard_seconds_max,pair_compensation_cents,currency)
 values(c,1,'PUBLISHED','US','US','en',1,60,120,30,180,6000,'USD') returning id into v;
 insert into participants(first_name,email,country_code,primary_language_code) values('A','existing-a@example.test','US','en') returning id into a;
 insert into participants(first_name,email,country_code,primary_language_code) values('B','existing-b@example.test','US','en') returning id into b;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state) values(c,v,a,'QUALIFIED') returning id into ea;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state) values(c,v,b,'QUALIFIED') returning id into eb;
 insert into pairs(campaign_id,campaign_version_id,state) values(c,v,'PARTNER_PENDING') returning id into pa;
 insert into pair_members(pair_id,enrollment_id,role) values(pa,ea,'A');
 insert into pairs(campaign_id,campaign_version_id,state) values(c,v,'PARTNER_PENDING') returning id into pb;
 insert into pair_members(pair_id,enrollment_id,role) values(pb,eb,'A');

 req:=request_existing_partner(a,(select public_code from participants where id=b),'existing-link-test');
 if req<>request_existing_partner(a,(select public_code from participants where id=b),'existing-link-test') then raise exception 'request_not_idempotent'; end if;

 result:=respond_existing_partner_request(req,b,true);
 if result->>'status'<>'ACCEPTED' then raise exception 'request_not_accepted'; end if;
 if (result->>'pairId')::uuid<>pa then raise exception 'wrong_canonical_pair'; end if;
 if (select state from pairs where id=pa)<>'PAIRED' then raise exception 'canonical_pair_not_paired'; end if;
 if (select state from pairs where id=pb)<>'CANCELLED' then raise exception 'superseded_pair_not_preserved_cancelled'; end if;
 if (select count(*) from pair_members where pair_id=pa and active=true)<>2 then raise exception 'canonical_pair_member_count_wrong'; end if;
 if exists(select 1 from pair_members where pair_id=pb and active=true) then raise exception 'superseded_pair_membership_still_active'; end if;
 if not exists(select 1 from campaign_enrollments where id=eb and participant_id=b and state='QUALIFIED') then raise exception 'target_enrollment_history_lost'; end if;
 if not exists(select 1 from business_funnel_events where pair_id=pa and event_name='partner_invite_accepted' and metadata->>'source'='existing_user') then raise exception 'existing_link_telemetry_missing'; end if;

 result:=respond_existing_partner_request(req,b,true);
 if result->>'status'<>'ACCEPTED' then raise exception 'repeat_accept_not_idempotent'; end if;

 begin
  perform request_existing_partner(a,(select public_code from participants where id=a),'existing-link-test');
  raise exception 'self_pair_allowed';
 exception when others then
  if sqlerrm='self_pair_allowed' then raise; end if;
 end;
end $$;
rollback;
select 'existing partner linking invariants passed' result;
