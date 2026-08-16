# Status: HISTORICAL
# Do not use as current implementation source of truth.
# Superseded by: `docs/coach/COACH_MODULE_HANDOVER.md`

# Member Workout Flow discovery

## Scope

This slice completes only the Coach business path that a Member needs to execute an assigned workout. Admin Coach Management, Video, Marketplace, Seller, Payment, Refund and Settlement remain out of scope.

## Existing contract

- `WorkoutPrograms`, `WorkoutProgramDays` and `WorkoutProgramExercises` are the Coach-authored program model from migration `0007`.
- `CoachProgramAssignments` is the member-to-program scope boundary. An active assignment is unique per member and carries the IANA `schedule_timezone`.
- `CoachProgramSchedules` is the dated execution queue. Its existing state contract is `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `SKIPPED`, `CANCELLED`.
- The legacy `WorkoutSessions`/`WorkoutExercises` tables are not compatible with the new program-day schedule contract: `WorkoutSessions` requires a legacy `workout_id`, has a lower-case status check, and has no snapshot or set-log tables.

## Decision

Migration `0008_member_workout_flow.sql` adds a separate execution model:

1. `MemberWorkoutSessions` records the member-owned execution and links it to exactly one assignment and schedule.
2. `MemberWorkoutSessionExercises` stores the exercise target snapshot at Start Session. It contains copied names and targets, so later Coach program edits do not rewrite history.
3. `MemberWorkoutSetLogs` stores the member's set-level input with a uniqueness guard on `(session_exercise_id, set_number)`.

This reuses the `0007` Coach tables without altering their schema or the legacy session model. Migration `0008` is applied through the normal runner and enables the additive Member execution tables without changing `0007`.

## State and authorization rules

- Start is transactional and allowed only for the authenticated member's active assignment, a `SCHEDULED` item due today in that assignment's IANA timezone.
- A filtered unique index permits at most one `IN_PROGRESS` session per member. A unique schedule link prevents starting the same schedule twice.
- Complete moves the session and schedule to `COMPLETED`; Abandon moves them to `ABANDONED` and `SKIPPED`. Terminal sessions and set logs are immutable through the API.
- Every Member route derives `member_id` from the JWT. IDs in the URL are checked against the session/assignment owner; no member, coach or user identity is accepted in a request body.

## Progress contract

Progress is calculated from completed Member sessions and completed set logs: duration is the sum of valid completed sessions, training volume is `reps * weight_kg` for completed sets with both metrics, and completion rate is completed due schedules divided by all due schedules. Future, cancelled, skipped/abandoned, incomplete and invalid data are excluded. Stored timestamps remain UTC; schedule due-day grouping uses the assignment's IANA timezone.

## 0008 decision

No further migration is required for the minimum flow after `0008`; the schema is intentionally additive and does not modify `0007` or legacy tables.
