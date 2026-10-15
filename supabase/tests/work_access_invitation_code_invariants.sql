\set ON_ERROR_STOP on
begin;
do $$
begin
 if position('invitation_code_not_configured' in pg_get_functiondef('public.prepare_pair_work_access(uuid,text)'::regprocedure))=0
    or position('pair_specific_invitation_code_unsupported' in pg_get_functiondef('public.prepare_pair_work_access(uuid,text)'::regprocedure))=0 then
  raise exception 'work_access_invitation_code_guard_missing';
 end if;
 if has_function_privilege('anon','public.prepare_pair_work_access(uuid,text)','EXECUTE')
    or has_function_privilege('authenticated','public.prepare_pair_work_access(uuid,text)','EXECUTE') then
  raise exception 'work_access_rpc_exposed_to_clients';
 end if;
 if not has_function_privilege('service_role','public.prepare_pair_work_access(uuid,text)','EXECUTE') then
  raise exception 'work_access_rpc_missing_service_role_grant';
 end if;
end $$;
rollback;
select 'work access invitation code invariants passed' result;
