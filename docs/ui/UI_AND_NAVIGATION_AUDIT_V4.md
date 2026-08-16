# UI and Navigation Audit V4

## P0_DISCOVERY_PASS

- Source branch: `coach`
- Work branch: `fix/vinh-balanced-ui-navigation-v4`
- Start commit: `ae861c4f9c68f3e1278b71005e1e259798753eca`
- Worktree started clean except the user-owned untracked CODEX README files.

## Discovered components and routes

- Public shell: `frontend/src/components/layout/MarketingHeader.tsx`, mounted by `MarketingHeaderWrapper` in `frontend/src/App.tsx`.
- Authenticated shell: `frontend/src/components/layout/Layout.tsx` with shared role-aware navigation in `frontend/src/components/layout/Sidebar.tsx`.
- Dashboard brand: the shared `Sidebar` brand renders `GYMFIT` for Member, Coach, Admin, and Seller shells.
- Public routes used by navigation: `/`, `/products`, `/exercises`, `/coaches`, `/videos`, `/membership`, `/blog`, and `/about`.
- Seller channel route: `/seller/apply`. Role dashboard routes are `/dashboard`, `/coach`, `/admin`, and `/seller`, resolved by `roleHome()`.
- Required target pages: `/complaints`, `/seller/apply`, `/referral`, and `/settings`.

## Repeated defects

- Page and surface colors were clustered around `#020617`/`slate-950`, with weak separation between page, shell, panels, and nested controls.
- Raw inputs, selects, and textareas existed across admin, coach, seller, marketplace, and member pages; shared control styling needed stronger background, border, focus, readonly, disabled, and autofill states.
- Several target pages used `bg-slate-950` and `border-slate-800` directly, making cards and empty states recede into the page.
- Button variants existed but needed consistent minimum touch size and shared focus/disabled/loading presentation.

## Navigation defect

- The public header rendered the complete menu horizontally on desktop and used a separate mobile dropdown without the required overlay, focus trap, focus return, and body-scroll handling.
- The authenticated brand was not a router link, so users could not reliably move Dashboard → public Home without leaving the session.
- The PWA runtime cache matched all `/api/**`, including authenticated business endpoints.

## Shared components to modify

- `index.css`: design tokens, control hardening, surfaces, buttons, responsive shell/drawer styles.
- `MarketingHeader.tsx`: compact header and accessible left navigation drawer.
- `Sidebar.tsx`: SPA brand link to `/` for every authenticated role.
- `Button.tsx`, `Input.tsx`, `Card.tsx`, and dashboard primitives were reviewed; shared CSS/token hardening covers their presentation without touching business behavior.
- `vite.config.ts`: remove authenticated API runtime caching.

## Protected logic intentionally skipped

- No backend, database, API endpoint, request payload, auth token, RBAC, service, Zustand business state, seller workflow, complaint state machine, order/refund/settlement, or workout business flow changes are in scope.
- Marketplace/Seller changes are limited to CSS, class names, layout, visual wrappers, and existing frontend links.
