# PairVoice Architecture

## Product model

PairVoice is a voice-work marketplace and operations layer. The system does not treat every external listing as a new product.

The hierarchy is:

`Job Family -> Campaign -> Source Posting -> Enrollment -> Pair/Participant Work -> Submission -> QA -> Payout`

### Job family
Reusable work format. Examples:
- Paired Conversation Recording
- Mobile Voice Recording

### Campaign
A market-specific version of a job family with its own eligibility, language, device, payout, client economics and provider rules.

Examples:
- U.S. English — 7 Conversations
- Canada English — 7 Conversations
- Spain Spanish — 7 Conversations
- Australia English — iPhone Recording

### Source posting
One external listing that points to a PairVoice campaign.

Multiple Upwork posts can map to one PairVoice campaign. A source posting is acquisition/source intelligence, not the core campaign identity.

### Participant
One reusable PairVoice person/profile. A participant may enroll in multiple campaigns over time.

### Campaign enrollment
The participant's status for one campaign. This prevents the old model where a profile was permanently attached to one campaign.

### Pair
Only created for campaigns that require two people. PairVoice pair codes are internal identifiers and are separate from external provider invitation codes.

### Campaign access
External provider access data belongs to the campaign. A shared Funcrowd code is stored once at campaign level and revealed only at the configured workflow state.

## Core operational rules

1. A campaign can have many external source postings.
2. A participant can join many campaigns.
3. A one-time campaign can enforce one enrollment/completion per participant.
4. Pair campaigns and solo campaigns share the same catalog but use different execution flows.
5. External provider invitation codes are never used as PairVoice pair IDs.
6. Participant completion, QA approval, payment due and paid are different states.
7. Client revenue and participant payout are stored separately.
8. Public Supabase table access is blocked by RLS. Application writes are server-side.
9. Public lead capture remains email-first and low friction.
10. Marketing attribution is separate from external job-source tracking.

## Database domains

- `job_families`
- `campaigns`
- `source_postings`
- `source_contract_observations`
- `campaign_access`
- `participants`
- `campaign_enrollments`
- `pairs`
- `recording_sessions`
- `submissions`
- `payment_obligations`
- `referral_commissions`
- `leads`
- `marketing_campaigns`
- `marketing_spend`

## Current public flow

`Landing page -> opportunity catalog -> select campaign or general list -> email + consent -> lead saved`

The public site does not require a password, phone, voice sample or payout account at first contact.

## Next execution layer

When campaign fulfillment is turned on:

`Lead -> participant -> campaign enrollment -> eligibility -> partner if required -> ready -> recording -> submission -> QA -> payment due -> paid`

Solo campaigns skip pair formation.

## Security model

All operational tables use RLS. Current app reads/writes through server-side routes using the Supabase service role. The service role key must never be exposed to client JavaScript.

Admin routes are protected by PairVoice admin authentication middleware.

External provider invitation codes are admin/server data and are not returned by the public opportunity API.
