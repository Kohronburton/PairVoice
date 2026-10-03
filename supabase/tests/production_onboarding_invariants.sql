\set ON_ERROR_STOP on

do $$
declare
  has_onboarding boolean;
  has_last_seen boolean;
begin
  select exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='participants' and column_name='onboarding_completed_at'
  ) into has_onboarding;
  select exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='participants' and column_name='last_seen_at'
  ) into has_last_seen;

  if not has_onboarding or not has_last_seen then
    raise exception 'production_participant_columns_missing';
  end if;

  if to_regprocedure('public.claim_participant_account()') is null
     or to_regprocedure('public.get_my_dashboard()') is null
     or to_regprocedure('public.mark_my_pair_ready(text)') is null then
    raise exception 'production_participant_rpc_missing';
  end if;

  if has_function_privilege('anon','public.claim_participant_account()','EXECUTE')
     or has_function_privilege('anon','public.get_my_dashboard()','EXECUTE')
     or has_function_privilege('anon','public.mark_my_pair_ready(text)','EXECUTE') then
    raise exception 'anon_participant_rpc_access_detected';
  end if;

  if not has_function_privilege('authenticated','public.claim_participant_account()','EXECUTE')
     or not has_function_privilege('authenticated','public.get_my_dashboard()','EXECUTE')
     or not has_function_privilege('authenticated','public.mark_my_pair_ready(text)','EXECUTE') then
    raise exception 'authenticated_participant_rpc_access_missing';
  end if;

  if has_function_privilege('anon','public.register_campaign_participant(text,text,text,text,text,text,boolean,boolean,text)','EXECUTE')
     or has_function_privilege('authenticated','public.register_campaign_participant(text,text,text,text,text,text,boolean,boolean,text)','EXECUTE')
     or has_function_privilege('anon','public.join_pair_invite(text,text,text,text,text,text,boolean,boolean)','EXECUTE')
     or has_function_privilege('authenticated','public.join_pair_invite(text,text,text,text,text,text,boolean,boolean)','EXECUTE') then
    raise exception 'direct_public_enrollment_rpc_access_detected';
  end if;

  if not has_function_privilege('service_role','public.register_campaign_participant(text,text,text,text,text,text,boolean,boolean,text)','EXECUTE')
     or not has_function_privilege('service_role','public.join_pair_invite(text,text,text,text,text,text,boolean,boolean)','EXECUTE') then
    raise exception 'service_role_enrollment_rpc_access_missing';
  end if;
end $$;

begin;
insert into public.funnel_events(event_name,session_id,page_path,language_code,metadata)
values
 ('onboarding_view','sql-production-funnel','/join','en','{}'::jsonb),
 ('dashboard_view','sql-production-funnel','/dashboard','en','{}'::jsonb),
 ('readiness_completed','sql-production-funnel','/dashboard','en','{}'::jsonb);
rollback;

select 'production onboarding invariants passed' as result;
