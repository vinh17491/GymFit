# ADR-002 — Shop Foundation and Product Ownership Baseline

**Status:** Accepted  
**Task:** SELLER-002  
**Date:** 2026-07-27

## Context

SELLER-002 requires creation of GymFit Official and assignment of every existing
Product to a Shop. The roadmap also described `Products.shop_id` under
SELLER-004. Those statements cannot both be implemented literally: assignment
is impossible before the ownership column and constraint exist.

## Decision

- SELLER-002 owns the database ownership baseline: `Shops`,
  `Products.shop_id`, the legacy Product backfill, the FK, NOT NULL constraint,
  and essential indexes.
- SELLER-004 must not recreate `Products.shop_id`. It will implement
  Seller-owned Product CRUD/query scopes and ownership enforcement for Product,
  Variant, Image and Inventory.
- GymFit Official is a system Shop identified by
  `system_key=GYMFIT_OFFICIAL`, slug `gymfit-official`, with no human owner. It
  is ACTIVE and verified, and cannot be suspended or unverified by ordinary
  APIs.
- A non-system Shop has exactly one Seller owner; a Seller owns at most one
  Shop. Shop transfer, deletion and Shop staff are not supported.
- Shop status is deliberately limited to ACTIVE and SUSPENDED. A suspended
  Shop remains visible to its owner and Admin but is excluded from public Shop
  and Product queries.
- Seller approval creates the Seller Shop inside the same transaction as role
  promotion, session revocation, application history and audit. Shop failure
  rolls back the approval.
- Legacy Admin Product create resolves GymFit Official by `system_key`; it does
  not accept client-selected Product ownership or hard-code a numeric Shop ID.
- The frontend is a minimal proof of real API behavior. This presentation
  strategy does not weaken database, security or business acceptance.

## Consequences

All existing Product IDs, including ID 0, slugs, variants, inventory and images
remain unchanged. Every Product has one Shop. Public catalog compatibility is
preserved while suspended Shop products are no longer public.

No Seller Product CRUD, BrandRequest, moderation, ShopOrder, finance, Shop
delete, owner transfer or staff model is introduced by this decision.
