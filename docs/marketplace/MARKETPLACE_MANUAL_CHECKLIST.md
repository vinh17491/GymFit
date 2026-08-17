# PHASE 64 — MARKETPLACE MANUAL CHECKPOINT

Status: `MANUAL_CHECK_REQUIRED`. Codex did not operate a browser, authenticated
user session, or live database for this checkpoint. No item below is marked
`PASS`.

## Safety prerequisites

- [ ] `MANUAL_CHECK_REQUIRED` — Confirm the target environment and database are
  disposable or explicitly approved for development verification. Do not use a
  canonical database for destructive or retry testing.
- [ ] `MANUAL_CHECK_REQUIRED` — Confirm test accounts, shops, products, variants
  and inventory fixtures are identified without changing canonical business
  data.
- [ ] `MANUAL_CHECK_REQUIRED` — Confirm the backend/frontend origin and cookie
  topology before checking authenticated requests.

## Checkout and multi-shop flow

- [ ] `MANUAL_CHECK_REQUIRED` — Browse products as a guest and verify product,
  variant, image and stock information.
- [ ] `MANUAL_CHECK_REQUIRED` — As an authorized Member/Coach buyer, add items
  from at least two shops and verify cart ownership and quantities.
- [ ] `MANUAL_CHECK_REQUIRED` — Submit one checkout and verify one parent order,
  one ShopOrder per shop, item snapshots, commission snapshots, reservation
  quantities and cart cleanup.
- [ ] `MANUAL_CHECK_REQUIRED` — Retry checkout with a stale cart version and
  verify the conflict does not create a second order or reservation.
- [ ] `MANUAL_CHECK_REQUIRED` — Verify seller and buyer cannot read another
  user's order, ShopOrder, complaint, refund or settlement by changing an id.

## Payment and cancellation

- [ ] `MANUAL_CHECK_REQUIRED` — Submit payment notification and verify the
  allowed state transition, history and user-visible response.
- [ ] `MANUAL_CHECK_REQUIRED` — Repeat the same payment transition and verify it
  does not create duplicate financial history or release stock twice.
- [ ] `MANUAL_CHECK_REQUIRED` — Cancel an eligible order/ShopOrder and verify
  reservation release, status history and response.
- [ ] `MANUAL_CHECK_REQUIRED` — Retry cancellation and verify no double release,
  duplicate refund record or second status transition occurs.
- [ ] `MANUAL_CHECK_REQUIRED` — Verify invalid payment/cancellation transitions
  return safe conflict responses without leaking SQL or stack details.

## Fulfillment and inventory

- [ ] `MANUAL_CHECK_REQUIRED` — Exercise the seller/admin fulfillment sequence
  through the currently supported states and verify ownership checks.
- [ ] `MANUAL_CHECK_REQUIRED` — Verify delivery creates exactly one settlement
  record for each delivered ShopOrder.
- [ ] `MANUAL_CHECK_REQUIRED` — Verify concurrent or repeated reservation
  release cannot make `reserved` negative or release the same item twice.
- [ ] `MANUAL_CHECK_REQUIRED` — Verify replacement inventory consumption is
  applied once and produces one inventory adjustment.

## Complaint, replacement and refund

- [ ] `MANUAL_CHECK_REQUIRED` — Create one eligible complaint and verify the
  complaint window, affected quantity and owner boundary.
- [ ] `MANUAL_CHECK_REQUIRED` — Verify a complaint in `OPEN`/`UNDER_REVIEW`
  does not hold settlement before a Seller-fault decision.
- [ ] `MANUAL_CHECK_REQUIRED` — Decide Seller fault and verify one replacement,
  settlement `HELD` metadata and immutable history.
- [ ] `MANUAL_CHECK_REQUIRED` — Exercise replacement state transitions,
  repeated transition behavior and failure reason validation.
- [ ] `MANUAL_CHECK_REQUIRED` — Verify a failed Seller-fault replacement can
  create one pending refund fallback and that a repeated request cannot create a
  second refund.
- [ ] `MANUAL_CHECK_REQUIRED` — Complete the refund through the approved manual
  process, resolve the complaint and verify hold release only when no active
  Seller-fault complaint blocks it.
- [ ] `MANUAL_CHECK_REQUIRED` — Verify refund, replacement and complaint event
  history cannot be edited or deleted through the application.

## Settlement and financial safety

- [ ] `MANUAL_CHECK_REQUIRED` — Verify commission snapshot and payable amount
  remain stable for an existing ShopOrder when current settings change.
- [ ] `MANUAL_CHECK_REQUIRED` — Refresh eligibility and verify only eligible,
  unheld settlements can enter a batch.
- [ ] `MANUAL_CHECK_REQUIRED` — Create a settlement batch and verify each
  settlement can belong to only one batch item.
- [ ] `MANUAL_CHECK_REQUIRED` — Retry `mark-paid` and verify a paid batch is not
  credited twice and payable snapshots cannot be changed after selection.
- [ ] `MANUAL_CHECK_REQUIRED` — Retry an adjustment apply/void operation and
  verify no `DOUBLE_CREDIT`, `DOUBLE_DEBIT` or `DOUBLE_RELEASE` occurs.
- [ ] `MANUAL_CHECK_REQUIRED` — Verify no real bank transfer, automatic payout,
  or unapproved settlement policy is exercised.

## Required evidence and unresolved policy

- [ ] `MANUAL_CHECK_REQUIRED` — Record request/response evidence without storing
  passwords, JWTs, refresh cookies, API keys or raw sensitive conversation data.
- [ ] `MANUAL_CHECK_REQUIRED` — Record any business ambiguity as
  `BUSINESS_RULE_REQUIRES_CONFIRMATION`; do not infer refund, hold, quota,
  commission or settlement rules from a failed manual step.
- [ ] `MANUAL_CHECK_REQUIRED` — After user verification, update this checklist
  with narrowly scoped evidence. Do not infer `PRODUCTION_SAFE`,
  `PRODUCTION_READY`, `FULLY_SECURE` or `FULLY_VERIFIED` from this checklist.

## Deferred

- `DEFERRED_TO_PHASE_65`: frontend route inventory.
