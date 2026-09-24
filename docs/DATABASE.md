# PairVoice Database

## Fresh-start policy
PairVoice is pre-production. Old parallel profiles/participants and duplicate pair models were removed instead of preserved.

Reset disposable local/staging databases and apply supabase/migrations/0001_baseline.sql from zero. Do not apply the fresh baseline destructively to a database containing production records.

## Canonical model
campaigns; campaign_versions; participants; campaign_enrollments; pairs; pair_members; credential_bundles; credential_accounts; credential_assignments; topics; conversation_sessions; session_attempts; reviews; referral_relationships; referral_commissions; ledger_entries; payouts; leads; acquisition_campaigns; acquisition_spend; message_events; outbox_events; activity_events; audit_events.

## Modeling decisions
A global participant can join future campaigns; campaign_enrollments enforce campaign-specific repeat rules. Pair membership is separate so replacements preserve history. Published campaign versions freeze rules/economics. Credential assignment is one-to-one. Ledger/audit rows are immutable.

## Database verification
Test clean migration, duplicate enrollment rejection, active pair membership uniqueness, credential double-assignment, invalid state transitions, duplicate approval idempotency, and immutable ledger/audit rows.
