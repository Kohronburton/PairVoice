# Workflow State Machine

Primary path:

`APPLIED -> SCREENING -> MANUAL_REVIEW/QUALIFIED -> PARTNER_PENDING -> PAIRED -> TRAINING -> FUNCROWD_SETUP -> FUNCROWD_TEST -> READY -> RECORDING -> SUBMITTED -> EXTERNAL_QA_PENDING -> APPROVED -> PAYMENT_DUE -> PAID`

QA can route `EXTERNAL_QA_PENDING -> REWORK_REQUIRED -> RECORDING/SUBMITTED` or to `REJECTED`.

Exception states: `WAITLISTED`, `REJECTED`, `ABANDONED`, `CREDENTIAL_HOLD`, `PAYMENT_FAILED`.

## External provider access

The Spain FunCrowd invitation code is campaign-level configuration, not a PairVoice pair identifier.

- PairVoice pair/invite codes remain unique per pair.
- The shared external invitation code is held in the RLS-protected `campaign_external_access` table.
- The configured earliest reveal state is `FUNCROWD_SETUP`.
- Reaching `PAIRED` alone does not authorize public exposure of the external code.
- Future participant-facing retrieval must verify pair membership and current workflow state on the server before returning the code.

## Financial invariant

`COMPLETED != ACCEPTED != PAYMENT_DUE != PAID`

A participant reporting 7/7 only permits submission. It never creates a payable obligation by itself.

## Messaging

Workflow events recommend versioned message templates. V1 creates operator-assisted WhatsApp actions. V1 statuses are limited to `RECOMMENDED`, `OPENED_FOR_SEND`, `OPERATOR_CONFIRMED_SENT`, `SKIPPED`, and `FAILED_TO_OPEN`.
