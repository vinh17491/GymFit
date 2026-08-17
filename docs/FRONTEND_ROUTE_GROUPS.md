# PHASE 67 — FRONTEND ROUTE GROUP EXTRACTION

Status: `SOURCE_COMPLETE`; route behavior is verified by source comparison only.
Browser navigation remains `MANUAL_CHECK_REQUIRED`.

## Structure

- `frontend/src/App.tsx` is now the application shell: command menu, local
  chatbot widget, shared `Suspense` fallback and the React Router container.
- `frontend/src/routes/routeGroups.tsx` owns the current route definitions and
  exports four ordered element groups:
  - `publicRouteElements`;
  - `authRouteElements`;
  - `protectedRouteElements`;
  - `fallbackRouteElements`.
- The existing lazy page imports, `ProtectedRoute`, `GuestRoute`, `AccessRoute`,
  `AccessDenied` and `MarketingHeaderWrapper` were moved with the route
  definitions so route ownership stays together.
- The arrays are rendered as direct children of the existing `<Routes>`
  container. No new router abstraction or URL rewriting was introduced.

## Contract comparison

- Baseline route declarations: `116`.
- Extracted route declarations: `116`.
- Route path sequence comparison against the source baseline: `PASS`.
- Existing redirects remain `/booking → /coaches`, Coach sessions/progress →
  `/coach/members`, and the final `*` route remains the public 404 page.
- Existing protected layout nesting and frontend guard inputs remain unchanged.

## Preserved boundaries

- Public, member/shared, Seller/Marketplace, Admin and Coach route semantics are
  preserved.
- Frontend guards remain UX only; backend RBAC and ownership checks remain the
  authority.
- No public URL, parameter name, API path or page component contract changed.
- No Assistant route, module or placeholder was created. Assistant remains
  deferred to PHASE 72.
- No new automated test suite was added or executed.

## Verification limits

- `git diff --check`: `PASS`; Git emitted only line-ending normalization
  warnings.
- Dynamic import path scan: `PASS` (`101` expressions).
- Frontend build/typecheck: `ENVIRONMENT_BLOCKED` because `vite`/project
  dependencies are unavailable in this workspace.
- Browser deep-link, guard, redirect and route-chunk checks:
  `MANUAL_CHECK_REQUIRED`.

## Deferred

- `DEFERRED_TO_PHASE_68`: frontend auth guard review.
- `DEFERRED_TO_PHASE_69`: frontend API error normalization.
