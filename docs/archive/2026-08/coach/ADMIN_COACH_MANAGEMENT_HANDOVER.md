# Status: HISTORICAL
# Do not use as current implementation source of truth.
# Superseded by: `docs/coach/COACH_MODULE_HANDOVER.md`

# Admin Coach Management Handover

Status: IMPLEMENTED, CANONICAL MIGRATION VERIFIED; BROWSER VERIFICATION BLOCKED BY ENVIRONMENT
Implementation branch: `feat/vinh-admin-coach-management`
Verification branch: `fix/vinh-coach-final-verification`
Cleanup branch: `coach1`

IMPLEMENTATION COMMIT: `232df83e4dfc5766b65289e925f25cf8d4f6914d`
VERIFICATION COMMIT: `4f4d7134e79db47570880e03fb65d956882cba96`
FINAL CLEANUP COMMIT: `d1523a29896c4b47a0ea73fab213ca2dbf65d9dd`
BROWSER VERIFICATION COMMIT: none; visual verification is blocked, evidence is recorded in `ea07035`
TEST COMMIT: `ea070358a876d89f8e8d5e8196b07653ad91337d`
DOCUMENTATION COMMIT: `b9e620e4eb686ca29a9bc9fbe4da203497c879ef`
END COMMIT: `b9e620e4eb686ca29a9bc9fbe4da203497c879ef`

## Scope and verdict

This branch adds the bounded Admin layer for TASK-008: dedicated Coach list/detail pages, Coach status management, CRM Member assign/reassign, Admin Exercise Library, read-only Workout Governance, backend authorization, frontend routes and an isolated acceptance script. Coach Workspace and Member Workout Flow are reused, not rewritten. Coach module verification is `PASS` for code/build/acceptance/migrations `0007`–`0009`; the overall final verdict remains `PARTIALLY_COMPLETE` because real visual browser verification is blocked and full-project clean install remains blocked by the unrelated pre-existing `0100` `SellerApplications` conflict.

`FULL_PROJECT_CLEAN_INSTALL: BLOCKED_BY_MARKETPLACE_MIGRATION_0100`.
`ADMIN_PROGRAM_BUILDER: BLOCKED_ADMIN_PROGRAM_OWNERSHIP_MODEL`.

Admin Program Builder is `BLOCKED_ADMIN_PROGRAM_OWNERSHIP_MODEL`: `WorkoutPrograms` currently has `owner_coach_id` only, so Admin stays read-only for Program governance.

## Routes and authorization

Frontend routes:

- `/admin/coaches`
- `/admin/coaches/:coachId`
- `/admin/exercises`
- `/admin/workouts`

Backend Admin APIs require `authenticate` and `authorize(UserRole.ADMIN)`. Guest requests receive `401`; Coach/Member requests receive `403`. Frontend guards are navigation UX only.

Coach APIs are unchanged except for the live authentication check: `SUSPENDED` and `INACTIVE` Coaches cannot access Coach Workspace. Admin status changes increment `token_version`.

## APIs

- `GET /api/admin/coaches`, `/summary`, `/:coachId`, `/:coachId/members`, `/coach-members/unassigned`
- `PATCH /api/admin/coaches/:coachId/status`
- `POST /api/admin/coaches/:coachId/members/:memberId/assign`
- `POST /api/admin/coaches/:coachId/members/:memberId/reassign`
- `GET/POST /api/admin/exercises`, `GET/PATCH /api/admin/exercises/:exerciseId`, `POST .../activate`, `POST .../deactivate`
- `GET /api/admin/workouts/programs|assignments|schedules|sessions|progress`

Exercise fields are limited to the existing `Exercises` schema. Workout Governance is GET-only; there is no Admin Session, Snapshot, Set Log or generic Assignment PATCH endpoint.

## Status and assignment rules

Migration `0009_admin_coach_management.sql` adds `coach_status`, bounded `coach_status_reason` and `coach_status_updated_at`. `ACTIVE` uses `is_active=1`; `INACTIVE` uses `is_active=0`; `SUSPENDED` remains visible to Admin but is rejected by live Coach authentication. No historical Program, Assignment, Session or Progress rows are deleted.

Assign locks the active Member and CRM row, verifies an active Coach and rejects an existing Coach scope with `409`. Reassign calls the existing transactional `reassignMemberCoach` service, locks Member/scope/assignment, pauses the old active Assignment, preserves sessions, creates the new Coach-owned active Assignment and commits one active scope. `Booking` is not used to create the Coach–Member relation.

## Acceptance matrix

`backend/src/scripts/admin-coach-acceptance.ts` covers Guest/Coach/Member denial, Admin Exercise create, Coach Program/Assignment/Schedule, Member Session/Set/Complete, Admin governance read, scoped Coach Progress, Coach A IDOR denial for Member B, Admin Set Log denial, duplicate assign, concurrent reassign winner/loser behavior, reassignment preservation/scope change and suspended Coach denial. Run only against `GYMFIT_DB_ADMIN_COACH_ACCEPTANCE_<timestamp>` with `ADMIN_COACH_ACCEPTANCE=1`; run `--cleanup` and verify the database is dropped/absent afterward. Latest isolated run: `PASS` on `GYMFIT_DB_ADMIN_COACH_ACCEPTANCE_20260804_012600`; cleanup and drop verification: `PASS`.

Browser checks remain required at 375px, 768px and 1440px for loading, empty/error/retry states, keyboard/focus, confirmation dialogs and no new console errors. They are blocked in this environment because the Browser skill's required `scripts/browser-client.mjs` is absent and the repository has no Playwright package; no browser PASS is claimed. Evidence is recorded in `docs/admin/ADMIN_COACH_BROWSER_VERIFICATION.md`.

## Verification and known limitations

- Backend build: `PASS` (`cd backend; npm run build`).
- Backend lint: `PASS` with `0` errors and `447` warnings; the direct Coach Workspace unused-helper error was removed without changing behavior.
- Frontend typecheck: `PASS`, `0` errors (`cd frontend; npx tsc --noEmit --pretty false`). The three real, behavior-preserving errors were fixed in `ProductCard.tsx` and `reviewsApi.ts`.
- Frontend build: `PASS` (`cd frontend; npm run build`; existing large-chunk warning only).
- Migration: `0007`, `0008` and `0009` applied with matching checksums on isolated and canonical verification. Canonical `GYMFIT_DB` status is `21 applied`, `0 pending`, `0 checksum mismatches` and remains fixture-free. Full clean install is separately blocked at `0100` because `SellerApplications` already exists; see `docs/marketplace/MIGRATION_0100_BASELINE_CONFLICT.md`.
- `git diff --check`: `PASS` for source changes. Admin Coach acceptance: `PASS`; isolated database cleanup/drop: `PASS`. Runtime fallback: backend health `200`, guest Admin API denial `401`, and Admin frontend routes served `200`.
- Existing schema has no specialization/experience columns; Admin displays those values as unavailable.
- No Marketplace, Video, Auth architecture, payroll, AI, chat, notification system, live coaching or Booking relation expansion is included.

## Files and final report

Implementation is under `backend/src/modules/admin-coaches`, `admin-exercises`, `admin-workouts`, `backend/src/scripts/admin-coach-acceptance.ts`, `frontend/src/pages/admin/coaches`, `admin/exercises`, `admin/workouts`, typed Admin services, `App.tsx`, `Sidebar.tsx` and migration `0009`. Final browser and migration evidence is in `docs/admin/ADMIN_COACH_BROWSER_VERIFICATION.md` and `docs/marketplace/MIGRATION_0100_BASELINE_CONFLICT.md`. No Marketplace/Video/Auth architecture files were changed.
