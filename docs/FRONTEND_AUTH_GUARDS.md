# PHASE 68 — FRONTEND AUTH GUARD REVIEW

Status: `SOURCE_COMPLETE`; this phase reviews and hardens frontend UX guards
only. Backend RBAC, session validation, ownership checks and API authorization
remain authoritative. Browser verification remains `MANUAL_CHECK_REQUIRED`.

## Guard behavior

- `ProtectedRoute` waits for the auth store to initialize, shows a neutral
  session-checking state, and redirects unauthenticated users to `/login` while
  preserving the original location in router state.
- `AccessRoute` waits for initialization, redirects a missing/unauthenticated
  user to `/login`, and sends a role mismatch to `/access-denied`.
- `GuestRoute` waits for initialization and redirects authenticated users to the
  existing `roleHome` destination.
- `AccessDenied` now uses the existing SPA `Link` instead of a full-document
  anchor navigation.
- `/dashboard` now uses the already-defined `/dashboard` `routeRoles` policy;
  it remains available to member/coach/admin UX roles, while Seller continues
  to use `/seller` as its home.

## Authority boundary

These checks only control which page the frontend renders. They do not grant
permissions, protect data, or replace backend middleware. A user can modify
frontend code or send a request directly, so every backend route must continue
to enforce JWT/session validity, RBAC, ownership and scope.

The existing role policy remains centralized in
`frontend/src/auth/accessPolicy.ts`; no new role or business permission was
invented.

## Preserved behavior

- Existing role values remain `member`, `coach`, `admin` and `seller`.
- Existing `roleHome` destinations and `/access-denied` URL remain unchanged.
- Public routes, Seller/Admin/Coach route paths, backend APIs and session
  transport remain unchanged.
- No Assistant route or module was created.
- No automated test suite was added or executed.

## Verification limits

- Source/reference scan: guard paths and policy references are present.
- `git diff --check`: `MANUAL_CHECK_REQUIRED` until final static check output.
- Frontend build/typecheck: expected environment blocker because `vite` and
  project dependencies are unavailable in the workspace.
- Browser verification of login redirect, role denial, revoked sessions and
  direct URL access: `MANUAL_CHECK_REQUIRED`.

## Deferred

- `DEFERRED_TO_PHASE_69`: frontend API error normalization.
- `DEFERRED_TO_PHASE_70`: frontend quality commands.
