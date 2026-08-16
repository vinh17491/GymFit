# ADR-003 — Brand Request and Moderation

**Status:** Accepted  
**Date:** 2026-07-27

Brands are a global Admin-managed taxonomy, not Shop-owned data. Sellers cannot
write Brands directly; they submit BrandRequests from their authenticated Shop.

Brand identity uses `normalized_name`: Unicode NFC, trim, deterministic
lowercase, and collapsed whitespace. Display names are preserved. Exactly one
active Generic Brand exists, identified by `is_generic`, and cannot be disabled
or deleted.

Only one PENDING request may exist globally per normalized name. Approval locks
the request and creates a Brand when none exists or resolves to the existing
Brand otherwise. Reject requires a reason. Both paths are transactional,
audited, and append immutable status history.

BrandRequest has Shop/requester provenance, but Brands have no Shop ownership.
Product-draft linking is deferred to SELLER-005 because Seller Product drafts do
not yet exist. The minimal frontend demonstrates real API behavior without
changing these acceptance rules.
