# PHASE 56 — PAYMENT SERVICE EXTRACTION

Status: `SOURCE_COMPLETE`; static checks only. Database and browser verification
remain `DATABASE_STATUS_UNVERIFIED` and `MANUAL_CHECK_REQUIRED`.

## Scope completed

Payment orchestration was moved from
`backend/src/modules/orders/orders.service.ts` to
`backend/src/modules/orders/payment.service.ts`:

- customer `notifyPayment` with ownership check, payment-state transition,
  payment-history insert and admin notification;
- admin `updatePaymentStatus` with the existing transition matrix, note rules,
  history, child-shop status transition, failed-payment reservation release and
  customer email behavior;
- payment-specific order shape, status-history helper and email helpers.

`ordersService.notifyPayment` and `ordersService.updatePaymentStatus` remain
available through delegated properties, so existing routes and API contracts
are unchanged.

## Preserved behavior

- transaction begin/commit/rollback boundaries;
- row locks and existing SQL statements;
- payment transition rules and idempotent same-status response;
- payment history, reservation release and shop-order transition behavior;
- mail configuration, delivery classification and message content.

No new payment provider, bank integration, settlement rule, refund rule or
business test was introduced. Existing cancellation interaction inside failed
payment handling is preserved and is not a cancellation-architecture rewrite.

## Safety notes

- No migration was run and no database was connected to or mutated.
- No automatic business test was created or executed.
- Manual payment verification remains `MANUAL_CHECK_REQUIRED`.

## Deferred

- `DEFERRED_TO_PHASE_57`: cancellation service extraction.
- `DEFERRED_TO_PHASE_58`: order query service.
- `DEFERRED_TO_PHASE_59`: inventory reservation boundary.
- `DEFERRED_TO_PHASE_60`–`DEFERRED_TO_PHASE_63`: commission, settlement,
  idempotency and complaint/refund interaction review.

