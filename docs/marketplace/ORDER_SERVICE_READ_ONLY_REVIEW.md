# Order Service Read-Only Review

Status: PHASE 54 CHECKPOINT / READ-ONLY

No Order/Marketplace code was changed in this phase. This document maps the
current behavior before the sequential Phase 55–64 extraction.

## Entry points

Customer routes are in `backend/src/modules/orders/orders.routes.ts` and are
authenticated for Member/Coach roles:

- `POST /api/orders` → `ordersService.createOrder`;
- `GET /api/orders` → expiration sweep, then `listCustomerOrders`;
- `GET /api/orders/:orderId` → expiration sweep, detail and reservation
  metadata;
- `POST /api/orders/:orderId/payment-notification` → `notifyPayment`;
- `PATCH /api/orders/:orderId/cancel` → `cancelCustomerOrder`.

Admin payment status uses the same service through
`admin-orders/admin-orders.routes.ts`. Seller stock/fulfillment uses
`seller-orders/seller-orders.service.ts`; Admin logistics uses
`admin-orders/logistics.service.ts`.

## Current `orders.service.ts` responsibilities

### Checkout (`createOrder`)

The current single service method owns the checkout transaction:

1. lock and validate active buyer/cart and cart version;
2. lock cart items, active published product/variant/shop/inventory rows;
3. calculate minor-unit subtotal and optional compensation-voucher discount;
4. insert Parent `Orders` as `PENDING`/`UNPAID`/`BANK_TRANSFER` with a
   reservation expiry;
5. consume the voucher using an availability guard;
6. load the commission configuration and snapshot each `ShopOrder` commission;
7. insert `ShopOrders`, `ShopOrderStatusHistory` and `OrderItems`;
8. increment inventory `reserved` with an atomic availability predicate;
9. delete cart items and increment the cart version with a count/version guard;
10. commit and return the parent/shop-order summary.

The transaction currently uses the driver default isolation. Cart version,
row locks, reservation guards and SQL row-count checks are part of the
existing compatibility behavior.

### Query (`getCustomerOrder`, `getReservationMetadata`, `listCustomerOrders`)

Customer detail reads the Parent order, owner-checks `user_id`, then reads
items and grouped ShopOrders with refund and compensation-voucher data. List
queries are owner-scoped and support order/payment status, pagination and sort
direction. Metadata derives `AUTO_EXPIRED`, `CUSTOMER_CANCELLED` or
`ADMIN_CANCELLED` from the latest cancellation history note.

### Payment (`notifyPayment`, `updatePaymentStatus`)

- Customer notification locks the order, is idempotent when already `PENDING`,
  rejects invalid states, writes payment history and sends the Admin email only
  after commit.
- Admin transitions are explicitly limited by the current state machine and
  require notes for failure/reset/refund-sensitive transitions.
- `PAID` advances pending ShopOrders to `PENDING_STOCK_CHECK`.
- `FAILED` releases the Parent reservation, cancels child ShopOrders and
  cancels the Parent when needed, with status history.
- `REFUNDED` records the payment status transition; external bank movement is
  not integrated here.

### Cancellation (`cancelCustomerOrder`)

The current customer path requires owner identity, Parent `PENDING` status and
payment `UNPAID` or `FAILED`. It releases item reservations, marks the Parent
cancelled, writes history and cancels active child ShopOrders in the same
transaction.

## Connected financial/inventory boundaries

- `order-reservation.service.ts`: lock-protected release by Parent or
  ShopOrder; `OrderItems.reservation_released_at` is the release marker and
  prevents ordinary double release.
- `order-expiration.service.ts` and runner: selects expired unpaid pending
  Parents, rechecks under lock, releases reservation, cancels children and
  records `AUTO_EXPIRED_RESERVATION`. Runtime interval is centralized in
  `orderReservationConfig`.
- `marketplace-finance.service.ts`: loads commission config; creates one
  settlement per delivered ShopOrder; applies the seven-day eligibility window;
  supports holds, releases, adjustments, batches and manual mark-paid.
- `seller-orders.service.ts`: Seller stock check transitions ShopOrders;
  unable-to-fulfill releases the ShopOrder reservation, creates a pending
  refund, issues the configured compensation voucher and may cancel the Parent
  when no active ShopOrders remain.
- `admin-orders/logistics.service.ts`: fulfillment transitions consume
  `on_hand` and `reserved` on delivery, mark item reservation release, write
  inventory adjustments and create settlements after delivery.
- `refunds.service.ts`: Admin manually transitions `PENDING → COMPLETED /
  FAILED` or `FAILED → PENDING`; it does not call a real bank.
- `complaints.service.ts`: complaint/replacement/fallback-refund flows can
  hold or release settlements and create refund records.

## Safety and idempotency observations

- `DOUBLE_RELEASE`: ordinary reservation release is guarded by the item
  release marker and row-count checks; this boundary must remain intact.
- `DOUBLE_CREDIT` / `DOUBLE_DEBIT`: settlement adjustment, batch mark-paid and
  refund transitions use status/row-count guards and immutable paid snapshots;
  they must not be weakened during extraction.
- `DOUBLE_RELEASE` / inventory: checkout reservation, seller release and
  delivery consumption must remain inside their current transactions with
  lock predicates.
- Checkout has cart-version conflict protection but no explicit client request
  idempotency key. A response-loss retry remains a risk to evaluate in the
  dedicated checkout phase; no new business rule is invented here.
- Customer payment notification is state-idempotent, but email is a
  post-commit side effect and may fail independently of the payment update.

## BUSINESS_RULE_REQUIRES_CONFIRMATION

- External bank transfer/refund execution is manual; no real bank integration
  is authorized by this plan.
- Exact refund/shipping-refund and compensation-voucher semantics for partial
  Seller failure are encoded in current behavior but are not redesigned here.
- Settlement timing, complaint hold duration, carry-forward adjustment policy
  and mark-paid external reference rules must remain current behavior unless a
  product decision explicitly changes them.
- Parent/ShopOrder cancellation and logistics semantics must not be inferred
  from frontend state alone.

## Phase boundary

Phase 54 is read-only. The next phase is checkout extraction only. Payment,
cancellation, query, inventory, commission, settlement and complaint/refund
changes remain `DEFERRED_TO_PHASE_56` through `DEFERRED_TO_PHASE_63`.

Verification status: source/static review complete;
`MANUAL_CHECK_REQUIRED` for checkout, payment, cancellation, fulfillment,
refund and settlement flows.
