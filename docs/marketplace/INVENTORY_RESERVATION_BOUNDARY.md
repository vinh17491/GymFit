# PHASE 59 — INVENTORY RESERVATION BOUNDARY

Status: `SOURCE_COMPLETE`; static checks only. Database and browser verification
remain `DATABASE_STATUS_UNVERIFIED` and `MANUAL_CHECK_REQUIRED`.

## Scope completed

The reservation boundary is now explicit in
`backend/src/modules/orders/order-reservation.service.ts`:

- `reserveInventory` performs a positive-integer guard and one atomic update
  with `reserved + quantity <= on_hand`;
- checkout uses that shared reserve operation instead of embedding its own
  inventory update;
- release operations keep the existing item-level release marker and now also
  guard the inventory decrement with `reserved >= quantity`;
- repeated release calls select no already-marked item and return zero, so the
  shared release path remains idempotent and does not double-release stock.

The database invariant remains:

```text
available = on_hand - reserved
```

No computed-column or migration change was made. Existing fulfillment paths that
consume an active reservation (`on_hand` and `reserved` together) remain inside
their current transaction/row-lock boundaries because they also write delivery
markers and inventory-adjustment history; they were not redesigned in this
checkpoint.

## Preserved behavior

- checkout error contract for failed reservation;
- reservation release for customer cancellation, failed payment, expiration
  and seller unable-to-fulfill flows;
- existing delivered-order stock consumption and adjustment history;
- no stock mutation outside the existing transaction boundaries.

## Safety notes

- No migration was run and no database was connected to or mutated.
- No automatic business test was created or executed.
- Manual concurrent checkout/release and stock verification remain
  `MANUAL_CHECK_REQUIRED`.

## Deferred

- `DEFERRED_TO_PHASE_60`: commission flow review.
- `DEFERRED_TO_PHASE_61`: settlement flow review.
- `DEFERRED_TO_PHASE_62`: payment/refund/settlement idempotency hardening.
- `DEFERRED_TO_PHASE_63`: complaint/refund interaction review.

