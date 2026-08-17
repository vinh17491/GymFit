# GymFit Roadmap

Updated: 2026-08-18 (Asia/Saigon)

This roadmap is a status summary, not an instruction to batch implementation.
The approved execution order remains PHASE 01 → PHASE 02 → … → PHASE 72, with
one checkpoint and one scope boundary per phase.

## DONE — current execution checkpoints

The following checkpoints are complete in the current worktree based on source
and static inspection:

- PHASE 01–05: repository, source-of-truth and database ownership analysis.
- PHASE 06–13: conditional baseline decision, migration collision/ownership
  hardening and database documentation.
- PHASE 14–20: safe root archival, branding normalization, README/status/
  roadmap synchronization and architecture boundary documentation.
- PHASE 21–25: environment/auth transport review, refresh-cookie transport,
  explicit CORS credentials and Origin boundary hardening.
- PHASE 26: access-token runtime storage and cookie-based reload restoration.
- PHASE 27: single-flight refresh, one-retry loop bound and safe auth-failure
  notification.
- PHASE 28: logout/session cleanup with backend revocation, cookie clearing and
  frontend runtime/user cleanup.
- PHASE 29: Auth manual verification checklist created; no browser result
  asserted.
- PHASE 30: CSP script-source hardening while preserving current dynamic style
  compatibility.
- PHASE 31: sanitization boundary review; opaque credential fields remain
  untouched by generic normalization.
- PHASE 32: centralized in-memory rate-limit configuration with explicit
  single-instance limitation.
- PHASE 33: explicit `TRUST_PROXY` configuration with safe default-off policy.
- PHASE 34: environment-sensitive SQL Server encryption and certificate-trust
  configuration; no database connection was run.
- PHASE 35: shared log redaction for credentials, tokens, cookies, provider
  secrets and sensitive conversation metadata.
- PHASE 36: `/health/live` process liveness endpoint without a DB dependency.
- PHASE 37: `/health/ready` minimal SQL readiness check with safe 503 failure.
- PHASE 38: DB-aware `/api/health` and explicit process-running versus
  application-ready distinction.
- PHASE 39: idempotent signal handling, background-runner stop, bounded HTTP
  close and SQL-pool shutdown.
- PHASE 40: fatal process errors log through the redaction boundary and enter
  the shutdown path; expected DB-unavailable startup remains non-fatal.
- PHASE 41: production background runners and their lifecycle ownership are
  inventoried; acceptance-script timers remain out of runtime scope.
- PHASE 42: runner start/stop lifecycle is idempotent, restart is blocked while
  draining, and shutdown awaits in-flight batches.
- PHASE 43: `app.ts` and `server.ts` responsibility boundaries are documented;
  Assistant was correctly absent before its assigned PHASE 72.
- PHASE 44: existing route registration moved to a registrar with 52/52
  prefix/order matches; no Assistant placeholder was added.
- PHASE 45: safe global error mapping for client conflicts, malformed input,
  rate limits and generic internal failures; no raw stack/SQL/secret response.
- PHASE 46: Coach booking flow is frozen and documented read-only; unresolved
  quota semantics are recorded as `BUSINESS_RULE_REQUIRES_CONFIRMATION`.
- PHASE 47: booking HTTP actor/id/status/body parsing and response delegation
  are isolated; business orchestration remains in the current controller.
- PHASE 48: booking orchestration is extracted into `bookings.service.ts`;
  SQL remains in the service until the repository phase.
- PHASE 49: booking SQL access is isolated in `bookings.repository.ts` without
  changing service orchestration or transaction behavior.
- PHASE 50: booking quota, transition, ownership and notification policies are
  isolated in `bookings.policy.ts` without changing rules.
- PHASE 51: booking duration, timezone, future-window, status-time and
  in-memory overlap calculations use the centralized time-policy boundary.
- PHASE 52: booking quota/cancellation/no-show/snapshot uncertainties are
  recorded as `BUSINESS_RULE_REQUIRES_CONFIRMATION`; no rules were invented.
- PHASE 53: Coach booking manual checklist is prepared; no browser result is
  asserted and all checks remain `MANUAL_CHECK_REQUIRED`.
- PHASE 54: Order service checkout/payment/cancellation/query/inventory/
  commission/settlement dependencies are mapped read-only; no Order code was
  changed.
- PHASE 55: checkout orchestration is isolated in `checkout.service.ts`; the
  existing transaction, cart/version locks, inventory reservation, commission
  snapshot and response contract are preserved.
- PHASE 56: payment orchestration is isolated in `payment.service.ts`; payment
  transitions, history, reservation interaction and mail behavior are
  preserved through the existing `ordersService` compatibility boundary.
- PHASE 57: customer cancellation orchestration is isolated in
  `cancellation.service.ts`; eligibility, reservation release, status history
  and child ShopOrder cancellation are preserved.
- PHASE 58: existing customer Order read operations are isolated in
  `query.service.ts`; owner filtering, IDOR boundary, pagination and response
  shapes are preserved.
- PHASE 59: checkout reservation uses a shared atomic reserve boundary and
  shared release operations guard against negative/double reservation release;
  `available = on_hand - reserved` remains the database invariant.
- PHASE 60: commission flow review confirms checkout and settlement use stored
  commission snapshots; unresolved voucher/refund commission-base semantics are
  recorded as `BUSINESS_RULE_REQUIRES_CONFIRMATION`.
- PHASE 61: settlement flow review confirms delivery-to-PENDING, eligibility
  window, ELIGIBLE batch selection and manual PAID transition; no bank
  integration was added.
- PHASE 62: payment/refund/settlement state guards and atomic row-count checks
  prevent repeated operations from causing `DOUBLE_CREDIT`, `DOUBLE_DEBIT` or
  `DOUBLE_RELEASE`; no idempotency-key API was invented.

These entries do not assert a live database result, browser verification or
production readiness. Manual work remains `MANUAL_CHECK_REQUIRED`.

## CURRENT

- PHASE 39: graceful shutdown — DONE (source/static; manual lifecycle check
  required).
- PHASE 40: fatal error policy — DONE (source/static; manual fault check
  required).
- PHASE 41: background-runner inventory — DONE (source/static; manual runner
  check required).
- PHASE 42: background-runner safety — DONE (source/static; manual runner
  check required).
- PHASE 43: app responsibility review — DONE (source/static; manual route
  check required).
- PHASE 44: route registrar extraction — DONE (source/static; manual route
  check required).
- PHASE 45: global error boundary review — DONE (source/static; manual HTTP
  error-flow check required).
- PHASE 46: Coach booking read-only review — DONE (source/static; manual Coach
  check required).
- PHASE 47: booking controller boundary extraction — DONE (source/static;
  manual booking check required).
- PHASE 48: booking service extraction — DONE (source/static; manual booking
  check required).
- PHASE 49: booking repository extraction — DONE (source/static; manual
  booking check required).
- PHASE 50: booking policy extraction — DONE (source/static; manual booking
  check required).
- PHASE 51: booking time policy — DONE (source/static; manual booking check
  required).
- PHASE 52: booking business ambiguity log — DONE (source/static; manual
  booking check required).
- PHASE 53: Coach manual checkpoint — CHECKLIST READY (`MANUAL_CHECK_REQUIRED`;
  no browser verification performed).
- PHASE 54: Order service read-only review — DONE (source/static; manual
  Marketplace check required).
- PHASE 55: checkout service extraction — DONE (source/static; manual checkout
  and database check required).
- PHASE 56: payment service extraction — DONE (source/static; manual payment
  and database check required).
- PHASE 57: cancellation service extraction — DONE (source/static; manual
  cancellation and database check required).
- PHASE 58: order query service — DONE (source/static; manual owner-filter and
  Marketplace check required).
- PHASE 59: inventory reservation boundary — DONE (source/static; manual
  concurrent stock/release check required).
- PHASE 60: commission flow review — DONE (source/static; business and manual
  settlement check required).
- PHASE 61: settlement flow review — DONE (source/static; business and manual
  settlement check required).
- PHASE 62: settlement/payment/refund idempotency hardening — DONE
  (source/static; manual retry and financial check required).
- PHASE 63: complaint/refund/replacement/settlement-hold interaction review —
  DONE (source/static; unresolved financial policy is
  `BUSINESS_RULE_REQUIRES_CONFIRMATION`; manual check required).
- PHASE 64: Marketplace manual checkpoint — checklist prepared; no browser or
  database verification performed, all items remain `MANUAL_CHECK_REQUIRED`.
- PHASE 65: frontend route inventory — DONE (read-only; 116 route declarations
  inventoried, URL semantics preserved, manual navigation check required).
- PHASE 66: route-level code splitting — DONE (lazy page imports and shared
  Suspense fallback; frontend build passes, manual chunk/navigation check
  required).
- PHASE 67: route group extraction — DONE (App shell reduced, route path
  sequence preserved, frontend build passes, manual navigation check required).
- PHASE 68: frontend auth guard review — DONE (session initialization and
  role-denied UX hardened; backend RBAC remains authority; manual check
  required).
- PHASE 69: frontend API error normalization — DONE (shared safe error
  representation, Axios rejection sanitization and shared-client coverage;
  frontend typecheck/build pass; manual check required).
- PHASE 70: frontend quality commands — DONE (existing Vite build preserved,
  explicit TypeScript `typecheck` added, no new lint stack or test command;
  backend/frontend static checks pass in the current workspace; manual check
  required).
- PHASE 71: chatbot current engine freeze — DONE (local engine and single
  catalog preserved, no Assistant module/router/provider created; manual
  chatbot check required).
- PHASE 72: Assistant API/AI architecture — DONE (optional-auth Assistant API,
  backend-only provider, centralized circuit breaker, strict read-only tools,
  LocalProvider/AIProvider boundary and Local Mode indicator; build/typecheck
  pass and provider/browser verification remains manual).
- Follow-up: manual/provider verification and user review; no implementation
  phase remains after PHASE 72.
- Current branch: `fix/gymfit-stabilization-chatbot-v2`.
- Current database state: `DATABASE_STATUS_UNVERIFIED`.

## SOURCE-PRESENT — requires current verification

| Workstream | Repository evidence | Current status |
|---|---|---|
| Core platform/Auth/RBAC | Backend auth middleware, controllers, sessions, role checks and frontend auth state exist. | SOURCE_PRESENT; preserve behavior; `MANUAL_CHECK_REQUIRED` |
| Coach and Member Workout | Coach, booking, workout, assignment and schedule modules plus migrations exist. | SOURCE_PRESENT; incremental refactor is PHASE 46–53; `MANUAL_CHECK_REQUIRED` |
| Seller/Marketplace/Orders | Seller, shop, product, cart, order, payment, refund, complaint and settlement modules plus migrations exist. | SOURCE_PRESENT; incremental refactor is PHASE 54–64; `MANUAL_CHECK_REQUIRED` |
| Frontend routing | Public, Member, Coach, Seller and Admin pages/routes exist in the current application. | SOURCE_PRESENT; URL semantics must remain unchanged; `MANUAL_CHECK_REQUIRED` |
| Local chatbot | `frontend/src/features/chatbot/` local engine, catalog, parser, normalizer, adapters, storage and types exist. | PRESERVED; current fallback remains independent; `MANUAL_CHECK_REQUIRED` |

## CURRENT CHECKPOINT — PHASE 72 COMPLETE

All implementation checkpoints PHASE 01–72 are source-complete in sequence.
The remaining work is manual/provider verification and any explicitly approved
follow-up; it is not a new implementation phase. `MANUAL_CHECK_REQUIRED`.

## LATER / DEFERRED

- `BASELINE_NOT_REQUIRED`: Phase 01–05 analysis keeps the legacy foundation as
  an explicit precondition for the current ordered migration chain; no
  `0000_baseline.sql` is created by assumption. A future empty-database
  bootstrap would require a separately approved design and target decision.
- `DATABASE_STATUS_UNVERIFIED`: no canonical or disposable database was
  selected, connected to, migrated or mutated in this task.
- `MANUAL_CHECK_REQUIRED`: browser, Auth, Coach, Marketplace and provider
  checks remain for the user; static checks do not establish production safety.
- `BUSINESS_RULE_REQUIRES_CONFIRMATION`: unresolved quota, refund, complaint,
  settlement and related business-policy questions remain unchanged.
- Phase-specific `DEFERRED_TO_PHASE_XX` entries in checkpoint documents are
  historical scope-boundary records; they do not authorize out-of-order work
  after PHASE 72.

## Guarded constraints

- Do not invent unresolved booking, refund, complaint or settlement rules;
  record `BUSINESS_RULE_REQUIRES_CONFIRMATION`.
- Do not run migration or destructive database operations against an unverified
  target. `TABLE EXISTS != MIGRATION APPLIED`.
- Do not create new unit, integration, E2E, Playwright, Jest or Vitest suites;
  do not run `test:*`, `acceptance:*` or `integrity:*` scripts in this task.
- Do not push, force-push or rewrite Git history.
- Historical archive/log evidence remains traceability only and does not replace
  current static or manual verification.
