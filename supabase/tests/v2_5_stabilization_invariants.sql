-- V2.5 stabilization invariants.
do $$
begin
 if not exists(
  select 1 from pg_indexes
  where schemaname='public' and indexname='participants_auth_user_unique'
 ) then raise exception 'missing participants auth unique index'; end if;

 if has_function_privilege('anon','public.guard_pair_transition()','EXECUTE')
    or has_function_privilege('authenticated','public.guard_pair_transition()','EXECUTE') then
  raise exception 'guard_pair_transition must not be public RPC surface';
 end if;

 if has_function_privilege('anon','public.enforce_pair_member_campaign_version()','EXECUTE')
    or has_function_privilege('authenticated','public.enforce_pair_member_campaign_version()','EXECUTE') then
  raise exception 'campaign version trigger must not be public RPC surface';
 end if;

 if coalesce((select proconfig::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace
              where n.nspname='public' and p.proname='guard_pair_transition' limit 1),'')
    not like '%search_path=public%' then
  raise exception 'guard_pair_transition search_path not pinned';
 end if;
end $$;
