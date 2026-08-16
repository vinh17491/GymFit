# SELLER-000 — Marketplace Repository Discovery

Audit date: 2026-07-26 (Asia/Saigon)  
Target architecture: Managed Multi-vendor B2C Marketplace  
Scope: discovery and read-only verification only; no Seller feature, schema, route, seed, or business-logic implementation.

> Roadmap normalization (SELLER-001): `docs/marketplace/GYMFIT_SELLER_MARKETPLACE_FULL_ROADMAP.md` is the designated authority for task mapping. Task numbers in the matrices below are provisional discovery estimates and do not override that roadmap. SELLER-001 does not create Shop/GymFit Official or change Product ID 0. GymFit Official belongs to SELLER-002; Parent Order/ShopOrder and reservation defects remain deferred to SELLER-008/009.

## 1. Executive Summary

GymFit is a TypeScript monorepository with an Express 4 API, React 18/Vite SPA, SQL Server database, direct `mssql` access, ordered/checksummed SQL migrations, JWT bearer authentication, and Zustand state. Commerce is already normalized around Product → Variant → Inventory → OrderItem and has transactional reservation/payment/order histories. Those foundations are reusable.

Marketplace readiness is **medium-low**. The catalog, image pipeline, inventory invariants, authentication, payment-at-order, and order snapshots can be extended. The current system has no Shop/Seller/Application/Moderation/ShopOrder/Settlement domain, Products have no owner, Cart is browser-only and ungrouped, and one Order has one fulfillment/cancellation state. Order reservation and fulfillment routines operate over every item in an Order, so they cannot support independent shop cancellation unchanged.

Highest risks:

1. Product `id=0` is real and active in `GYMFIT_DB`; public detail supports it, but Cart/Checkout and some admin filters require IDs `> 0`, so Product 0 cannot complete checkout.
2. Current `Orders` has one fulfillment state while marketplace fulfillment must be per ShopOrder.
3. `releaseOrderReservation(orderId)` releases all items in the parent; partial ShopOrder cancellation would over-release.
4. Role is a single constrained string and Commerce Order routes allow only `MEMBER`; adding Seller touches shared auth/session/frontend policy files.
5. The legacy membership `Payments`/`Invoices`/`Coupons` domains are separate from commerce Order payment. Reusing them without an explicit boundary would mix domains.
6. Canonical documentation has count drift: the live read-only audit found 0 commerce Orders and 167 ProductImages, while some status documents report 1 Order or 1 ProductImage.

Recommended overall approach: **EXTEND** existing auth/catalog/inventory/order foundations, introduce Shop and ShopOrder incrementally, preserve `Orders` as the buyer-facing parent and payment aggregate, keep legacy API response shapes through adapters, and allocate Seller migrations in a separate provisional four-digit range.

## 2. Repository Baseline

| Item | Observed value |
|---|---|
| Repository root | `D:/bai/TMĐT/Đồ Án (Gymfit)/gymer` |
| Remote | `origin https://github.com/vinh17491/GymFit.git` (fetch/push) |
| Branch | `seller_role_add` tracking `origin/seller_role_add` |
| HEAD | `97ffca7a7924124c79821f9cf2892d798d4bcc1b` — `feat: redesign role-based dashboards and app shell` |
| Baseline relation | `seller_role_add`, local `main`, `origin/main`, and `origin/seller_role_add` point to the same commit |
| Initial working tree | Clean |
| Detached HEAD | No |
| Backend | Node.js, Express 4, TypeScript, Zod/express-validator |
| Frontend | React 18, TypeScript, Vite 4, React Router 6, Zustand, Axios, Tailwind |
| Package manager | npm with lockfiles at backend/frontend |
| Database/access | SQL Server via `mssql`; no ORM |
| Migrations | `backend/src/scripts/migrate.ts`; ordered `NNNN_description.sql`, SHA-256 checksums, `SchemaMigrations`, per-migration transaction |
| Tests | No test script or conventional unit-test framework in package manifests; one isolated auth/RBAC acceptance script exists |
| Upload/storage | Local filesystem (`uploads`, repository `/image`, backend `public/media`), served by Express |
| Auth/session | JWT access token + opaque rotating refresh record in `AuthSessions`; SPA stores both tokens in `localStorage` |
| Applications | One Express API and one React SPA; no separate Seller service |

Primary evidence: `package.json`, `backend/package.json`, `frontend/package.json`, `backend/src/app.ts`, `backend/src/config/database.ts`, `backend/src/scripts/migrate.ts`, `frontend/src/App.tsx`, and `db/migrations/0001`–`0006`.

## 3. Current Architecture Map

### 3.1 Authentication, User, RBAC, and session

- Roles are lowercase strings `member`, `coach`, `admin`, constrained in `Users.role` and duplicated in backend `UserRole`, frontend `User`, and `accessPolicy`.
- A User has exactly one primary role. Registration always writes `member`; role cannot be mass-assigned through registration.
- `authenticate` verifies HS256 issuer/audience claims, requires `userId`, `sessionId`, and `tokenVersion`, and re-reads active User, current role, token version, and live `AuthSessions` state on every protected request.
- `authorize(...)` is the backend role guard. Admin catalog/product/variant/inventory/order routers apply it at router level.
- Role or active-state changes increment `token_version` and revoke all refresh sessions. Password change does the same, so role changes require a new login.
- Frontend `ProtectedRoute`, `AccessRoute`, `accessPolicy.ts`, and `Sidebar.tsx` are navigation controls only; backend authorization is present for audited commerce APIs.
- Auth state and refresh token are in `localStorage`, not HttpOnly cookies. `session.ts` and `csrf.ts` exist but are not mounted in `app.ts`; they are not part of the active auth flow.
- Email verification is stored but not enforced. No verification or password-reset endpoint was found.
- Admin user security management is `PATCH /api/users/:id/security`; list scope is Admin all, Coach assigned CRM customers, Member self.
- Commerce buyer assumption is explicit: `/api/orders` uses `authorize(UserRole.MEMBER)`. COACH cannot currently place commerce orders despite the proposed rule that MEMBER and COACH are buyers.

MVP impact: retain one primary role, but adding `seller` means a Seller cannot also be a buyer. Add `SELLER` consistently to DB constraint, backend enum/validation, token/session current-role checks, frontend `User`, role home, route policy, sidebar, dashboards, acceptance actors, and admin user management. Existing session revocation behavior is reusable.

### 3.2 Product, Category, Brand, Image

- `Products` has no `shop_id`, owner User, Store, or equivalent ownership field. All writes are Admin-only.
- Public list filters only `p.is_active=1`, then category/brand/price/stock/featured/sale; public variants must be active and have Inventory.
- Product status is booleans (`is_active`, `is_featured`, `is_on_sale`), not a moderation/publish/archive/suspend state machine.
- Category and Brand CRUD is Admin-only. Referenced Category/Brand deletion becomes disable; unreferenced rows are hard-deleted.
- Product delete is hard delete of option/image/inventory/variant/product rows, but a historical FK conflict returns 409. This is not adequate seller archive/moderation behavior.
- Rating and review count are legacy Product columns. No review/comment backend domain was found. Product detail UI renders sample review structures.
- Related-product UI state exists, but the current public Product response does not populate `related_products`.
- Sold count is not modeled; `ProductCard` “Sold Out” means stock unavailable, not a sales aggregate.
- Product image ownership is through Product only. Admin upload accepts JPEG/PNG/WebP MIME, max 8 files, configured per-file size (default 5 MiB), validates decoded Sharp metadata, rotates/converts to WebP, randomizes names under `/uploads/products/{productId}`, stores public URLs, enforces at most 8, supports primary selection and deletion, and prevents path traversal on local deletion.
- Frontend falls back to `/assets/product-placeholder.png`.
- Image endpoints are Admin-only and verify `imageId` belongs to `productId`; they can be reused after adding Shop ownership checks and moderation rules.

Live database facts: 167 Products, IDs 0–166, 167 default Variants, 167 Inventory rows, and 167 ProductImages. Product 0 (`adistar`) is active, has default Variant 1, one image, and available stock 120.

### 3.3 Variant and Inventory

- ProductVariants belong to Product. One active default Variant is enforced by filtered unique index and service invariants.
- Inventory is one row per Variant. `available` is computed as `on_hand - reserved`.
- Checks enforce `on_hand >= 0`, `reserved >= 0`, and `reserved <= on_hand`.
- Admin stock adjustment uses a transaction plus `UPDLOCK,HOLDLOCK`, disallows negative stock and stock below reserved, and appends immutable `InventoryAdjustments`.
- Checkout sorts variant IDs and locks Variant/Inventory rows, reloads active flags/current price, checks availability, creates snapshots, and reserves stock in one transaction.
- No warehouse/shop owner exists. Inventory adjustment history records Admin actor only.

Invariants to preserve with Shop ownership: a Variant must belong to the same Shop as its Product; exactly one Inventory row per Variant; reservations cannot cross Variant/Shop; `available=on_hand-reserved`; no stock below reserved; immutable adjustment history; deterministic lock order; Seller may mutate only own Shop inventory; Admin override remains explicit and audited.

### 3.4 Cart

- Cart is Zustand + `localStorage` only (`gymer_cart`); no backend Cart table, guest merge, server persistence, price snapshot, coupon, or shipping calculation.
- Identity is `(productId, variantId)`. It stores only IDs and quantity.
- Cart/Checkout reload current Product/Variant/price/availability before submit; backend is final authority.
- Checkout payload contains shipping contact/address and `items[{variantId,quantity}]`; subtotal, discount, shipping, tax, and total are recomputed by backend (discount/shipping/tax currently zero).
- No Shop grouping or single-store constraint exists. The current data structure can technically hold items from multiple future Shops, but it cannot display/group or validate Shop state.
- `validId` and Checkout require Product IDs `>0`, causing Product 0 incompatibility.

Marketplace strategy: **EXTEND** the cart resolver/API responses with `shopId/shopName`, group UI by Shop, keep one buyer submit, and let backend atomically create Parent Order plus ShopOrders. A backend Cart is optional for MVP but needed later for cross-device persistence/merge.

### 3.5 Order, Payment, Reservation

- `Orders` owns buyer/contact/shipping snapshots, subtotal/discount/shipping/tax/total, one order status, one payment status/provider/reference, and reservation expiry.
- `OrderItems.order_id` directly references Orders and snapshots Product/Variant name, SKU, quantity, unit price, and line total. It does not snapshot image or Shop.
- Product/Variant FKs use NO ACTION to preserve history. OrderStatusHistory and PaymentStatusHistory are immutable through triggers.
- Order numbers are generated in application code with timestamp/random content and DB unique constraint.
- Buyer APIs are owner-scoped and MEMBER-only. Admin APIs list/detail/update globally.
- Order fulfillment is a single state machine. Delivery consumes `on_hand` and `reserved`; cancellation/expiry releases reservation.
- Reservation starts at Order creation, defaults to 30 minutes, is represented by `Inventory.reserved` plus Order/OrderItem and `reservation_expires_at`; no separate reservation row or per-item reservation status exists.
- A cron-style interval and lazy expiration before reads cancel eligible unpaid Orders. Release locks inventory and rejects double/inconsistent release.
- Payment is stored on the commerce Parent Order and in `PaymentStatusHistory`; Bank QR configuration is environment-driven. Customer notification is idempotent for already-PENDING state. Admin transitions are locked and reject same/invalid transitions.
- There is no amount entered by the customer to validate; Admin manually reconciles the Order total against the bank.
- `PAID→REFUNDED` is supported as a full manual status transition. `PARTIALLY_REFUNDED` exists in constraints/types but has no implemented transition or refund ledger.
- Mail is sent only after DB commit; missing/failing configuration does not roll back payment state.
- A code-quality defect exists in Order creation: `inventoryUpdate` captures the OrderItem INSERT result and is checked after the Inventory UPDATE. Locks and the prior availability check currently protect concurrency, but the intended update row-count assertion is checking the wrong statement.

Live database facts: 0 commerce Orders, 0 OrderItems, 0 payment-history rows, and 0 active reservations. Therefore there is no current canonical Order row to backfill, but the migration must still support other environments that contain Orders.

### 3.6 Legacy Payment, Coupon, Notification, Invoice, Ticket

- `Payments` is a separate membership/Plan payment table linked to User/Plan; it is not the commerce Order payment model. Live count: 11.
- `Invoices` links to legacy `Payments`, not commerce Orders; generation is MEMBER-owned and completed-payment scoped. `send-email` only flips `email_sent`; it does not call the mail service or generate a PDF despite `pdf_path`. Live count: 10.
- Coupons apply only to Plans. Types include fixed/percentage and campaign-like types; validation checks time/limits/user/Plan price. It is not wired into commerce checkout. `CouponUsages.order_id` exists in legacy schema but has no FK to the commerce Orders created later. Live Coupons/Usages: 6/6.
- Reusing Coupon for compensation would overload Plan-scoped rules. A MarketplaceVoucher/ShopVoucher domain or explicit generalized Promotion instrument is safer.
- `Notifications` exists with read state and seed data but no notification API/service was found. Live count: 8.
- Nodemailer service supports configuration status and failure-tolerant sends. Current templates are inline strings in Order service.
- Ticket supports MEMBER creation/ownership, Coach assignment scope, Admin global scope, replies/internal notes, and status. It has no Order relation. Live count: 6.
- Ticket can be **EXTENDED** for post-hub complaints with `order_id`, optional `shop_order_id`, complaint type, evidence, and immutable handling events.

### 3.7 Frontend routing and state

- Public: marketing, coaches, video/exercise, products/detail, cart.
- Auth: login/register.
- Protected shared/member: dashboard, members, referral, coupons, loyalty, tickets, invoices, CRM, settings, booking, profile, customer orders/detail, checkout, video.
- Admin: dashboard, analytics, audit, revenue, backup, products, categories, brands, variants, inventory, orders/detail.
- Coach: `/coach`.
- No React error boundary or router `errorElement` was found.
- API client is Axios with bearer injection and one shared refresh promise. State is Zustand; React Query is installed but not materially used in the audited commerce flow.

Routes expected to change across SELLER-001–013: auth redirects/access-denied; app route table; shared Layout/Sidebar; Product list/detail/card/gallery; Cart/Checkout; customer Orders/detail/tracking; Admin Product/Category/Brand/Inventory/Order/Payment; new Seller application/dashboard/catalog/images/variants/inventory/orders/fulfillment/settlement routes.

## 4. Entity Impact Matrix

| Entity/domain | Current state and evidence | Marketplace target | Strategy | Risk | Roadmap task |
|---|---|---|---|---|---|
| Authentication | JWT + rotating DB refresh sessions; `auth.controller.ts`, `auth.ts` | Same secure session lifecycle | REUSE | Medium: tokens in localStorage | SELLER-001/002 |
| RBAC | One string role; backend + frontend policies | Add SELLER, keep one primary role | EXTEND | High shared-file/session impact | SELLER-001/002 |
| User | Single role, active/verified flags | Seller applicant/account linkage | EXTEND | High Coach/shared schema conflict | SELLER-001 |
| Product | No owner; Admin-only; active booleans | Shop-owned, moderation lifecycle | EXTEND | High backfill/API filtering | SELLER-003/004 |
| Category | Admin global taxonomy | Marketplace-managed global taxonomy | REUSE | Low | SELLER-003 |
| Brand | Admin global taxonomy | Marketplace-managed global taxonomy | REUSE | Low | SELLER-003 |
| Product Image | Product-owned WebP pipeline, max 8 | Seller own-product upload + moderation | EXTEND | Medium IDOR/storage quota | SELLER-004 |
| Variant | Product-owned/default invariant | Inherit Product Shop | EXTEND | Medium ownership checks | SELLER-005 |
| Inventory | Variant row + immutable adjustments | Shop-scoped operations | EXTEND | High concurrency/authorization | SELLER-005/009 |
| Cart | Browser-only `(product,variant,qty)` | Multi-Shop grouping, one checkout | EXTEND | High Product 0 and stale Shop metadata | SELLER-006/007 |
| Order | Buyer aggregate + one fulfillment state | Parent payment/buyer order | EXTEND | High compatibility/derived state | SELLER-007/008 |
| OrderItem | Direct Parent FK, catalog snapshots | Belong to ShopOrder and retain parent compatibility | EXTEND | High backfill/FK/API | SELLER-008 |
| Payment | Commerce fields/history on Order | Parent Order payment | REUSE | Medium partial refund/settlement split | SELLER-010 |
| Reservation | Inventory.reserved + whole Order release | Per-ShopOrder/item release | EXTEND | Critical over-release risk | SELLER-008/009 |
| Coupon | Legacy Plan-only | Marketplace promotion/voucher | REPLACE | High semantic mismatch | SELLER-011 |
| Notification | Table without service/API | Event-driven buyer/seller/admin inbox | EXTEND | Medium missing delivery pipeline | SELLER-012 |
| Email | Failure-tolerant Nodemailer | Reusable delivery adapter + templates/outbox | EXTEND | Medium after-commit loss/retry | SELLER-012 |
| Invoice | Legacy membership Payment only | Parent Order invoice/credit notes | EXTEND | High current model mismatch | SELLER-010/013 |
| Ticket | User/Coach/Admin support, no Order | Order/ShopOrder complaint workflow | EXTEND | Medium ownership and escalation | SELLER-013 |
| Frontend routes | Member/Coach/Admin route policy | Add Seller workspace and shared buyer compatibility | EXTEND | High App/accessPolicy conflict | SELLER-001–013 |
| Admin layout | Shared Layout + role-specific Sidebar | Add moderation/marketplace operations | EXTEND | High concurrent Coach edits | SELLER-001–013 |
| Migration runner | Four-digit ordered checksummed SQL | Same runner + allocation registry | REUSE | High number collision | All schema tasks |

No audited domain is marked DEPRECATED today. Legacy Product scalar stock/price fields and membership-only Payment/Invoice/Coupon paths are candidates for gradual deprecation only after consumers are inventoried and compatibility is proven.

## 5. API Impact Matrix

| API/module | Consumer | Current state | Expected change | Compatibility strategy | Task |
|---|---|---|---|---|---|
| `/api/auth/*`, `/api/users/*` | All roles | One primary role; live-session role recheck | SELLER registration/application/admin approval and role | EXTEND; preserve response User shape, add role value | SELLER-001/002 |
| `/api/products` | Public/Product/Cart | Active products, no Shop | Include Shop summary and moderation visibility | EXTEND additive fields | SELLER-003/004 |
| `/api/products/:slug` | Detail/Cart/Checkout | Slug or numeric including 0 | Include Shop; preserve ID 0 | ADAPTER/additive response | SELLER-003/006 |
| `/api/admin/products` | Admin Product UI | Global Admin CRUD/hard delete | Admin moderation/official-shop override | EXTEND; preserve existing endpoints initially | SELLER-003/004 |
| `/api/admin/categories`, `/brands` | Admin Catalog | Global taxonomy | Remain marketplace-managed | REUSE | SELLER-003 |
| image endpoints | Admin upload UI | Admin-only and Product-bound | Seller own-product authorization | EXTEND shared service, separate Seller routes | SELLER-004 |
| variant/inventory admin APIs | Admin UI | Global Admin | Seller own-Shop equivalents | EXTEND shared services with explicit scope | SELLER-005 |
| `POST /api/orders` | Checkout | Creates one Order and reserves all items | Create Parent + ShopOrders atomically | ADAPTER; keep request, add grouped response fields | SELLER-007/008 |
| customer Order list/detail | Buyer UI | Direct Orders/OrderItems | Aggregate Parent + child summaries | ADAPTER, then DEPRECATE legacy flat internals gradually | SELLER-008 |
| customer cancel | Buyer UI | Whole Order only | Parent or eligible ShopOrder cancellation policy | EXTEND with explicit endpoints; keep whole-parent path | SELLER-008/009 |
| Admin Order APIs | Admin UI | One fulfillment state | Parent payment + ShopOrder fulfillment/moderation | EXTEND; compatibility DTO | SELLER-008/010 |
| payment notification/status | Buyer/Admin | Parent Order, Bank transfer | Remain Parent; settlement/refund projections | REUSE + EXTEND | SELLER-010 |
| `/api/coupons` | Membership UI | Plan-only | Do not silently use for commerce | REPLACE with marketplace voucher APIs | SELLER-011 |
| `/api/invoices` | Membership UI | Legacy Payment only | Separate commerce invoice APIs | EXTEND via new module; preserve membership API | SELLER-010/013 |
| `/api/tickets` | Member/Coach/Admin | No Order link | Add order/shop complaint scope | EXTEND | SELLER-013 |

## 6. UI Impact Matrix

| Route/component | Current role | Marketplace impact | Conflict risk | Task |
|---|---|---|---|---|
| `App.tsx`, `accessPolicy.ts` | All | SELLER routes/home/guards | HIGH | SELLER-001/002 |
| `Layout.tsx`, `Sidebar.tsx`, `CommandMenu.tsx` | All | Seller workspace + Admin moderation menu | HIGH | SELLER-001–013 |
| `/products`, `/products/:id`, ProductCard/Gallery | Public | Shop identity, moderation availability, seller link | MEDIUM | SELLER-003/004 |
| `/cart` | Public/guest | Group items/totals by Shop; preserve Product 0 | HIGH | SELLER-006 |
| `/checkout` | MEMBER | MEMBER + COACH buyer rule; one Parent checkout | HIGH | SELLER-007 |
| `/orders`, `/orders/:orderId` | MEMBER | Parent tracking with ShopOrder sections | HIGH | SELLER-008/009 |
| `/admin/products`, categories, brands | ADMIN | Official Shop + seller moderation | HIGH | SELLER-003/004 |
| `/admin/inventory` and variant page | ADMIN | Shop filtering and Seller ownership | HIGH | SELLER-005 |
| `/admin/orders*` | ADMIN | Parent payment + per-Shop fulfillment | HIGH | SELLER-008/010 |
| `/coupons`, `/invoices`, `/tickets` | Mixed | Separate marketplace voucher/invoice/complaint semantics | MEDIUM | SELLER-011/013 |
| New `/seller/*` | SELLER | Application, dashboard, catalog, orders, settlement | HIGH | SELLER-001–013 |

## 7. Migration Strategy

### 7.1 Shop baseline and old Product ownership

Create a system Shop named **GymFit Official** and backfill every existing Product to it. Preserve Product, Image, Variant, Inventory IDs and relations; only add ownership. Use a stable system slug/key and prohibit deletion.

Preferred ownership: allow the system Shop owner to be nullable/system-managed. Do not bind it to the current human Admin because staff role/deactivation must not orphan the Shop. If the schema mandates an owner User, create a dedicated inactive/non-login system owner with an explicit system-account flag; do not use a normal Seller login and do not reuse the current Admin implicitly.

Backfill preconditions: exactly one official Shop; all Products receive a Shop; no orphan Variant/Image/Inventory; Product 0 is included; counts/checksums before and after match; public queries remain compatible. Verdict: **RECOMMENDED WITH CONDITIONS**.

### 7.2 Migration allocation

Observed runner constraints: filename must match `NNNN_description.sql`, versions must be unique, lexical order controls execution, applied checksums are immutable, and each migration runs in a transaction. Highest applied migration is `0006`. Canonical docs reserve `0007` onward for TASK-008/Coach, although some roadmap text is stale about `0006`.

Provisional allocation:

- Coach/TASK-008: `0007`–`0049`.
- Shared/platform/security: `0050`–`0099`, assigned centrally.
- Seller marketplace: `0100`–`0199`.

This is a reservation proposal, not a final number assignment. Before SELLER-001 creates a migration, add a tracked allocation registry/ADR and obtain agreement from the Coach owner. Never renumber or edit `0001`–`0006`.

### 7.3 Parent Order + ShopOrder

Recommended forward migration:

1. Add Shops and the non-deletable GymFit Official row.
2. Add nullable `Products.shop_id`; backfill all Products including ID 0; validate, index, then make required.
3. Add `ShopOrders` with `order_id`, `shop_id`, per-Shop totals, fulfillment/cancellation status, shipping/hub fields, timestamps, and unique `(order_id, shop_id)`.
4. Add nullable `OrderItems.shop_order_id` and immutable Shop identity/name snapshots as needed.
5. For every existing Order, insert one ShopOrder for GymFit Official and point all its OrderItems to that ShopOrder.
6. Reconcile each ShopOrder subtotal against its items and Parent totals; validate FK/count/orphan invariants; then make `shop_order_id` required.
7. Keep `OrderItems.order_id` during compatibility rollout or expose it through a compatibility view. It may be removed only after all API/UI/report consumers migrate.

Current canonical DB has 0 Orders, so this backfill is vacuous there. It must still be set-based and safe for environments with historical rows. Product ownership is inferable after the official-shop Product backfill. Payment history stays on Parent. Existing order/payment status maps directly to the single initial ShopOrder, but future Parent order status must be derived from child states. Coupon/shipping/tax allocation must use deterministic proportional rules with a documented remainder policy. Invoice remains parent-level. Cancellation history should distinguish Parent and ShopOrder events.

Rollback/recovery: the runner has no down-migration mechanism. Use roll-forward correction, pre-migration verified backup, pre/post invariant tables/results, and do not drop legacy columns/FKs in the first release. A failed migration transaction rolls back automatically; post-commit recovery is restore-or-forward-fix, never editing an applied migration.

### 7.4 Payment, reservation, fixtures

- Keep commerce Payment at Parent Order. One buyer transaction maps naturally to one checkout and avoids split QR reconciliation.
- Settlement to Sellers is a new ledger/domain, not `PaymentStatusHistory`.
- Full refund may remain Parent initially. Partial Shop refunds require a Refund/Allocation ledger before enabling `PARTIALLY_REFUNDED`.
- Reservation release/consume must accept ShopOrder or explicit OrderItem IDs. Never call the current whole-parent release routine for one ShopOrder.
- Preserve all current IDs and snapshots. Existing live data to retain for regression: 167 Products/Variants/Inventory/Images, Product ID 0, 15 Users by role 11/3/1, 11 legacy membership Payments, 10 Invoices, 6 Coupons, 6 CouponUsages, 8 Notifications, and 6 Tickets.
- Acceptance must include Product 0 public detail, Cart, Checkout, order snapshots, multi-Shop grouping, partial Shop cancellation, payment idempotency, reservation no-over-release, and legacy membership payment/invoice/coupon regression.

## 8. Coach Conflict Map

`origin/008-workout-programs-progress` exists but points to `57a65f0`, has no unique diff against current `main`, and contains only migrations `0001`–`0006`. No implemented Coach/TASK-008 migration was found. Current Seller branch also has no diff from `main`.

| File/module/schema | Seller impact | Coach impact | Conflict level | Recommendation |
|---|---|---|---|---|
| `Users.role`, `backend/src/types/index.ts` | Add SELLER | Coach role/scope may expand | HIGH | Coordinate one enum/constraint migration |
| auth/session controllers and middleware | Seller login/session | Coach security/session baseline | HIGH | Preserve token-version/revocation behavior |
| `frontend/src/types/index.ts`, `accessPolicy.ts` | Seller role/routes | Coach role routes | HIGH | Centralize role capability map |
| `App.tsx`, `Sidebar.tsx`, `Layout.tsx` | Seller workspace | Coach workout/navigation | HIGH | Split route/menu registries before parallel edits |
| `backend/src/app.ts` | Mount Seller modules | Mount workout modules | MEDIUM | Small isolated route mounts |
| shared Axios/auth store | Seller consumers | Coach consumers | MEDIUM | Avoid feature-specific logic in shared client |
| migrations | Seller Shop/Order | Coach workout/progress | HIGH | Ratify ranges before either branch creates next migration |
| Product/Inventory/Order modules | Core marketplace ownership | Coach work should not touch commerce | LOW | Keep domain boundary |
| Exercise/Workout modules | None | Coach primary scope | NONE | Seller must not modify |

Because the Coach branch has no unique implementation, actual line-level conflicts remain **UNKNOWN** until Coach work begins; the map above is a forecast based on shared modules.

## 9. Security Findings

1. **Positive:** audited commerce Admin routers use backend `authenticate + authorize(ADMIN)`; customer Orders check owner ID in service queries.
2. **Positive:** session validity and current role are re-read from DB; role/status/password changes revoke sessions.
3. **High:** Seller resource APIs will introduce IDOR risk. Every Shop/Product/Image/Variant/Inventory/ShopOrder query must derive allowed Shop IDs from the authenticated User, not trust body/query `shopId`.
4. **High:** access and refresh tokens in `localStorage` increase XSS impact. Existing unused Express session/CSRF modules should not be mistaken for active protection.
5. **Medium:** `email_verified` is not enforced and no verification/reset flow exists; Seller onboarding should define whether verified email is mandatory.
6. **Medium:** upload validation is strong for format/count/size and path containment, but marketplace needs per-Shop quotas, malware policy, pixel/dimension limits, moderation, and orphan cleanup.
7. **Medium:** Product hard delete should not be exposed to Sellers. Use archive/unpublish and immutable moderation/audit records.
8. **Medium:** Order mail is after-commit without durable retry/outbox; notification loss is possible.
9. **Medium:** there is no in-app notification API despite the table.
10. **Medium:** Invoice “send email” marks sent without sending; do not reuse it as proof of delivery.
11. **Medium:** Product 0 validation inconsistency is an integrity/availability defect across UI/API layers.
12. **Low/quality:** Order creation checks the INSERT row count instead of the reservation UPDATE row count; correct before expanding concurrency.

## 10. Decisions and Recommendations

### Decision 1 — Old Products and GymFit Official

**RECOMMENDED WITH CONDITIONS.** Create a non-deletable system Shop `GymFit Official`; prefer no human owner. If owner is mandatory, use a dedicated inactive/non-login system User. Backfill all 167 Products including ID 0. Preserve all Product/Image/Variant/Inventory IDs. Public APIs can remain compatible with additive Shop fields, but Product 0 checkout validation must be fixed before marketplace acceptance.

### Decision 2 — Seller/Coach migration range

Use the existing four-digit runner. Provisionally reserve Coach `0007`–`0049`, shared `0050`–`0099`, Seller `0100`–`0199`; ratify in an allocation ADR before creating SELLER-001 migration. Never modify applied `0001`–`0006`.

### Decision 3 — Existing Order to Parent + ShopOrder

Keep `Orders` as Parent. Create one GymFit Official ShopOrder for every pre-existing Order and attach all its OrderItems. Current canonical has no rows, but migration must handle non-empty environments. Preserve Parent payment/history, map current Order status to the initial child, and do not enable per-Shop cancellation until reservation/fulfillment routines operate on child items.

### Decision 4 — Old Order API/UI compatibility

Use **REUSE + EXTEND + ADAPTER + DEPRECATE GRADUALLY**:

- Reuse Parent IDs/order numbers/payment flow.
- Extend DTOs with `shopOrders`.
- Adapt legacy flat `items` and aggregate status during rollout.
- Dual-write Parent/ShopOrder atomically.
- Deprecate direct single-status/single-fulfillment assumptions only after customer/admin pages and acceptance migrate.

Do not replace the full frontend in SELLER-008.

### Decision 5 — Fixtures and acceptance data

Preserve Product ID 0 and all existing catalog IDs. There are no live commerce Orders to preserve today, but legacy membership Payments/Invoices/Coupons are real and must not be treated as commerce fixtures. Existing auth acceptance data is isolated by DB-name guard. Add marketplace isolated-DB fixtures for at least two Shops, MEMBER buyer, COACH buyer, SELLER accounts, Product 0, mixed-Shop cart, Shop cancellation, parent payment, refund/settlement, and IDOR. Never seed canonical DB destructively.

## 11. Updated Roadmap Notes

| Roadmap assumption | Source reality | Affected task | Proposed change | Reason | Mandatory? |
|---|---|---|---|---|---|
| Product IDs are positive | Live Product ID 0 exists; cart/checkout reject it | SELLER-003/006/007 | Add ID 0 regression and use non-negative Product validation where Product IDs are accepted | Preserve canonical product | MUST |
| MEMBER and COACH are commerce buyers | Order backend and checkout route permit MEMBER only | SELLER-002/007 | Explicitly authorize MEMBER+COACH buyer endpoints/UI while excluding SELLER | Business rule mismatch | MUST |
| Existing Orders require backfill | Current canonical Orders count is 0; other environments may differ | SELLER-008 | Keep generic safe backfill; do not assume data exists | Environment variance | MUST |
| ProductImages baseline is 1 | Live status shows 167 and no missing images | SELLER-004 | Use live status as acceptance baseline and correct stale docs separately | Prevent false regression | MUST |
| Existing Coupon can be voucher | Coupon is Plan-scoped and not commerce checkout | SELLER-011 | Create explicit marketplace voucher/promotion domain or generalized versioned contract | Avoid semantic coupling | MUST |
| Invoice already represents Order | Invoice links legacy membership Payment only | SELLER-010/013 | Add commerce invoice relation/module; preserve membership invoice API | Current FK boundary | MUST |
| One Order cancellation can be reused | Release routine processes all parent items | SELLER-008/009 | Introduce ShopOrder/item-scoped reserve/release first | Prevent stock corruption | MUST |
| Next migration can be chosen locally | `0007` is documented for Coach/TASK-008 | All schema tasks | Reserve/ratify separate ranges | Avoid branch collision | MUST |
| Seller task-to-feature mapping exists | No SELLER-001–013 roadmap file was found | SELLER-001 | Add an approved Seller roadmap/ADR before implementation | Matrix task mapping here is provisional | SHOULD |

Business rules were not changed by this audit.

## 12. Open Questions

1. Where is the authoritative definition of SELLER-001 through SELLER-013? It is not present in this repository.
2. Must GymFit Official have a login-capable owner, or may a system Shop have no owner?
3. Who has final authority to ratify Coach/Seller migration ranges?
4. What is the exact aggregation rule for Parent fulfillment status when ShopOrders differ?
5. How should shipping, coupons, taxes, cancellations, and rounding be allocated to ShopOrders?
6. Is marketplace invoice issued once for the Parent Order, per ShopOrder, or both?
7. What settlement, commission, payout, refund, and hub/pickup policies are approved?
8. Should Seller email verification be mandatory before application/submission?
9. Is backend Cart persistence required for MVP, or is browser persistence accepted?

## 13. Verification Summary

- Backend build: PASS.
- Backend lint: PASS with 39 warnings and 0 errors.
- Frontend build: PASS with a large-chunk warning.
- Migration status: PASS; 6 applied, 0 pending, 0 checksum mismatches.
- Read-only DB integrity profile: 167 Products/Variants/Inventory/Images, no orphan/default/inventory invariant failures.
- Targeted read-only counts: PASS; no sensitive row contents logged.
- Unit/integration tests: NOT RUN because no test script/framework exists in package manifests.
- Auth/RBAC acceptance: NOT RUN because the existing script intentionally mutates an isolated acceptance DB and this task did not provision one.
- Browser tests/email sends/migration apply/seed/reset: NOT RUN by scope.

## 14. Acceptance Checklist

| Acceptance item | Result |
|---|---|
| Git Guard complete; WIP preserved; not detached | PASS |
| Role/RBAC/session and User/auth audited | PASS |
| Product/Category/Brand/Image audited | PASS |
| Variant/Inventory audited | PASS |
| Cart audited | PASS |
| Order/OrderItem/history audited | PASS |
| Payment/QR and Reservation audited | PASS |
| Coupon, Notification/email, Invoice/Ticket audited | PASS |
| Frontend routes/sidebar/access policy audited | PASS |
| Coach conflict map prepared | PASS |
| Migration runner/allocation analyzed | PASS |
| Five architecture decisions answered | PASS |
| REUSE/EXTEND/REPLACE/DEPRECATED matrix complete | PASS |
| Discovery document created | PASS |
| Build/status verification recorded truthfully | PASS |
| Unit/integration/browser acceptance | NOT RUN — no test script / out of discovery scope |
| Seller implementation avoided | PASS |

Task discovery status: **COMPLETE**.
