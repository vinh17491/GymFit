# ADR: Coach Program Versioning

Status: CANONICAL FOR `coach1`

## Decision

`WorkoutPrograms` becomes the version record. Legacy rows are backfilled with a root identifier and version number. A version has one lifecycle state: `DRAFT`, `PUBLISHED` or `ARCHIVED`. Existing `WorkoutProgramAssignments.program_id` continues to point to the exact version used by the Assignment.

- DRAFT versions may be edited by their owning Coach.
- A PUBLISHED version used by an Assignment cannot be structurally edited.
- Clone New Version deep-copies the Program Days and Program Exercises in one transaction.
- Publishing, cloning and archiving are conditional state transitions and cannot silently replace an active Assignment.
- An archived version remains readable for historical Sessions and Assignments but is not selectable for a new Assignment.
- Existing `is_active` behavior is retained as a compatibility mapping until all clients use lifecycle fields.

## Consequences

Program changes become explicit and historical execution remains stable. The UI must use lifecycle wording rather than treating `Activate` as a substitute for Publish/Clone/Archive.
