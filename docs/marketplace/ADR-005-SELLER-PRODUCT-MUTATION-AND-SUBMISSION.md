# ADR-005 — Seller Product Mutation and Submission

**Status:** Accepted  
**Task:** SELLER-005  
**Date:** 2026-07-27

## Context and lifecycle split

Seller catalog mutation requires a minimal lifecycle before the Admin
moderation feature exists. SELLER-005 therefore owns `DRAFT`,
`PENDING_REVIEW`, `PUBLISHED`, `REJECTED`, and `SUSPENDED` foundations plus
submission. SELLER-006 still owns the Admin moderation inbox, approve/reject,
suspend/re-publish transitions, moderation history, and moderation UI.

Migration `0103_seller_product_mutation_and_submission.sql` backfills every
existing GymFit Official Product, including Product ID 0, to `PUBLISHED`
without changing `is_active`, IDs, Shop, Brand, Category, Variant, Image, or
Inventory. `is_active` and `moderation_status` remain separate concepts.
Public visibility requires both active and published state plus an active Shop.
Seller-created Products are inactive `DRAFT`s and Sellers cannot publish.

## Ownership and Brand resolution

`Products.shop_id` remains the only ownership authority. Variant and Image
inherit through Product; Inventory inherits through Variant → Product.
Cross-Shop resources return 404.

A Product has exactly one Brand source: active `brand_id` or an owned pending
`brand_request_id`. BrandRequest approval resolves linked DRAFT/REJECTED
Products to the official Brand in the same transaction, clears the request,
records audit metadata, and never submits or changes moderation state.

## Mutation policies

- Product core, Variant, and Image mutations are allowed only for an active
  Shop's DRAFT/REJECTED Product.
- Submission locks and validates Category, resolved Brand, active/default
  Variant invariants, Inventory rows and values, and exactly one primary image.
- Inventory adjustment is independent of content review and remains available
  to the owner in every Product/Shop state. The existing transactional row lock,
  derived `available`, immutable adjustment ledger, and reservation floor are
  retained.
- Variant deletion cannot remove the final Variant, a reserved Variant, or a
  Variant referenced by commerce.
- A DRAFT/REJECTED Product may be hard-deleted only with no OrderItem,
  reservation, or immutable Inventory adjustment history. Child rows are
  removed transactionally; validated local image cleanup occurs after commit.
- Images reuse the Admin Sharp/WebP pipeline, current file-size limit and
  eight-image cap. The first image is primary; primary replacement is
  deterministic and transactional.

All Seller mutations write domain AuditLogs without secrets, file bytes, or
filesystem paths. The minimal frontend consumes these APIs but is not a
security boundary.
