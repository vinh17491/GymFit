# Coach Booking Read-Only Review

Status: PHASE 46 CHECKPOINT / READ-ONLY REVIEW

This document records the current Coach booking behavior before any extraction.
No booking code was changed in this phase.

## Current route and identity boundary

- Public discovery: `GET /api/bookings/coaches` and
  `GET /api/coaches/:id/availability`/the legacy booking availability path.
- Member create: `POST /api/bookings`; the member identity is always
  `req.user.userId`, not a request-body user ID.
- Member/Coach/Admin reads: list, summary and detail are scoped by the
  authenticated role. Members see their own bookings, Coaches their own
  bookings and Admin reads are unscoped by owner.
- Status update: `PUT /api/bookings/:id/status`; Members may only cancel,
  Coaches are owner-scoped and Admin is not owner-scoped.
- Backend authentication and authorization remain authoritative; no frontend
  guard is treated as a security boundary.

## Create flow observed in `bookings.controller.ts`

1. Validate date, start time, future time and the fixed 60-minute duration.
   The booking window is today through 90 days in `Asia/Ho_Chi_Minh`.
2. Start a `SERIALIZABLE` SQL transaction.
3. Read active membership `PlanEntitlements` under transaction locks and count
   the member's monthly bookings.
4. Lock and verify the active Coach, Coach status and `booking_enabled`.
5. Resolve the authoritative availability slot from weekly rules, open/block
   exceptions and existing pending/confirmed intervals.
6. Lock-check Coach and Member overlap independently.
7. Insert a `pending` Booking with the server-derived slot mode/location.
8. Insert a deduplicated Coach notification in the same transaction, commit,
   and return the normalized DTO.

Unique-key conflicts are converted to a safe 409. Existing range locks and the
filtered `UX_Bookings_ActiveSlot` index are preserved; the service overlap
checks cover pending/confirmed intervals rather than only exact starts.

## Current state machine

```text
pending   -> confirmed | cancelled
confirmed -> completed | cancelled | no_show
completed | cancelled | no_show -> terminal
```

Additional temporal guards currently require confirmation before the local
start time, completion after the start time and `no_show` after the end time.
Status changes create a deduplicated notification for the other participant
inside the same transaction.

## Availability and data dependencies

- `CoachProfiles` supplies `booking_enabled`, session mode and location.
- `CoachAvailabilityRules` stores weekly windows; `CoachAvailabilityExceptions`
  stores date-specific BLOCK/OPEN overrides.
- `PlanEntitlements` supplies `COACH_BOOKING_ENABLED` and
  `COACH_BOOKING_MONTHLY_LIMIT`; invalid/missing entitlement data is not
  silently interpreted as unlimited.
- `Notifications` supports recipient ownership and deduplication.
- `Bookings` is a legacy foundation assumed by migration `0006`; migration
  `0017` adds immutable `session_mode`/`location` snapshot fields. The current
  repository has not verified a live database and does not treat table
  existence as migration application.

## Preserved ambiguities

`BUSINESS_RULE_REQUIRES_CONFIRMATION`:

- The quota query counts all monthly `Bookings` rows without a status filter;
  cancelled and no-show rows therefore currently consume `used` quota.
- Current status update has no quota refund/reinstatement path when a booking
  is cancelled by a Member or Coach.
- The exact intended quota treatment for cancelled, Coach-cancelled and
  no-show bookings is not invented in this phase.
- Historical rows predating migration `0017` may have NULL slot snapshot fields;
  the system does not reconstruct unavailable historical availability.

## Phase boundary and risks

Phase 46 is read-only. `DEFERRED_TO_PHASE_47`: controller extraction is
deferred to Phase 47; service,
repository, policy and time extraction must not be pulled forward. The current
controller combines HTTP parsing, quota, availability, locking, SQL,
transactions, notifications and DTO mapping, so extraction must preserve all
these boundaries without changing the state machine or ownership clauses.

Verification status: source/static review complete;
`MANUAL_CHECK_REQUIRED` for Member/Coach booking flows, overlap races, quota,
availability, notification delivery and state transitions.
