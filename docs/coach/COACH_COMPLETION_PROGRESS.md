# Coach1 Completion Progress

## Phase 29 - Final acceptance and handover

Status: PASS (full Coach acceptance, browser QA, migration verification, build gates, security/concurrency regression and cleanup)

- Branch was verified as `coach1` before and after the final run. Phase 29 was the last valid phase in the Master Prompt (`Phase 00` through `Phase 29`); no Phase 30 exists and none was started. The final scope remained Coach, Member Workout, Coach Booking, Membership/Entitlement, Availability, Notifications, Program Versioning and Admin Coach only.
- No Marketplace/Seller source, route or migration `0100`-`0111` was changed. The canonical database `GYMFIT_DB` was inspected read-only: migration `0010` is applied, `0011`-`0016` remain pending for a separately authorized deployment, checksum mismatches are zero, and all applied Marketplace/Seller migrations `0100`-`0111` match their checksums. `canonicalDatabaseChanged=false` and `migrationRunning=false` throughout this phase.
- Canonical `npm.cmd run verify:coach-migration` was intentionally not treated as a product failure: it reported `0010` applied and `0011`-`0016` pending, so the canonical database has no Availability rows/indexes yet. The same verifier exited PASS on disposable `GYMFIT_DB_COACH_ACCEPTANCE_FINAL_VERIFY_20260807` after `0010`-`0016` were applied, reporting `pending=[]`, `checksum_mismatches=[]`, `coach_profiles=1`, `coach_availability_rules=1`, `coach_availability_exceptions=1`, `unique_indexes=2` and `availability_indexes=2`. A second migration run reported 0 pending migrations and 0 checksum mismatches before the disposable database was dropped.

Final runtime matrix:

- `npm.cmd run test:coach-booking-unit`: PASS.
- Disposable migration verification on `GYMFIT_DB_COACH_ACCEPTANCE_PHASE29_FINAL_20260807`: migrations `0010`-`0016` applied, `0010` CoachProfiles shape verified, `0011` Availability, `0012` Entitlements, `0013` Context, `0014` Notifications, `0015` Versioning and `0016` performance indexes verified; rerun reported 0 pending migrations and 0 checksum mismatches. The exact database was dropped.
- `npm.cmd run acceptance:coach-role`: PASS.
- `npm.cmd run acceptance:coach-member-e2e`: PASS.
- `npm.cmd run acceptance:admin-coach`: PASS.
- `npm.cmd run acceptance:coach-booking`: PASS.
- `npm.cmd run acceptance:coach-booking-quota`: PASS, including Starter blocked, Pro exhausted at 2/2, Elite unlimited, cancellation no-refund, month boundary and concurrent last-quota requests.
- `npm.cmd run acceptance:coach-membership`: PASS.
- `npm.cmd run acceptance:coach-entitlement`: PASS.
- `npm.cmd run acceptance:coach-member-context`: PASS.
- `npm.cmd run acceptance:coach-notifications`: PASS.
- `npm.cmd run acceptance:coach-program-versioning`: PASS.
- `npm.cmd run acceptance:coach-completion-security`: PASS, including Guest/Member/Coach A/Coach B/Admin RBAC, cross-owner IDOR, identity spoof rejection, booking slot/quota races, schedule idempotency, assignment transition, Session completion/set immutability, notification deduplication, Publish/Clone and reassignment concurrency.
- Phase 28 performance acceptance evidence remained PASS for the large fixture, query plans, `STATISTICS IO/TIME`, migration `0016` and stale-request cancellation.

Build gates:

- Backend `npm.cmd ci`: PASS. NPM reported 9 dependency audit findings (3 low, 3 moderate, 3 high); no install failure.
- Frontend `npm.cmd ci`: PASS. NPM reported 7 dependency audit findings (3 moderate, 4 high); no install failure.
- Backend `npm.cmd run build`: PASS.
- Backend `npm.cmd run lint`: PASS with 0 errors and 461 existing `no-explicit-any` warnings.
- Frontend `npx.cmd tsc --noEmit`: PASS.
- Frontend `npm.cmd run build`: PASS. The existing Vite large-chunk warning remains non-blocking.
- Repository `git diff --check`: PASS.

Browser QA evidence:

- Browser QA used a clean localhost origin with a disposable database and fresh Guest, Member, Coach and Admin sessions at `375x812`, `768x1024` and `1440x900`.
- A dedicated tier fixture additionally verified Starter, Pro and Elite browser behavior at all three viewports: Starter displayed the server denial and `Review plans`; Pro displayed `2/2 used · 0 remaining`; Elite displayed `Unlimited`, exposed real slots and successfully created a disposable booking.
- Guest public Coach list/detail, booking login guard and private-route protection passed. Member dashboard, Coach discovery/booking, appointments, workouts, membership and self-scoped notifications passed. Coach dashboard, Availability, Appointments, Programs, Published/Draft Builder, Notifications and source-aware session links passed. Admin dashboard, Coach management, Exercise Library and Workout Governance passed.
- Notification bell/unread count, dropdown/list, mark-one-read, read-all, empty state and role isolation passed. Program Draft/Published/Archived badges, Publish/Clone/Archive, version links, Published read-only behavior and Assignment selector passed.
- Mobile QA found and fixed two real overflow defects: `min-w-0` on the Coach Program Builder grid/content and Admin Exercise Library grid/content. Draft Builder width changed from `459` to `369` CSS pixels at 375px viewport; Admin Exercise Library changed from `381` to `375`. All final route checks had no horizontal overflow and no new console errors.
- Console output contained only existing React Router future-flag warnings. The initial `127.0.0.1` browser attempt failed because the disposable backend CORS origin was configured for `localhost`; rerunning with the configured localhost origin passed. Long navigation-loop timeouts were browser harness resets, not application failures.

Cleanup and transition:

- Exact Phase 29 backend/Vite QA processes were stopped. Ports `51230`-`51232` and the tier-audit ports `51233`-`51234` were verified closed. The exact databases `GYMFIT_DB_COACH_ACCEPTANCE_PHASE29_BROWSER_20260807` and `GYMFIT_DB_COACH_ACCEPTANCE_PHASE29_TIER_AUDIT_20260807` were dropped and read-only `DB_ID` checks returned `null`. No other process or database was touched.
- The required Phase 00 artifact `COACH_COMPLETION_BASELINE.md` is present and records the original branch, HEAD, clean-worktree, migration and build/test evidence from checkpoint `0dfc201`.
- Phase 29 is complete. The state transitions to `DONE` with `activeStatus=PASS`, `lastCompletedPhase=29`, `nextPhase=null`, `blocker=null` and `safeToStartNextPhase=false`.
- Final checkpoint commit: `803e4b0 docs(coach): finalize coach1 completion handover`.
- Final audit evidence commit: `d20fdd6 docs(coach): complete final audit evidence`.
- Migration boundary clarification commit: `d8808bf docs(coach): clarify migration deployment boundary`.
- Known non-blocking warnings are documented in `COACH_KNOWN_LIMITATIONS.md`. No Phase 30 is planned or required.

## Phase 28 - Performance and index review

Status: PASS (disposable query-plan/statistics review, evidence-backed indexes, frontend stale-request protection, regression gates and cleanup)

- Branch was verified as `coach1` before and after execution. This phase stayed within Coach performance scope: one disposable performance acceptance script, one additive Coach migration `0016`, a targeted entitlement query optimization and AbortSignal plumbing for Coach/Booking list requests. No Marketplace/Seller source or migration `0100`-`0111` was changed.
- The first harness attempt stopped before fixture completion because the SQL CTE alias `offsets` conflicted with SQL Server syntax. A second harness issue showed that `SET SHOWPLAN_XML` must be the only statement in its batch. Both were harness defects, corrected before any PASS result; no product data was treated as evidence from those failed runs.
- `backend/src/scripts/coach-performance-acceptance.ts` now creates an isolated fixture only when `COACH_PERFORMANCE_ACCEPTANCE=1` and `DB_NAME` starts with `GYMFIT_DB_COACH_ACCEPTANCE_PHASE28_`. It seeds 60 Members, 60 Assignments, 240 Schedules, 120 Bookings, 60 member sessions, legacy sessions, seven weekly Availability rules, 24 exceptions and 250 Notifications. It captures runtime `STATISTICS XML`, `STATISTICS IO/TIME`, operator summaries and API latency for Members, Assignments, Schedules, Dashboard, Notifications, Bookings, Booking summary, Availability and Plans/Entitlements.
- Baseline evidence on `GYMFIT_DB_COACH_ACCEPTANCE_PHASE28_PERF_20260806` showed clustered scans for the high-cardinality Coach Member and filtered Booking queries. After applying `0016` only on that disposable database, Coach Members changed to `Index Seek` and Users logical reads fell from 120 to 4; the filtered Booking query changed to `Index Seek` and logical reads fell from 4 to 3. Schedule and Notification query plans remained bounded with their existing indexes, so no redundant Schedule/Notification index was added.
- Added `db/migrations/0016_coach_performance_indexes.sql`, additive and idempotent, with indexes for CRM assignment scope, active Member name ordering, Coach/Member Booking status-date filtering and Membership user/status/date lookup. The migration was applied only to the disposable fixture, then rerun with `0 pending migrations` and `0 checksum mismatches`.
- `listPlanEntitlements(planIds)` now pushes the requested Plan ID filter into SQL with parameterized `IN` values instead of reading every entitlement and filtering in memory. Frontend Coach Programs, Members and Appointments list requests now use `AbortController`/Axios `signal`; Booking and Coach Workspace list services accept optional cancellation signals, preventing stale responses from replacing newer filters/pages. Existing availability cancellation behavior remains intact.

Commands and runtime evidence:

- `npm.cmd run acceptance:coach-performance` with the seeded disposable fixture: PASS; all plan/statistics assertions and API smoke checks returned `200`.
- Post-migration `COACH_PERFORMANCE_SKIP_SEED=1 npm.cmd run acceptance:coach-performance`: PASS; plan operators, IO/TIME and API smoke rechecked after `0016`.
- `npm.cmd run db:migrate -- --through=0016`: PASS; second run reported `Applied migrations: 28`, `Pending migrations: 0`, `Checksum mismatches: 0`.
- Backend `npm.cmd run build`: PASS.
- Backend `npm.cmd run lint`: PASS with 0 errors and 461 existing `no-explicit-any` warnings.
- Frontend `npx.cmd tsc --noEmit`: PASS.
- Frontend `npm.cmd run build`: PASS with the existing Vite large-chunk warning.
- `git diff --check`: PASS; only the repository's existing LF/CRLF normalization warnings were reported.

Cleanup and scope evidence:

- Exact disposable backend PID `16044` was stopped and port `51228` verified closed. Exact database `GYMFIT_DB_COACH_ACCEPTANCE_PHASE28_PERF_20260806` was dropped. No migration remained running and the canonical database was not changed.
- Phase 28 code checkpoint: `674279e perf(coach): review coach query plans and indexes`.
- Browser QA and full final Coach acceptance remain intentionally reserved for Phase 29; this phase did not start Phase 29.

Transition:

- Phase 28 is complete. Phase 29 is selected as `NOT_STARTED`; no Phase 29 work was started in this checkpoint.
- Known warnings are unchanged: repository-wide ESLint `no-explicit-any` warnings, the Vite large-chunk warning and existing React Router future-flag notices. None is a Phase 28 failure.

## Phase 27 - Security, IDOR and concurrency hardening

Status: PASS (completion security acceptance, Coach regression matrix, build/lint/typecheck and disposable cleanup)

- Branch was verified as `coach1` before and after execution. Phase 27 created only the isolated completion acceptance script and its package command. No production Coach route/service was changed, no migration was created, and no Marketplace/Seller source or migration `0100`-`0111` was modified.
- Added `backend/src/scripts/coach-completion-security-acceptance.ts` and `acceptance:coach-completion-security`. The fixture uses six actors: Guest, Member A/B/C, Coach A/B and Admin. It exercises public/private RBAC, Coach ownership, body identity spoofing, source-aware Session identity, private Member context, notification recipient scope and Membership/quota boundaries.
- The first fixture run exposed an empty disposable `Exercises` catalog. The acceptance fixture now seeds and cleans up a dedicated active Exercise rather than relying on unrelated catalog data. A schedule-race fixture initially targeted a date with no matching Program Day; the fixture now adds a week-four race Day and verifies the real assignment-relative generation race at `today+21`.
- Final completion acceptance passed all checks: Guest public access/private denial; Member/Coach/Admin route RBAC; cross-Coach Program/Availability/Assignment/Member/Context/Booking/Notification/Session IDOR; client `memberId` and `owner_coach_id` spoof rejection; slot/quota serialization; notification deduplication; Session completion and terminal Set immutability; idempotent Schedule generation; conditional Assignment transition; transactional Publish/Clone; and concurrent Admin reassignment with one authoritative owner.

Runtime acceptance evidence:

- `npm run acceptance:coach-completion-security`: PASS on `GYMFIT_DB_COACH_ACCEPTANCE_PHASE27_20260806`.
- `npm run acceptance:coach-role`: PASS on the same disposable Coach database.
- `npm run acceptance:coach-booking-quota`: PASS, including Starter/Pro/Elite, cancellation no-refund, month boundary and concurrent last-quota requests.
- `npm run acceptance:coach-membership`: PASS, including pending payment, confirmation, upgrade/downgrade/cancel, audit and concurrent activation.
- `npm run acceptance:coach-entitlement`: PASS; structured entitlement constraints and typed Plan response verified.
- `npm run acceptance:coach-member-context`: PASS; previous Coach read-only/new Coach isolated scope and optimistic conflict verified.
- `npm run acceptance:coach-notifications`: PASS; self-scope, read lifecycle, triggers and concurrent deduplication verified.
- `npm run acceptance:coach-program-versioning`: PASS; Published immutability, deep clone, Assignment pinning and concurrent version allocation verified.
- `npm run acceptance:admin-coach`: PASS on `GYMFIT_DB_ADMIN_COACH_ACCEPTANCE_PHASE27_20260806`.
- `npm run acceptance:coach-member-e2e`: PASS on `GYMFIT_DB_COACH_E2E_FIX_PHASE27_20260806`.
- `npm run acceptance:coach-booking`: PASS on `GYMFIT_DB_COACH_BOOKING_ACCEPTANCE_PHASE27_20260806`.
- `npm run test:coach-booking-unit`: PASS.

Build and scope evidence:

- Backend `npm run build`: PASS.
- Backend `npm run lint`: PASS with 0 errors and 460 existing `no-explicit-any` warnings.
- Frontend `npx tsc --noEmit`: PASS.
- Frontend `npm run build`: PASS with the existing Vite large-chunk warning.
- `git diff --check`: PASS; only the existing package/script line-ending normalization warning was reported by Git.
- Four disposable databases were stopped and dropped exactly by name. Backend fixture PIDs on ports `51227`, `51228`, `51229` and `51230` were stopped and verified absent. No canonical database was changed and no migration was left running.

Known warnings/limitations:

- Repository-wide ESLint `no-explicit-any` warnings, Vite large-chunk warning and existing React Router future-flag notices remain; none is a Phase 27 failure.
- Phase 27 does not add browser UI behavior; frontend verification here is typecheck/build. Final browser QA remains part of Phase 29.

Transition:

- Phase 27 is complete. Phase 28 is selected as `NOT_STARTED`; it was not started in this checkpoint.
- Code checkpoint commit: `414366a test(coach): add completion security and concurrency acceptance`.
- Documentation checkpoint commit: `docs(coach): checkpoint phase 27`.

## Phase 26 - Workout Program Versioning frontend

Status: PASS (frontend lifecycle UI, browser QA, API acceptance and disposable cleanup)

- Branch was verified as `coach1`. Changes are limited to the five planned frontend files for lifecycle metadata/actions, read-only Published/Archived editing, version links and Published/Active Assignment selection. No backend production file, migration or Marketplace/Seller file was changed.
- The Assignment selector includes a compatibility fallback for legacy rows without `lifecycle_status`; the backend remains authoritative and only active Published versions can be assigned.
- The earlier browser failure was isolated to the QA harness: the browser-origin `Origin: http://127.0.0.1:51230` reached the disposable backend, whose default CORS allow-list rejected it and returned `Internal Server Error`. A temporary proxy outside the repository stripped only browser-origin headers and returned an empty Cart fixture response; it did not alter production code, credentials, tokens or the canonical database.
- A clean in-app browser session then authenticated against the disposable Coach fixture and verified the lifecycle list, Draft/Published/Archived badges, version links, Clone Version, Publish, Archive, read-only Published/Archived editor controls and the Assignment selector. Published and Archived inputs/actions were disabled; Draft controls were enabled; the selector exposed only the Published version.
- Guest protection was verified by logout followed by navigation to `/coach/workout-programs`, which redirected to `/login`. Browser console error collection was empty for the successful run.
- Responsive QA passed at `375x812`, `768x1024` and `1440x900`; document/body widths stayed within the viewport and lifecycle content remained visible. No horizontal overflow was observed.
- Disposable database `GYMFIT_DB_COACH_ACCEPTANCE_PHASE26_UIQA_20260806` was migrated through `0015`, used for browser/API QA, then dropped. The canonical database was not changed, no migration remained running, and the exact backend/Vite/proxy QA processes and browser tabs were stopped/finalized.

Commands/evidence:

- `frontend: npx tsc --noEmit`: PASS.
- `frontend: npm run build`: PASS with the existing Vite large-chunk warning.
- `backend: npm run build`: PASS.
- `backend: npm run lint`: PASS, 0 errors and 460 existing `no-explicit-any` warnings.
- `backend: npm run acceptance:coach-program-versioning`: PASS on the disposable Phase 26 database after the browser lifecycle actions; RBAC/IDOR, immutability, Assignment pinning, deep-copy and concurrent clone checks all passed.
- Browser QA: login, lifecycle actions, read-only controls, Assignment filtering, guest redirect and three viewport/overflow checks: PASS.
- `git diff --check`: PASS before checkpoint commit.

Transition:

- Phase 26 is complete. Phase 27 is selected as `NOT_STARTED` and was not started in this checkpoint.
- Known warnings are unchanged: repository-wide ESLint `no-explicit-any` warnings, Vite large-chunk warning and existing React Router future-flag notices. None is a Phase 26 failure.
- Checkpoint code commit: `65d4455 feat(coach): expose workout program version lifecycle in UI`.
- Documentation checkpoint commit: `4081bd8 docs(coach): checkpoint phase 26`; Phase 27 remains stopped.

## Phase 25 - Workout Program Versioning database/backend

Status: PASS (migration, lifecycle API, Assignment pinning, security/concurrency acceptance and regression)

- Added `db/migrations/0015_workout_program_versioning.sql` as an additive, idempotent extension of `WorkoutPrograms` with `root_program_id`, `version_number`, `lifecycle_status`, `published_at` and `cloned_from_program_id`. Legacy active rows already referenced by active/paused Assignments are backfilled as `PUBLISHED`; unassigned active rows become `DRAFT`; inactive rows become `ARCHIVED`. Migration `0015` was applied only to disposable databases and was never applied to the canonical database or migrations `0100`-`0111`.
- New Programs start as `DRAFT` and are self-rooted inside the same serializable transaction. Because SQL Server cannot know an identity value before the insert, `root_program_id` remains nullable at the storage boundary while the service populates it immediately before commit; versioned rows returned by the Coach service always carry a root ID.
- Added Coach-only `POST /api/coach/workout-programs/:programId/publish`, `POST /api/coach/workout-programs/:programId/clone-version` and `POST /api/coach/workout-programs/:programId/archive`. Clone performs a transactional deep copy of Days and Exercises, allocates a unique sequential version under serializable locking and never replaces an existing Assignment. Published and Archived structural mutations return `409 PROGRAM_VERSION_IMMUTABLE`.
- All existing Program/Day/Exercise mutation paths now enforce Draft ownership. Assignment creation and Admin reassignment require an active Published version; `program_id` remains the exact selected version. Legacy Activate maps Archived to Draft, while Deactivate maps any non-Archived version to Archived without deleting history.
- Updated Coach acceptance fixtures to publish Programs before Assignment and to assert Published immutability. Added `acceptance:coach-program-versioning` covering lifecycle transitions, deep-copy, Assignment version pinning, archive preservation, legacy mapping, RBAC/IDOR and concurrent clone version allocation.

Database/runtime evidence:

- Disposable fixtures: `GYMFIT_DB_COACH_ACCEPTANCE_PHASE25`, `GYMFIT_DB_ADMIN_COACH_ACCEPTANCE_PHASE25` and `GYMFIT_DB_COACH_E2E_FIX_PHASE25`.
- The first migration attempt exposed a SQL Server batch-compilation issue (`ALTER TABLE ADD` followed by same-batch references); the transaction rolled back with no partial migration. `GO` batch boundaries were added, after which migration `0015` applied cleanly. A second `--through=0015` run reported `0 pending migrations` and `0 checksum mismatches`.
- All three disposable databases were stopped/dropped after testing; exact backend processes were stopped. No canonical database was changed and no migration remained running.

Tests:

- `npm run build` (backend): PASS.
- `npm run lint` (backend): PASS with 0 errors and 460 existing `no-explicit-any` warnings.
- `npx tsc --noEmit` (frontend): PASS.
- `npm run build` (frontend): PASS; existing large-chunk warning remains.
- `npm run acceptance:coach-program-versioning`: PASS.
- `npm run acceptance:coach-role`: PASS.
- `npm run acceptance:admin-coach`: PASS.
- `npm run acceptance:coach-member-e2e`: PASS.
- `git diff --check`: PASS.

Security/concurrency evidence:

- Guest/Member/Admin cannot call Coach version routes; Coach B cannot read, edit or clone Coach A's Program. Assignment and Admin reassignment ownership remains actor-scoped.
- Published metadata, Day, Exercise, delete and reorder mutations are blocked; Archived versions cannot be cloned; historical Days/Exercises and existing Assignment references remain readable.
- Concurrent clone requests produced versions 3 and 4 exactly once each. Existing Assignment remained pinned to the source version while a new Assignment selected the Published clone. Admin concurrent reassignment retained one winner and one active scope.

Known warnings/limitations:

- Repository-wide ESLint `no-explicit-any` warnings and the frontend Vite large-chunk warning remain pre-existing; no Phase25 error was found.
- Phase26 frontend lifecycle badges/editor lock has not started. The existing frontend still exposes legacy Activate/Deactivate labels until Phase26.

Checkpoint:

- Code commit: `54fe846 feat(coach): add immutable workout program version lifecycle`.
- Phase26 is selected as `NOT_STARTED`; no Phase26 work was started in this phase.

## Phase 24 - In-app notification UI

Status: PASS (implementation, API acceptance, browser QA and disposable cleanup; Phase 25 not started)

Changed files:
- `frontend/src/components/notifications/NotificationBell.tsx`: authenticated bell, bounded 60-second unread refresh, dropdown open/close behavior and full-page link.
- `frontend/src/components/notifications/NotificationFeed.tsx`: loading/empty/error states, mark-read/read-all, load-more and safe relative action navigation. Replaced the Zustand object selector with stable primitive selectors after browser QA exposed a `getSnapshot` infinite-update loop.
- `frontend/src/pages/notifications/NotificationsPage.tsx`, `frontend/src/services/notifications.ts`, `frontend/src/stores/notificationsStore.ts`: self-scoped notification page, typed API client and stale-request-safe state management.
- `frontend/src/App.tsx`, `frontend/src/auth/accessPolicy.ts`, `frontend/src/components/layout/Layout.tsx`: authenticated route, role policy and bell integration.

Database:
- No Phase 24 migration was created.
- Notification API dependency remained Phase 23 migration `0014`; canonical database was not changed.
- Disposable database `GYMFIT_DB_COACH_ACCEPTANCE_PHASE24_DEBUG` was stopped and dropped after QA.

Tests:
- `frontend: npx tsc --noEmit`: PASS.
- `frontend: npm run build`: PASS; existing large-chunk warning remains.
- `backend: npm run build`: PASS.
- `backend: npm run lint`: PASS with 460 pre-existing `no-explicit-any` warnings and zero errors.
- `git diff --check`: PASS.
- `backend: npm run acceptance:coach-notifications` on the disposable fixture: PASS for Guest/RBAC, recipient self-scope, cross-Coach IDOR, unread/read lifecycle, concurrent deduplication and workflow triggers.

Acceptance evidence:
- Coach browser flow: bell/unread count, dropdown, safe action URL navigation, mark-read, full notification page and read-all: PASS.
- Member browser flow: self-scoped empty state and Coach notification isolation: PASS.
- Guest `/notifications` access redirected to `/login`: PASS.
- Controlled backend outage rendered the notification error state and retry recovered successfully: PASS.
- Responsive QA at `375x812`, `768x1024` and `1440x900`: PASS; no horizontal overflow.
- Fresh browser console had no new error logs. The original timeout was isolated to the QA shell stdout lifecycle (`EPIPE`); the actual UI defect was the unstable Zustand object selector and is fixed.
- Exact disposable backend/Vite processes were stopped and no migration was left running.

Known limitations:
- Existing React Router future-flag warnings and repository-wide ESLint `no-explicit-any` warnings remain; neither is a Phase 24 error.
- Polling is intentionally bounded to 60 seconds; no WebSocket/realtime transport was added.

Next phase prerequisites:
- Phase 25 is selected in `COACH_PHASE_STATE.json` as `NOT_STARTED` and must not start in the current checkpoint.
- Code checkpoint commit: `f4962ab feat(notifications): add coach and member notification UI`.
- Documentation checkpoint commit: `e496929 docs(coach): checkpoint phase 24`.

## Phase 23 - Coach workflow in-app notification backend

Status: PASS (additive migration, self-scoped API, transactional triggers and disposable acceptance)

- Added `db/migrations/0014_notifications.sql` as an additive/idempotent upgrade of the existing `dbo.Notifications` table. It adds `recipient_user_id`, `action_url`, `read_at` and `deduplication_key`, backfills recipient/read state from the legacy columns, preserves `user_id/is_read` compatibility and creates recipient/unread/dedup indexes. No second Notifications table was created.
- Added authenticated self-scoped `GET /api/notifications`, `GET /api/notifications/unread-count`, `PATCH /api/notifications/:id/read` and `POST /api/notifications/read-all`. Cross-recipient reads/writes return the same not-found behavior without leaking notification existence; mark-read and mark-all are idempotent.
- Added transactional Coach workflow triggers for Booking creation/status changes, Coach assignment creation/transitions, schedule generation, Admin assignment/reassignment and overdue schedule reconciliation. Notifications use bounded payloads, role-safe relative action URLs and stable deduplication keys; no email, WebSocket or realtime chat was added.
- Added `acceptance:coach-notifications`, covering Guest/RBAC self-scope, unread/read lifecycle, cross-Coach IDOR, concurrent deduplication, Booking/Assignment/Schedule/Reassignment triggers and overdue batch retry idempotency. Disposable database `GYMFIT_DB_COACH_ACCEPTANCE_PHASE23` applied `0010`-`0014`, reran migration with 0 pending/checksum mismatch, passed the full acceptance and was dropped afterward.
- No frontend notification UI was added; Phase 24 consumes this API. No Marketplace/Seller source or migrations `0100`-`0111` changed.

Checks: backend build PASS; targeted ESLint PASS with one acceptance fixture `no-explicit-any` warning; disposable migration/acceptance PASS; second `db:migrate --through=0014` was a no-op with 0 pending and 0 checksum mismatch; `git diff --check` PASS.

## Phase 21 - Coach Member goals and private context API

Status: PASS (migration, API, RBAC/IDOR and concurrency acceptance)

- Added `db/migrations/0013_coach_member_context.sql` as an additive, idempotent Coach-only context table with `(coach_id, member_id)` uniqueness, User foreign keys, bounded private fields, next-review date and updated timestamp/index coverage. The migration does not reuse `CRMNotes` and does not modify Marketplace/Seller migrations.
- Added Coach-only `GET/PATCH /api/coach/members/:memberId/context`. Ownership is derived from the authenticated Coach and the current `CRMCustomers.assigned_coach_id`; Member/Admin routes are denied. A previous Coach may read its historical context after reassignment but receives read-only behavior, while the new Coach starts with a separate context row.
- PATCH uses serializable transaction scope and `expectedUpdatedAt` optimistic concurrency. Stale writes return `409 COACH_CONTEXT_CONFLICT`; a previous Coach write returns `403 COACH_CONTEXT_READ_ONLY`. Private notes are never returned through Member-facing or Admin-facing routes.
- Added `acceptance:coach-member-context`, covering guest/member/admin RBAC, cross-Coach read/write IDOR, context creation/round-trip, concurrent optimistic-lock updates, reassignment read-only policy and new-Coach isolation. Disposable migration `0010`-`0013` passed twice with zero checksum mismatch; database `GYMFIT_DB_COACH_ACCEPTANCE_PHASE21` was dropped after testing.
- No frontend editor was added in this phase; Phase 22 consumes the typed API contract. No Marketplace/Seller source or migration `0100`-`0111` changed.

Checks: backend build PASS; Phase 21 ESLint PASS with one acceptance fixture `no-explicit-any` warning; frontend `npx tsc --noEmit` PASS; `git diff --check` PASS; disposable `acceptance:coach-member-context` PASS.

## Phase 22 - Coach Member Context editor UI

Status: PASS (frontend implementation, browser QA and API contract verification)

- Rebuilt `CoachMemberDetailPage` around the Phase 21 context API. The editor includes Goal, Limitations, private note and next-review date, with explicit Save, dirty/saved state, loading/empty/error states and a browser `beforeunload` warning for unsaved changes.
- The form sends `expectedUpdatedAt` and preserves the draft on `409 COACH_CONTEXT_CONFLICT`; the Coach can explicitly reload the latest server version before retrying. A reassigned historical context is rendered read-only when the API exposes that state, and private-note copy is explicitly Coach-only.
- No per-keystroke PATCH is issued. Disabled controls and role route policy remain UI affordances only; backend ownership and privacy checks remain authoritative. Monitoring links retain the existing Coach scope and source-aware session routes.
- Browser QA on disposable `GYMFIT_DB_COACH_ACCEPTANCE_PHASE22_BROWSER` verified Coach sign-in, Member Detail rendering, Goal dirty-state transition, Save success and reset to synchronized/disabled state. A temporary `VITE_COACH_QA` harness bypassed only the unrelated Buyer cart bootstrap for the fixture and was removed before checkpoint; no Marketplace/Seller source changed.
- No migration was created in this phase. The Phase 21 `0013` context migration and typed API are the only database/API dependencies.

Checks: frontend `npx tsc --noEmit` PASS; frontend `npm run build` PASS with the existing large-chunk warning; browser QA PASS; temporary frontend/backend processes and disposable database were stopped/dropped; `git diff --check` PASS.

## Phase 15 — Coach Availability database model

Status: PASS (migration created and statically reviewed; canonical database intentionally not changed)

- Added `db/migrations/0011_coach_availability.sql` with additive, idempotent creation of `CoachAvailabilityRules` and `CoachAvailabilityExceptions`.
- Weekly rules enforce weekday, valid time range, supported mode, Coach FK, exact-duplicate protection and a Coach/day/active query index.
- Date exceptions support the ADR-defined `BLOCK` and `OPEN` precedence, enforce all-day BLOCK versus ranged OPEN semantics, validate optional mode, add Coach FK, exact-duplicate protection and a Coach/date/active query index.
- The migration does not create materialized slots and documents that overlap rejection remains a serializable service responsibility for Phase 16. It does not touch Marketplace/Seller source or migrations `0100`–`0111`.
- No canonical migration apply was performed. Runtime idempotency and constraint checks remain to be run against the disposable acceptance database before Phase 16 API work.

Checks: migration file reviewed for SQL Server types/constraints/indexes and `git diff --check` PASS. Canonical `db:migrate:status` remains the only permitted database operation for this phase; `0011` is expected to be pending until an approved disposable migration run.

## Phase 16 — Database-backed Coach Availability API

Status: PASS (implementation, disposable migration and runtime acceptance)

- Replaced the public hardcoded slot calculation with a database-backed availability service using `CoachAvailabilityRules`, `CoachAvailabilityExceptions`, Coach profile status, booking state, Asia/Ho_Chi_Minh date boundaries and fixed 60-minute slot generation.
- Added public availability metadata and compatibility fields: active/booking-enabled state, rules, exceptions, real `slots`, `available_slots`, `booked_slots`, mode/location, duration and timezone. Public responses do not expose exception private notes.
- Added Coach-only self routes for availability preview and CRUD of weekly rules/date exceptions. Rules and OPEN exceptions reject overlap in serializable transactions; ownership is derived from the authenticated Coach and cross-Coach delete is denied.
- Added BLOCK/OPEN precedence: a BLOCK suppresses recurring rules while an OPEN exception adds an explicitly validated window. Suspended Coaches remain hidden; active booking-disabled Coaches return no public slots.
- Booking creation now re-evaluates the DB-backed slot inside its serializable transaction before overlap insertion. The fixed slot constant was removed; arbitrary valid times are accepted only when a configured rule/exception produces that slot.
- Updated disposable Coach acceptance setup so migration `0010`/`0011` remain pending until the normal migration runner applies them, and extended booking acceptance for availability CRUD, block/open behavior and ownership.
- No Marketplace/Seller source or migrations `0100`–`0111` changed. Canonical database was not modified; the disposable database `GYMFIT_DB_COACH_BOOKING_ACCEPTANCE_PHASE16` was dropped after testing.

Checks: backend build PASS; `test:coach-booking-unit` PASS; targeted ESLint PASS with only existing acceptance `no-explicit-any` warnings; disposable `0010`/`0011` migration and Coach migration verification PASS; full `acceptance:coach-booking` PASS including availability, booking enforcement, concurrency, RBAC and IDOR cases. Disposable status also showed no checksum mismatch; its pre-existing generic post-migration probe lacks `ProductOptions` and is not used as the Coach verdict.

## Phase 17 — Coach Availability UI and real-slot booking UX

Status: PASS (implementation, frontend checks and browser QA)

- Added the Coach-only `/coach/availability` page with recurring weekly windows, BLOCK/OPEN date exceptions, explicit save/delete actions, 14-day preview, loading/empty/error states and visible Coach timezone/mode/location data.
- Added typed availability rule/exception/slot contracts and self-management API calls. Availability list calls use a no-cache request and normalize malformed empty list payloads to prevent a blank-screen render failure.
- Added the Availability route to access policy, Coach Sidebar and Command Menu. The page aborts stale preview requests when the selected date changes and does not issue PATCH requests per keystroke.
- Reworked public Member booking to consume database-generated `slots` and compatibility `available_slots`; it shows real mode/location/timezone data and refreshes availability after a 409 slot conflict. No hardcoded Coach slot list remains in the page.
- Browser QA on the disposable Coach fixture verified Coach sign-in, Availability rule rendering, 14-day preview and real slots; Member sign-in verified Coach discovery and booking slots with mode/location; an unauthenticated request to `/coach/availability` redirected to login. A temporary local browser harness stubbed only the unrelated Marketplace cart bootstrap dependency; it was removed after QA and no Marketplace source/migration was changed.
- No migration was created or applied in this phase. The Phase 16 `0011` availability migration remains the database dependency.

Checks: frontend `npx tsc --noEmit` PASS; frontend `npm run build` PASS with the existing large-chunk warning; `git diff --check` PASS. Temporary API/Vite/browser processes and disposable database `GYMFIT_DB_COACH_BOOKING_ACCEPTANCE_PHASE17_BROWSER` were stopped/dropped. No Marketplace/Seller source or migrations `0100`–`0111` changed.

## Phase 18 — Membership purchase, simulated payment and plan lifecycle

Status: PASS (implementation, disposable runtime acceptance and frontend checks)

- Replaced the old subscribe flow that activated a Membership before payment. `POST /api/plans/subscribe` now creates only a `Payments.status='pending'` record with the schema-correct `Payments.method` column; `POST /api/plans/subscribe/confirm` performs explicit simulated confirmation before creating the active Membership.
- Added transactional `upgrade` and `downgrade` endpoints. A pending plan change preserves the current active Membership; confirmation cancels the old record and creates exactly one new active record, retaining history and writing `AuditLogs` entries. Cancellation no longer references the non-existent `Memberships.updated_at` column.
- Membership state responses normalize lifecycle to `PENDING_PAYMENT`, `ACTIVE`, `CANCELLED` or `EXPIRED`, include the scoped current Membership and pending Payment, and never trust a client-supplied amount or user ID. Member-only routes include `/my-membership`, `/subscribe`, `/subscribe/confirm`, `/upgrade`, `/downgrade` and `/cancel`.
- Added typed frontend plan/lifecycle APIs, public plan intent storage for Guest registration return, login query-string preservation, Register return to `/membership/checkout`, and the Member-only `/membership/account`/`/membership/checkout` UI with pending confirmation, upgrade/downgrade and cancellation states.
- Added `acceptance:coach-membership`. Disposable acceptance passed Guest/RBAC checks, no early activation, pending-payment uniqueness, confirmation idempotency, payment IDOR, upgrade/downgrade ordering, cancellation, audit coverage and concurrent subscribe/confirm races. The disposable database `GYMFIT_DB_COACH_ACCEPTANCE_PHASE18` was dropped after testing.
- A temporary browser harness stubbed only unrelated Marketplace cart bootstrap calls because the disposable Coach fixture does not provide that Marketplace state. It was removed; no Marketplace/Seller source or migration `0100`–`0111` changed. Direct membership API acceptance remains the Phase 18 runtime verdict.

Checks: backend build PASS; backend lint PASS with 0 errors and the repository's existing `no-explicit-any` warnings; frontend `npx tsc --noEmit` PASS; frontend `npm run build` PASS with the existing large-chunk warning; `git diff --check` PASS. No Phase 18 migration was created or applied.

## Phase 19 - Structured Coach booking entitlements

Status: PASS (implementation, disposable migration/idempotency and API acceptance)

- Added `db/migrations/0012_membership_entitlements.sql` with additive, idempotent `PlanEntitlements` storage, typed Coach Booking keys, FK/unique/check constraints and a lookup index. Existing `Plans.features` remains compatibility copy and is not parsed for authorization.
- Seeded the first three active Plan slots by stable `sort_order` (the current Basic/Premium/VIP slots) as the Coach1 Starter/Pro/Elite contract: disabled/0, enabled/2 per Asia/Ho_Chi_Minh month, and enabled/unlimited `-1`. Display names are not used as identifiers and existing configured rows win on rerun.
- Added entitlement normalization and transactional Admin Plan create/update support, plus public `GET /api/plans` structured entitlement DTOs. Missing migration fails closed with `PLAN_ENTITLEMENTS_MIGRATION_REQUIRED`; no entitlement decision is made from free-form feature text.
- Updated frontend Plan types and Feature Comparison so Coach Booking rights are rendered from API entitlements. No hardcoded `2x/month` or `Unlimited` Coach values remain in the UI.
- Added `acceptance:coach-entitlement`. Disposable migration `0010`-`0012` applied successfully, a second `db:migrate --through=0012` was a no-op with zero checksum mismatch, duplicate/invalid entitlement writes were rejected, the public Plans API returned structured rows, and disposable database `GYMFIT_DB_COACH_ACCEPTANCE_PHASE19` was dropped afterward.
- No Marketplace/Seller source or migration `0100`-`0111` changed. Monthly quota enforcement remains Phase 20 and is not included here.

Checks: backend build PASS; backend lint PASS with 0 errors and 458 repository-wide `no-explicit-any` warnings; frontend `npx tsc --noEmit` PASS; frontend `npm run build` PASS with the existing large-chunk warning; disposable entitlement acceptance PASS; canonical migration status remains read-only and `0012` is pending until approved deployment.

## Phase 20 - Membership entitlement and monthly Coach booking quota

Status: PASS (transactional enforcement, quota API, frontend messaging and disposable acceptance)

- Booking creation now reads the authenticated Member's active Membership and structured Plan entitlement inside the same serializable transaction as availability, slot overlap and Booking insertion. Starter/no-Membership requests fail with `403 COACH_BOOKING_NOT_INCLUDED`; finite quota exhaustion fails with `409 COACH_BOOKING_QUOTA_EXCEEDED`.
- Monthly usage counts every successfully inserted Booking in the requested `Asia/Ho_Chi_Minh` calendar month, including cancelled and no-show rows. The Member Membership range and indexed Booking month range are locked before the count/insert so concurrent last-quota requests cannot oversubscribe.
- Added Member-only `GET /api/bookings/quota?date=YYYY-MM-DD`, returning `included`, `monthlyLimit`, `used`, `remaining`, `bookingMonth`, `timezone` and a stable exclusion reason. Elite uses `monthlyLimit=null`/`remaining=null` for unlimited.
- Coach Booking UI now displays quota and a Membership upgrade link. Booking backend remains authoritative; Coach/Admin cannot use the Member quota or create route.
- Added `acceptance:coach-booking-quota` covering Starter/no Membership, Pro 2-limit, cancellation no-refund, month boundary, Elite unlimited, RBAC and concurrent last-quota requests. Fresh disposable Booking regression also passed after seeding existing Booking fixtures with an Elite entitlement.
- No migration was created. No Marketplace/Seller source or migration `0100`-`0111` changed.

Checks: backend build PASS; targeted quota/controller lint PASS; frontend `npx tsc --noEmit` PASS; quota acceptance PASS; fresh `acceptance:coach-booking` PASS; disposable databases were dropped after testing. Query-plan/index review remains Phase 28.

## Scope guard

- Target branch: `coach1`
- Scope: Coach modules, Coach-facing Membership/Entitlement/Booking, Member Workout, Admin Coach and related acceptance coverage.
- Explicitly out of scope: Marketplace Backend, Seller Backend, migrations `0100`–`0111`, framework/database changes, microservices, AI, realtime chat and video call.
- Existing user-owned untracked files were preserved.

## Phase 00 — Workspace safety and baseline

Status: PASS

Baseline captured on 2026-08-05 before Coach implementation changes.

### Repository

- Branch: `coach1`
- HEAD: `5944d17 feat(ui): stabilize shell and overhaul dashboard UX`
- Tracked worktree: clean before this checkpoint.
- Existing untracked plan/prompt files: preserved and not staged.

### Baseline evidence

- Backend build: PASS (`npm run build`).
- Backend lint: PASS with 0 errors and 452 existing warnings.
- Frontend typecheck: PASS (`npx tsc --noEmit`).
- Frontend build: PASS (`npm run build`).
- Booking unit test: PASS (`npm run test:coach-booking-unit`).
- Migration status: PASS/read-only. Target `GYMFIT_DB` has 22 applied migrations, 0 pending migrations and 0 checksum mismatches. Coach migration `0010_coach_profiles.sql` is applied.
- Marketplace/Seller migrations `0100`–`0111` are present and applied in the existing database; no source or migration changes were made to them.

### Acceptance execution note

Role, member E2E, Admin Coach and Booking acceptance scripts require isolated disposable databases through their environment guards. They were not run against the canonical database during this baseline checkpoint.

## Reporting convention

Each subsequent phase records its status, changed files, database/API/frontend impact, RBAC/IDOR checks, concurrency checks, test evidence, risks and checkpoint commit here. A phase is not marked PASS until its required build/test/scope checks complete.

## Phase 01 — Domain rules and ADR

Status: PASS

Added the canonical Coach domain contract and focused ADRs for Membership entitlement/quota, Availability and Program Versioning. The contract fixes Asia/Ho_Chi_Minh boundaries, reservation-based quota with no cancellation refund, explicit pending-payment confirmation, availability-versus-booking responsibilities, immutable snapshots, private context scope, notification limits and API error semantics.

Runtime tests were not required for this documentation-only phase. `git diff --check` passed before checkpointing.

## Phase 02 — Migration 0010 readiness and database guard

Status: PASS

- Canonical target: `GYMFIT_DB`.
- `npm run db:migrate:status`: 22 applied, 0 pending, 0 checksum mismatches.
- `0010_coach_profiles.sql`: APPLIED with matching checksum.
- `COACH_MIGRATION_VERIFY`: PASS; `CoachProfiles` exists and has two unique indexes.
- No migration file was created or rewritten. Migrations `0100`–`0111` were not changed.

The existing verification script already supplied the required Coach migration evidence, so no script change was necessary in this phase.

## Phase 03 — Schedule date model and generation

Status: PASS (implementation and compile checks)

- Schedule generation now uses the assignment start date as the relative week anchor.
- Requested generation dates are bounded by assignment start, current Coach timezone date, assignment end date and Program duration.
- The response now includes requested/effective range, `toDate`, `horizonDays`, `inserted` and `skipped` counts.
- Serializable generation and the existing `(assignment, program_day, scheduled_date)` idempotency guard remain in place.
- The Coach role acceptance fixture now covers bounded range and supplemental generation preserving assignment-relative week numbers.

Checks: backend build PASS; targeted ESLint PASS with two existing `no-explicit-any` warnings in the acceptance script; booking unit PASS; frontend typecheck/build PASS after the Schedule DTO/UI update. Disposable acceptance execution remains part of the integrated acceptance run.

## Phase 04 — Overdue Schedule reconciliation

Status: PASS (implementation and compile checks)

- Added a bounded Coach overdue service and interval runner.
- Only `SCHEDULED` rows older than the assignment timezone's current date are eligible.
- Rows with a Member Workout Session are excluded; `IN_PROGRESS`, `COMPLETED` and `CANCELLED` are never changed.
- Updates are conditional and idempotent; the runner has a single-flight guard, batch limit and error logging.
- The runner is disabled for isolated Coach acceptance environments and does not alter the existing order-expiration runner.
- Member E2E acceptance now verifies an overdue schedule becomes `SKIPPED` without a Session.

Checks: backend build PASS; targeted ESLint PASS; acceptance fixture compiles. Disposable execution remains part of integrated acceptance because the script requires an isolated Coach E2E database.

## Phase 05 — Session completion integrity

Status: PASS (implementation and compile checks)

- `COMPLETE` now requires at least one Session Exercise and one completed Set with at least one measurement.
- `ABANDON` remains valid for an empty/in-progress Session; not every target must be completed.
- Session and Schedule updates now verify affected rows inside the existing serializable transaction.
- Added stable error code `SESSION_HAS_NO_COMPLETED_WORK` on the 409 response.
- Member UI disables Complete until completed measured work exists while retaining backend enforcement.
- Member E2E acceptance now checks empty completion rejection.

Checks: backend build PASS; targeted lint PASS; frontend typecheck/build PASS; booking unit PASS. Disposable Member E2E remains part of integrated acceptance.

## Phase 06 — Immutable Exercise snapshot after source deactivation

Status: PASS (implementation and compile checks)

- Member Session start no longer filters `Exercises.is_active`; an Exercise already referenced by a Program Day is still copied into the immutable `MemberWorkoutSessionExercises` snapshot.
- The selectable Coach/Admin catalog continues to require an active source Exercise, so deactivation does not make the Exercise available for new Program edits.
- The Member E2E fixture now uses a dedicated Exercise slug, deactivates that source after the first Session, and verifies a later Session still receives the source name/id snapshot. Cleanup remains safe for reruns.
- Admin Exercise routes were reviewed: they support soft deactivate/activate and do not expose a source Exercise hard-delete route.

Checks: backend build/lint and frontend typecheck/build are required before checkpoint; booking unit and disposable Member E2E remain part of integrated acceptance. No migration was created.

## Phase 07 — Source-aware Session identity

Status: PASS (implementation and compile checks)

- Coach Session detail now accepts the discriminated route `/coach/members/:memberId/sessions/:source/:sessionId`, with `source` limited to `member` or `legacy`.
- The old numeric-only route remains a compatibility path only: it serves a unique source and returns `SESSION_SOURCE_REQUIRED` with HTTP 409 when both sources contain the same numeric ID. It never silently falls back after an explicit source was supplied.
- Dashboard, progress, list and detail links carry the source; frontend Session types and API client are source-aware. Member/legacy rows keep distinct React keys.
- Source checks are ownership-scoped before data is returned. Acceptance fixtures cover the valid legacy route, valid member route, wrong-source 404 and unambiguous legacy compatibility route.

Checks: backend build PASS; targeted ESLint PASS with two pre-existing `no-explicit-any` warnings in `coach-role-acceptance.ts`; frontend typecheck/build PASS; booking unit PASS. No migration was created.

## Phase 11 — Server-side pagination foundation

Status: PASS (implementation and compile checks)

- Coach Workspace `listSessions` now performs the legacy/member `UNION ALL`, ordering, count and `OFFSET/FETCH` in SQL Server. It no longer loads both complete histories and slices them in memory.
- Session rows retain the source discriminator, set summary and legacy blocked reason while using the same `{items,page,limit,total,totalPages}` contract as the other Coach Workspace lists.
- Public Coach list now exposes normalized `items` while preserving the existing `coaches` alias and pagination metadata for current callers.
- Added a reusable frontend pagination control and wired Coach Programs, Exercise Library, Members, Assignments, Schedules, Sessions and Admin Workout Governance to server page/filter state. Search/filter changes reset to page 1 and list views no longer request 50 records as an implicit full fetch.
- Admin Coach and Admin Exercise services were already SQL-paginated and were kept compatible; no migration or query index was added without Phase 28 query-plan evidence.
- Scope review: no Marketplace/Seller source or migration `0100`–`0111` changed.

Checks: backend build PASS; backend lint PASS with the existing 452 `no-explicit-any` warnings and zero errors; `test:coach-booking-unit` PASS; frontend typecheck PASS; frontend build PASS with the existing large-chunk warning. Disposable list fixtures with more than one page remain part of the integrated acceptance run.

## Phase 09 — Program Builder integrity and save semantics

Status: PASS (implementation and compile checks)

- Reworked the Coach Program Builder Exercise editor to keep edits local until an explicit `Save targets` action; PATCH is no longer sent for every keystroke.
- Added visible fields for target weight, duration, tempo and Coach note alongside sets/reps/rest, with dirty/saved/saving states and server-backed validation.
- Added client validation for the reps/duration requirement and min/max ordering while retaining the route's Zod validation and existing SQL columns from migration `0007`.
- A per-Exercise revision guard prevents a late save response from clearing a newer local draft. Double submit is disabled while a save is active.
- Program Day add/reorder/delete, Exercise add/reorder/delete and Program detail save remain available; the UI only touches Coach-owned resources through existing endpoints.

Checks: backend build PASS; targeted backend ESLint PASS; frontend typecheck/build PASS; booking unit PASS. No migration was created.

## Phase 12 — Booking filters and server-side summaries

Status: PASS (implementation and compile checks)

- `GET /api/bookings` now accepts server-side `status`, `fromDate`, `toDate`, `page` and `limit` filters. Status can remain a single value or use a validated comma-separated set for history tabs; date ranges reject invalid dates and `fromDate > toDate`.
- Added role-scoped `GET /api/bookings/summary` with pending, confirmed, completed, cancelled, no-show, upcoming and today counts, plus `asOfDate` and `Asia/Ho_Chi_Minh` timezone metadata. Upcoming/today only count pending or confirmed bookings and use the same role/date scope.
- Coach Appointments now requests the active tab on the server, has date filters, summary cards and pagination. Member Appointments uses the same server contract for upcoming/history tabs rather than fetching 100 rows and filtering locally.
- Coach Dashboard gets summary data and bounded today/pending lists from the API. Member Dashboard gets summary data and a bounded upcoming list; no booking dashboard metric depends on client-side filtering.
- Booking acceptance now covers server status/date filtering, invalid ranges and scoped summary metrics. Existing overlap, transition and IDOR protections remain unchanged.
- No migration was created; no Marketplace/Seller source or migration `0100`–`0111` changed.

Checks: backend build PASS; targeted backend ESLint PASS with six pre-existing `no-explicit-any` warnings in the acceptance script; backend typecheck PASS; `test:coach-booking-unit` PASS; frontend typecheck/build PASS with the existing large-chunk warning. Full disposable Booking acceptance remains required for runtime SQL/date-summary verification.

## Phase 13 — Dashboard metric correctness and future queries

Status: PASS (implementation and compile checks)

- `assignedMembers` remains the count of active Members assigned to the Coach, while `activeMembers` now counts distinct Members with an `ACTIVE` Coach Program Assignment. The previous duplicate query was removed.
- Future Schedule filtering is now performed before `TOP 5` in SQL. Because assignments store IANA timezone names, the service builds a bounded OR predicate per distinct scoped assignment timezone and computes each timezone's local current date before querying. JavaScript no longer filters a `TOP 50` result.
- Dashboard Schedule candidates are limited to active/paused assignment scopes and `SCHEDULED` state; the overdue reconciliation contract remains the source of truth for stale schedules. Recent Session rows keep explicit `legacy`/`member` source values and the existing source-aware links.
- Coach acceptance now checks assigned-versus-active counts, future schedule filtering and the post-completion dashboard state.
- No migration was created; no Marketplace/Seller source or migration `0100`–`0111` changed.

Checks: backend build PASS; targeted ESLint PASS with three pre-existing `no-explicit-any` warnings in `coach-role-acceptance.ts`; backend typecheck PASS. Disposable dashboard fixture execution remains required for runtime SQL timezone/aggregate verification.

## Phase 14 — Bounded Coach Attention Queue

Status: PASS (implementation and compile checks)

- Replaced the empty `attentionQueue` placeholder with seven deterministic, bounded rules: pending booking older than 24 hours, at least two skipped schedules, no workout session in seven days, assignment ending within seven days, missing future schedule in fourteen days, empty assigned Program Day, and low completion across at least two recent due schedules.
- Each rule is scoped through the authenticated Coach, active CRM Member relationship and assignment ownership. The combined queue sorts by `HIGH`/`MEDIUM`/`LOW`, stable trigger date, Member and rule type, then returns at most 10 items.
- Queue items expose only `type`, severity, Member identity, plain-language title/description, `actionUrl` and `createdFrom`. No diagnosis, treatment or health-risk inference is generated. Action URLs point to existing Coach routes and are not client-supplied.
- SQL queries are bounded per rule (`TOP 20`) and aggregate/group in the database; no N+1 per Member query was added. Dashboard frontend renders loading, empty and actionable states with severity styling.
- Role acceptance checks queue availability, maximum size, Coach-safe URLs and a scoped empty Program Day/no-workout signal after fixture generation.
- No migration was created; no Marketplace/Seller source or migration `0100`–`0111` changed.

Checks: backend targeted ESLint/typecheck PASS with five pre-existing `no-explicit-any` warnings in `coach-role-acceptance.ts`; frontend typecheck/build PASS with the existing large-chunk warning. Full disposable Coach role acceptance remains required for runtime SQL rule verification.

## Phase 10 — Safe Program Day editing

Status: PASS (implementation and compile checks)

- Backend Day create/update validates week 1–104 and day 1–7 even when called below the route layer.
- SQL Server unique violations for `(program_id, week_number, day_number)` are normalized to HTTP 409 `PROGRAM_DAY_POSITION_CONFLICT` instead of leaking raw SQL errors.
- A Day's week/day position cannot be changed after it has a Schedule reference; title and description metadata remain editable. Delete continues to map FK references to a stable 409.
- Program Builder now exposes explicit Day week/day/title/description editing with a `Save Day` action, dirty/saved state and no per-keystroke PATCH. Add Day caps the local next-day suggestion at 7.
- Role acceptance covers duplicate positions, invalid Day 8, scheduled position lock and safe metadata edit.

Checks: backend build PASS; targeted ESLint PASS; frontend typecheck/build PASS; booking unit PASS. No migration was created.

## Phase 08 — Assignment lifecycle and transition concurrency

Status: PASS (implementation and compile checks)

- The canonical transition map is now `ACTIVE → PAUSED|COMPLETED|CANCELLED` and `PAUSED → ACTIVE|COMPLETED|CANCELLED`; terminal states remain terminal.
- Transition reads the scoped Assignment with `UPDLOCK,HOLDLOCK`, checks the expected current status, and performs `UPDATE ... WHERE id AND coach_id AND status=@expectedStatus` inside a serializable transaction. Resume rejects a second active Assignment for the same Member.
- Completing or cancelling an Assignment conditionally closes its remaining `SCHEDULED` rows as `CANCELLED`; pausing prevents new Member Sessions through the existing assignment-status guard, while resume preserves the assignment's schedules.
- Role acceptance now covers concurrent pause/resume/complete, invalid repeated transition and no remaining scheduled rows after terminal transition. Existing Admin reassignment remains transactional and separate.

Checks: backend build PASS; targeted ESLint PASS with two pre-existing `no-explicit-any` warnings in `coach-role-acceptance.ts`; frontend typecheck/build PASS; booking unit PASS. No migration was created.
