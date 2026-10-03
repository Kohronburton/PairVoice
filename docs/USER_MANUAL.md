# PairVoice User & Operations Manual

Approved revenue first: increase qualified pair throughput, reduce rejection/redo, shorten time-to-approval and protect credential capacity.

## Production participant flow
1. Choose a published gig from the public catalog.
2. Complete production signup: name, email, optional phone, 18+ confirmation, market/language eligibility and communication consent.
3. PairVoice creates the participant, campaign enrollment and Pair A record server-side.
4. PairVoice emails the participant and offers passwordless account access.
5. Participant A invites Participant B using the pair-specific production link.
6. Participant B completes the same eligibility checks and is attached to the existing pair.
7. Both participants open the dashboard and complete the readiness checklist.
8. The second readiness confirmation moves the pair to READY.
9. Operations releases recording access and the pair completes required sessions.
10. Submission moves through internal QA → client QA → approval → payable → paid.

The dashboard is the participant source of truth. It must always show the current gig, payout share, pair status, progress and one clear next action.

## Account access
PairVoice uses passwordless Supabase Auth links. The verified auth email claims the existing participant row with the same email. A participant cannot claim a different participant's record. Returning users sign in at `/login` and land on `/dashboard`.

## Partner flow
Production partner invitations use `/pair/{inviteCode}`. Legacy `/invite/{code}` links remain available only for early-access recovery. A production invite can be used while the pair is in PARTNER_PENDING; after Participant B joins, the pair becomes PAIRED.

Partner matching inside PairVoice is a future feature. Until then, the production UI clearly asks Participant A to invite someone they know.

## Spain operating rules
Spain rules currently captured: 2 participants; 7 different conversations; target 21–22 minutes (aim ~21:30); hard supplied window >20 and <24; 90–95% Spanish; both say “MagicData sound recording” before every topic; quiet separate rooms/places; phone on table 10–20 cm away; no headphones/charging/other apps/screen-off; no politics/religion/offensive content; no repeat participation. PairVoice public offer: $50 per pair. Supplied invitation code D43LH547F3 remains scope-unconfirmed.

## Operations rule
If a control can change eligibility, credentials, QA, approval or money, it must execute a real permission-checked server action and create evidence. Public signup and pair formation go through server-authoritative API routes using the service role; anonymous browser clients cannot execute the enrollment RPCs directly.
