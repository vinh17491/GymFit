# API Overview

Catalog verified against `backend/src/app.ts` and current route files on 2026-08-04. `Auth` means JWT bearer authentication; role checks shown are backend checks.

The six-actor authorization matrix and session/ownership rules are maintained in this document and the active module handover. `authenticate` validates the live session, token version, active user and current role on every protected request.

## Auth

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register |
| POST | `/api/auth/login` | Public | Authenticate |
| POST | `/api/auth/refresh` | Public/token | Refresh access token |
| POST | `/api/auth/logout` | Auth | Logout |
| GET/PUT | `/api/auth/me` | Auth | Read/update profile |
| POST | `/api/auth/password` | Auth | Change password |
| POST/DELETE | `/api/auth/avatar` | Auth | Upload/remove avatar |

## Public Product

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/products` | Public | Paginated/filterable products |
| GET | `/api/products/featured` | Public | Featured products |
| GET | `/api/products/new` | Public | New products |
| GET | `/api/products/sale` | Public | Sale products |
| GET | `/api/products/filters` | Public | Catalog filter values |
| GET | `/api/products/:slug` | Public | Product/variant detail; numeric ID fallback |

## Customer Order

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/orders` | Auth/owner | Create variant-aware order/reservation |
| GET | `/api/orders` | Auth/owner | List own orders |
| GET | `/api/orders/:orderId` | Auth/owner | Own order detail |
| POST | `/api/orders/:orderId/payment-notification` | Auth/owner | Record customer bank-payment notification |
| PATCH | `/api/orders/:orderId/cancel` | Auth/owner | Cancel eligible own order |

## Admin commerce

All routes below are protected by `authenticate` plus `ADMIN` authorization at router level.

## Seller Application

Applicant routes are backend role-protected. Only MEMBER may create, edit, submit, resubmit, or withdraw; MEMBER and the resulting SELLER may read their own application.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/seller-applications/me` | MEMBER/SELLER owner | Read own application and history |
| POST | `/api/seller-applications` | MEMBER | Create the single DRAFT |
| PATCH | `/api/seller-applications/me` | MEMBER owner | Edit DRAFT/REJECTED/WITHDRAWN |
| POST | `/api/seller-applications/me/submit` | MEMBER owner | Move eligible application to PENDING |
| POST | `/api/seller-applications/me/withdraw` | MEMBER owner | Withdraw PENDING |
| GET | `/api/admin/seller-applications` | ADMIN | Filtered/paginated review inbox |
| GET | `/api/admin/seller-applications/:applicationId` | ADMIN | Safe applicant detail and history |
| POST | `/api/admin/seller-applications/:applicationId/approve` | ADMIN | Approve PENDING and atomically promote/revoke sessions |
| POST | `/api/admin/seller-applications/:applicationId/reject` | ADMIN | Reject PENDING with required reason |

Approval atomically promotes the applicant to Seller, revokes existing sessions, and creates one ACTIVE, unverified Shop owned by that Seller.

| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/api/admin/products` | List/create products |
| GET/PATCH/DELETE | `/api/admin/products/:id` | Product detail/update/delete |
| POST | `/api/admin/products/:id/images` | Upload images |
| PATCH/DELETE | `/api/admin/products/:id/images/:imageId[/primary]` | Set primary/remove image |
| GET/POST | `/api/admin/categories`, `/api/admin/brands` | List/create catalog entities |
| GET/PATCH/DELETE | `/api/admin/categories/:id`, `/api/admin/brands/:id` | Entity detail/update/delete |
| GET/POST | `/api/admin/products/:productId/variants` | List/create variants |
| GET/PATCH/DELETE | `/api/admin/variants/:variantId` | Variant detail/update/delete |
| POST | `/api/admin/variants/:variantId/set-default` | Select default variant |
| GET | `/api/admin/inventory`, `/api/admin/inventory/low-stock` | Inventory lists |
| GET | `/api/admin/variants/:variantId/inventory` | Inventory detail |
| POST/GET | `/api/admin/variants/:variantId/inventory/adjustments` | Adjust/list history |
| PATCH | `/api/admin/variants/:variantId/inventory/threshold` | Low-stock threshold |
| GET | `/api/admin/payment-configuration` | Bank/mail readiness |
| GET | `/api/admin/orders`, `/api/admin/orders/:orderId` | Order list/detail and histories |
| PATCH | `/api/admin/orders/:orderId/status` | Order transition |
| PATCH | `/api/admin/orders/:orderId/payment-status` | Payment transition/refund record |

## Relevant legacy modules

Mounted APIs include public/authenticated Plans, Coaches, Bookings, Videos, Exercises; and authenticated Referral, Coupons, Loyalty, CRM, Tickets, Invoices, Audit, Analytics, Revenue, Backup and Media. Their route files are authoritative. Existing Exercises remains a separate shared source; Membership payment under Plans is separate from Product Order payment.

## Admin Coach Management

All routes in this section require `authenticate` plus `authorize(UserRole.ADMIN)`. Admin mutations do not rely on the frontend guard.

| Method | Route | Contract |
|---|---|---|
| GET | `/api/admin/coaches`, `/api/admin/coaches/summary`, `/api/admin/coaches/:coachId` | Safe Coach list, dashboard counters and detail; no auth secrets |
| PATCH | `/api/admin/coaches/:coachId/status` | `ACTIVE`, `SUSPENDED` or `INACTIVE`; bounded optional reason; token version increment |
| GET | `/api/admin/coaches/:coachId/members` | Members in the selected CRM Coach scope |
| GET | `/api/admin/coaches/coach-members/unassigned` | Active Members without an active Coach |
| POST | `/api/admin/coaches/:coachId/members/:memberId/assign` | Transactional assign; duplicate scope returns `409` |
| POST | `/api/admin/coaches/:coachId/members/:memberId/reassign` | Requires target Coach Program/date/timezone; delegates to existing reassignment service |
| GET/POST | `/api/admin/exercises` | Admin Exercise list/search/filter/create |
| GET/PATCH | `/api/admin/exercises/:exerciseId` | Admin Exercise detail/update |
| POST | `/api/admin/exercises/:exerciseId/activate|deactivate` | Soft state changes; no hard delete |
| GET | `/api/admin/workouts/programs|assignments|schedules|sessions|progress` | Read-only governance, with Coach/Member/status/date filters where applicable |

Suspended Coaches remain visible to Admin but fail the backend live-auth check and cannot access Coach Workspace. Existing `WorkoutPrograms`, `CoachProgramAssignments`, `MemberWorkoutSessions`, snapshots, set logs and progress are preserved. Admin Program Builder remains `BLOCKED_ADMIN_PROGRAM_OWNERSHIP_MODEL` because the current schema is Coach-owned.

## Out of scope for current Admin Coach work

Video, Marketplace, Seller, Payment, Refund, Settlement, payroll, AI generation, chat, complex notifications, live coaching and Booking-created Coach–Member relations remain unchanged. The current Member Workout routes below are implemented and self-scoped; route files remain authoritative for exact validation.

## Authorization and response principles

JWT bearer authentication supplies the authenticated identity and role (`ADMIN`, `COACH`, `MEMBER`). Backend middleware and owner-filtered service queries are authoritative; frontend guards are navigation UX only. Customer Order endpoints derive ownership from JWT and reject cross-member access. Admin override exists only in Admin routes. Coach Workout access requires an active CRM/assignment scope; Member Workout identity comes from the Member JWT.

Validation failures use 400-class responses, missing/invalid authentication uses 401, insufficient role/scope uses 403, missing resources use 404, business transition/concurrency conflicts use 409, and incomplete required external configuration may use 503. Central error handling owns unexpected failures. SQL inputs must remain parameterized; pagination, filtering and sorting require validation/allowlists.

Order and Payment histories are immutable normal-flow audit data. Email is attempted after committed commerce state and cannot roll back the transaction. Member Workout session snapshots and terminal set logs are self-scoped and transactional; Coach reads remain scoped and read-only.

Auth/RBAC closure preserved the canonical Order and verified no acceptance fixtures remain in the canonical database.

## Final Marketplace module map

Current Seller Marketplace routes additionally cover persistent Cart, Parent/ShopOrder checkout, Seller stock/fulfillment, Admin hub logistics, refund/voucher recovery, Seller/Admin finance, buyer/Seller/Admin complaints and replacements, and Product/Shop reviews. See [Marketplace MVP Final Handover](marketplace/MARKETPLACE_MVP_FINAL_HANDOVER.md) for the route-family map, migration range, security evidence and safe acceptance commands.

Admin `PATCH /api/users/:id/security` atomically updates role/active state, increments token version, revokes target sessions and writes `user.security_updated` to `AuditLogs`. Old access and refresh tokens are invalid on the next request.
# SELLER-002 Shop APIs

## Seller

- `GET /api/seller/shop` — SELLER only; resolves ownership exclusively from the
  authenticated user.
- `PATCH /api/seller/shop` — SELLER only; accepts only `name`, `slug`,
  `logoUrl`, `bannerUrl`, `description`, and `pickupAddress`.

Owner IDs, system identity, status, verification, aggregates and Product
ownership are rejected by strict validation. Slug conflicts return 409.

## Public

- `GET /api/shops/:shopSlug?page=&limit=` — ACTIVE Shops only. The response
  excludes owner data, pickup address and system key and includes paginated
  active Products.
- Existing public Product list/detail queries exclude Products belonging to a
  SUSPENDED Shop and include an additive safe Shop summary.

## Admin

- `GET /api/admin/shops`
- `GET /api/admin/shops/:shopId`
- `PATCH /api/admin/shops/:shopId/status`
- `PATCH /api/admin/shops/:shopId/verification`

All endpoints require ADMIN. Suspending requires a reason. Status and
verification updates lock the Shop row and write `AuditLogs`. GymFit Official
cannot be suspended or unverified. No Shop delete or owner-transfer endpoint
exists.
# SELLER-003 Brand Request APIs

- Seller: `GET/POST /api/seller/brand-requests` and
  `GET /api/seller/brand-requests/:requestId`. Ownership is resolved from the
  authenticated Seller Shop; cross-Shop IDs return 404.
- Admin: `GET /api/admin/brand-requests`,
  `GET /api/admin/brand-requests/:requestId`,
  `POST .../:requestId/approve`, and `POST .../:requestId/reject`.
- Seller create uses strict payload validation and a configurable 10/24h
  user+IP limiter. Suspended Shops cannot create requests.
- Active Brand selectors return `id`, `name`, and `isGeneric`; inactive Brands
  are excluded.

## SELLER-004 Product ownership APIs

Catalog ownership is derived exclusively from `Products.shop_id`. Child
resources inherit ownership through their Product; the backend never trusts a
client Shop or owner identifier.

| Method | Route | Authorization | Scope |
|---|---|---|---|
| GET | `/api/seller/products` | SELLER | Authenticated Seller's Shop only; includes inactive Products |
| GET | `/api/seller/products/:productId` | SELLER | Own Product only; cross-Shop returns 404 |

The Seller endpoints are read-only. Unknown list parameters and non-whitelisted
sort/filter values return 400. Public Product APIs require both an active
Product and an `ACTIVE` Shop and expose only a safe Shop summary. Admin Product
APIs retain global scope and include Shop summary metadata; create resolves
GymFit Official server-side and update cannot transfer ownership.

## SELLER-005 Product mutation APIs

All routes require SELLER and derive ownership from the authenticated User:

| Method | Route | Policy |
|---|---|---|
| POST | `/api/seller/products` | Active Shop; creates inactive DRAFT |
| PATCH/DELETE | `/api/seller/products/:productId` | Owner; DRAFT/REJECTED only |
| POST | `/api/seller/products/:productId/submit` | Owner; validates complete catalog state |
| POST/PATCH/DELETE | `/api/seller/products/:productId/variants...` | Owner; DRAFT/REJECTED content |
| POST/PATCH/DELETE | `/api/seller/products/:productId/images...` | Owner; DRAFT/REJECTED content |
| POST | `/api/seller/products/:productId/variants/:variantId/inventory/adjustments` | Owner; transactional stock delta |

Protected Shop, owner, publication, moderation, review, reservation, and
derived Inventory fields are rejected by strict validation. Cross-Shop path
IDs return 404. Seller submission can only transition DRAFT/REJECTED to
PENDING_REVIEW; no Seller endpoint can publish.

## Member Workout API (Coach E2E)

All routes below require `authenticate` plus `authorize(member)`, except the Coach monitoring routes which retain `authorize(coach)` and existing CRM/assignment scope checks. Member identity is always derived from the JWT; request bodies do not accept `member_id`, `user_id` or `coach_id`.

| Method | Route | Contract |
|---|---|---|
| GET | `/api/member/workouts/current` | Active assignment, program, upcoming schedules and active session |
| GET | `/api/member/workouts/schedules` | Self-only paginated schedule list |
| GET | `/api/member/workouts/schedules/:scheduleId` | Self-only schedule detail and target exercises |
| POST | `/api/member/workouts/schedules/:scheduleId/start` | Transactional Start Session plus immutable snapshot |
| GET | `/api/member/workouts/sessions` | Self-only session history |
| GET | `/api/member/workouts/sessions/:sessionId` | Snapshot and set logs |
| POST | `/api/member/workouts/sessions/:sessionId/complete` | `IN_PROGRESS` to `COMPLETED` |
| POST | `/api/member/workouts/sessions/:sessionId/abandon` | `IN_PROGRESS` to `ABANDONED`; schedule to `SKIPPED` |
| POST/PATCH/DELETE | `/api/member/workouts/sessions/:sessionId/exercises/:sessionExerciseId/sets...` | Self-only set CRUD while in progress |
| GET | `/api/member/workouts/progress` | Completed sessions, duration, volume and due completion |
| GET | `/api/member/workouts/progress/sessions` | Completed/abandoned history with status/date/program/day filters and pagination |
| GET | `/api/member/workouts/progress/exercises/:exerciseId` | Self-only exercise totals and completed-session history; `404` without history |

Coach session history/detail/progress now include Member-generated rows within the existing Coach-to-Member scope. Cross-scope resources return `404`; role failures return `401/403`.
# SELLER-006 Admin Product Moderation

- `GET /api/admin/product-moderation` — ADMIN-only Seller Product inbox with strict pagination/search/filter/date/sort whitelist; defaults to `PENDING_REVIEW`.
- `GET /api/admin/product-moderation/:productId` — ADMIN-only non-system Seller Product preview, readiness, Variants, Images, Inventory, and history.
- `POST /api/admin/product-moderation/:productId/approve` — `PENDING_REVIEW → PUBLISHED`.
- `POST /api/admin/product-moderation/:productId/reject` — `PENDING_REVIEW → REJECTED`, reason required.
- `POST /api/admin/product-moderation/:productId/suspend` — `PUBLISHED → SUSPENDED`, reason required.
- `POST /api/admin/product-moderation/:productId/republish` — `SUSPENDED → PUBLISHED`.
- Seller Product DTOs add `reviewedAt`, `publishedAt`, and neutral moderation history. Seller has no moderation action endpoint.
- Order creation revalidates Product/Shop/Variant publication eligibility and database price before any reservation.
# SELLER-007 public marketplace

- `GET /api/products` is public and accepts strict query parameters: `q`, `categoryId` (or legacy `category` slug), `brandId` (or legacy `brand` slug), `shopSlug`, `verifiedShop`, `minPrice`, `maxPrice`, `inStock`, `sort`, `page`, and `pageSize` (legacy `limit` remains accepted). Sort is one of `relevance`, `newest`, `price_asc`, `price_desc`, `name_asc`, or `name_desc`; existing curated `featured` and `sale` routes retain their internal sorts.
- `GET /api/products/filters` returns public-safe Categories, Brands, and active Shops that have at least one visible Product.
- `GET /api/products/:slugOrId` accepts Product ID `0` and returns only Products in the shared public visibility scope.
- `GET /api/shops/:shopSlug` returns an active Shop profile plus the same filtered/paginated Product card DTO. It accepts the Product filters except `shopSlug`; the Shop is locked to the path.
- Public Product visibility is `Products.is_active = 1`, `moderation_status = PUBLISHED`, and owning `Shops.status = ACTIVE`. Invalid or unknown query fields return 400. Non-public Product/Shop detail returns 404 without existence disclosure.
- Public DTOs exclude moderation/reviewer fields, Shop ownership and pickup fields, system keys, reserved Inventory, and auth/session data. Admin and Seller management endpoints keep their independent authorization scopes.

## Coach appointment API contract

Public Coach endpoints are canonical:

- `GET /api/coaches` -> `{ coaches, pagination }` with `id`, `name`, `avatarUrl`, `specialty`, `bio`, `experienceYears`, `sessionMode`, `location` and `bookingEnabled` only.
- `GET /api/coaches/:id` -> one active Coach; suspended/inactive IDs return 404.
- `GET /api/coaches/:id/availability?date=YYYY-MM-DD` -> fixed 60-minute availability in `Asia/Ho_Chi_Minh`.

Coach self-profile is Coach-only and derives the Coach ID from the JWT:

- `GET /api/coach/profile` -> safe public-profile fields plus `bookingEnabled`.
- `PATCH /api/coach/profile` -> trims nullable profile fields, validates experience/session mode and atomically updates `bookingEnabled`; identity, role, status and security fields are not writable.

`/api/bookings/coaches` and `/api/bookings/coaches/:id/availability` are compatibility aliases to that same query/controller. `POST /api/bookings` is Member-only and accepts canonical `{ coachId, date, startTime, note }`; the legacy snake_case payload remains accepted during compatibility. The authenticated Member ID is always used; client-supplied `member_id` is ignored/rejected. New rows are `pending` and may transition only `pending -> confirmed/cancelled` or `confirmed -> completed/cancelled/no_show`.

`GET /api/bookings` and `GET /api/bookings/:id` are scoped to the authenticated Member/Coach (Admin may view all). Status mutations enforce role, ownership, state and appointment time. Seller and other roles cannot create or operate Member bookings. These appointment permissions are backend-enforced; frontend access policy only controls navigation.

Frontend surfaces are `/coaches`, `/coaches/:id`, `/coaches/:id/book`, `/appointments`, `/appointments/:id`, `/coach`, `/coach/profile`, `/coach/appointments` and `/coach/appointments/:id`. Booking DTO dates/times are normalized strings; no `Appointments` table is introduced and booking never creates a Coach–Member assignment.
