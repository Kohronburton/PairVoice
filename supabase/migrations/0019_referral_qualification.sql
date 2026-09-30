-- Referral qualification and configurable cash awards.
-- No cash is created unless the campaign/program explicitly configures a non-zero reward.

create or replace function evaluate_referral_milestones(p_referrer_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_program referral_programs%rowtype; v_count integer; v_award uuid; v_ledger uuid;
begin
 for v_program in select * from referral_programs where active=true order by created_at,id
 loop
  select count(*) into v_count
  from referral_relationships rr
  where rr.referrer_participant_id=p_referrer_id
    and (
      select count(distinct pm.pair_id)
      from campaign_enrollments e
      join pair_members pm on pm.enrollment_id=e.id and pm.active=true
      join pairs p on p.id=pm.pair_id
      where e.participant_id=rr.referred_participant_id
        and p.state in('APPROVED','PAYABLE','PAID')
    ) >= v_program.qualifying_approved_jobs;

  if v_count>=v_program.milestone_referrals then
   insert into referral_milestone_awards(program_id,participant_id,qualified_referral_count)
   values(v_program.id,p_referrer_id,v_count)
   on conflict(program_id,participant_id) do update
    set qualified_referral_count=greatest(referral_milestone_awards.qualified_referral_count,excluded.qualified_referral_count)
   returning id into v_award;

   if v_program.milestone_bonus_cents>0 then
    insert into ledger_entries(participant_id,entry_type,amount_cents,currency,idempotency_key,metadata)
    values(p_referrer_id,'REFERRAL_EARNING',v_program.milestone_bonus_cents,v_program.currency,
      'referral-milestone:'||v_program.id||':'||p_referrer_id,
      jsonb_build_object('program_id',v_program.id,'qualified_referrals',v_count))
    on conflict(idempotency_key) do nothing
    returning id into v_ledger;

    if v_ledger is null then
      select id into v_ledger from ledger_entries
       where idempotency_key='referral-milestone:'||v_program.id||':'||p_referrer_id;
    end if;
    update referral_milestone_awards set ledger_entry_id=v_ledger where id=v_award and ledger_entry_id is null;
   end if;
  end if;
 end loop;
end $$;
revoke all on function evaluate_referral_milestones(uuid) from public,anon,authenticated;
grant execute on function evaluate_referral_milestones(uuid) to service_role;

create or replace function process_referrals_for_approved_pair(p_pair_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_pair pairs%rowtype; v_version campaign_versions%rowtype; v_member record; v_rel referral_relationships%rowtype; v_commission uuid;
begin
 select * into v_pair from pairs where id=p_pair_id;
 if not found then raise exception 'pair_not_found'; end if;
 if v_pair.state not in('APPROVED','PAYABLE','PAID') then return; end if;
 select * into v_version from campaign_versions where id=v_pair.campaign_version_id;

 for v_member in
  select e.participant_id
  from pair_members pm join campaign_enrollments e on e.id=pm.enrollment_id
  where pm.pair_id=p_pair_id and pm.active=true
 loop
  select * into v_rel from referral_relationships where referred_participant_id=v_member.participant_id;
  if found then
   if v_version.referral_commission_cents>0 then
    insert into referral_commissions(referral_id,pair_id,amount_cents,currency,status)
    values(v_rel.id,p_pair_id,v_version.referral_commission_cents,v_version.currency,'AVAILABLE')
    on conflict(referral_id,pair_id) do update
      set status=case when referral_commissions.status='VOID' then referral_commissions.status else 'AVAILABLE' end
    returning id into v_commission;

    insert into ledger_entries(participant_id,pair_id,referral_commission_id,entry_type,amount_cents,currency,idempotency_key,metadata)
    values(v_rel.referrer_participant_id,p_pair_id,v_commission,'REFERRAL_EARNING',v_version.referral_commission_cents,v_version.currency,
      'referral-commission:'||v_rel.id||':'||p_pair_id,
      jsonb_build_object('referred_participant_id',v_member.participant_id))
    on conflict(idempotency_key) do nothing;
   end if;

   perform record_business_funnel_event(
    'referral_pair_completed',v_pair.campaign_id,p_pair_id,v_rel.referrer_participant_id,
    'referral-pair:'||v_rel.id||':'||p_pair_id,
    jsonb_build_object('cash_commission_configured',v_version.referral_commission_cents>0)
   );
   perform evaluate_referral_milestones(v_rel.referrer_participant_id);
  end if;
 end loop;
end $$;
revoke all on function process_referrals_for_approved_pair(uuid) from public,anon,authenticated;
grant execute on function process_referrals_for_approved_pair(uuid) to service_role;

create or replace function referral_pair_approved_trigger()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.state<>new.state and new.state='APPROVED' then
  perform process_referrals_for_approved_pair(new.id);
 end if;
 return new;
end $$;
create trigger pair_referral_after_approval
 after update of state on pairs
 for each row execute function referral_pair_approved_trigger();
