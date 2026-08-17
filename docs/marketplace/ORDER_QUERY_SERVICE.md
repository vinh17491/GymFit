# PHASE 58 — ORDER QUERY SERVICE

Status: `SOURCE_COMPLETE`; static checks only. Database and browser verification
remain `DATABASE_STATUS_UNVERIFIED` and `MANUAL_CHECK_REQUIRED`.

## Scope completed

The existing Order read operations were moved from
`backend/src/modules/orders/orders.service.ts` to
`backend/src/modules/orders/query.service.ts`:

- `getCustomerOrder`;
- `getReservationMetadata`;
- `listCustomerOrders`.

`ordersService` is now a compatibility facade that delegates to the phase-owned
checkout, payment, cancellation and query services. Existing routes and public
URLs remain unchanged.

## Preserved boundaries

- `getCustomerOrder` still checks the authenticated user against the order
  owner before reading child items and shop-order detail.
- `listCustomerOrders` still scopes by `o.user_id=@userId`, preserves validated
  status filters, pagination and sort direction.
- Reservation metadata still derives cancellation reason from the existing
  status-history notes.
- Existing response shapes, bank-transfer public configuration and read-only
  SQL queries are unchanged.

No Seller/Admin query API was invented in this phase; only currently existing
Order read operations were extracted. No inventory, commission, settlement,
refund or complaint policy was changed.

## Safety notes

- No migration was run and no database was connected to or mutated.
- No automatic business test was created or executed.
- Manual IDOR/owner-filter and Marketplace verification remain
  `MANUAL_CHECK_REQUIRED`.

## Deferred

- `DEFERRED_TO_PHASE_59`: inventory reservation boundary hardening.
- `DEFERRED_TO_PHASE_60`–`DEFERRED_TO_PHASE_63`: commission, settlement,
  idempotency and complaint/refund interaction review.

