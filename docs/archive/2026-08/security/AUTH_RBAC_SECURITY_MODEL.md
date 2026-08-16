# Status: HISTORICAL
# Do not use as current implementation source of truth.
# Superseded by the active API/Authorization document and Coach module handover.

# Authentication, RBAC and ownership model

Updated 2026-08-03. This document is the authorization baseline after migration `0006_auth_session_security.sql`; Coach/Member Workout adds scoped routes in `0007`/`0008` without changing the core auth model.

## Server authority

Access tokens are HS256 JWTs with issuer, audience, user id, current database role, token version and session id. `authenticate` verifies all claims and the live, unrevoked `AuthSessions` row; it rejects inactive users, stale token versions and revoked/expired sessions. Refresh tokens are random opaque values stored only as SHA-256 hashes. Refresh rotates atomically; reuse revokes its entire token family. Logout revokes the current session and password/security changes revoke affected sessions.

The API is authoritative. React route guards, menus and redirects only prevent confusing navigation. Controllers derive actor identity from `req.user`; they do not trust client owner/role identifiers. Cross-owner resources return a nondisclosing 404 where applicable.

## Backend route authorization matrix

Legend: `P` public, `S` self only, `A` assigned Coach scope, `R` role-wide resource scope, `✓` allowed, `—` denied. `M-A/M-B` and `C-A/C-B` distinguish different accounts of the same role.

| Route group | Guest | M-A | M-B | C-A | C-B | Admin |
|---|---:|---:|---:|---:|---:|---:|
| `GET /health`, product/catalog, coaches, public videos/exercises | P | P | P | P | P | P |
| `POST /auth/register|login|refresh` | P | P | P | P | P | P |
| `POST /auth/logout`; `/auth/me`, password, avatar | — | S | S | S | S | S |
| `/users` read | — | S | S | A | A | R |
| `PATCH /users/:id/security` | — | — | — | — | — | R |
| `/plans/subscribe|my-membership|cancel` | — | S | S | — | — | — |
| `/bookings` create/list/change | — | S | S | A | A | R |
| `/tickets` create/list/read/reply/status | — | S | S | A | A | R |
| `/invoices`, invoice generation | — | S | S | — | — | R |
| `/crm/customers`, notes, tasks | — | — | — | A | A | R |
| `/videos` read | P | P | P | P | P | P |
| `/videos` create/update | — | — | — | A | A | R |
| `/videos/:id` delete; `/exercises` mutation | — | — | — | — | — | R |
| `/referral`, `/loyalty` read/redeem/daily | — | S | S | — | — | R |
| loyalty adjustment | — | — | — | — | — | R |
| `/coupons/validate` | — | S | S | — | — | — |
| coupon CRUD | — | — | — | — | — | R |
| customer `/orders` checkout/list/detail/payment/cancel | — | S | S | — | — | — |
| `/admin/*`, audit, analytics, revenue, backup, media mutation | — | — | — | — | — | R |

`S` means M-A cannot read/write M-B and vice versa. `A` means C-A can act only on entities assigned to C-A; C-B is independently filtered. Booking slot uniqueness is enforced by a filtered database index.

## Frontend policy

`frontend/src/auth/accessPolicy.ts` is the single role policy used by router guards, sidebar, command menu, marketing/mobile navigation and login return paths. Member home is `/dashboard`, Coach home is `/coach`, Admin home is `/admin`. A stale or forbidden saved path is replaced with the current role home. Axios has a single-flight refresh and terminal auth failure clears local state; it never logs tokens.

## Acceptance coverage

The isolated acceptance suite checks all six actors above across 20 API route groups (163 assertions), including guest denial, M-A/M-B and C-A/C-B IDOR, role change, deactivation, stale access token, refresh replay/family revocation, logout revocation, account switching, booking concurrency and daily-loyalty idempotency. Browser evidence covers Member, Coach and Admin policy/navigation states.

Final browser evidence is manual acceptance PASS on `5502`/`5501`, not Codex browser automation PASS.

Canonical migrations `0001–0008` are applied for the current Coach/Member slice. The auth smoke verified the JSON `{refreshToken}` contract, refresh rotation, replay/family revocation, logout revocation and live-role/token checks. Coach/Member Workout routes still derive identity from JWT and enforce CRM/assignment or Member ownership in backend queries.
