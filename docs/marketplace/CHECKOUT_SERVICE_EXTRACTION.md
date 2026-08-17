# PHASE 55 — CHECKOUT SERVICE EXTRACTION

Status: `SOURCE_COMPLETE`; static checks only. Browser and database verification
remain `MANUAL_CHECK_REQUIRED` and `DATABASE_STATUS_UNVERIFIED`.

## Scope completed

Checkout orchestration was moved from `backend/src/modules/orders/orders.service.ts`
to `backend/src/modules/orders/checkout.service.ts`. The public
`ordersService.createOrder` property remains available to the existing routes,
so the API contract and route URL are unchanged.

The extracted boundary preserves the existing transaction and business flow:

- active-user and cart-version validation;
- cart and item locks during checkout;
- product, variant, shop and inventory checks;
- minor-unit pricing and compensation-voucher handling;
- ParentOrder creation and logistics history;
- commission configuration snapshot and multi-shop `ShopOrders`;
- `OrderItems` creation and atomic inventory reservation;
- cart cleanup/version increment;
- commit/rollback behavior and the existing `CreateOrderResult` shape.

No payment status transition, cancellation, order query, inventory lifecycle,
commission configuration, settlement or refund policy was redesigned in this
phase. Those scopes remain deferred to their ordered checkpoints.

## Safety notes

- No migration was run and no database was connected to or mutated.
- No business rule was invented; existing checkout behavior is preserved.
- No automatic business test was created or executed.
- `MANUAL_CHECK_REQUIRED` remains until the user verifies checkout in the
  intended environment.

## Deferred

- `DEFERRED_TO_PHASE_56`: payment service extraction.
- `DEFERRED_TO_PHASE_57`: cancellation service extraction.
- `DEFERRED_TO_PHASE_58`: order query service extraction.
- `DEFERRED_TO_PHASE_59`: inventory reservation boundary hardening.
- `DEFERRED_TO_PHASE_60`: commission flow review.
- `DEFERRED_TO_PHASE_61`: settlement flow review.
- `DEFERRED_TO_PHASE_62`: settlement idempotency hardening.
- `DEFERRED_TO_PHASE_63`: complaint/refund interaction review.

