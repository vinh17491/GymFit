# GymFit Final Hotfix Pass Baseline

This is the read-only baseline for phases 273 through 284. It records the
known source defects before behavioral changes on `phan-tich-lan-5`.

## Git and schema baseline

- Repository: `https://github.com/vinh17491/GymFit`
- Source branch: `phan-tich-lan-4`
- New working branch: `phan-tich-lan-5`
- Base commit: `8fd1e069500ef547c0211a98577eb1c29f7bb3b0`
- Migration head: `0119_analytics_retention_runtime.sql`
- Migration changes allowed in this pass: none; migrations `0001` through
  `0119` are frozen.
- Pass 4 handoff: `PHAN_TICH_LAN_4_RESULT.md` and
  `docs/analysis/PASS4_FINAL_FINDINGS.md`.

## Known P1: Admin Workout session CTE aliases

`backend/src/modules/admin-workouts/admin-workouts.service.ts` builds
`session_rows` from canonical `MemberWorkoutSessions`,
`CoachProgramAssignments`, `WorkoutPrograms`,
`MemberWorkoutSessionExercises`, and `MemberWorkoutSetLogs`. Five projected
expressions currently have no explicit aliases:

- `ms.ended_at`, later read as `s.completed_at`;
- total set count, later read as `s.set_count`;
- completed set count, later read as `s.completed_set_count`;
- `p.name`, later read as `s.workout_name`;
- `N'MEMBER'`, later read as `s.source`.

TypeScript compilation does not prove the SQL Server CTE column names. This is
a source-level runtime risk for `sessions()` and `progress()` and must be
fixed with explicit aliases only.

## Known P2: Video listing query validation

`backend/src/modules/videos/videos.routes.ts` mounts `GET /public` and `GET /`
without a route-level query schema. `getVideos()` currently reads `page`,
`limit`, `search`, `category`, and `difficulty` directly from `req.query` and
uses `Number(...)` for pagination. The canonical source is already
`dbo.Exercises`; this pass only adds reusable normalized Zod validation and
defensive pagination bounds.

## Verification boundary

This pass permits backend build/lint, frontend typecheck/build,
`git diff --check`, encoding/secret scans, and read-only source inspection. It
does not run database, browser, live API/provider, business, acceptance,
integrity, e2e, Playwright, Vitest, Jest, or chatbot suites. Those remain
`MANUAL_CHECK_REQUIRED` or `DATABASE_MANUAL_CHECK_REQUIRED`.
