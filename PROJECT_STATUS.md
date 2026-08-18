# GymFit Project Status

Updated: 2026-08-19 (Asia/Saigon)

## Current execution status

- Working branch: `phan-tich-lan-2`.
- Pass 2 checkpoint commits are pushed to `origin/phan-tich-lan-2` as each
  stable phase range completes.
- Pass 1 source reviewed: `phan-tich-lan-1` at `f80c4e3fbb3e8379303ceb6a46e4788f5cdb14f2`.
- Pass 2 pre-handoff checkpoint: `4ff9d85`; the final handoff commit is the
  checkpoint containing `PHAN_TICH_LAN_2_RESULT.md`. Its exact hash is reported
  from `git log -1` at delivery time because a commit cannot contain its own
  hash.
- PHASE 01–72 are source-complete; Pass 2 phases 73–132 are source-complete.
  Manual verification remains required and no production-safety conclusion is
  asserted.
- Objective: demo/staging stable and production-oriented hardening while
  preserving current business, Auth, API and database behavior.

## Evidence policy

- `DATABASE_STATUS_UNVERIFIED`: this execution has not connected to, queried,
  migrated, reset or mutated a database. No live migration ledger state is
  asserted here.
- `BOOTSTRAP_SOURCE_COMPLETE`: the guarded non-destructive foundation source and
  operator sequence are complete at repository level.
- `DATABASE_MANUAL_CHECK_REQUIRED`: no live empty-database bootstrap or ordered
  migration run has been performed in this execution.
- `MANUAL_CHECK_REQUIRED`: browser, Auth, Coach, Marketplace, Local Fallback
  and any other manual checklist has not been performed in this execution.
- Build, lint, typecheck and static inspection are evidence for their own
  narrow checks only. They do not establish `PRODUCTION_SAFE`,
  `PRODUCTION_READY`, `FULLY_SECURE` or `FULLY_VERIFIED`.
- Historical handovers and release logs may contain earlier PASS claims. They
  are not current verification until rechecked under this task's constraints.

## Repository-level findings completed through PHASE 17

- Repository inventory, source-of-truth review and database migration analysis
  are recorded in the current database documentation.
- The migration chain contains `0001`–`0017` and `0100`–`0111`; migration files
  remain forward-only and applied/canonical content is treated as immutable.
- `db/schema.sql` is explicitly marked as a destructive legacy snapshot/dev
  seed artifact, not canonical provisioning.
- Migration ownership and fail-closed ledger checks are documented. A table's
  existence is not treated as migration application; incompatible adoption
  must stop with `SCHEMA_MISMATCH` or `SCHEMA_ADOPTION_REQUIRED` as applicable.
- Historical root prompts, plans, academic artifacts and the verified duplicate
  bank image were archived without deleting their contents.
- User-visible branding and package metadata now use GymFit where safe; database
  names, environment keys, API paths, session/storage identifiers and legacy
  seed data were preserved.

## Current application boundaries

- Member, Coach, Seller/Marketplace and Admin modules remain in the existing
  source structure.
- Backend authorization remains the authority; frontend guards are UX only.
- Auth behavior remains protected: `tokenVersion`, `AuthSessions`, revocation,
  refresh rotation/replay detection, role authorization and inactive-user
  checks. PHASE 25 now transports refresh tokens through an HttpOnly cookie;
  PHASE 26 keeps access tokens in runtime memory and restores them after reload
  through the cookie path.
- The existing local/rule-based chatbot engine remains the fallback source and
  has not been rewritten or duplicated.
- Frontend API failures now cross one safe representation boundary. Status,
  allowlisted codes, field errors and user-facing messages are normalized;
  HTML, SQL, stack, token, cookie, secret and provider diagnostics are not
  displayed. Existing API contracts are preserved.
- Frontend quality commands preserve the existing Vite build and expose
  `npm run typecheck` through the existing strict TypeScript configuration.
  No new frontend lint stack or automated test command was added.
- PHASE 71 froze the local chatbot engine and its single catalog, parser,
  normalizer, suggestions, adapters, storage, types, delay and widget surface.
- PHASE 72 now contains the Assistant API, backend AI provider, centralized
  circuit breaker, strict read-only tool registry and frontend provider
  abstraction. The Assistant uses backend identity and existing services only.
- Before PHASE 72, Assistant backend/API/AI provider work was intentionally
  absent. PHASE 72 now provides the real Assistant module and router; no
  placeholder or fake router was used.

## Known blockers and risks

- Current static evidence: backend build passes; backend lint has zero errors
  and legacy `no-explicit-any` warnings; frontend typecheck and build pass; and
  `git diff --check` passes. These are narrow checks only and do not replace
  manual verification or establish a production-safety conclusion.
- `DATABASE_STATUS_UNVERIFIED`: the target database identity and live ledger
  must be checked read-only before any migration decision.
- The guarded empty-database foundation bootstrap and setup contract are
  source-complete after Pass 2 phases 73–90, but the first live bootstrap and
  migration run remain
  `DATABASE_MANUAL_CHECK_REQUIRED`; no `0000_baseline.sql` was created.
- Pass 2 payment/order hardening is source-complete through phase 104: failed
  payment is terminal for its order, cancelled orders cannot be paid through
  the payment endpoint, released reservations cannot be paid, and failed-flow
  state changes remain transactional. Legacy inconsistent finance states are
  `LEGACY_PAYMENT_STATE_REQUIRES_REVIEW`; no startup repair was added.
- Pass 2 Assistant hardening is source-complete through phase 132: chat has a
  dedicated guest-IP/authenticated-user limiter with safe 429 output, status is
  not given the chat limiter, `AI_ONLINE` requires a closed circuit, zero
  failures and a successful timestamp newer than the last failure, and tool
  definitions/execution are constrained by the verified actor.
- Pass 2 chatbot fallback/recovery is source-complete through phase 132: the
  frontend keeps explicit mode/status/retry state in the extracted
  orchestrator, uses LocalProvider directly during disabled/open/cooldown paths,
  limits interactive AI waits to 7 seconds, permits only controlled
  message-driven recovery attempts, and exposes an accessible green/red dot on
  the closed widget button.
- The current development cookie topology is same-site and defaults to Lax;
  production topology still requires an explicit SameSite/Secure decision.
  CORS credentials, explicit origin allowlisting and refresh/logout
  CSRF/Origin boundaries are implemented at source level but remain
  `MANUAL_CHECK_REQUIRED` in a real deployment.
- The current task forbids new or executed business test suites. Existing
  acceptance/integrity scripts are retained as historical/guarded artifacts.
- AI provider configuration is backend-only. AI_BASE_URL is optional and
  defaults through the provider implementation; no frontend AI secret exists.

## Current checkpoint

Pass 2 database foundation, payment/order integrity, Assistant hardening and
chatbot fallback/recovery are source-complete through phase 132. The repository
now has an explicit empty-database sequence: create an empty SQL Server
database, configure and verify `DB_*`, run guarded `db:bootstrap`, review
`db:migrate:status`, then run `db:migrate`. The legacy `db/schema.sql` path
remains destructive, legacy, non-canonical and not for a shared database.
Payment manual cases include valid `PENDING -> PAID`, failed atomic
cancellation/release, no failed reset, no cancelled-order notification or
payment confirmation, and no implicit re-reservation. Assistant manual cases
include guest/authenticated limit keys, safe 429 responses, status reads without
provider calls and recovery-status predicates. Chatbot manual cases include
fast Local fallback, cooldown suppression, controlled recovery, stale-request
cancellation, mode-preserving history and the closed-button status dot. Actor
tool availability, executor denial and data minimization are source-level
checks. The final manual QA package is in
`docs/analysis/PASS2_FINAL_MANUAL_QA_CHECKLIST.md`; live browser, provider and
database checks remain manual. No database was connected to or mutated.
