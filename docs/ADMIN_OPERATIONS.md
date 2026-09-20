# PairVoice Admin Operations

The admin surface is an operating console, not a mock dashboard.

## Live functions
- approved-revenue/contribution dashboard
- pair queue with real current states
- server-validated pair state transitions
- credential inventory
- encrypted credential bundle creation
- atomic next-available credential reservation
- credential release into recording state
- activity and audit evidence for privileged changes

## Credential security
Passwords are encrypted server-side with AES-256-GCM using PAIRVOICE_CREDENTIAL_ENCRYPTION_KEY. The database stores ciphertext, not raw passwords. Inventory GET responses return usernames/status only.

## Revenue protection
The generic transition endpoint cannot move a pair into APPROVED, PAYABLE, PAID or PAYMENT_FAILED. Those financial states require dedicated idempotent operations.

## Professional gamification
Mission Control shows launch progress and operating badges. Badges are display-only and never change eligibility, QA, credentials or money.
