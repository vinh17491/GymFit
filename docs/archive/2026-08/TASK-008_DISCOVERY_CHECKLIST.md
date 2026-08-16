# Status: HISTORICAL
# DO NOT USE AS CURRENT SOURCE OF TRUTH.
# Superseded by: `docs/coach/COACH_END_TO_END_HANDOVER.md` and `docs/PROJECT_STATUS.md`

# TASK-008 Discovery Checklist

Read this first before TASK-008 implementation. Do not create migration `0006` until the gate is complete.

## Inspect

- Database: User/Role, Exercise/media, workout/program/session/progress, booking/Coach-Member tables, constraints/indexes and migration history.
- Backend: `exercises`, `videos`, `media`, `coaches`, `crm`, auth/role middleware, validation/error patterns, route mounting and any workout references.
- Frontend: `pages/exercises/WorkoutPrograms.tsx`, Exercise pages/services/types, `components/MediaPlayer.tsx`, Coach/Member pages, `App.tsx`, layout/guards/stores/API.
- Media: supported URL/path rules, public directories, ownership and storage limits.

## Decide

| Area | REUSE | EXTEND | REPLACE | DEPRECATED | Evidence/decision |
|---|---:|---:|---:|---:|---|
| Exercise data/API |  |  |  |  | Required |
| WorkoutPrograms UI/data |  |  |  |  | Required |
| MediaPlayer/media API |  |  |  |  | Required |
| Coach-Member relationship |  |  |  |  | Required |
| Session/progress structures |  |  |  |  | Required |

Resolve before `0006`: canonical existing table names/columns; whether Exercises can be extended safely; whether a Coach-Member relation already enforces active scope; media reuse policy; ownership model; migration compatibility/backfill; uniqueness/locking strategy; timezone source; and which legacy UI is wired versus presentation-only.

Gate passes only when every row has source/database evidence, conflicts are recorded, the data model avoids a parallel system, authorization/privacy boundaries are explicit, migration ownership/order is confirmed, and the 008A implementation plan is approved in the branch notes. Then begin `0006`; otherwise verdict is BLOCKED with the exact unresolved decision.
