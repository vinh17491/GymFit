# PHASE 66 — FRONTEND ROUTE-LEVEL CODE SPLITTING

Status: `SOURCE_COMPLETE`; frontend build is `ENVIRONMENT_BLOCKED` because the
workspace does not have the `vite` executable installed. Browser navigation and
chunk-loading verification remain `MANUAL_CHECK_REQUIRED`.

## Implementation

- `frontend/src/App.tsx` now loads route page modules with `lazy(() => import(...))`.
- The named exports from `MemberWorkoutPages.tsx` use the existing module with
  a small dynamic-import adapter; no page export was renamed.
- A shared `Suspense` boundary renders a neutral `Loading page…` status while a
  route chunk is loading.
- `Layout`, `CommandMenu`, `MarketingHeader`, auth store logic,
  `ChatbotWidget`, route guards and access policy remain in the application
  shell.

## Preserved contract

- All 116 route declarations remain in the same order.
- No public URL, redirect, route parameter, guard policy or backend API path
  changed.
- No route group module was created; that belongs to PHASE 67.
- No Assistant module, route or placeholder was created.
- The local chatbot remains outside the route chunk boundary and is not
  replaced by an Assistant implementation.

## Static verification

- Dynamic import path scan: `PASS` (`101` import expressions resolved to source
  modules).
- Route declaration count: `116`, unchanged from PHASE 65 inventory.
- `git diff --check`: `PASS`; Git emitted only line-ending normalization
  warnings.
- Frontend build: `ENVIRONMENT_BLOCKED` — `vite` is not installed in the
  workspace. This is not a production or runtime verdict.

## Manual verification

`MANUAL_CHECK_REQUIRED` for:

- direct navigation to public, protected, Seller, Admin and Coach routes;
- first-load loading fallback and chunk-load failure behavior;
- auth redirects and role-denied routes after lazy loading;
- browser back/forward and deep links;
- chatbot visibility while route chunks load.

## Deferred

- `DEFERRED_TO_PHASE_67`: route group extraction.
- `DEFERRED_TO_PHASE_68`: frontend auth guard review.
