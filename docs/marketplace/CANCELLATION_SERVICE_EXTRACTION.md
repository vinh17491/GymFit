# PHASE 57 — CANCELLATION SERVICE EXTRACTION

Status: `SOURCE_COMPLETE`; static checks only. Database and browser verification
remain `DATABASE_STATUS_UNVERIFIED` and `MANUAL_CHECK_REQUIRED`.

## Scope completed

Customer cancellation orchestration was moved from
`backend/src/modules/orders/orders.service.ts` to
`backend/src/modules/orders/cancellation.service.ts`. The existing route still
calls `ordersService.cancelCustomerOrder` through a delegated compatibility
property, so the URL and response contract are unchanged.

The extracted flow preserves:

- row locking and customer ownership enforcement;
- cancellation eligibility for pending orders with `UNPAID` or `FAILED`
  payment state;
- shared reservation release behavior;
- parent order status update and status history;
- child ShopOrder cancellation/history;
- transaction commit/rollback and the existing released-item result.

No new cancellation eligibility rule, refund rule, quota rule or inventory
algorithm was introduced. The shared reservation service remains the authority
for release idempotency and inconsistency detection.

## Safety notes

- No migration was run and no database was connected to or mutated.
- No automatic business test was created or executed.
- Manual cancellation and stock-release verification remains
  `MANUAL_CHECK_REQUIRED`.

## Deferred

- `DEFERRED_TO_PHASE_58`: order query service.
- `DEFERRED_TO_PHASE_59`: inventory reservation boundary hardening.
- `DEFERRED_TO_PHASE_60`–`DEFERRED_TO_PHASE_63`: commission, settlement,
  idempotency and complaint/refund interaction review.

