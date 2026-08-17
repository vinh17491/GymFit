# Coach Booking Repository Extraction

Status: PHASE 49 CHECKPOINT / REPOSITORY EXTRACTION

`backend/src/modules/bookings/bookings.repository.ts` now owns the narrowly
scoped booking data-access operations:

- quota count query with the existing lock hints;
- Coach availability/booking-enabled lookup;
- Coach and Member overlap queries;
- booking insert and status update raw rows;
- scoped list, summary and detail queries.

`bookings.service.ts` remains the orchestration boundary. It still owns input
validation, membership entitlement decisions, transaction begin/commit/
rollback, availability policy invocation, status-transition checks,
notifications and response DTO mapping. No generic repository framework was
introduced, and no database query or migration was executed.

The SQL text, parameters, lock hints, transaction isolation and result shapes
were preserved. Policy extraction is `DEFERRED_TO_PHASE_50`; time policy
centralization is `DEFERRED_TO_PHASE_51`.

Verification status: source/static review complete;
`MANUAL_CHECK_REQUIRED` for booking behavior.
