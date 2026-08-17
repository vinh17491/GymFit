# Coach Booking Time Policy

Status: PHASE 51 CHECKPOINT / TIME POLICY

`backend/src/modules/bookings/bookings.time-policy.ts` is the booking-domain
boundary for the existing time behavior. It delegates to the canonical
`backend/src/utils/coachBooking.ts` constants and helpers, preserving:

- `COACH_BOOKING_DURATION_MINUTES = 60`;
- `COACH_BOOKING_MAX_DAYS = 90`;
- `COACH_BOOKING_TIME_ZONE = Asia/Ho_Chi_Minh`;
- date-window, start-time and future-booking validation;
- end-time calculation;
- confirmation/completion/no-show time guards;
- local summary clock and pure in-memory interval overlap calculation.

The booking repository keeps SQL overlap predicates and lock hints as the
authoritative concurrency boundary. The time-policy overlap helper is used by
availability snapshot calculation for in-memory interval comparison; no
database overlap rule was changed.

No time value or timezone was changed. Verification status:
source/static review complete; `MANUAL_CHECK_REQUIRED` for booking time,
timezone, boundary and overlap behavior.
