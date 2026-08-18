# GymFit Pass 2 Payment and Order State Matrix

Status: source-level contract; live database and business-flow verification
remain `DATABASE_MANUAL_CHECK_REQUIRED` and `MANUAL_CHECK_REQUIRED`.

## Phase 91 baseline

The following matrix was read from the order, payment, cancellation,
reservation, seller-fulfillment, refund and settlement modules before the Pass 2
payment changes. It records source behavior, not a claim about the live
database.

| Actor or flow | Observed source transition | Transaction boundary |
|---|---|---|
| Customer payment notification | `UNPAID -> PENDING`; repeated `PENDING` returned `ALREADY_PENDING`; `FAILED` instructed Admin reset to `UNPAID`. | The order update and payment history are committed together; mail is best effort after commit. |
| Admin payment update | `PENDING -> PAID`, `PENDING -> FAILED`, `UNPAID -> PAID`, `PAID -> REFUNDED`, and previously `FAILED -> UNPAID`. | Order/payment history, child-state changes, reservation release and cancellation are in one transaction. |
| Payment failure | Payment moved to `FAILED`, active reservations were released, ShopOrders were cancelled, then the Parent Order was cancelled and history was written. | One transaction with rollback on failure. |
| Customer cancellation | `PENDING + UNPAID` or `PENDING + FAILED` could cancel; reservation release, Parent cancellation, ShopOrder cancellation and history were one transaction. | One transaction with rollback on failure. |
| Admin order cancellation | Pending-payment and paid orders were rejected; unpaid/failed orders could be cancelled through the order endpoint. | One transaction with reservation release and child cancellation. |
| Reservation release | Each unreleased item locks its inventory row, decrements `reserved`, marks the item released and fails closed on an inconsistent count. | Caller-owned transaction. |

## Invalid combinations

These combinations are not valid for the canonical flow and require review if
found in a legacy database:

- `Order CANCELLED + Payment PENDING`;
- `Order CANCELLED + Payment PAID` when the payment endpoint is attempting to
  confirm the order;
- `Order CANCELLED + active reservation`;
- `Payment FAILED + active order`;
- `Payment FAILED + active reservation`;
- `Payment PENDING` followed by a customer notification after the Parent Order
  is cancelled.

The application must not silently repair these combinations at startup.
Documented policy: `LEGACY_PAYMENT_STATE_REQUIRES_REVIEW`.

## Pass 2 target rules

- `FAILED` is terminal for the order that failed. The payment endpoint no longer
  supports `FAILED -> UNPAID`; the customer must use a new checkout.
- Customer payment notification is valid only while the Parent Order is still
  `PENDING`. A valid repeated `PENDING` request remains idempotent; a cancelled
  or otherwise non-payable order returns a safe `409` business error.
- `UNPAID -> PAID` and `PENDING -> PAID` require the Parent Order not to be
  `CANCELLED` and require every order-item reservation to remain active.
- Confirmation never re-reserves inventory and never reconstructs an order.
- `FAILED` processing remains one transaction in this order: payment `FAILED`,
  reservation release, ShopOrder cancellation, Parent Order cancellation and
  history.

## Manual verification required

The following cases remain manual and were not run in this task:

1. `UNPAID -> PENDING`;
2. `PENDING -> PAID` with an active reservation;
3. `PENDING -> FAILED` and atomic cancellation/release;
4. `FAILED` cannot reset to `UNPAID`;
5. a cancelled order cannot accept customer payment notification;
6. a cancelled order cannot be marked `PAID`;
7. released reservations cannot be marked `PAID` without an implicit re-reserve.
