# ADR: Coach Availability

Status: CANONICAL FOR `coach1`

## Decision

Availability is stored as recurring weekly Rules plus date-specific Exceptions. Rules and Exceptions describe open windows, mode and location; they do not materialize a permanent slot table. Public availability computes bookable slots for a requested date and overlays existing Booking rows, past-time rules and Coach profile status.

Availability reads never reserve a slot. Booking creation re-evaluates the same contract under its transaction and returns `409` when another request wins the slot.

Weekly overlap and date-exception overlap are rejected per Coach. Rules are managed only by the Coach actor for that profile; public consumers receive only fields needed to book.

## Precedence

Date-specific `BLOCK` exceptions suppress recurring availability. Date-specific `OPEN` exceptions add an explicit window after normal validation. Profile suspension or `booking_enabled=false` suppresses all public bookable slots.

## Consequences

The API remains compatible with the existing fixed-slot response where practical, while adding real mode, location, duration, timezone and availability metadata. No generated slot rows are required.
