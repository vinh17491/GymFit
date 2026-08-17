# PHASE 61 — SETTLEMENT FLOW REVIEW

Status: `SOURCE_COMPLETE`; no code change was required after source review.
Database and browser verification remain `DATABASE_STATUS_UNVERIFIED` and
`MANUAL_CHECK_REQUIRED`.

## Verified current flow

```text
Customer payment confirmed
  → ShopOrder moves to PENDING_STOCK_CHECK
  → fulfillment reaches HUB_CHECK_PASSED / delivered
  → ShopOrderSettlement is created as PENDING
  → after the eligibility window it becomes ELIGIBLE
  → Admin creates a settlement batch
  → Admin marks the batch PAID with manual external reference/reason
```

Source evidence:

- Admin delivery calls `createSettlementsForDeliveredOrder` in the same
  transaction as the delivery transition.
- Settlement creation copies the stored ShopOrder commission and payable fields.
- `refreshEligibility` only promotes `PENDING` settlements whose `eligible_at`
  has arrived; held settlements stay held.
- Batch creation requires every selected settlement to be `ELIGIBLE` and
  unbatched, and stores a payable snapshot.
- `markBatchPaid` requires the batch items to remain eligible and unchanged,
  then records settlement history and the admin/external payment metadata.
- No real bank or payment-provider integration is introduced.

## Preserved behavior

- seven-day eligibility window;
- complaint/hold boundary and seller/admin ownership checks;
- stored commission and payable snapshots;
- manual external settlement model;
- existing route contracts and status history.

No settlement transition or financial retry behavior was changed in this phase.

## BUSINESS_RULE_REQUIRES_CONFIRMATION

The current system treats `ELIGIBLE` settlement records as the available seller
balance and uses a seven-day window. Requirements should confirm whether any
additional payout schedule, bank reconciliation or complaint/refund hold rule is
needed. Existing behavior remains authoritative until confirmed.

## Safety notes

- No migration was run and no database was connected to or mutated.
- No automatic business test was created or executed.
- Manual settlement and financial verification remain
  `MANUAL_CHECK_REQUIRED`.

## Deferred

- `DEFERRED_TO_PHASE_62`: payment/refund/settlement idempotency hardening.
- `DEFERRED_TO_PHASE_63`: complaint/refund interaction review.
- `DEFERRED_TO_PHASE_64`: Marketplace manual checkpoint.

