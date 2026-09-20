# Pair State Machine
PARTNER_PENDING → PAIRED → READINESS_PENDING → READY → RECORDING → SUBMITTED → INTERNAL_QA → CLIENT_QA → APPROVED → PAYABLE → PAID

Controlled branches: REWORK_REQUIRED, PAYMENT_FAILED, ON_HOLD, REJECTED, CANCELLED.

The database trigger is authoritative. Application code cannot skip gates.
