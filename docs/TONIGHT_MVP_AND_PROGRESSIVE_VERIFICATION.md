# PairVoice Tonight MVP + Progressive Verification Plan

## Locked Tonight Scope

Tonight is an email-first acquisition launch. The public funnel must stay low-friction:

Ad / social post -> PairVoice landing page -> email -> consent -> lead saved -> confirmation.

No password, phone number, voice recording, payout setup, partner workflow, or full account creation is required tonight.

### Tonight data captured automatically

PairVoice should collect or infer without asking the visitor:

- email address
- marketing consent
- detected browser/device locale
- detected browser language list
- inferred preferred language
- inferred market / country-region
- campaign/source attribution
- UTM source, medium, campaign, content and term
- referrer
- ad click IDs when present
- landing path
- created/updated timestamps

The visitor should only need to type an email address and check consent.

## Market and Language Are Separate

Do not treat language and geography as the same field.

Examples:

- United States market + Spanish device language
- Spain market + Spanish language
- Australia market + English language
- Italy market + Italian language

The database must preserve both the selected/inferred market and language signals.

Initial markets:
- US — United States
- ES — Spain
- IT — Italy
- AU — Australia
- GB — United Kingdom
- MX — Mexico
- AR — Argentina
- CO — Colombia

More markets can be added without redesigning the lead schema.

## KPI / Acquisition Tracking

Track acquisition from the first visit so PairVoice can calculate:

- total leads
- leads by market
- leads by language
- cost per lead (CPL)
- total acquisition spend
- cost per click (CPC)
- click-through rate (CTR)
- lead-to-customer conversion rate
- customer acquisition cost (CAC)
- campaign-level CPL
- campaign-level CAC
- campaign-level conversion rate

CPL is the primary acquisition metric while PairVoice is collecting emails. CAC only becomes valid when a lead converts into a real participant/customer.

## Phase 2 — Progressive Account Creation

Do not force full account creation until a relevant paid opportunity exists.

Recommended flow:

Email lead -> magic-link job invitation -> see job/pay -> accept -> phone number -> quick voice check -> eligibility -> job access -> complete work -> payout setup only when money is owed.

Returning verified participants should be able to accept future jobs in a few taps.

## Phase 2 — Voice Enrollment With Minimal Friction

Use one short voice-check screen, approximately 20 seconds total:

1. 8–10 second scripted phrase.
2. 10–15 second random/natural response.

Reuse the same samples internally for:

- speaker enrollment
- language/accent matching
- duplicate-participation screening
- later 1-to-1 speaker verification

Do not make normal participants repeat unnecessary recordings.

## One-Time Job Enforcement

Many voice campaigns allow one completion per real speaker.

Maintain:

- a global internal speaker profile / speaker ID
- campaign participation history
- account identifiers
- phone
- payment destination when available
- device/session risk signals
- voice similarity signals

Before a one-time campaign is accepted, PairVoice should determine whether that enrolled speaker has already attempted or completed the same campaign.

Risk handling:

- Green: no meaningful duplicate signal -> continue automatically.
- Yellow: possible duplicate -> deeper automated comparison or manual review.
- Red: strong duplicate signal -> hold access pending review.

Do not rely on a single signal and do not automatically accuse a user based only on a voice similarity score.

## Voice Matching vs Accent / Language Matching

These are separate systems.

Speaker verification:
"Does this new recording appear to be the same enrolled speaker?"

Language/accent screening:
"Does the speech appear consistent with the language/variant required by the campaign?"

Examples:
- Spain Spanish
- Mexican Spanish
- Australian English
- UK English
- Italian

Accent analysis can support campaign matching but does not prove nationality, residence, or legal identity.

## Anti-Replay / Voice-Change Resistance

Use multiple short enrollment samples and random prompts so prerecorded audio is harder to reuse.

Voice duplicate detection should use speaker characteristics beyond pitch alone. A person changing pitch, speed, or performing an accent should not automatically become a new speaker identity.

Borderline cases should route to review rather than automatic rejection.

## Privacy / Consent Principle

Voice samples and derived speaker representations may be treated as biometric or sensitive data in some jurisdictions.

Before Phase 2 voice enrollment is released, PairVoice needs explicit user consent and defined rules for:

- purpose limitation
- storage
- encryption
- access control
- retention
- deletion
- jurisdiction-specific requirements

Tonight's email-only launch does not require voice enrollment.

## Product Principle

Remove friction aggressively for legitimate users while keeping the verification system strong behind the scenes.

First-time participant target:
- under 60 seconds before eligible job access once Phase 2 is live.

Returning verified participant target:
- a few taps.

Never ask for information before it is needed.
Never make users re-enter information PairVoice already has.
