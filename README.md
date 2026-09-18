# PairVoice

Mobile-first recruitment and operations platform for paid conversational speech-data projects.

## Tonight Launch Scope

The current public launch is deliberately email-first:

**Landing page -> email -> consent -> lead saved -> confirmation.**

No password, phone number, voice recording, payout setup, partner workflow, or full account is required for tonight's acquisition launch.

The lead layer automatically captures locale/language signals and campaign attribution so PairVoice can segment future opportunities and measure CPL/CAC without adding signup friction.

See `docs/TONIGHT_MVP_AND_PROGRESSIVE_VERIFICATION.md` for the locked launch scope and the next-phase voice verification design.

## V1 Platform Foundation

The repository also preserves the broader participant/account foundation for future campaign operations: profiles, pairs, gigs, completions, referrals, payments, campaign targeting, admin analytics and progressive verification.

### Core rules

- Supabase/Postgres is the source of truth.
- Campaign requirements are configuration, not platform hard-coding.
- Market and language are separate signals.
- COMPLETED != ACCEPTED != PAYMENT_DUE != PAID.
- Credentials and payment obligations require database-level duplicate protection.
- One-time jobs should eventually enforce one completion per real enrolled speaker, with manual review for uncertain duplicate matches.

## Stack

Next.js App Router + TypeScript + Supabase/Postgres.

## Launch Priority

1. Collect email leads with minimal friction.
2. Preserve attribution and acquisition KPIs from day one.
3. Notify leads when a matching opportunity opens.
4. Convert only interested leads into full accounts.
5. Add phone, voice enrollment, duplicate-speaker screening and payout setup progressively when needed.
