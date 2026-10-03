-- Security hardening discovered by Supabase staging advisors.
-- Public browser traffic reaches privileged mutations through PairVoice server routes.

-- Tables exposed through PostgREST must always have RLS enabled.
alter table public.campaigns enable row level security;
alter table public.campaign_versions enable row level security;
alter table public.topics enable row level security;
alter table public.referral_relationships enable row level security;
alter table public.referral_commissions enable row level security;
alter table public.message_events enable row level security;
alter table public.idempotency_records enable row level security;
alter table public.outbox_events enable row level security;

-- Server-only SECURITY DEFINER RPCs. Signup/pair routes use service_role.
revoke all on function public.join_pair_invite(text,text,text,text,text,text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.join_pair_invite(text,text,text,text,text,text,boolean,boolean) to service_role;

revoke all on function public.register_campaign_participant(text,text,text,text,text,text,boolean,boolean,text) from public,anon,authenticated;
grant execute on function public.register_campaign_participant(text,text,text,text,text,text,boolean,boolean,text) to service_role;

-- Legacy lead RPCs are retained for compatibility but may only be called server-side.
revoke all on function public.upsert_public_lead(text,text,boolean,text,text[],text,text,text,text,text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.upsert_public_lead(text,text,boolean,text,text[],text,text,text,text,text,text,text,text,text,text,text) to service_role;

revoke all on function public.upsert_public_lead_v2(text,text,boolean,text,text[],text,text,text,text,text,text,text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.upsert_public_lead_v2(text,text,boolean,text,text[],text,text,text,text,text,text,text,text,text,text,text,text,text) to service_role;

-- Trigger-only SECURITY DEFINER functions must not be callable through /rest/v1/rpc.
revoke all on function public.capture_pair_business_funnel_event() from public,anon,authenticated;
revoke all on function public.capture_payout_business_funnel_event() from public,anon,authenticated;
revoke all on function public.enqueue_pair_lifecycle_messages() from public,anon,authenticated;
revoke all on function public.enqueue_payout_lifecycle_message() from public,anon,authenticated;
revoke all on function public.referral_pair_approved_trigger() from public,anon,authenticated;

-- Pin search_path on helper/trigger functions flagged by the database linter.
alter function public.set_updated_at() set search_path=public;
alter function public.protect_published_campaign_version() set search_path=public;
alter function public.pair_transition_allowed(pair_state,pair_state) set search_path=public;
alter function public.guard_pair_transition() set search_path=public;
alter function public.immutable_financial_audit_rows() set search_path=public;
alter function public.set_audit_hash() set search_path=public;
alter function public.initialize_sessions_when_ready() set search_path=public;
alter function public.sync_lead_campaign_keys() set search_path=public;
alter function public.protect_verified_recovery() set search_path=public;
alter function public.next_voice_sample_version(uuid,uuid) set search_path=public;
alter function public.protect_published_legal_document() set search_path=public;
