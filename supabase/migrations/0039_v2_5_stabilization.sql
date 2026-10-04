-- V2.5 stabilization: reconcile proven auth identities and harden core security/performance surfaces.

-- Link participants to already-existing Supabase Auth users only when the normalized
-- email matches exactly and neither side is already claimed by a different identity.
update public.participants p
set auth_user_id=u.id,updated_at=now()
from auth.users u
where p.auth_user_id is null
  and u.email is not null
  and lower(trim(p.email::text))=lower(trim(u.email))
  and not exists(select 1 from public.participants other where other.auth_user_id=u.id and other.id<>p.id);

create unique index if not exists participants_auth_user_unique
  on public.participants(auth_user_id) where auth_user_id is not null;

-- Trigger-only SECURITY DEFINER functions must not be callable as public RPCs.
alter function public.guard_pair_transition() set search_path=public;
alter function public.protect_published_legal_document() set search_path=public;
revoke all on function public.guard_pair_transition() from public,anon,authenticated;
revoke all on function public.protect_published_legal_document() from public,anon,authenticated;
revoke all on function public.enforce_pair_member_campaign_version() from public,anon,authenticated;

-- Core-path FK indexes flagged by the live advisor.
create index if not exists campaign_enrollments_participant_idx on public.campaign_enrollments(participant_id);
create index if not exists campaign_enrollments_version_idx on public.campaign_enrollments(campaign_version_id);
create index if not exists pairs_campaign_idx on public.pairs(campaign_id);
create index if not exists pairs_campaign_version_idx on public.pairs(campaign_version_id);
create index if not exists ledger_entries_participant_idx on public.ledger_entries(participant_id);
create index if not exists payouts_participant_idx on public.payouts(participant_id);
create index if not exists work_provider_runs_campaign_idx on public.work_provider_runs(campaign_id);
