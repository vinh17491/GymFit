# PHASE 60 — COMMISSION FLOW REVIEW

Status: `SOURCE_COMPLETE`; no code change was required after source review.
Database and browser verification remain `DATABASE_STATUS_UNVERIFIED` and
`MANUAL_CHECK_REQUIRED`.

## Verified current flow

1. Checkout reads the current `default_commission_rate_bps` inside the checkout
   transaction.
2. Each created `ShopOrder` stores:
   `commission_rate_snapshot`, `commission_base_amount`, `commission_amount`,
   `seller_net_before_adjustment` and `commission_snapshotted_at`.
3. Delivered-order settlement creation copies those stored ShopOrder values into
   `ShopOrderSettlements`.
4. Settlement reporting and batch validation read the stored settlement fields;
   they do not call the current commission configuration to recalculate an old
   order.

This satisfies the phase boundary: historical orders use their stored snapshot,
not a later configuration value. The existing `ordersService` facade and
checkout/payment/query/cancellation boundaries remain unchanged.

## Preserved behavior

- basis-point configuration validation remains centralized in
  `loadCommissionConfiguration`;
- commission is calculated once per ShopOrder at checkout;
- settlement amount fields remain snapshot-driven;
- no bank integration, settlement transition or retry behavior was changed;
- no applied migration was edited.

## BUSINESS_RULE_REQUIRES_CONFIRMATION

The current code calculates commission from the ShopOrder merchandise subtotal
before ParentOrder compensation-voucher discount. Requirements do not establish
whether vouchers, refunds, complaints or later adjustments should change the
commission base. Existing behavior is preserved until the business owner
confirms the rule; no new calculation was invented in this phase.

## Safety notes

- No migration was run and no database was connected to or mutated.
- No automatic business test was created or executed.
- Manual commission/settlement verification remains `MANUAL_CHECK_REQUIRED`.

## Deferred

- `DEFERRED_TO_PHASE_61`: settlement flow review.
- `DEFERRED_TO_PHASE_62`: payment/refund/settlement idempotency hardening.
- `DEFERRED_TO_PHASE_63`: complaint/refund interaction review.
- `DEFERRED_TO_PHASE_64`: Marketplace manual checkpoint.

