# Status: HISTORICAL
# Do not use as current implementation source of truth.
# Retained as dashboard presentation history.

# GYMFIT Command Center

Updated 2026-07-16. The dashboard redesign is frontend-only and preserves the existing API, RBAC policy, database, migrations, and backend business logic.

## Strategy

- Admin sees operational revenue and catalog signals from `/revenue/*`, formatted in VND.
- Coach sees only scoped navigation and truthful unavailable states because the current backend has no Coach dashboard/schedule endpoint.
- Member sees self-scoped bookings and loyalty data only; business-wide revenue, member counts, fake activity, and workout progress are excluded.
- Navigation continues to use `frontend/src/auth/accessPolicy.ts`.

## Tokens and components

The dark premium system is defined with CSS variables in `frontend/src/index.css`: app/sidebar/surface layers, borders, text hierarchy, GYMFIT lime accent, status colors, focus ring, and reduced-motion behavior. Shared primitives live in `frontend/src/components/dashboard/DashboardPrimitives.tsx`: page header, metric card, panel, chart state, empty state, quick action, skeleton, and VND formatter.

## Responsive and data policy

The shell uses 252px desktop navigation, a mobile drawer, 4/2/1-column KPI layouts, responsive charts, and contained records. Loading, empty, unavailable, error, and real-zero states are distinct. No dashboard contract uses `any`; absent backend fields are not replaced with invented KPIs or trends.

The Coach/Member Workout slice is now implemented behind its own authenticated routes and additive `0007`/`0008` migrations. This dashboard document remains a presentation reference; current workout contracts are maintained in the Coach handover and API document.

## Acceptance

Authenticated acceptance passed for Member, Coach and Admin at 1440×900, 1280×800, 430×932 and 390×844. Role-scoped navigation, real/empty/unavailable states, mobile drawer behavior, VND output, account switching and unauthorized-route denial were verified. The login differential passed through the backend, explicit Vite proxy and React form; no source fix was required.
