# PHASE 62 — PAYMENT / REFUND / SETTLEMENT IDEMPOTENCY

Status: `SOURCE_COMPLETE`; static checks only. Database and browser verification
remain `DATABASE_STATUS_UNVERIFIED` and `MANUAL_CHECK_REQUIRED`.

## Guards verified or hardened

- Payment status transitions lock the order row, return the existing result for
  a same-status retry, and reject invalid transitions before any second history
  or financial action.
- Payment failure uses the shared reservation-release marker, so a repeated
  release does not decrement inventory twice.
- Refund status transitions lock the refund row, return the existing detail for
  a same-status retry, and now require the expected current status in the
  atomic update with a row-count guard.
- Delivered-order settlement creation is protected by the unique
  `ShopOrderSettlements.shop_order_id` constraint and `NOT EXISTS`/row locks.
- Eligibility promotion only updates `PENDING` rows.
- Batch creation excludes already-batched settlements and the schema enforces a
  unique settlement per batch-item association.
- Mark-paid returns the existing batch state when already `PAID`; otherwise it
  validates every item is still eligible and its payable snapshot is unchanged
  inside the transaction before updating settlement state/history.
- Applied settlement adjustments are guarded by `status=N'PENDING'` and an
  atomic row-count check, preventing repeated application from double-crediting
  or double-debiting a settlement.

These guards prevent the known failure classes `DOUBLE_CREDIT`,
`DOUBLE_DEBIT` and `DOUBLE_RELEASE` within the current API contracts. No new
idempotency-key API was invented; identical independent manual adjustments
remain distinct business actions and require business confirmation if that
policy should change.

## Preserved behavior

- Existing payment/refund/settlement state machines and response contracts.
- Manual external settlement; no real bank integration.
- Existing complaint/refund resolution rules; broader interaction review is
  deferred to PHASE 63.
- Applied migrations and canonical database remain untouched.

## BUSINESS_RULE_REQUIRES_CONFIRMATION

The system has no client idempotency-key contract for creating independent
refund or adjustment requests. State guards and database uniqueness prevent
replaying the same persisted operation from applying twice, but the business
owner must confirm whether identical manual requests should be deduplicated by a
future explicit key.

## Safety notes

- No migration was run and no database was connected to or mutated.
- No automatic business test was created or executed.
- Manual retry/concurrency and financial verification remain
  `MANUAL_CHECK_REQUIRED`.

## Deferred

- `DEFERRED_TO_PHASE_63`: complaint/refund interaction review.
- `DEFERRED_TO_PHASE_64`: Marketplace manual checkpoint.

