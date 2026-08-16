# Safe-scope UI audit

## Pages audited

- Buyer, seller and admin complaint views (`/complaints`, `/seller/complaints`, `/admin/complaints`).
- Seller application (`/seller/apply`).
- Referral Program (`/referral`).
- Settings and password dialog (`/settings`).
- Shared-pattern member pages: Profile, Members, Support Tickets and Loyalty.

## Repeated issues

- Shared class names such as `input`, `input-field`, `btn-*`, `card`, `page-title` and `stat-card` are used broadly but have no matching global definitions.
- Native controls therefore inherit inconsistent browser colors; disabled values, placeholders, select options and focus states can become faint or invisible on the dark shell.
- Cards and CTAs have inconsistent padding, borders, disabled states and visual hierarchy.
- Referral sharing is not mobile-safe because the Input wrapper cannot grow inside the action row; empty states are visually weak.
- Complaint and Seller forms lack clear section grouping; Complaint admin actions also fall back to unstyled native buttons.
- Support Ticket fields rely on placeholders instead of persistent visible labels.

## Shared components affected

- Global theme and form primitives in `frontend/src/index.css`.
- `components/ui/Input`, `Button` and `Card` consumers.
- Existing `StatCard` and page-heading class consumers.

## Risky pages skipped

- No backend, API service, auth, RBAC, validation rule, workflow or state transition will be changed.
- Marketplace actions, Seller submission/withdrawal, Complaint settlement/refund/replacement actions and password submission remain behaviorally unchanged; only their presentation is in scope.

## Fix plan

1. Restore coherent dark form/card/button/page tokens and states globally.
2. Improve Input labeling/container support without changing value or submit behavior.
3. Polish the four target pages, then the shared-pattern Ticket form.
4. Verify focus/disabled/readability and responsive layouts at 375, 768 and 1440 px.

`P1_UI_AUDIT_PASS`
