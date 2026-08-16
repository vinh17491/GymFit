# Status: HISTORICAL
# DO NOT USE AS CURRENT SOURCE OF TRUTH.
# Superseded by: `docs/coach/COACH_END_TO_END_HANDOVER.md`

# Coach-only Discovery Report

## Gate

`COACH_DISCOVERY_GATE_PASS`

`C0_COACH_DISCOVERY_PASS`

Discovery was run on baseline `54015ae9638ec9f722e171c01a0ca69533ba907d` from
`seller_role_add`, before creating a Coach migration. The canonical database
reported database `GYMFIT_DB`, 18 applied migrations, 0 pending migrations and
0 checksum mismatches. Frontend and backend baseline builds both passed.

## Evidence and decisions

| Area | Decision | Evidence | Coach-only decision |
|---|---|---|---|
| User and role | REUSE | `Users.role` contains `admin`, `coach`, `member`, `seller`; `authenticate` resolves the live JWT identity and `authorize` enforces role. | Coach identity is always `req.user.userId`; no client owner IDs are trusted. |
| Coach dashboard | EXTEND | `/coach` already exists and renders truthful unavailable placeholders because no scoped dashboard API exists. | Replace placeholders with `/api/coach/dashboard` data only; no fabricated KPI or cross-role data. |
| Coach–Member relationship | REUSE | `CRMCustomers.assigned_coach_id` is the existing relationship. Existing CRM list/detail queries filter Coach rows by that column and return concealed 404 for an out-of-scope detail. | Use an active Coach row when the assigned Coach and Member are active. Do not create a parallel relation table or Coach self-assignment UI. |
| Exercise data/API | EXTEND | `Exercises` is present with active flag, text instructions, difficulty, muscle group and equipment. Existing `/api/exercises` list/detail is public; only Admin has mutation. | Add authenticated Coach read-only list/detail under `/api/coach/exercises`, with bounded pagination and allowlisted filters/sort. No Exercise CRUD, media management or entitlement logic. |
| `WorkoutPrograms.tsx` | DEPRECATED for Coach data | The page stores sample programs in component state and creates IDs from `Date.now`; it is a public presentation page and has no backend contract. | Leave the public page unchanged. Add real Coach routes/pages backed by the new API. |
| Legacy Workouts | DEPRECATED as Coach Program source | `Workouts` and `WorkoutExercises` are legacy tables with a coach ID and denormalized exercise names; they do not satisfy Program Day/Exercise ownership or ordering requirements. | Do not mutate or use as the new Program Builder persistence model. |
| Program model | EXTEND | No `WorkoutPrograms`, `WorkoutProgramDays`, or `WorkoutProgramExercises` tables exist. | Add Coach-owned tables in migration `0007`; owner is stored from JWT context and protected by filtered queries. |
| Assignment/Schedule model | EXTEND | No assignment or workout schedule tables exist. Existing `Bookings` is appointment scheduling and must not be conflated with workout schedule. | Add `CoachProgramAssignments` and `CoachProgramSchedules` in migration `0007`; assignment requires active CRM scope and an active owned Program. |
| Session read | REUSE / BLOCKED | Legacy `WorkoutSessions(user_id, workout_id, started_at, completed_at, status, notes)` exists, but no session exercise snapshots or set logs exist and it is not linked to the new Program assignment. | Provide a scoped, read-only Coach view over compatible legacy sessions. Do not build Member session creation/start/log/complete flow. New Program sessions remain `BLOCKED_BY_MEMBER_WORKOUT_FLOW`. |
| Progress read | REUSE / BLOCKED | Legacy session timestamps/status can support truthful session count/duration for scoped members; training-volume and exercise-history set data do not exist. | Return calculated legacy summary where available and explicit empty/blocked fields for missing Member-generated data. Do not create fake progress or a Member Progress page. |
| Media | REUSE, read-only | Exercise table has existing URL columns and the repository has shared media components; no Coach media-management contract exists. | Render text/instruction data and existing safe thumbnail values only. No upload, video library or playback feature. |
| Validation/errors | REUSE + EXTEND | Central `validate`, `AppError`, `sendSuccess`, `sendError`, duplicate-key-to-409 handling and parameterized `query` are available. | Add strict Zod schemas, bounded pagination, allowlists and domain conflict/404 handling in the Coach module. |
| Migration ledger | EXTEND | `0006_auth_session_security.sql` is applied; `0100`–`0111` are applied Marketplace migrations and must not be edited. | Add the next Coach migration as `0007_coach_programs_assignments_schedules.sql`; do not touch applied or Marketplace migrations. |

## Coach data contract

The new migration owns only Coach program authoring and Coach-controlled
assignment/schedule state. It does not introduce Member session/set-log
behavior. `coach_id` and `assigned_by` are server-derived. The active CRM row
is the authorization boundary for Member list/detail, assignment, schedule,
legacy session and progress reads.

Program writes use transactions and row locks where an assignment can race.
Program/Day/Exercise ordering is unique and bounded. Inactive Exercises cannot
be added to a Program; inactive Programs cannot receive a new Assignment.
Terminal schedules cannot be edited. Schedule generation is deterministic and
idempotent for a bounded future horizon.

## Explicit exclusions verified before implementation

No Coach work will change Admin pages, Member Dashboard, Member workout/session
or set-log flow, Member Progress pages, Video Library, membership packages,
Marketplace, Seller, payment/refund/settlement code, or their migrations. The
existing public exercise/program presentation remains outside the Coach route
surface.

## 008A implementation plan approved

1. Add migration `0007` for Coach-owned Program, Day, Exercise, Assignment and
   Schedule persistence while reusing CRM scope.
2. Add authenticated `/api/coach/*` routes with strict ownership/scope checks.
3. Add Coach Exercise read, Program Builder, Member, Assignment, Schedule,
   session-history and progress read pages.
4. Replace only the existing Coach dashboard placeholders and add Coach route
   registration/sidebar links.
5. Run backend/frontend builds, security and cross-Coach IDOR acceptance,
   deterministic schedule/concurrency checks, and browser tests for Coach,
   Member-negative and Guest-negative flows.

## Gate outcome

The gate passes. Coach implementation may begin. The missing Member-generated
session/set-log source is recorded as `BLOCKED_BY_MEMBER_WORKOUT_FLOW` and will
remain a truthful empty state rather than triggering Member-flow work.
