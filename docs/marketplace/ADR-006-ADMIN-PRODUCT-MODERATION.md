# ADR-006 — Admin Product Moderation

## Status

Accepted for SELLER-006.

## Scope authority

The marketplace Roadmap defines SELLER-006 as Admin Product Moderation. Earlier Discovery task-number mapping does not bring Cart, Parent Order, ShopOrder, payment, fulfillment, logistics, or settlement architecture into this task.

## Decision

- Valid Admin transitions are `PENDING_REVIEW → PUBLISHED`, `PENDING_REVIEW → REJECTED`, `PUBLISHED → SUSPENDED`, and `SUSPENDED → PUBLISHED`.
- Seller submit/resubmit records `DRAFT|REJECTED → PENDING_REVIEW` history from migration 0104 onward.
- `reviewed_at`, `published_at`, and `reviewed_by_user_id` describe the current moderation decision. History is stored append-only in `ProductModerationHistory`.
- Existing 167 GymFit Official Products remain PUBLISHED with null legacy review/publish timestamps and no fabricated history or reviewer.
- Moderation endpoints reject system-Shop Products. GymFit Official continues through the legacy Admin Catalog workflow.
- Approve/re-publish set `is_active=1`; reject/suspend set `is_active=0`. These fields remain conceptually separate, but Seller Product transitions synchronize them.
- Every Admin transition locks the Product, rechecks the expected state and applicable readiness/Shop rules, updates Product, inserts history, and inserts AuditLogs in one transaction.
- Approve and re-publish use the same readiness evaluator as Seller submission: active Category and Brand, resolved BrandRequest, valid/default Variants, Inventory invariants, and exactly one primary image.
- Shop SUSPENDED blocks approve/re-publish but still permits Admin rejection of PENDING_REVIEW. Seller Inventory adjustment remains allowed.
- Seller receives reason, timestamps, and neutralized history labels only; raw reviewer identity and Admin private data are not exposed.
- Public and purchase eligibility require PUBLISHED Product, active Product, active Shop, active Variant, and sufficient Inventory. Stale carts are rejected before reservation and database price remains authoritative.
- History is protected from UPDATE and DELETE by a database trigger.
- Frontend is intentionally minimal and is not a security boundary.

## Consequences

Admin moderation is explicit, concurrency-safe, auditable, and compatible with legacy GymFit Official catalog data. Marketplace storefront expansion and Multi-Shop Cart/ShopOrder remain future tasks.
