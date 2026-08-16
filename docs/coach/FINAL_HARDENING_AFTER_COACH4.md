# Coach4 Hardening Report

## Scope

Coach4 hardening covers the known Program, Publish, Day, partial PATCH, reschedule/cancel, Availability, Attention Queue, Seller Apply frontend policy, product media reporting, and runner isolation findings. It preserves backend RBAC, Marketplace/Seller backend code, and migration `0100–0111`.

## Hardening decisions

- Coach-owned Program draft mutations and Publish use serializable locked transactions with `UPDLOCK,HOLDLOCK`, owner/lifecycle checks, invariant validation, and stable conflict responses.
- Publish rejects incomplete weeks/days/exercises and invalid target/reps with `PROGRAM_NOT_READY_TO_PUBLISH`.
- Day bounds, duration/week uniqueness, partial PATCH merge semantics, schedule bounds, assignment scope, and cancel/reschedule races are enforced in the existing service boundary.
- OPEN availability exceptions take precedence over weekly rules without duplicate intervals; full-day BLOCK remains authoritative.
- Booking requires a concrete `ONLINE` or `IN_PERSON` mode and resolves location using the existing contract.
- Background runners do not start merely because the Express app is imported by tests.
- Product media findings remain read-only; no canonical image row is repaired by Coach4.

## Evidence

The detailed phase results and exact command output belong in `docs/chatbot/CHATBOT_AND_HARDENING_PROGRESS.md`. This report must not be interpreted as a final PASS until that log records H00–H46 and the final verdict.
