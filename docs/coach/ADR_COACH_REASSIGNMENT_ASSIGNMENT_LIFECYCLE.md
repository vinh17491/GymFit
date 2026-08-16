# ADR: Coach Reassignment and Assignment Lifecycle

Status: CANONICAL
Date: 2026-08-03

## Context

`CRMCustomers.assigned_coach_id` is the active relationship scope, while `CoachProgramAssignments.coach_id` owns a concrete program assignment. Treating reassignment as an ownership transfer would expose old execution data to the wrong Coach or allow a Member to start an obsolete assignment.

## Decision

Reassignment is a new lifecycle, not an update-in-place transfer:

1. In one `SERIALIZABLE` transaction, lock the Member's CRM row and current active assignment.
2. Pause the old assignment and update the CRM row to the new Coach. Existing sessions, snapshots and set logs remain attached to the old assignment.
3. Validate that the new Coach is active and owns the new active Program.
4. Insert a new `ACTIVE` assignment with the new Coach, explicit date range and valid IANA timezone.
5. Generate new schedules for the new assignment through the existing Coach flow.

The old Coach loses access as soon as the CRM scope changes. The new Coach does not inherit old assignment ownership or rewrite old sessions. Member current/upcoming/start queries require the assignment Coach to match the active CRM Coach, so an old assignment cannot be started after reassignment.

## Implementation boundary

The reusable domain function is `reassignMemberCoach` in `backend/src/modules/coach-workspace/coach-reassignment.service.ts`. The Admin route delegates to this function and supplies the Admin actor as `assigned_by`; no public reassignment route exists. Existing Coach `createAssignment` remains the normal new-assignment path when a reassignment workflow is not invoked. Admin-specific contracts are documented in [`COACH_MODULE_HANDOVER.md`](COACH_MODULE_HANDOVER.md).

## Consequences

History is preserved and scope is deterministic, at the cost of a new assignment and schedule set. A future UI must show the lifecycle event/audit trail and must not offer an ownership-transfer shortcut.
