# PairVoice Phase 0 + Phase 1 Release Contract

## Product rule
Complex underneath, simple on top.

Participant lifecycle: **JOIN → QUALIFY → PAIR → READY → WORK → REVIEW → PAID → NEXT JOB**.

## Phase 0 — Early Access
Phase 0 is not a disposable mailing list. Early-access people claim a permanent PairVoice participant identity using an email magic link.

Public flow:
1. Join Early Access.
2. Receive magic link.
3. Claim/recover the canonical PairVoice identity.
4. Open the participant command center.
5. Bring a partner, connect an existing PairVoice user, or enter Find a Partner.
6. Remain available for compatible opportunities.

No active-gig payout is promised until a campaign is actually open.

## Phase 1 — Production foundation
Phase 1 establishes the permanent seams used by production:
- one human / one canonical participant;
- magic-link session and continuation-safe redirects;
- permanent campaign history;
- partner pool available from launch;
- potential partnerships separate from campaign-specific pairs;
- referral programs with configurable 10-qualified-referral milestone bonus;
- immutable ledger remains the money source of truth;
- payout methods are provider-independent so PayPal and other rails can be enabled later;
- Niva/FunCrowd remain external providers, never PairVoice business truth.

## Duplicate-account rule
Email is canonical at account claim. Verified phone becomes a unique identity signal. Possible duplicates go to verification/review; history is merged, never silently deleted. Referral rewards must be revalidated against canonical identity before award.

## Find a Partner
Find a Partner is P0, not Coming Soon. Matching begins with country + language + waiting status. Campaign eligibility, prior participation, sample/readiness, availability and reliability are added as those gates become applicable. Matching never resets campaign history.

## Referral milestone
The UX may say “Invite 10 people. Unlock a cash bonus,” but only qualified unique referrals count. The amount remains configuration, not hard-coded product logic. A reward becomes money only through an idempotent ledger entry.

## Payout architecture
Wallet balance = projection of immutable ledger entries. Payout providers only execute transfers. PayPal and other methods are adapters/configuration, not wallet truth.

## Phase 0/1 release gates
- magic link works on mobile and returns to a safe intended route;
- existing email claims existing participant rather than creating another;
- early-access lead converts to permanent participant once;
- verified phone cannot silently create a second identity;
- partner pool never matches self, wrong country/language or non-waiting participant;
- partner history survives later campaign changes;
- referral milestone cannot pay from raw registrations;
- participant cannot read another participant’s protected data;
- admin/security controls remain server-authoritative;
- typecheck, unit tests and build pass.

## Ready for Phase 2
Phase 2 starts from a permanent authenticated participant and adds the production job experience: participant dashboard completion, opportunity eligibility, individual voice qualification, campaign pair readiness, Niva credential allocation, provider launch, QA, approval and wallet/payout execution.
