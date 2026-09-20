# PairVoice V1 System Plan

## Objective
Move a Spain pair from acquisition to accepted work and a controlled $50 total pair payout with minimal operator effort and zero unnecessary launch infrastructure.

## Boundaries
- PairVoice: recruitment, screening, pair formation, training, workflow, session reporting, QA state, payment obligation, messaging orchestration and audit.
- FunCrowd: external recording provider.
- WhatsApp Business V1: operator-assisted communication channel.
- PayPal V1: manual payment execution after approval.
- Supabase/Postgres: source of truth.

## Domains
Campaigns, requirements, participants, screening, voice review, pairs, workflow, training, external recording readiness, credentials, sessions, QA, payments, messaging, referrals, analytics and audit.

## Campaign #1
Spain Spanish. Two independently qualified participants. Seven separate conversations. Active operational target 21–22 minutes per conversation. $50 total participant compensation per accepted pair. Same-project repeat participation is not permitted under the active requirement version. All campaign rules remain configuration-driven.

### External provider access
- FunCrowd uses one invitation code for the Spain campaign, not one code per pair.
- PairVoice still creates and tracks its own unique pair/invite identifier for Participant A + Participant B.
- The external invitation code is stored once at the campaign level in `campaign_external_access`.
- The external code is server/admin data and is not stored in the public campaign record or committed to source control.
- The configured reveal state is `FUNCROWD_SETUP`: only an eligible pair that has reached the external setup stage should receive the code.
- Admins can update the provider, invitation code, and reveal state through the protected campaign settings API/UI.

## Core invariants
1. Published requirement versions are immutable.
2. Both participants qualify independently before pair readiness.
3. External provider status is never fabricated.
4. Participant-reported completion and external QA are distinct.
5. APPROVED is required before PAYMENT_DUE.
6. One payment obligation per pair + compensation-policy version.
7. Credentials cannot be assigned to multiple active pairs.
8. WhatsApp V1 never claims DELIVERED/READ without official API evidence.
9. Sensitive credentials never enter click-to-chat URLs.
10. Privileged mutations are audited.
11. External provider invitation codes belong to campaigns, not PairVoice pairs.
12. PairVoice pair/invite codes and external provider invitation codes are separate identifiers.
13. External provider access is not exposed through public campaign reads.

## Milestones
- M1: synthetic pair traverses complete workflow without direct DB editing.
- M2: two real Spain pairs traverse the same workflow.
- M3: ten accepted pairs validate first-pass acceptance, support load, cycle time and contribution economics.
- M4: automate the measured bottleneck only after M3.
