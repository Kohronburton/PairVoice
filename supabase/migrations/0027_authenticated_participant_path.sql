-- Authenticated participant self-service path.
-- Removes ordinary participant login/dashboard dependency on service-role credentials.

create or replace function public.claim_pairvoice_identity_self()
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(coalesce(auth.jwt()->>'email','')));
begin
  if v_uid is null or v_email='' then raise exception 'authenticated_identity_required'; end if;
  return public.claim_pairvoice_identity(v_uid,v_email);
end $$;

revoke all on function public.claim_pairvoice_identity_self() from public,anon;
grant execute on function public.claim_pairvoice_identity_self() to authenticated;

alter table public.pair_members enable row level security;
alter table public.partner_pool enable row level security;
alter table public.referral_relationships enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_versions enable row level security;

drop policy if exists pair_member_read_self on public.pair_members;
create policy pair_member_read_self on public.pair_members
for select to authenticated
using (
  exists (
    select 1
    from public.campaign_enrollments e
    join public.participants p on p.id=e.participant_id
    where e.id=pair_members.enrollment_id
      and p.auth_user_id=auth.uid()
  )
);

drop policy if exists partner_pool_read_self on public.partner_pool;
create policy partner_pool_read_self on public.partner_pool
for select to authenticated
using (
  exists (
    select 1 from public.participants p
    where p.id=partner_pool.participant_id and p.auth_user_id=auth.uid()
  )
);

drop policy if exists referral_relationship_read_self on public.referral_relationships;
create policy referral_relationship_read_self on public.referral_relationships
for select to authenticated
using (
  exists (
    select 1 from public.participants p
    where p.id=referral_relationships.referrer_participant_id and p.auth_user_id=auth.uid()
  )
  or exists (
    select 1 from public.participants p
    where p.id=referral_relationships.referred_participant_id and p.auth_user_id=auth.uid()
  )
);

drop policy if exists campaign_public_read on public.campaigns;
create policy campaign_public_read on public.campaigns
for select to authenticated
using (active=true);

drop policy if exists campaign_version_published_read on public.campaign_versions;
create policy campaign_version_published_read on public.campaign_versions
for select to authenticated
using (status='PUBLISHED');
