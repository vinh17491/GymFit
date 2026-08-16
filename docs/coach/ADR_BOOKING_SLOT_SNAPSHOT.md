# ADR: Coach Booking Slot Snapshot

Status: ACCEPTED FOR COACH2 CLOSURE

## Decision

Every newly-created Coach Booking stores the authoritative slot contract fields:

- `session_mode`: `ONLINE`, `IN_PERSON`, `BOTH`, or `NULL` for legacy rows.
- `location`: the location resolved by the backend availability slot, or `NULL` when no location was configured.

The Booking API never trusts client-supplied mode or location. The authoritative source is the slot returned by the locked availability calculation inside the Booking transaction. The stored snapshot is immutable after creation; Booking status changes do not recalculate it.

## Compatibility

The migration is additive and leaves existing rows as `NULL` because their historical Availability rule cannot be reconstructed safely. Member and Coach appointment readers must tolerate `NULL` without using the current Coach profile as a historical fallback.

No full Availability rule snapshot, materialized slot table, new reservation flow or priority booking behavior is introduced.

## Consequences

- Availability changes affect future bookings only.
- Historical appointments retain the mode/location that was authoritative when they were created.
- Legacy appointments can explicitly display that the historical snapshot was not recorded.
- `session_mode` is constrained at the database boundary as well as validated by the backend slot contract.

