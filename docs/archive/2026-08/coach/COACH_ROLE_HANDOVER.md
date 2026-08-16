# Status: HISTORICAL
# Do not use as current implementation source of truth.
# Superseded by: `docs/coach/COACH_MODULE_HANDOVER.md`

# Coach Role Handover

Status: CANONICAL
Scope: Coach authoring/assignment/schedule and read-only Member Workout monitoring.
Out of scope: Admin Coach Management, Admin pages, Member Workout implementation beyond the scoped slice, Video, Marketplace, Seller, Payment, Refund and Settlement.

## Current contract

- Coach identity and scope come from the JWT, `CRMCustomers.assigned_coach_id`, active user state and assignment `coach_id`.
- Coach owns Programs, Days and Program Exercises through `0007` and may assign only an active owned Program to an active CRM-scoped Member.
- Assignment validity is `ACTIVE`, `start_date <= today`, `end_date IS NULL OR end_date >= today`, evaluated in the assignment's IANA `schedule_timezone`.
- Coach monitoring reads real `MemberWorkoutSessions`, immutable `MemberWorkoutSessionExercises` snapshots, `MemberWorkoutSetLogs` summaries and Member progress. Legacy sessions remain labeled when set data is unavailable.
- Coach reschedule, cancel and dashboard date comparisons use the assignment timezone. Invalid IANA timezone input is rejected with `422`.

## Reassignment policy

CRM ownership and workout assignment are separate facts. Reassignment must use the transactional domain operation in `backend/src/modules/coach-workspace/coach-reassignment.service.ts` and the lifecycle decision in [ADR_COACH_REASSIGNMENT_ASSIGNMENT_LIFECYCLE.md](ADR_COACH_REASSIGNMENT_ASSIGNMENT_LIFECYCLE.md). It locks CRM and the active assignment, pauses the old assignment, ends the old CRM scope, preserves old sessions, updates the CRM Coach and creates a new assignment owned by the new Coach. No ownership transfer or Admin UI is added here.

## Verification

- `0007_coach_programs_assignments_schedules.sql` is applied and checksum-valid; it is not edited by this task.
- `0008_member_workout_flow.sql` is additive and applied through the migration runner.
- Backend build must pass. Frontend TypeScript may retain only the three recorded out-of-scope errors in ProductCard/ReviewsPage/reviewsApi; no Coach error is allowed.
- Final evidence is recorded in [COACH_END_TO_END_HANDOVER.md](COACH_END_TO_END_HANDOVER.md) and [DOCUMENTATION_CLEANUP_REPORT.md](../DOCUMENTATION_CLEANUP_REPORT.md).

## Delivery rule

Stage explicit Coach/Member Workout and documentation paths only. Do not stage prompt/package artifacts, unrelated Admin/Marketplace/Video files or the three pre-existing TypeScript-error files. Do not push automatically.
