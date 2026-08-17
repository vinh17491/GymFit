# Coach Booking Service Extraction

Status: PHASE 48 CHECKPOINT / SERVICE EXTRACTION

`backend/src/modules/bookings/bookings.service.ts` now owns the booking
orchestration used by the existing HTTP handlers:

- booking-date, time, future-window and fixed-duration validation;
- membership quota reads and Coach availability resolution;
- serializable create/status transactions and overlap locking;
- booking persistence, status-transition checks and notifications;
- scoped list, summary and detail reads;
- existing booking row-to-DTO mapping and response data shapes.

`bookings.controller.ts` remains an HTTP adapter. It keeps request parsing,
filter parsing, actor extraction, response delegation and `next(error)`
handling. Routes, URLs, Zod schemas, identity, role scope, status codes,
messages, transaction isolation and existing business behavior are preserved.

SQL access remains inside the service for this checkpoint. Repository/query
extraction is `DEFERRED_TO_PHASE_49`; policy and time-policy extraction remain
`DEFERRED_TO_PHASE_50` and `DEFERRED_TO_PHASE_51`.

Verification status: source/static review complete;
`MANUAL_CHECK_REQUIRED` for booking behavior.
