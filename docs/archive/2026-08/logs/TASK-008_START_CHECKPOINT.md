# Status: HISTORICAL
# DO NOT USE AS CURRENT SOURCE OF TRUTH.
# Superseded by: `docs/coach/COACH_END_TO_END_HANDOVER.md`

# TASK-008 Start Checkpoint

TASK-007 baseline: FULL_TASK_007_COMPLETE
Base branch: 007c-order-management
Base commit: 427ad52996961648ffc622ca1bf2999a5aab3df4
TASK-008 branch: 008-workout-programs-progress
Next migration: 0007 or later (DO NOT CREATE before Discovery Gate; `0006` is reserved by auth/RBAC hardening)

Locked scope: Exercise Library/Programs; Member Assignments/Schedules/Sessions/
snapshots/Set Logs; progress and final acceptance.
Out of scope: AI, camera, pose estimation, automatic rep counting, medical,
nutrition, wearables, live coaching, social expansion and new payment work.

TASK-008 implementation: NOT STARTED.

Read first: `docs/TASK-008_DISCOVERY_CHECKLIST.md`, then
`docs/TASK-008_IMPLEMENTATION_SPEC.md`, `docs/ARCHITECTURE.md`,
`docs/DATABASE_AND_MIGRATIONS.md` and `docs/API_AND_AUTHORIZATION.md`.
Exact next steps: audit source/database; classify REUSE/EXTEND/REPLACE/DEPRECATED;
resolve Coach-Member and media decisions; record evidence; only then design 0006.

Auth/RBAC hardening closure completed separately; TASK-008 remains NOT STARTED and is now unblocked.

Canonical migrations `0001–0006` are complete; TASK-008 remains NOT STARTED and its next action is the Discovery Gate before migration `0007`.

The 2026-07-16 dashboard redesign and authenticated Member/Coach/Admin browser acceptance are complete. This frontend-only closure does not begin TASK-008; the Discovery Gate remains the next action.
