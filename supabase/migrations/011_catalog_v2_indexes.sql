-- V2 follow-up: remove inherited duplicate indexes and cover all foreign keys.

drop index if exists public.leads_market_code_idx;
drop index if exists public.leads_campaign_key_idx;

create index if not exists enrollments_source_posting_idx
  on public.campaign_enrollments(source_posting_id);
create index if not exists leads_converted_participant_idx
  on public.leads(converted_participant_id);
create index if not exists leads_source_posting_idx
  on public.leads(source_posting_id);
create index if not exists pairs_enrollment_a_idx
  on public.pairs(enrollment_a_id);
create index if not exists pairs_enrollment_b_idx
  on public.pairs(enrollment_b_id);
create index if not exists participants_referred_by_idx
  on public.participants(referred_by);
create index if not exists referrals_referred_participant_idx
  on public.referral_commissions(referred_participant_id);
