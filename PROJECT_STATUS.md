# GymFit Project Status

Updated: 2026-08-04 (Asia/Saigon)

## Snapshot

- Working branch: `coach`.
- Implementation audit baseline: `47417e26452cf4646ed51ec03a2891410e304823`.
- Canonical database: `GYMFIT_DB`.
- Canonical read-only migration status: `21 applied`, `1 pending` (`0010_coach_profiles.sql`), `0 checksum mismatches`; the canonical database was not mutated.
- Coach migrations `0007`, `0008` and `0009` are applied and checksum-valid.
- Acceptance databases are disposable, guarded by prefix and must be dropped after use.
- No acceptance fixtures remain in `GYMFIT_DB`.

## Coach module

The Coach/Member Workout slice and bounded Admin Coach Management are implemented. The canonical handover is [`docs/coach/COACH_MODULE_HANDOVER.md`](docs/coach/COACH_MODULE_HANDOVER.md).

- Coach Workspace: implemented and scoped by JWT/CRM/assignment ownership.
- Member Workout: Start Session, immutable snapshot, Set Logs, Complete/Abandon, history and progress.
- Admin Coach: list/detail/status, assign/reassign and status token invalidation.
- Admin Exercise Library: existing-schema CRUD and activate/deactivate.
- Admin Workout Governance: read-only Programs, Assignments, Schedules, Sessions and Progress.
- Coach appointments: canonical public DTOs, fixed 60-minute booking, ownership-safe state machine and normalized date/time output.
- Coach self-profile: authenticated Coach-only GET/PATCH with booking toggle and no identity-field mutation.
- Admin Program Builder: `BLOCKED_ADMIN_PROGRAM_OWNERSHIP_MODEL`.

## Verification

- Backend build: PASS.
- Backend lint: PASS, 0 errors with existing warnings.
- Frontend TypeScript: PASS, 0 errors.
- Frontend production build: PASS; existing large-chunk warning remains non-blocking.
- Coach Role acceptance: PASS on `GYMFIT_DB_COACH_ACCEPTANCE_20260804215000`.
- Coach Member E2E acceptance: PASS on `GYMFIT_DB_COACH_E2E_FIX_20260804215500`.
- Admin Coach acceptance: PASS on `GYMFIT_DB_ADMIN_COACH_ACCEPTANCE_20260804220000`.
- Coach Booking acceptance: PASS on `GYMFIT_DB_COACH_BOOKING_ACCEPTANCE_20260804212823`.
- Regression-02/03 acceptance: PASS; disposable databases and regression storage were removed.
- Isolated Admin–Coach–Member acceptance: PASS, including RBAC, IDOR, duplicate assignment, concurrent reassign, history preservation, Exercise status and suspended Coach denial.
- Acceptance database cleanup/drop: PASS.
- Browser visual verification: PASS for Guest, Member, Coach and Admin route flows at `375x812`, `768x1024` and `1440x900`; no horizontal overflow and no browser console errors.

## Known blockers

- `FULL_PROJECT_CLEAN_INSTALL_BLOCKED_BY_MARKETPLACE_MIGRATION_0100`: a fresh baseline contains `SellerApplications` before migration `0100` creates it. This is owned by Marketplace/Seller work and is outside Coach scope.
- Canonical `GYMFIT_DB` still requires a separately approved migration window for `0010_coach_profiles.sql`; no production data was changed by this task.

## Protected scope

Marketplace documentation under `docs/marketplace/**`, Marketplace/Seller backend modules, Video and Auth architecture are protected and unchanged by this cleanup. See [`docs/README.md`](docs/README.md) for the canonical documentation index.

## Next action

Apply `0010_coach_profiles.sql` only through the normal approved production migration procedure. Resolve migration `0100` separately on a Marketplace-owned branch; do not alter it as part of Coach work.

## Coach appointment update

The implementation includes canonical public Coach APIs, real Member booking, `/appointments`, `/coach/appointments`, fixed `Asia/Ho_Chi_Minh` slots, overlap/concurrency guards, IDOR-safe ownership, normalized Booking DTOs and additive `CoachProfiles` migration `0010`. Backend build/lint/unit, frontend TypeScript/build, Coach Role, Member E2E, Admin Coach, Coach Booking, regression and browser acceptance all pass on disposable environments. The canonical database remains unchanged with `0010` pending by design.
