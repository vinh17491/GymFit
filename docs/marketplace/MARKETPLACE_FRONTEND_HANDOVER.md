# Marketplace Frontend Handover

## 1. Git baseline and handover status

| Item | Verified value |
|---|---|
| Repository | `https://github.com/vinh17491/GymFit.git` |
| Local path | `D:\bai\TMĐT\Đồ Án (Gymfit)\gymer` |
| Branch | `seller_role_add` |
| Local/remote HEAD | `c4801d3541f7a546d2ffc9630a23c44075ab6cf0` |
| SELLER-013 closure commit | `64c2e03da8d123802b45d5bbcb02aac26428de6f` (contained in HEAD) |
| Marketplace status | MVP backend and role surfaces are present; ready for continued FE completion |
| Initial working tree | Clean; ahead 0, behind 0 after `git fetch origin` |

Verification exceptions: authenticated multi-role browser journeys were not run because the repository has no safe browser credential lifecycle. Live SMTP was not exercised. Frontend has no lint script. These exceptions do not replace source/build/integrity verification and must not be reported as browser PASS.

## 2. Architecture overview

- Backend: Express + TypeScript in `backend/src`; API routers are mounted below `/api` and backend authorization is authoritative.
- Frontend: React 18 + TypeScript + React Router + Vite in `frontend/src`. `frontend/src/api/axios.ts` uses base URL `/api`; Vite proxies API and asset paths to `VITE_API_PROXY_TARGET` (default `http://localhost:5000`).
- Database: SQL Server. Ordered immutable migrations are under `db/migrations`; the runner and checksum ledger are described in `docs/DATABASE_AND_MIGRATIONS.md`.
- Authentication: bearer access token plus rotating refresh session. `/api/auth/me` refreshes current user/role on application initialization. A 401 refresh failure clears auth storage and menu state. Hidden navigation is not a security boundary.
- Roles: `member`, `coach`, `seller`, `admin`. Buyer Marketplace pages are available to Member/Coach; Seller and Admin ownership/operations are separate.
- Uploads/assets: backend serves configured `UPLOAD_DIR` at `/uploads`; repository assets are served at `/image`; media is served at `/media`. Vite proxies all three in development.
- Public assets: frontend static/PWA assets live below `frontend/public` and are emitted by Vite.

## 3. Role-route matrix

`Embedded` means the capability is a section of its parent page rather than a separate URL. `Combined` means the backend function is intentionally exposed within an existing operations page.

### Public

| Role | Route | Page | Purpose | Backend API | Navigation | UX states | Status |
|---|---|---|---|---|---|---|---|
| Public | `/products` | `ProductsListPage` | Marketplace catalog/search | `GET /api/products` | Marketing header | loading/empty/error | Implemented |
| Public | `/products/:id` | `ProductDetailPage` | Product, variants, inventory availability | `GET /api/products/:slug` | Product cards | loading/404/error | Implemented |
| Public | `/shops/:shopSlug` | `PublicShopPage` | Public Shop and published products | `GET /api/shops/:slug` | Product detail | loading/empty/error | Implemented |
| Public | Embedded in product detail | `ProductDetailPage` | Product reviews | `GET /api/products/:identifier/reviews` | Product detail section | loading/empty/error | Implemented |
| Public | Embedded in Shop page | `PublicShopPage` | Shop reviews | `GET /api/shops/:slug/reviews` | Shop page section | loading/empty/error | Implemented |

### Buyer (Member/Coach)

| Role | Route | Page | Purpose | Backend API | Sidebar/navigation | UX states | Status |
|---|---|---|---|---|---|---|---|
| Buyer/Public | `/cart` | `CartPage` | Local/server cart | `/api/cart` | Public header/cart entry | loading/empty/conflict/error | Implemented |
| Buyer | `/checkout` | `CheckoutPage` | Canonical checkout/order creation | `POST /api/orders` | Cart CTA | loading/validation/conflict/error | Implemented |
| Buyer | `/orders` | `CustomerOrdersPage` | Order history | `GET /api/orders` | Buyer sidebar | loading/empty/error | Implemented |
| Buyer | `/orders/:orderId` | `CustomerOrderDetailPage` | Payment, items, cancellation, reviews | `/api/orders/:id`, `/api/reviews/orders/:id/eligibility` | Order list | loading/404/conflict/error | Implemented |
| Buyer | `/complaints` | `ComplaintsPage` (`buyer`) | Create and follow complaints | `/api/complaints` | Buyer sidebar | loading/empty/validation/error | Implemented |
| Buyer | `/reviews` | `ReviewsPage` (`buyer`) | My product/Shop reviews | `/api/reviews/mine` | Buyer sidebar | loading/empty/error | Implemented |

### Seller

| Role | Route | Page | Purpose | Backend API | Sidebar/navigation | UX states | Status |
|---|---|---|---|---|---|---|---|
| Seller | `/seller` | `SellerFoundationPage` | Workspace and shortcuts | Existing Seller routes | Seller sidebar | static | Implemented |
| Seller | `/seller/shop` | `SellerShopPage` | Shop profile | `/api/seller/shop` | `Hồ sơ Shop` | loading/error/success | Implemented |
| Seller | `/seller/brand-requests` | `SellerBrandRequestsPage` | Brand requests | `/api/seller/brand-requests` | `Yêu cầu Brand` | loading/empty/validation/error | Implemented |
| Seller | `/seller/products` | `SellerProductsPage` | Product management | `GET /api/seller/products` | `Sản phẩm` + dashboard | loading/empty/error | Implemented |
| Seller | `/seller/products/new` | `SellerProductFormPage` | Create Product DRAFT | `POST /api/seller/products` | `+ Thêm sản phẩm` | loading/validation/error | Implemented |
| Seller | `/seller/products/:id` | `SellerProductDetailPage` | Variant, inventory, image, moderation | `/api/seller/products/:id/**` | Product list | loading/404/conflict/error | Implemented |
| Seller | `/seller/products/:id/edit` | `SellerProductFormPage` | Edit DRAFT/REJECTED | `PATCH /api/seller/products/:id` | Product detail | loading/validation/conflict/error | Implemented |
| Seller | `/seller/orders` | `SellerOrdersPage` | Shop order inbox | `GET /api/seller/orders` | Seller sidebar | loading/empty/error | Implemented |
| Seller | `/seller/orders/:shopOrderId` | `SellerOrderDetailPage` | Stock check/ready pickup actions | `/api/seller/orders/:id/**` | Seller order list | loading/404/conflict/error | Implemented |
| Seller | `/seller/revenue` | `SellerRevenuePage` | Backend-calculated finance/settlements | `/api/seller/finance/**` | Seller sidebar | loading/empty/error | Implemented |
| Seller | `/seller/complaints` | `ComplaintsPage` (`seller`) | Seller complaint view/actions | `/api/seller/complaints` | Seller sidebar | loading/empty/error | Implemented |
| Seller | `/seller/reviews` | `ReviewsPage` (`seller`) | Read-only received reviews | `GET /api/seller/reviews` | Seller sidebar | loading/empty/error | Implemented |

### Admin

| Role | Route | Page | Purpose | Backend API | Sidebar/navigation | UX states | Status |
|---|---|---|---|---|---|---|---|
| Admin | `/admin/seller-applications` (+ `/:applicationId`) | Seller application pages | Review applications | `/api/admin/seller-applications` | Admin sidebar | loading/empty/404/error | Implemented |
| Admin | `/admin/shops` (+ `/:shopId`) | Shop pages | Shop status/verification | `/api/admin/shops` | Admin sidebar | loading/empty/404/error | Implemented |
| Admin | `/admin/products` | `AdminProductsPage` | Catalog products | `/api/admin/products` | Admin sidebar | loading/empty/error | Implemented |
| Admin | `/admin/product-moderation` (+ `/:productId`) | Moderation pages | Approve/reject/suspend/republish | `/api/admin/product-moderation` | Admin sidebar | loading/empty/404/conflict/error | Implemented |
| Admin | `/admin/categories`, `/admin/brands`, `/admin/brand-requests` | Catalog/brand pages | Catalog and requests | `/api/admin/categories`, `/brands`, `/brand-requests` | Brand request entry; categories/brands are route-accessible | loading/empty/error | Implemented |
| Admin | `/admin/orders` (+ `/:orderId`) | Admin order pages | Orders, payment record, logistics | `/api/admin/orders`, `/api/admin/**/logistics` | Admin sidebar | loading/empty/404/conflict/error | Combined |
| Admin | `/admin/refunds` | `AdminRefundsPage` | Manual refund records | `/api/admin/refunds` | Admin sidebar | loading/empty/error | Implemented |
| Admin | `/admin/settlements` | `AdminSettlementsPage` | Settlement operations | `/api/admin/marketplace-finance/**` | Admin sidebar | loading/empty/conflict/error | Implemented |
| Admin | `/admin/complaints` | `ComplaintsPage` (`admin`) | Complaint/replacement decisions | `/api/admin/complaints` | Admin sidebar | loading/empty/conflict/error | Implemented |
| Admin | `/admin/reviews` | `ReviewsPage` (`admin`) | Review moderation/history | `/api/admin/reviews` | Admin sidebar | loading/empty/error | Implemented |

## 4. Seller Product flow

```text
Seller Sidebar
→ Sản phẩm
→ + Thêm sản phẩm
→ Product DRAFT
→ Variant
→ Inventory
→ Images
→ Primary image
→ Submit moderation
→ Admin review
→ PUBLISHED
```

The create form calls `POST /api/seller/products` without owner/shop fields and navigates to `/seller/products/:id` using the canonical response ID. Detail supports variants, inventory adjustments, image upload/removal, primary image selection and submit. The FE displays mutation controls only when moderation is `DRAFT` or `REJECTED` and the Shop is `ACTIVE`; backend ownership, Shop status and transitions remain authoritative. A rejected Product can be edited and resubmitted. A suspended Shop cannot use Seller Product mutation controls.

## 5. State machine reference

The FE renders canonical state and invokes named action endpoints; it must never invent a transition or use a generic status PATCH.

- Product moderation: `DRAFT → PENDING_REVIEW → PUBLISHED`; Admin may reject, suspend or republish through named moderation actions; rejected Products return through Seller edit/submit.
- ShopOrder: payment/stock-check/preparing/pickup/hub states, unable-to-fulfill and cancelled are driven by Seller/Admin named action endpoints.
- Parent logistics: `WAITING_FOR_SHOPS → READY_TO_SHIP → SHIPPED → DELIVERED` through Admin logistics actions.
- Refund: `PENDING`, `COMPLETED`, `FAILED`; manual external confirmation is backend-authorized and history-backed.
- Settlement: `PENDING`, `HELD`, `ELIGIBLE`, `PAID`; values and eligibility come from backend finance responses.
- Complaint: lifecycle and fault/resolution decisions come from `/complaints`, `/seller/complaints`, and `/admin/complaints` action endpoints.
- Replacement: created/advanced only by complaint replacement action endpoints; FE must not infer replacement eligibility.
- Review: `PENDING`, `PUBLISHED`, `HIDDEN`, `REJECTED`; Admin uses named hide/reject/restore endpoints.

## 6. Error handling

- `401`: unauthenticated, expired or revoked session. Refresh once; if refresh fails, clear session and return to login.
- `403`: authenticated but wrong role/policy. Show access denied; do not retry as another role.
- `404`: resource absent, or ownership intentionally hidden. Do not disclose another owner's resource.
- `409`: duplicate, optimistic/version conflict, or invalid current state. Reload canonical data before another action.
- `422`: payload or transition validation failure. Preserve user input and display the backend message near the action/form.
- `429`: rate limited. Disable immediate repeat and tell the user to retry later.
- `500/503`: server, configuration or dependent-service issue. Keep current input where safe and offer retry.

Current pages mostly follow local loading/empty/error conventions. Shared FE follow-up should normalize status-aware messages and retry affordances without replacing backend messages or introducing a new framework during feature work.

## 7. API integration rules

- Do not calculate commission, refund, revenue or settlement amounts in the FE.
- Do not send `ownerId`, `userId`, `shopId` or similar ownership claims when the backend derives ownership from authentication.
- Do not mutate a state machine with generic `PATCH {status}`; use the named action endpoint and its exact payload.
- Render and navigate from the canonical response, including IDs, timestamps, totals and state.
- FE route guards/menu filtering improve UX only; backend `authenticate`, role authorization and ownership checks are the security boundary.
- Never persist or publish secrets, tokens, passwords, internal Admin notes or private audit data.
- Review/description/comment content is rendered as React text. Do not add raw HTML rendering (`dangerouslySetInnerHTML`).

## 8. Local setup

1. Install Node.js/npm and SQL Server access. Run `npm install` independently in `backend` and `frontend`.
2. Copy values from `backend/.env.example` into an ignored `backend/.env`; never commit the populated file.
3. From `backend`, run `npm run db:migrate:status` first. Applied migration files/checksums are immutable. Apply forward migrations only against a verified intended database and backup.
4. Start backend and frontend with `npm run dev` in their respective directories. Verify `/api/health`.
5. Set `VITE_API_PROXY_TARGET` only when backend is not at `http://localhost:5000`.
6. Ensure `UPLOAD_DIR` exists and is writable; uploaded files are exposed at `/uploads`.
7. Product Order mail uses `MAIL_*`; legacy modules use `SMTP_*`. `MAIL_MODE=acceptance` is test-only and requires `NODE_ENV=test` plus a guarded acceptance DB. Live SMTP remains unverified.
8. Development bank/QR values use `BANK_NAME`, `BANK_ACCOUNT_NAME`, `BANK_ACCOUNT_NUMBER`, `BANK_QR_IMAGE_URL`; use non-production examples and a root-relative/HTTPS QR path.

See `docs/SETUP_AND_ENVIRONMENT.md`, `docs/API_AND_AUTHORIZATION.md` and `docs/DATABASE_AND_MIGRATIONS.md` for canonical details.

## 9. Demo data and credential policy

**DEMO FIXTURE: DOCUMENTED ONLY.** Existing SELLER-013 runners safely create/drop disposable API acceptance databases, but they do not provide a browser credential lifecycle. Do not seed canonical `GYMFIT_DB` for FE demos.

Required scenario labels: `ADMIN`, `SELLER_A` + Shop A, `SELLER_B` + Shop B, `MEMBER_A`, `MEMBER_B`, and `COACH`; GymFit Official; Product ID `0`; products covering DRAFT/PENDING_REVIEW/PUBLISHED/REJECTED/SUSPENDED; orders covering payment, fulfillment and logistics; settlements covering PENDING/HELD/ELIGIBLE/PAID; complaints with replacement and refund paths; reviews covering PENDING/PUBLISHED/HIDDEN/REJECTED.

If the FE team later creates a browser helper, require all of the following: `NODE_ENV=test`; `DB_NAME` contains `demo`, `test`, `acceptance` or `disposable`; live DB identity is queried and checked before setup and teardown; setup and teardown are explicit; secrets come from ignored environment variables such as `DEMO_ADMIN_PASSWORD`, `DEMO_SELLER_A_PASSWORD`, `DEMO_MEMBER_A_PASSWORD`; no password/token/JWT is logged; no production email/phone is used; nothing runs during normal application start; no migration is created for fixtures.

Safe existing commands from `backend`: `npm run acceptance:seller-013:final -- integrity` is canonical read-only; `npm run acceptance:seller-013:final -- security` uses its guarded disposable database and drops it. Marketplace mutation suites must only run through their own disposable runner guards.

## 10. Known limitations

- Authenticated browser automation has not run fully; browser status is `NOT RUN`, not PASS.
- Live Product Order SMTP has not been verified; deterministic acceptance transport is distinct from live mail.
- Frontend has no lint script.
- Frontend production build retains the Vite large-chunk advisory.
- Backend lint retains warning-only `no-explicit-any` debt.
- Carrier API/webhooks, automated bank refunds/payouts, full RMA, automated clawback, Seller wallet/escrow, AI moderation, Seller review replies and advanced analytics are outside scope.
- Some pages still use local/English Marketplace terminology and uneven status-specific error copy. Normalize incrementally in shared/role work, without changing contracts or policy.

## 11. Work allocation

| Workstream | Primary files/pages | Conflict boundary |
|---|---|---|
| FE Buyer | `pages/products`, `pages/shops`, `pages/cart`, `pages/checkout`, `pages/orders`, buyer complaints/reviews | Avoid Seller/Admin mutations and finance logic |
| FE Seller | `pages/seller`, Seller mode in complaints/reviews, `services/seller*`, `services/shopsApi.ts` | Preserve Seller ownership and state-action contracts |
| FE Admin | `pages/admin`, Admin mode in complaints/reviews, `services/admin*`, moderation services | Keep Admin operations separate from Seller ownership screens |
| FE Shared Components | `components/ui`, `components/shared`, `components/layout`, `api/axios.ts`, auth/access policy | Coordinate changes because all roles consume these files |

## 12. Pull request rules

- Do not develop directly on `seller_role_add`; create a feature branch per workstream/task.
- Do not change an API contract without backend review and updated contract documentation.
- Every UI PR includes screenshots or a short video for desktop and affected mobile behavior.
- PR description lists tested role, route, API endpoint, states and verification exceptions.
- Frontend production build must pass. Run available backend verification when a shared contract is touched.
- Never stage credentials, generated acceptance secrets, local databases, upload fixtures or logs containing tokens.
