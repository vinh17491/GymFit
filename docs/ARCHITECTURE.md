# Architecture

## System flow

The current request path is:

```text
React/Vite UI
  -> Axios
  -> Express /api routes
  -> validation and authentication middleware
  -> controller/service
  -> repository/data access
  -> SQL Server
```

Backend modules live under `backend/src/modules/`. `backend/src/app.ts`
mounts middleware, static asset paths and health endpoints; the existing route
set is registered through `backend/src/routes/registerRoutes.ts`, preserving
the established prefixes and order. The frontend shell in `frontend/src/App.tsx`
composes the ordered route groups from `frontend/src/routes/routeGroups.tsx`;
lazy loading and grouping do not change public URLs.

JWT bearer authentication supplies the authenticated `userId`, role,
`tokenVersion` and session identity. The backend checks signature,
issuer/audience, live `AuthSessions`, `Users.token_version`, role, active-user
state and Coach status before protected work. Owner-filtered service queries
remain part of the authorization boundary. Frontend `ProtectedRoute`,
`AccessRoute` and `Admin` navigation guards are UX only and never replace
backend authorization.

## Actor boundaries

| Actor | Current responsibility | Boundary that must remain server-enforced |
|---|---|---|
| Guest | Public marketing, product/catalog, active Shops, Coach discovery, public exercise/video/plan views, register and login. | Public DTOs only; no private Member, Seller or Admin data. |
| Member | Own profile, membership, workout execution/progress, appointments, cart/orders, complaints/reviews and other self-scoped features. | Identity comes from the authenticated JWT/session; request IDs cannot widen ownership. |
| Coach | Coach profile/availability, appointments, programs, assignments, schedules, Member workout monitoring and Coach-scoped progress. | Live Coach status and CRM/assignment scope are checked by the backend; suspended/inactive Coaches are rejected. |
| Seller | Seller application lifecycle and, after approval, own Shop, products, inventory adjustments, fulfillment, revenue, complaints and reviews. | Shop/product ownership is derived server-side; client owner IDs and cross-Shop IDs are not trusted. |
| Admin | Global governance for users/roles, Coach and workout oversight, catalog, moderation, inventory, orders, refunds, complaints, reviews and settlements. | Backend `ADMIN` authorization and audit/transition rules remain authoritative. |
| Marketplace | A domain spanning Guest catalog, Member buyer flows, Seller operations and Admin governance. | Inventory reservation, payment/refund, commission and settlement invariants stay transactional and idempotent. |
| Assistant | Backend Assistant API, optional-auth chat, status snapshot, provider boundary and read-only tool registry are implemented in PHASE 72. | Backend JWT/session identity, RBAC, ownership, scope and the tool allowlist remain authoritative; Local Mode is a valid fallback. |

## Auth and session boundary

The protected flow is:

```text
JWT
  -> signature / issuer / audience
  -> live AuthSessions + Users token_version / role / is_active
  -> role check
  -> ownership and scope query
  -> controller/service
```

Auth behavior is preserved: `tokenVersion`, `AuthSessions`, session revocation,
refresh rotation, refresh replay detection, role authorization and inactive-user
checks. The PHASE 24–28 refresh-cookie flow uses Axios `withCredentials`,
backend CORS credentials and an explicit origin allowlist. SameSite, Origin
validation, refresh and logout CSRF boundaries remain deployment-topology
decisions and are not hardcoded from this document.

## Catalog and Marketplace boundary

Product catalog data uses `Products`, `ProductImages`, `ProductVariants`, option
tables and per-variant `Inventory`. The core inventory invariant is:

`available = on_hand - reserved`

The commerce chain is:

```text
Product -> Variant -> Cart -> Checkout -> Parent/ShopOrder
  -> Reservation -> Payment -> Fulfillment -> Commission/Settlement
```

Creating an order reserves inventory. Expiration or valid cancellation releases
the reservation exactly once; delivery reduces both `reserved` and `on_hand`.
Payment, refund, stock release, commission snapshot, pending/available balance
and settlement retries must not create double credit, double debit or double
release. No real bank integration is part of the current architecture.

Static product uploads use the configured upload directory and `/uploads`;
repository images use `/image`; media uses `/media`. Bank QR configuration is
validated as a root-relative public path or HTTPS URL.

## Coach and Member Workout boundary

The Coach/Member Workout slice reuses `Users`, `CRMCustomers` and `Exercises`.
Migrations `0007` and `0008` add the current Coach authoring and Member
execution model while keeping legacy `WorkoutSessions` separate. Member start
creates an immutable exercise snapshot; set logs and terminal session state are
self-scoped. Coach monitoring uses the active CRM/assignment scope and remains
read-only for Member-generated session data.

Admin Coach Management is an Admin-only governance layer. Migration `0009`
owns bounded Coach status fields; Admin assignment/reassignment uses existing
transactional scope services. Historical programs, assignments, sessions and
progress are preserved when a Coach status or assignment changes. Admin Program
ownership remains read-only while the current schema models Coach-owned
Programs.

## Frontend presentation boundary

`frontend/src/auth/accessPolicy.ts` maps UX route access for `member`, `coach`,
`seller` and `admin`. `frontend/src/App.tsx` groups public routes, auth routes
and protected routes under the existing layout. This mapping controls
navigation only. Missing or unavailable backend data must render as an empty,
loading or safe error state, never as fabricated authorization or business
data.

## Local chatbot and future Assistant boundary

The current local chatbot is a frontend feature under
`frontend/src/features/chatbot/` and remains independent of Assistant backend
availability. The following files are preserved and are not duplicated or
rewritten before their assigned phase:

- `chatbotEngine.ts`
- `chatbotCatalog.ts`
- `chatbotEntityParser.ts`
- `chatbotNormalizer.ts`
- `chatbotSuggestions.ts`
- `chatbotDataAdapters.ts`
- `chatbotStorage.ts`
- `chatbotTypes.ts`

Only PHASE 72 may create the Assistant backend module and register Assistant
routes. The official name is `ASSISTANT API`, not “Public Assistant API”. The
implemented endpoints are `GET /api/assistant/status` and
`POST /api/assistant/chat`. Status is a provider-independent snapshot; chat is optional-auth and returns Local Mode when unavailable.

The target boundary is:

```text
LLM/provider adapter
  -> backend tool registry
  -> existing GymFit service
  -> repository/data layer
  -> SQL Server
```

The model must never generate SQL, access SQL Server directly, choose user
identity, or use a `userId` supplied by a prompt, frontend or tool argument.
Private tools must derive identity from `req.user`/the authenticated session
and enforce RBAC, ownership, scope, allowlist and secret boundaries. Version one
is read-only (`searchProducts`, `getCoachAvailability`, `getMyAppointments`,
`getMyOrders`, `getWorkoutContext`); booking, order, payment, refund,
replacement, settlement, role, inventory and database mutations are not tools.
Prompt injection is not claimed to be detectable or blockable with 100%
certainty; it must not bypass those backend/tool boundaries. Fitness guidance
must not become medical diagnosis.

PHASE 72 provides the Assistant status endpoint, provider call, centralized
circuit breaker and Assistant router. Status reports configured/circuit/last-
known state without polling the provider on every request. The existing local
chatbot remains the independent fallback and mode switching preserves
conversation history.

## Verification boundary

This document describes source-level architecture. It does not assert live
database state, browser behavior, production readiness or full security. Manual
verification remains `MANUAL_CHECK_REQUIRED` until the user performs the
relevant checklist.
