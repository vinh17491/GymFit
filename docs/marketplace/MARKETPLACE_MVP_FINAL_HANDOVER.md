# Marketplace MVP Final Handover

Status: `READY WITH VERIFICATION EXCEPTIONS`  
Task: `SELLER-013 — Security, Regression and Final Marketplace Acceptance`  
Baseline: branch `seller_role_add`, commit `182f50eb56537c799f5666a8018d26df0df6797a`  
Migration range: `0100–0111` (plus commerce/auth foundation `0001–0006`)

## Task and verification inventory

| Task | Commit | Migration | Domain | Current evidence |
|---|---|---|---|---|
| SELLER-000 | repository discovery log | none | discovery/decisions | log reviewed |
| SELLER-001 | `6d9dd62`, `1c9b17e` | 0100 | application, Seller role, session handling | current security suite PASS |
| SELLER-002 | `2db9b22` | 0101 | Shop, GymFit Official, Product ownership | security/catalog and canonical integrity PASS |
| SELLER-003 | `5c604cc`, `cb53479` | 0102 | BrandRequest/moderation | RBAC, ownership and rate-limit PASS |
| SELLER-004 | `dc40df3` | none | Product ownership/query scopes | current catalog PASS |
| SELLER-005 | `3daeadb` | 0103 | Seller Product/Variant/Image/Inventory | current catalog/upload PASS |
| SELLER-006 | `ad513f4` | 0104 | Admin Product moderation | current catalog Admin RBAC PASS |
| SELLER-007 | `87924e6` | none | storefront/search/Shop page | current catalog PASS |
| SELLER-008 | `b19b78d` | 0105 | Parent Order/ShopOrder | historical 0104→forward runner PASS, 33 assertions |
| SELLER-008A | `146b188` | 0106 | persistent Cart/merge | current-schema isolated acceptance PASS |
| SELLER-009 | `fc096d6` | 0107 | payment/refund/voucher | current-schema isolated acceptance PASS with deterministic mail |
| SELLER-010 | `b0258b9` | 0108 | fulfillment/hub logistics | current-schema isolated acceptance PASS |
| SELLER-011 | `1a1dfca` | 0109 | commission/settlement/revenue | current-schema isolated acceptance PASS |
| SELLER-011A | `e826035` | 0110 | complaint/fault/replacement | current-schema isolated acceptance PASS |
| SELLER-012 | `182f50e` | 0111 | Product/Shop Review | isolated 52 assertions and canonical integrity PASS |
| SELLER-013 | uncommitted handover work | none | security/regression/handover | API/security/integrity PASS; authenticated browser matrix NOT RUN |

Task-specific epoch runners for SELLER-001–007 are historical artifacts. They must not be run against old schemas with the current application because current services legitimately reference later columns. Current verification uses the consolidated auth/security and catalog/product suites. SELLER-008 is the exception: its backfill proof intentionally seeds at 0104 and migrates forward.

## Architecture and API map

- Onboarding: `/api/seller-applications`, `/api/admin/seller-applications`, `/api/seller/shop`, `/api/admin/shops`.
- Catalog: `/api/seller/products`, `/api/seller/brand-requests`, `/api/admin/product-moderation`, `/api/products`, `/api/shops`.
- Cart/checkout: `/api/cart`, `/api/orders`.
- Payment/refund: buyer payment notification, Admin payment status, `/api/admin/refunds`.
- Fulfillment: `/api/seller/orders` stock/ready actions and Admin hub/parent logistics routes.
- Finance: `/api/seller/finance` and `/api/admin/marketplace-finance`.
- Complaints/replacements: buyer, Seller and Admin complaint routers.
- Reviews: buyer `/api/reviews`, Seller read-only review routes and Admin moderation routes.

Backend `authenticate` verifies signature/issuer/audience, live active User, token version and non-revoked unexpired `AuthSessions` row on every protected request. Router roles and service ownership filters remain authoritative; frontend guards are navigation UX only.

## Database map

- Identity/security: `Users`, `AuthSessions`, `AuditLogs`.
- Seller/catalog: `SellerApplications`, status history, `Shops`, `BrandRequests`, `Products`, `ProductVariants`, `ProductImages`, `Inventory`.
- Cart/order: `Carts`, `CartItems`, `Orders`, `ShopOrders`, `OrderItems`, payment/order/shop histories.
- Recovery: `Refunds`, `CompensationVouchers`, marketplace notifications.
- Logistics: ShopOrder and Parent logistics histories.
- Finance: settlement, adjustment and settlement-batch tables.
- Trust: complaints, complaint/replacement histories, Product/Shop reviews and moderation histories.

Canonical status at handover is 18 applied migrations, 0 pending and 0 checksum mismatches. Highest Seller migration is 0111. No SELLER-013 migration is required.

## Security closure

- Auth/session: 125-assertion isolated suite proves roles, live role recheck, disabled account, refresh rotation/replay, logout and session revocation.
- Ownership: current suites cover Seller Shop/BrandRequest/Product/order/finance/complaint/review scoping and Buyer Cart/Order/complaint/review ownership. Foreign ownership follows the concealed 404 convention.
- Admin-only: route-level Admin guards cover moderation, payment/refund, hub logistics, settlement, complaint fault and review moderation.
- Rate limiting: SellerApplication and BrandRequest mutation limits are backend user+IP limiters. Threshold/window are environment-configurable for deterministic isolated acceptance.
- Uploads: memory-only intake, byte/file-count limits, JPEG/PNG/WebP MIME allowlist, Sharp decode/magic validation, server-generated WebP filenames and ownership checks. SVG/scripts/corrupt images are rejected.
- Audit: important domain mutations use `AuditLogs` and/or immutable histories. Admin role/active mutation commits User update, session revocation and `user.security_updated` audit atomically.
- Privacy/error handling: public DTOs exclude private ownership/contact/finance fields; central 500 serialization hides SQL/stack details; acceptance does not print passwords or tokens.

## Safe acceptance

From `backend/`:

```powershell
$env:SELLER013_SECURITY_ACCEPTANCE='1'
npm run acceptance:seller-013:security
npm run acceptance:seller-013:final -- historical
npm run acceptance:seller-013:final -- marketplace
npm run acceptance:seller-013:final -- integrity
npm run acceptance:seller-013:final -- legacy
```

Mutation suites create a name-guarded disposable database, verify live DB identity and clean it up. Never point mutation suites at `GYMFIT_DB`. Integrity and legacy modes are explicitly read-only canonical checks.

Historical mode runs setup → `migrate --historical-pre-0105` → Product ID 0 historical seed → migrate forward → acceptance → drop.

`MAIL_MODE=acceptance` is accepted only when `NODE_ENV=test` and the configured database name matches the isolated acceptance pattern. It returns a deterministic successful adapter result without SMTP or message content. SELLER-009 injects non-secret Bank/QR acceptance placeholders. Live SMTP remains separately configured through `MAIL_*`; commerce state commits before best-effort delivery.

## Business configuration

- Voucher amount, minimum, expiry and refund policy are rows in `MarketplaceSettings` created by 0107.
- Default commission is `default_commission_rate_bps=500` (5%) in `MarketplaceSettings`; ShopOrder stores a snapshot.
- Settlement eligibility is seven calendar days after delivery; bank payout remains manual and outside the MVP.

## Verification exceptions and known limitations

- Authenticated multi-role browser journeys were not run: the repository has no current Playwright/Cypress harness or safe browser account lifecycle. No credentials were seeded into the canonical database.
- Live SMTP was not exercised; deterministic acceptance passed and mail remains best-effort after transaction commit.
- Frontend has no lint script. Backend lint has warning-only `no-explicit-any` debt. Frontend build retains the Vite large-chunk advisory.
- Carrier API/webhooks, automated bank refunds/payout, full RMA, automated clawback, Seller wallet/escrow, AI moderation and Seller review replies are outside scope.
- Team Summary: `NOT FOUND`.

The safe next action is code review followed by a controlled authenticated browser smoke in a disposable environment. Do not create a new Seller feature task to close these environment-only checks.
