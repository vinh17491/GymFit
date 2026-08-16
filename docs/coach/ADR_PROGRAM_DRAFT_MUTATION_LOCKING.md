# ADR — Program Draft Mutation Locking

## Decision

Every mutation of a Coach-owned workout Program DRAFT uses one `SERIALIZABLE` transaction. The transaction locks the parent `WorkoutPrograms` row with `UPDLOCK,HOLDLOCK`, verifies owner and `lifecycle_status=N'DRAFT'`, performs the child or parent mutation, validates affected invariants, and commits. A failed affected-row update is a conflict (`409`) rather than a silent success.

The same transaction boundary is used for Publish and schedule reschedule/cancel races. Published and archived versions are immutable.

## Consequences

- Publish cannot race past a concurrent Day or Exercise mutation.
- Day week numbers cannot exceed `duration_weeks`.
- PATCH operations merge omitted fields with the locked current row; explicit `null` remains a clear operation.
- Unique position and schedule conflicts are surfaced as stable `409` errors.
- No schema or migration change is required.
