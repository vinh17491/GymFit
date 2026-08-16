# ADR-007 — Marketplace Search and Shop Page

Status: Accepted for SELLER-007.

## Decision

All public Product reads use the shared SQL visibility scope: Product is active and `PUBLISHED`, its owning Shop exists and is `ACTIVE`, and it has at least one active Variant. The same marketplace service backs `GET /api/products`, Product detail, and the Product collection embedded by `GET /api/shops/:shopSlug`. Seller and Admin management queries remain independent of this public scope.

Search normalizes by trimming and collapsing whitespace, limits the normalized query to 120 characters, and searches Product name/slug, Brand, Category, Shop name, and active Variant SKU. SQL parameters carry all client values. Relevance is deterministic: exact Product name, name prefix, name contains, Brand/Category/Shop match, then creation time and Product ID. Sort values are a fixed whitelist; no client column or SQL fragment is accepted.

Category, Brand, Shop slug, verified Shop, price, availability, sort, and pagination filters are applied in SQL. Price range matches when at least one active Variant's effective sell price is in range. Card `minPrice` and `maxPrice` aggregate all active Variant effective prices. `price_asc` uses minimum price and `price_desc` maximum price. A Product is in stock only when at least one active Variant has `Inventory.available > 0`; reserved quantity is never exposed.

Pagination uses database `OFFSET/FETCH`, a Product-level count, and Product ID as a stable tie-break. Variant, Inventory, image, Brand, Category, and Shop data are aggregated or joined in the same query, preventing duplicate cards and N+1 card queries.

Public Product cards expose Product identity, safe Brand/Category data, primary image, real price range, availability summary, and a safe Shop summary (`id`, `name`, `slug`, `logoUrl`, `isVerified`). Detail adds public images, active Variants and Variant availability. Neither response exposes moderation state/reasons/history, reviewer, Shop owner, pickup address, system key, reserved Inventory, credentials, or sessions.

The public Shop endpoint returns only an `ACTIVE` Shop's safe profile and calls the shared marketplace query with the path slug forcibly applied. A query parameter cannot override that path. Suspending a Shop hides both its profile and all its Products; reactivation only restores Products that are independently active and `PUBLISHED`.

## Database decision

**No database migration required.** Existing indexes cover Shop status/verification, Product Shop/active/moderation access, Product Variant lookup, Inventory's unique Variant lookup, Product image lookup, Brand, and Category. SELLER-007 creates no placeholder `0105` and does not duplicate an index. Canonical remains 11 applied migrations, 0 pending, 0 checksum mismatch.

## Scope

The implementation uses parameterized SQL and existing SQL Server capabilities. It does not add Elasticsearch, full-text infrastructure, AI/vector search, ratings/reviews, recommendations, Multi-Shop Cart, Parent Order/ShopOrder, payment, fulfillment, commission, or settlement. The frontend is deliberately minimal and URL-driven; backend acceptance and privacy rules are authoritative regardless of presentation.
