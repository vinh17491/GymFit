# Architecture

## System flow

`React/Vite UI -> Axios -> Express /api routes -> validation/auth -> controller or service -> SQL Server`

JWT bearer authentication supplies `userId` and role. Roles are `ADMIN`, `COACH`, and `MEMBER`; backend middleware and ownership queries are authoritative. The frontend uses `ProtectedRoute` and `AdminRoute` for navigation UX, but these do not replace API authorization.

The hardened flow is `JWT -> signature/issuer/audience -> live AuthSessions + Users token_version/role/is_active -> route role check -> controller ownership query`. Refresh credentials are opaque hashed database records and rotate atomically; logout/password/security changes revoke sessions. See [API and Authorization](API_AND_AUTHORIZATION.md) for the active route policy.

Backend features live under `backend/src/modules/`. Legacy modules commonly use route/controller pairs; current commerce modules add validation and service layers. `backend/src/app.ts` mounts middleware, `/uploads`, `/image`, `/media`, health/CSRF endpoints, and all API routers. Central not-found/error middleware formats failures; validation uses Zod or express-validator depending on module.

The frontend uses `frontend/src/App.tsx` for React Router 6 routes, layout guards under `components/layout`, Zustand auth/product state, `api/axios.ts`, typed service modules, and feature pages. Public marketing/catalog pages and protected member/admin pages coexist in the same app.

## Catalog and commerce

Product catalog data uses Products, ProductImages, ProductVariants, option tables and per-variant Inventory. The invariant is:

`available = on_hand - reserved`

The commerce chain is `Product -> Variant -> Cart -> Checkout -> Order -> Reservation -> Payment -> Fulfillment`. Cart identity is `(productId, variantId)` and current price/availability is reloaded from the API.

Order lifecycle: `PENDING -> CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED`, with permitted cancellation from pre-delivery states subject to payment rules. Payment lifecycle supports `UNPAID -> PENDING -> PAID/FAILED`, `FAILED -> UNPAID`, direct `UNPAID -> PAID`, and `PAID -> REFUNDED`; unsupported/same-status transitions conflict. `OrderStatusHistory` and `PaymentStatusHistory` preserve actor, transition and time.

Creating an order reserves inventory. Expiration or valid cancellation releases reserved stock; delivery reduces both `reserved` and `on_hand`. A cron runner plus lazy expiration before relevant reads handles expired unpaid reservations. Bank readiness is derived from validated `BANK_*` configuration; mail readiness uses separate `MAIL_*` configuration. Mail occurs after database commit, so delivery failure does not undo committed payment/order state.

Static product uploads use the configured upload directory and `/uploads`; repository images use `/image`; media uses `/media`. Bank QR accepts a root-relative public URL or HTTPS and rejects unsafe/local schemes.

## Workout boundary

The Coach/Member Workout slice reuses `Users`, `CRMCustomers` and `Exercises`, extends the repository with Coach migrations `0007` and additive execution migration `0008`, and keeps legacy `WorkoutSessions` separate. Admin Coach Management is a separate Admin-only governance layer: migration `0009` adds bounded Coach status fields, Admin mutations use `CRMCustomers` and the existing reassignment service, and Workout Governance reads the existing `0007`/`0008` plus legacy session data without mutation. Commerce and Video remain outside this boundary.

Admin status is enforced in the backend live-user check as well as the frontend navigation: `SUSPENDED` and `INACTIVE` Coaches cannot enter Coach Workspace, while their historical programs, assignments, sessions and progress remain queryable by Admin. Admin Program ownership is intentionally read-only because the schema only models Coach-owned Programs.
## Dashboard presentation boundary

The GYMFIT Command Center is a frontend presentation layer over existing API contracts. Role visibility remains centralized in `frontend/src/auth/accessPolicy.ts`; dashboard components must not widen Member or Coach data scope. Missing backend dashboard fields render as unavailable/empty states rather than fabricated values. The Member Workout widget has explicit loading, empty and retryable error states.

Dashboard authentication was accepted through three differential layers: direct backend, explicit Vite `/api` proxy, and the real React form/store/router flow. The earlier login timeout was isolated to the acceptance harness/process context; no auth or dashboard source change was required.

## Coach Member execution flow

The execution path is `Member JWT -> /api/member/workouts -> active assignment/schedule scope -> transactional session start -> immutable snapshot -> set logs -> terminal session/schedule state -> Coach read-only monitoring`. `MemberWorkoutSessions`, `MemberWorkoutSessionExercises` and `MemberWorkoutSetLogs` are additive to the `0007` Coach tables and deliberately do not reuse the incompatible legacy `WorkoutSessions` contract. All member identity comes from the JWT; URL IDs are ownership-checked.
