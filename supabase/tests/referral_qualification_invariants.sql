\set ON_ERROR_STOP on
begin;
do $$
declare
 c uuid; v uuid; referrer uuid; referred uuid; partner uuid; er uuid; ep uuid; pair_id uuid; program uuid;
begin
 insert into campaigns(slug,name,active) values('referral-test','Referral Test',true) returning id into c;
 insert into campaign_versions(campaign_id,version,status,market_code,country_code,language_code,sessions_required,target_seconds_min,target_seconds_max,hard_seconds_min,hard_seconds_max,pair_compensation_cents,referral_commission_cents,currency)
 values(c,1,'DRAFT','US','US','en',1,60,120,30,180,6000,250,'USD') returning id into v;

 insert into participants(first_name,email,country_code,primary_language_code) values('Referrer','referrer@example.test','US','en') returning id into referrer;
 insert into participants(first_name,email,country_code,primary_language_code) values('Referred','referred@example.test','US','en') returning id into referred;
 insert into participants(first_name,email,country_code,primary_language_code) values('Partner','ref-partner@example.test','US','en') returning id into partner;
 insert into referral_relationships(referrer_participant_id,referred_participant_id,code) values(referrer,referred,'REFCODE');

 insert into referral_programs(name,qualifying_approved_jobs,milestone_referrals,milestone_bonus_cents,currency,active)
 values('Test Milestone',1,1,1000,'USD',true) returning id into program;

 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state) values(c,v,referred,'QUALIFIED') returning id into er;
 insert into campaign_enrollments(campaign_id,campaign_version_id,participant_id,state) values(c,v,partner,'QUALIFIED') returning id into ep;
 insert into pairs(campaign_id,campaign_version_id,state) values(c,v,'CLIENT_QA') returning id into pair_id;
 insert into pair_members(pair_id,enrollment_id,role,share_basis_points) values(pair_id,er,'A',5000),(pair_id,ep,'B',5000);

 perform approve_pair_and_create_earnings(pair_id,'approve:referral-test','TEST');

 if (select count(*) from referral_commissions where pair_id=pair_id)<>1 then raise exception 'referral_commission_not_created'; end if;
 if (select count(*) from ledger_entries where participant_id=referrer and entry_type='REFERRAL_EARNING')<>2 then raise exception 'referral_ledger_count_wrong'; end if;
 if (select sum(amount_cents) from ledger_entries where participant_id=referrer and entry_type='REFERRAL_EARNING')<>1250 then raise exception 'referral_amount_wrong'; end if;
 if not exists(select 1 from referral_milestone_awards where program_id=program and participant_id=referrer and ledger_entry_id is not null) then raise exception 'milestone_award_missing'; end if;
 if not exists(select 1 from business_funnel_events where pair_id=pair_id and participant_id=referrer and event_name='referral_pair_completed') then raise exception 'referral_telemetry_missing'; end if;

 perform process_referrals_for_approved_pair(pair_id);
 if (select count(*) from referral_commissions where pair_id=pair_id)<>1 then raise exception 'referral_commission_not_idempotent'; end if;
 if (select count(*) from ledger_entries where participant_id=referrer and entry_type='REFERRAL_EARNING')<>2 then raise exception 'referral_ledger_not_idempotent'; end if;
end $$;
rollback;
select 'referral qualification invariants passed' result;
