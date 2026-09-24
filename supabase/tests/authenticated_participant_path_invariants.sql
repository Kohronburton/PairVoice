\set ON_ERROR_STOP on
begin;
do $$
begin
 if has_function_privilege('anon','public.claim_pairvoice_identity_self()','EXECUTE')
  then raise exception 'anon_can_claim_identity_self'; end if;
 if not has_function_privilege('authenticated','public.claim_pairvoice_identity_self()','EXECUTE')
  then raise exception 'authenticated_cannot_claim_identity_self'; end if;

 if not exists(select 1 from pg_policies where schemaname='public' and tablename='pair_members' and policyname='pair_member_read_self')
  then raise exception 'pair_member_self_policy_missing'; end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='partner_pool' and policyname='partner_pool_read_self')
  then raise exception 'partner_pool_self_policy_missing'; end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='referral_relationships' and policyname='referral_relationship_read_self')
  then raise exception 'referral_relationship_self_policy_missing'; end if;
end $$;
rollback;
select 'authenticated participant path invariants passed' result;
