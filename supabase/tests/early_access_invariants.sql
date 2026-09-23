\set ON_ERROR_STOP on

begin;
do $$
declare
  inviter jsonb;
  partner jsonb;
  invite text;
  link_count integer;
  email_events integer;
begin
  inviter := public.upsert_public_lead_v3(
    'sql-test-inviter@example.test','SQL Inviter','US','en',true,'en-US',array['en-US']::text[],
    'sql_test','sql_test',null,null,'https://example.test',null,null,null,null,null,null,null,null,null
  );
  invite := inviter->>'inviteCode';
  if invite is null or length(invite) <> 12 then raise exception 'invite_code_missing'; end if;

  partner := public.upsert_public_lead_v3(
    'sql-test-partner@example.test','SQL Partner','US','en',true,'en-US',array['en-US']::text[],
    'partner_invite','partner_invite',null,null,'https://example.test/invite/'||invite,null,invite,null,null,null,null,null,null,null
  );
  if coalesce((partner->>'partnerJoined')::boolean,false) is not true then raise exception 'partner_join_state_missing'; end if;

  select count(*) into link_count from public.leads child join public.leads parent on parent.id=child.referred_by_lead_id
    where child.email='sql-test-partner@example.test' and parent.email='sql-test-inviter@example.test';
  if link_count <> 1 then raise exception 'referral_link_missing'; end if;

  select count(*) into email_events from public.early_access_email_outbox
    where lead_id in(select id from public.leads where email like 'sql-test-%@example.test');
  if email_events <> 3 then raise exception 'expected_three_email_events_got_%',email_events; end if;
end $$;
rollback;

select 'early access invariants passed' as result;
