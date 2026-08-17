# PHASE 63 — COMPLAINT / REFUND / REPLACEMENT INTERACTION

Status: `SOURCE_COMPLETE`; this is a source/static review only. Database state
is `DATABASE_STATUS_UNVERIFIED` and browser/financial verification remains
`MANUAL_CHECK_REQUIRED`.

## Current interaction flow

- A buyer can create one complaint per `OrderItem` after delivery while the
  complaint window is open. `OPEN` and `UNDER_REVIEW` do not hold settlement.
- An Admin `SELLER_FAULT` decision moves the complaint to
  `REPLACEMENT_REQUIRED`, creates one replacement, and changes a `PENDING` or
  `ELIGIBLE` settlement to `HELD` with `hold_source_type=COMPLAINT` and the
  complaint id as the source.
- Replacement inventory is consumed when the Seller marks the replacement
  `READY_FOR_PICKUP`. The replacement state guard and inventory adjustment keep
  the operation from consuming the same replacement twice.
- A replacement may proceed through the existing logistics states. A delivered
  replacement resolves the complaint as `REPLACEMENT` and attempts to release
  the matching complaint hold.
- A failed Seller-fault replacement enables the Admin refund fallback. The
  fallback creates one `PENDING` complaint refund and records a complaint event.
  `REFUND` complaint resolution requires that refund to be `COMPLETED` first.
- Complaint resolution, buyer-fault rejection, and delivered replacement use
  the existing hold-release helper. It releases only a `HELD` settlement whose
  source is the same complaint and leaves the settlement held when another
  active Seller-fault complaint for the ShopOrder remains.

## Database constraints reviewed

- `MarketplaceComplaints` has one complaint per `order_item_id`.
- `ComplaintReplacements` has one replacement per `complaint_id`.
- `Refunds` has one complaint refund per non-null `complaint_id` through
  `UX_Refunds_Complaint`.
- Complaint and replacement event histories are immutable through database
  triggers.
- Settlement hold state requires matching hold metadata, and settlement status
  history is immutable.

These constraints prevent duplicate persisted complaint, replacement, and
complaint-refund objects, but `TABLE/UNIQUE CONSTRAINT EXISTS` is not treated as
a complete applied-migration or runtime verification result.

## Retry and financial boundary

- Repeating a completed replacement transition returns the existing detail;
  invalid transitions are rejected.
- Repeating a refund status update at the same status returns the existing
  detail. The PHASE 62 expected-state update also rejects a concurrent status
  change without applying a second transition.
- Creating the same complaint refund twice is prevented by the unique database
  constraint, but the current service contract does not promise that a repeated
  POST returns the original refund. It remains a safe conflict rather than a
  second refund. Changing that response into an idempotent lookup would be a
  contract/business-policy decision and is not invented here.
- Refund creation does not silently credit/debit settlement balances. Settlement
  hold release remains tied to the existing complaint resolution flow; actual
  refund status and settlement adjustment remain separate operations.
- No bank integration, automatic payout, or new refund/settlement rule was
  introduced.

## BUSINESS_RULE_REQUIRES_CONFIRMATION

- Whether a failed replacement refund should hold a settlement until refund
  completion, until complaint resolution, or for another explicit period.
- Whether refund amount changes commission, seller pending balance, available
  balance, or a later settlement adjustment, and the exact accounting order.
- Whether a repeated refund-fallback request should return the existing refund,
  reject with conflict, or require a future explicit idempotency key.
- Whether replacement quantity and affected complaint quantity may differ in
  partial-refund/partial-replacement cases.
- Complaint hold duration and how concurrent complaints for one ShopOrder
  interact with refund, replacement, and settlement eligibility.

The current implementation is preserved until these rules are confirmed.

## PHASE 63 outcome

- No source code, migration, or database was changed in this review.
- No destructive or canonical database operation was performed.
- No automatic business test was created or executed.

## Deferred

- `DEFERRED_TO_PHASE_64`: Marketplace manual checkpoint.
- `MANUAL_CHECK_REQUIRED`: browser, database, retry/concurrency, refund and
  settlement verification.
