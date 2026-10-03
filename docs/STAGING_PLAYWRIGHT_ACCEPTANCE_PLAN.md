# PairVoice Staging Playwright Acceptance Plan

Status: Ready for Work / Cloud Browser execution  
Environment: https://staging.pairvoice.com  
Branch: `phase-2-production-workflow`  
Test account: `hello@kohronburton.com`  
Production: DO NOT MODIFY

## Objective

Prove the actual PairVoice mobile journey in a real browser. This is an end-to-end acceptance test, not a build-only or API-only check.

The core journey must remain:

**Join → Partner → Complete gig → Get paid**

## Test standard

For every browser scenario:
- use a mobile/iPhone-sized viewport first;
- capture screenshots at important states;
- record console errors;
- record failed HTTP/network requests;
- verify visible copy and primary CTA;
- check that the primary task does not require unnecessary scrolling;
- verify URL/query state across redirects;
- verify resulting application/database state where available;
- do not modify production.

## Pass 1 — Public entry and signup

1. Open staging fresh with no session.
2. Open an eligible campaign join URL.
3. Verify campaign context is visible and correct.
4. Register with `hello@kohronburton.com` when the account state permits.
5. Validate form errors and recovery behavior.
6. Complete the real confirmation/magic-link flow.
7. Verify callback returns to the public staging origin, never localhost or Render's internal hostname.
8. Verify authenticated participant/dashboard state.

Pass condition: signup/authentication completes without broken redirects, missing PKCE state, dead ends, or unclear recovery.

## Pass 2 — Dashboard mobile UX

1. Load dashboard at an iPhone-sized viewport.
2. Verify the promise and progress state.
3. Verify Partner is not marked complete merely because matching is active.
4. Verify the immediate next action is above the fold.
5. Verify Wallet is immediately reachable.
6. Check short-height phone behavior.
7. Check for horizontal overflow, clipped controls, duplicate instructions, or unnecessary scrolling.

Pass condition: the member can identify and start the correct next action immediately.

## Pass 3 — Partner discovery and sharing

Participant A:
1. Open partner connection.
2. Verify own PairVoice code is visible.
3. Test Copy code.
4. Test exact partner-code lookup.
5. Test exact account-email lookup.
6. Test native Share where supported.
7. Test SMS deep link.
8. Test email deep link.
9. Inspect the generated URL.

Pass condition: shared URLs preserve the campaign and A's partner code without manual copying.

## Pass 4 — Zero-friction A → B handoff

Use a second isolated browser context for Participant B.

1. Open A's shared invite.
2. Verify the correct campaign is selected.
3. Verify A's code is already applied.
4. Create/sign into B's account.
5. Verify signup carries the partner code server-side.
6. Verify a pending partner request is automatically created.
7. Return to A.
8. Verify A can accept the correct request.
9. Accept.
10. Verify both participants show the same connected pair/campaign state.
11. Verify dashboard progress advances appropriately.

Pass condition: no partner code re-entry, backtracking, or hidden manual recovery is required.

## Pass 5 — Active gig/work flow

1. Open the newly available gig.
2. Verify campaign consent/readiness requirements.
3. Verify work access is denied until required gates are satisfied.
4. Verify successful gate completion unlocks the intended work state.
5. Verify state survives refresh/navigation.
6. Verify the dashboard's next action changes with the pair state.

Pass condition: the UI and server state agree throughout the workflow.

## Pass 6 — Wallet

1. Open Wallet on a common iPhone viewport.
2. Verify available balance is visually dominant.
3. Verify Earned and Paid totals.
4. Verify one primary payout action.
5. Verify empty state.
6. Verify payout-method form.
7. Verify validation and recoverable errors.
8. Verify optional fields remain secondary.
9. Verify Recent activity is collapsed by default.
10. Check for unnecessary page scrolling and horizontal overflow.

Pass condition: the member understands money available, money earned/paid, and the next payout action on one focused screen.

## Pass 7 — Payout lifecycle

When staging test data permits:
1. Create/use an approved earning.
2. Verify it appears in ledger/earned total.
3. Verify available balance calculation.
4. Add payout method.
5. Verify pending/verified state.
6. Request the available balance.
7. Verify idempotency/no duplicate payout on retry.
8. Verify funds become reserved/unavailable while processing.
9. Verify payout/history state.
10. Verify paid state updates totals correctly.

No real external money movement is required for staging acceptance unless a dedicated sandbox provider is configured.

## Pass 8 — Negative and abuse cases

Test safely:
- duplicate signup;
- invalid partner code;
- self-pair attempt;
- partner from wrong campaign;
- duplicate partner request;
- already-paired participant;
- expired/invalid auth callback;
- rapid repeated magic-link request;
- payout with zero available balance;
- payout without verified method;
- duplicate payout request;
- refresh/back navigation during important transitions.

Pass condition: failures are contained, state is not corrupted, and users receive a useful recovery message.

## Evidence and scoring

Score these independently:
- Signup/auth
- Mobile onboarding
- Dashboard
- Partner discovery
- Partner sharing
- A→B handoff
- Pair state consistency
- Gig/work access
- Wallet UX
- Payout lifecycle
- Error recovery
- Runtime stability

A category receives **10/10 only when the tested behavior passes in staging**. Build success alone does not qualify.

## Fix loop

For every failure:
1. capture exact reproduction;
2. identify the smallest root-cause fix;
3. change staging only;
4. deploy;
5. rerun the failed scenario;
6. rerun adjacent regression scenarios;
7. update the score.

Continue until all release-critical categories either reach 10/10 or have a clearly documented external dependency that prevents execution.

## Final release gate

Do not promote to production until:
- latest staging revision is live;
- no release-critical browser test fails;
- A→B partner flow passes end-to-end;
- wallet/payout state machine passes with staging/sandbox data;
- no new material console/server errors appear;
- mobile primary actions remain immediately accessible;
- production configuration is reviewed separately before promotion.
