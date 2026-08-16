# Status: HISTORICAL
# Do not use as current implementation source of truth.
# Superseded by: `docs/coach/COACH_MODULE_HANDOVER.md`

# Coach/Member Workout End-to-End Handover

Status: CANONICAL
Branch: `fix/vinh-coach-e2e-hardening`
Baseline: `feat/vinh-coach-member-e2e` at `21f69017b0c4f2f5933998b0382d0676b0e83a16`
Final commit: report after local commit; do not place a self-referencing hash in this file.

## Scope and verdict target

This handover covers the minimum Coach/Member Workout business flow: assignment/program/schedule read, Start Session, immutable snapshot, Set Logs, Complete/Abandon, Progress and Coach visibility of real Member execution data. Hardening additionally covers contract alignment, dedicated progress pages, current date-range eligibility, timezone consistency, reassignment lifecycle, dashboard states, migration checks and repository documentation cleanup.

The final verdict must be one of `FULL_COACH_BUSINESS_E2E_COMPLETE`, `PARTIALLY_COMPLETE` or `BLOCKED`, based on the evidence in the final report. Admin Coach Management is documented separately in [`docs/admin/ADMIN_COACH_MANAGEMENT_HANDOVER.md`](../admin/ADMIN_COACH_MANAGEMENT_HANDOVER.md); no Admin claim belongs in this Coach handover.

## API and UI contract

- Session list uses flat `MemberSessionListItem` fields: `program_name`, `day_title`, `scheduled_date`, `status`, `started_at`, `completed_at`, duration and set/exercise summaries.
- Progress `recent_sessions` uses flat `RecentWorkoutSession` fields.
- Set Logs support create/read/update/delete while `IN_PROGRESS`, completed/draft state, validation, duplicate-number `409`, edit and delete confirmation; terminal sessions are read-only.
- `/progress/sessions` is a dedicated filtered, paginated completed/abandoned history page.
- `/progress/exercises/:exerciseId` uses the route param and self-only exercise-history endpoint; no history returns `404`.
- Current/upcoming schedules are filtered by active assignment date range, status `SCHEDULED|IN_PROGRESS`, today in assignment timezone and ascending date. The API returns `can_start` and `blocked_reason`; Start rechecks all conditions in a serializable transaction.

## Security and lifecycle

Member IDs are always derived from JWT. Session, schedule, set and exercise-progress queries are self-scoped. Coach reads require current CRM/assignment scope. Reassignment pauses the old assignment and preserves its sessions; a new Coach creates a new assignment. No cross-member or cross-Coach ownership transfer is permitted.

## Database and acceptance

`0007` remains checksum-valid and `0008_member_workout_flow.sql` is additive. Acceptance uses `GYMFIT_DB_COACH_E2E_FIX_<timestamp>` with deterministic Coach A/B and Member A/B data; the canonical database never receives acceptance fixtures. The isolated databases were cleaned and dropped after API and browser runs; the acceptance cleanup runner also removes browser-created cart rows before fixture users.

## Build and handoff evidence

Verified on 2026-08-03: full API acceptance PASS (including concurrency, IDOR, snapshot immutability, Set Log CRUD, progress contracts, timezone/date-range and Coach visibility); browser acceptance PASS with real fixture data at 375/768/1440; focused Coach regression PASS; backend build PASS; frontend build PASS; frontend typecheck reports only the three recorded pre-existing out-of-scope errors; canonical `GYMFIT_DB` status is 20 applied/0 pending/0 mismatches; and backup checksum verification passed. Documentation inventory, archive/link scan, `git diff --check`, secret scan and out-of-scope review are recorded in the final handoff report. The branch is local only until the user explicitly requests a push.
