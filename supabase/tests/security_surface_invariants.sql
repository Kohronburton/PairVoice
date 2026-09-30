\set ON_ERROR_STOP on
begin;
do $$
declare bad_tables text[];
begin
 select array_agg(c.relname order by c.relname) into bad_tables
 from pg_class c
 join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public'
   and c.relkind='r'
   and c.relname=any(array[
    'campaigns','campaign_versions','topics','referral_relationships',
    'referral_commissions','message_events','idempotency_records','outbox_events'
   ])
   and not c.relrowsecurity;
 if bad_tables is not null then raise exception 'rls_missing:%',bad_tables; end if;

 if has_function_privilege('anon','public.join_pair_invite(text,text,text,text,text,text,boolean,boolean)','EXECUTE')
   then raise exception 'anon_can_execute_join_pair_invite'; end if;
 if has_function_privilege('authenticated','public.join_pair_invite(text,text,text,text,text,text,boolean,boolean)','EXECUTE')
   then raise exception 'authenticated_can_execute_join_pair_invite_directly'; end if;
 if not has_function_privilege('service_role','public.join_pair_invite(text,text,text,text,text,text,boolean,boolean)','EXECUTE')
   then raise exception 'service_role_cannot_execute_join_pair_invite'; end if;

 if has_function_privilege('anon','public.register_campaign_participant(text,text,text,text,text,text,boolean,boolean,text,boolean)','EXECUTE')
   then raise exception 'anon_can_execute_campaign_signup_rpc'; end if;
 if not has_function_privilege('service_role','public.register_campaign_participant(text,text,text,text,text,text,boolean,boolean,text,boolean)','EXECUTE')
   then raise exception 'service_role_cannot_execute_campaign_signup_rpc'; end if;

 if has_function_privilege('anon','public.capture_pair_business_funnel_event()','EXECUTE')
   or has_function_privilege('anon','public.capture_payout_business_funnel_event()','EXECUTE')
   or has_function_privilege('anon','public.enqueue_pair_lifecycle_messages()','EXECUTE')
   or has_function_privilege('anon','public.enqueue_payout_lifecycle_message()','EXECUTE')
   or has_function_privilege('anon','public.referral_pair_approved_trigger()','EXECUTE')
 then raise exception 'anon_can_execute_trigger_function'; end if;
end $$;
rollback;
select 'security surface invariants passed' result;
