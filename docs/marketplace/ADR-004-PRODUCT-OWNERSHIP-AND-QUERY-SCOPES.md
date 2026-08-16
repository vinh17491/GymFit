# ADR-004 — Product Ownership and Query Scopes

**Status:** Accepted  
**Task:** SELLER-004  
**Date:** 2026-07-27

## Context

SELLER-002 migration `0101_shop_foundation_and_product_ownership.sql` already
created the marketplace Shop model, assigned the legacy catalog to GymFit
Official, and made `Products.shop_id` a required foreign key with the composite
index needed by public and Seller queries. SELLER-004 therefore hardens
application-level ownership without repeating that migration.

## Decision

`Products.shop_id` is the single source of catalog ownership. A Seller's Shop is
resolved only from the authenticated User ID. Client-supplied `shop_id`,
`owner_user_id`, or Seller IDs are never ownership selectors.

Child ownership is inherited:

- Variant → Product → Shop
- ProductImage → Product → Shop
- Inventory → Variant → Product → Shop

No `shop_id` is duplicated on ProductVariants, ProductImages, or Inventory.
Reusable guards return a domain-safe 404 for a missing or cross-Shop resource.

The three query scopes are intentionally distinct:

- Public: active Product whose Shop is `ACTIVE`; existing catalog visibility
  conditions still apply.
- Seller: every Product belonging to the authenticated Seller's Shop, including
  inactive Products and Products of a suspended Shop.
- Admin: global catalog, including active/inactive Products and
  active/suspended Shops.

Suspending a Shop changes public visibility only. It does not mutate
`Product.is_active`, inventory, or ownership. Reactivation makes previously
active Products public again.

`GET /api/seller/products` and `GET /api/seller/products/:productId` are
read-only in SELLER-004. Seller Product, Variant, Image, and Inventory mutations
are deferred to SELLER-005. GET ownership enforcement does not create synthetic
audit events; existing mutation audit behavior remains authoritative.

## Migration decision

No database migration required. Audit confirmed the NOT NULL column, FK, and
`IX_Products_Shop_Active(shop_id,is_active,id)` from `0101`; Product ownership
has no nulls or orphans. Canonical migration state remains nine applied, zero
pending, and zero checksum mismatches. A `0103` file was not created.

## Consequences

Public and Seller filtering occurs in parameterized SQL rather than after
fetching. Admin-created Products still resolve GymFit Official by
`system_key='GYMFIT_OFFICIAL'`, never by a numeric constant, and legacy Admin
payloads cannot transfer ownership. The minimal Seller UI only demonstrates
real scoped reads; frontend access control is not a security boundary.
