# PHASE 65 — FRONTEND ROUTE INVENTORY

Status: `SOURCE_COMPLETE`; this is a read-only route inventory. No URL,
component import, guard or route semantics were changed. Browser verification
remains `MANUAL_CHECK_REQUIRED`.

## Source and route shape

- Primary source: `frontend/src/App.tsx`.
- `App.tsx` currently contains 116 `<Route path>` declarations, including the
  `*` catch-all route.
- `BrowserRouter` is mounted in `frontend/src/main.tsx` after the auth store
  initialization gate.
- The route tree has one public section, guest auth routes, and one protected
  `Layout` outlet containing shared/member, seller, admin and coach routes.
- `ChatbotWidget` is mounted outside `Routes`, so it is available independently
  of page route selection. It is still the existing local engine; no Assistant
  route exists before PHASE 72.

## Public routes

`/`, `/about`, `/contact`, `/blog`, `/membership`, `/coaches`,
`/coaches/:id`, `/coaches/:id/book`, `/booking`, `/videos`,
`/success-stories`, `/exercises`, `/exercises/:id`, `/workout-programs`,
`/products`, `/products/:id`, `/shops/:shopSlug`, `/cart`.

`/booking` redirects to `/coaches`. The remaining public pages use the
`MarketingHeaderWrapper` except where the current source explicitly chooses a
different page wrapper.

## Guest authentication routes

- `/login`
- `/register`

`GuestRoute` redirects an already authenticated user to the existing
role-specific `roleHome` value.

## Protected shared/member routes

All routes below are inside `ProtectedRoute` and `Layout`; the listed
`AccessRoute` path is the current frontend UX policy input.

- `/dashboard`
- `/membership/account`, `/membership/checkout`
- `/workouts`, `/workouts/program`, `/workouts/schedule`,
  `/workouts/schedule/:scheduleId`, `/workouts/sessions`,
  `/workouts/sessions/:sessionId`
- `/progress`, `/progress/sessions`, `/progress/exercises/:exerciseId`
- `/members`, `/referral`, `/coupons`, `/loyalty`, `/tickets`, `/invoices`,
  `/crm`, `/settings`, `/appointments`, `/appointments/:bookingId`, `/profile`,
  `/notifications`
- `/orders`, `/orders/:orderId`, `/complaints`, `/reviews`, `/checkout`,
  `/video`

The current source intentionally leaves `/dashboard`, `/settings` and
`/profile` under the authenticated layout without an `AccessRoute` wrapper.
That behavior is recorded, not redesigned in this phase.

## Seller and marketplace routes

- `/seller/apply`, `/seller`, `/seller/shop`, `/seller/brand-requests`
- `/seller/products`, `/seller/products/new`, `/seller/products/:id/edit`,
  `/seller/products/:id`
- `/seller/orders`, `/seller/orders/:shopOrderId`, `/seller/revenue`,
  `/seller/complaints`, `/seller/reviews`

The current route paths and component assignments are preserved for the Phase
54–64 Marketplace work.

## Admin routes

- `/admin`, `/admin/coaches`, `/admin/coaches/:coachId`, `/admin/exercises`,
  `/admin/workouts`, `/admin/analytics`, `/admin/audit`, `/admin/revenue`,
  `/admin/backup`
- `/admin/products`, `/admin/product-moderation`,
  `/admin/product-moderation/:productId`, `/admin/orders`,
  `/admin/orders/:orderId`, `/admin/refunds`, `/admin/settlements`,
  `/admin/complaints`, `/admin/reviews`
- `/admin/seller-applications`, `/admin/seller-applications/:applicationId`,
  `/admin/shops`, `/admin/shops/:shopId`, `/admin/brand-requests`,
  `/admin/categories`, `/admin/brands`, `/admin/inventory`,
  `/admin/products/:productId/variants`

Admin access is derived by the current `canAccess` rule for `/admin` and is
only a frontend UX boundary. Backend RBAC remains authoritative.

## Coach routes

- `/coach`, `/coach/profile`, `/coach/availability`, `/coach/appointments`,
  `/coach/appointments/:bookingId`
- `/coach/sessions` and `/coach/progress` redirect to `/coach/members`.
- `/coach/exercises`, `/coach/exercises/:exerciseId`,
  `/coach/workout-programs`, `/coach/workout-programs/new`,
  `/coach/workout-programs/:programId`,
  `/coach/workout-programs/:programId/edit`
- `/coach/members`, `/coach/members/:memberId`, `/coach/assignments`,
  `/coach/assignments/new`, `/coach/assignments/:assignmentId`,
  `/coach/schedules`, `/coach/members/:memberId/schedule`,
  `/coach/members/:memberId/sessions`,
  `/coach/members/:memberId/sessions/:source/:sessionId`,
  `/coach/members/:memberId/sessions/:sessionId`,
  `/coach/members/:memberId/progress`

## System routes

- `/access-denied` renders the current UX response for a failed frontend role
  check.
- `*` renders the existing public 404 page.

## Guard and authority inventory

- `ProtectedRoute` waits for initialization, requires authentication and stores
  the original location when redirecting to `/login`.
- `AccessRoute` checks explicit roles when supplied, otherwise calls
  `canAccess(user.role,path)` from `frontend/src/auth/accessPolicy.ts`.
- `GuestRoute` prevents authenticated users from reopening login/register.
- `roleHome` remains the current redirect source for admin, coach, seller and
  default member destinations.
- These are UX guards only. They must not replace backend authorization or
  resource ownership checks.

## PHASE 65 outcome

- No URL changed.
- No route was added, removed, renamed or regrouped.
- No `React.lazy`, `Suspense` or route module was introduced.
- No Assistant route or placeholder was created.

## Deferred

- `DEFERRED_TO_PHASE_66`: route-level code splitting candidates.
- `DEFERRED_TO_PHASE_67`: route group extraction candidates.
- `MANUAL_CHECK_REQUIRED`: browser navigation, role guard and deep-link checks.
