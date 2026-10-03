# PairVoice Mobile Zero-Friction UX & Copy Standard

Status: Staging standard
Branch: `phase-2-production-workflow`
Updated: 2026-09-30

## Product rule

PairVoice authenticated flows should behave like a focused mobile app, not a content-heavy website.

Each state should answer three questions without hunting:
1. What do I get?
2. What do I do next?
3. What happens after I tap?

Default rule: **one screen, one goal, one obvious primary action.** Scrolling is used only when the task genuinely requires more information.

## Value-first copy framework

PairVoice copy uses a Hormozi-inspired value framework rather than imitating any individual's exact wording:
- Make the desired outcome concrete.
- Reduce perceived effort and delay.
- Increase certainty about the next step.
- Show the value before asking for effort.
- Use one clear CTA.
- Do not use fake urgency, unsupported earnings claims, or guaranteed approval/payment language.

Preferred sequence:
**Outcome → ease/certainty → next action.**

## Core member journey

**Join → Partner → Complete gig → Get paid**

The UI should always expose the member's current stage and the immediate next action.

## Partner connection standard

A participant must be able to connect a partner without hunting for account information.

Supported paths:
- Partner PairVoice code.
- Partner account email.
- Native mobile share.
- SMS share.
- Email share.

### My PairVoice code

The member's own PairVoice code is shown prominently with:
- Copy code
- Share
- Text it
- Email it

Do not bury the code inside profile/settings.

### Shared invite behavior

Shared links carry:
- campaign slug
- inviter's partner code

Target URL pattern:
`/join?campaign=<campaign>&partnerCode=<code>`

When the recipient opens the link:
- the correct gig is already selected;
- the inviter's partner code is already populated in state;
- the page visibly confirms that the partner invite is ready;
- the recipient should not need to copy/paste the code.

### Partner invite copy

Current default:

> I found us a paid voice gig on PairVoice: [Gig Name]. We can complete it together if we qualify and our work is approved. I already connected my partner code, so you don't have to type it in. Tap this link, join me, and PairVoice will show us the next step: [Invite Link]

Subject for email:
**Join me on PairVoice**

The exact payout may be included when it is campaign-backed and unambiguous. Never imply payment is guaranteed before qualification/completion/approval requirements are satisfied.

## Existing member lookup

Partner connection supports:
- code entry;
- exact account-email lookup.

Email lookup should not expose a searchable participant directory or disclose account data beyond what is necessary to complete the connection.

## Mobile interaction rules

- Primary CTA should be visible without scrolling on common phone viewports whenever practical.
- Secondary actions should be visually subordinate.
- Use progressive disclosure for account details.
- Avoid duplicate explanations.
- Avoid forcing users to remember/copy identifiers between screens.
- Prefer prefilled state and deep links.
- Preserve campaign context across authentication.
- Success states immediately explain the next action.
- Error states explain how to recover, not merely what failed.

## Current staging implementation

Implemented:
- action-led mobile dashboard;
- compact Join → Partner → Get paid progress;
- visible PairVoice code;
- copy-code control;
- partner lookup by code;
- partner lookup by email;
- native share;
- SMS share with prewritten message;
- email share with prewritten subject/body;
- deep link carrying campaign + partner code;
- join page reads and displays the incoming partner code.

## Remaining acceptance gate

The final zero-friction partner handoff is not considered complete until staging verifies that the incoming `partnerCode` is persisted/consumed server-side after signup and results in the intended pending/connected partner state without manual re-entry.

Acceptance test:
1. Participant A opens an eligible campaign.
2. A taps Text/Email/Share.
3. Participant B opens the generated link on a phone.
4. Correct campaign and A's code are already present.
5. B creates/signs into the account.
6. The partner request/relationship is created using the carried code.
7. A/B complete any required acceptance step.
8. Both dashboards reflect the same pair/campaign state.
9. No code copying, backtracking, or unnecessary scrolling is required.

## Copy governance

Use this standard for PairVoice landing pages, onboarding, dashboard, partner flows, reminders, SMS, email, WhatsApp, recording instructions, wallet, payout, empty states, and recoverable errors.

Before adding copy, ask:
**Does this increase perceived value, reduce effort, reduce delay, increase certainty, or make the next action clearer?**

If not, remove or hide it.
