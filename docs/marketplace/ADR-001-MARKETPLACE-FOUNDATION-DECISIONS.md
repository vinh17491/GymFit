# ADR-001 — Marketplace Foundation Decisions

Status: Accepted for Seller implementation  
Date: 2026-07-26

## Context

GymFit is extending its single-store B2C commerce foundation into a managed multi-vendor B2C marketplace. SELLER-001 introduces only Seller Application and the `seller` primary role. It does not create Shops or change Product/Order ownership.

The designated authoritative task mapping is `docs/marketplace/GYMFIT_SELLER_MARKETPLACE_FULL_ROADMAP.md`. Impact-matrix task numbers in SELLER-000 are discovery estimates and do not override that roadmap. At the start of SELLER-001 the designated roadmap file was absent from the working tree; the locked SELLER-001 scope in the task contract was used without inventing mappings for later tasks.

## Decisions

1. Migration allocation is:
   - Coach: `0007`–`0049`
   - Shared: `0050`–`0099`
   - Seller: `0100`–`0199`
   - SELLER-001 uses `0100_seller_application_role_foundation.sql`.
2. GymFit continues to use one primary User role: `member`, `coach`, `admin`, or `seller`.
3. `GymFit Official` will be a system Shop that may have no human owner. It is not created in SELLER-001; Shop creation belongs to SELLER-002.
4. Existing Product ID `0` is preserved. Cart/Checkout compatibility is not changed in SELLER-001.
5. Parent Order/ShopOrder, reservation partitioning, payment allocation, fulfillment, and related schema changes are outside SELLER-001.
6. Applied migrations `0001`–`0006` are immutable and must not be renumbered or edited.

## Consequences

- Seller approval atomically changes a Member to Seller, increments `token_version`, and revokes active AuthSessions.
- Seller is not a Commerce buyer in the MVP. Coach Commerce buyer authorization remains unchanged in SELLER-001.
- No Shop, Product ownership, Seller catalog, Seller Order, or settlement data may be fabricated by the Seller foundation UI.
- Later tasks must use the official roadmap rather than preliminary SELLER-000 task labels.

