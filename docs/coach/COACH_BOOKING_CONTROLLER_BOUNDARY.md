# Coach Booking Controller Boundary

Status: PHASE 47 CHECKPOINT / CONTROLLER BOUNDARY

`backend/src/modules/bookings/bookings.http.ts` now owns the narrow HTTP
adapter concerns for the existing booking handlers:

- authenticated actor extraction from `req.user`;
- Booking ID and status parsing;
- normalized create-request body typing;
- response delegation through the existing `sendSuccess` contract.

`bookings.controller.ts` continues to own the current orchestration and SQL
for this checkpoint. Quota reads, availability resolution, transaction
boundaries, overlap locks, status transitions, notifications and DTO mapping
were intentionally not moved into a service or repository. Those extractions
remain `DEFERRED_TO_PHASE_48` and `DEFERRED_TO_PHASE_49`.

The routes and Zod schemas are unchanged. The HTTP adapter is called only by
the existing controller and does not change URL contracts, authenticated
identity, role scope, response messages, status codes or business rules.

Verification status: source/static review complete;
`MANUAL_CHECK_REQUIRED` for booking request/response behavior.
