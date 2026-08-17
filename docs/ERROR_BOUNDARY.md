# Global Error Boundary

Status: PHASE 45 CHECKPOINT / SOURCE AND STATIC REVIEW

The backend error boundary uses a small, explicit public status set:

| Status | Boundary behavior |
|---:|---|
| 400 | Client validation, malformed JSON or invalid upload input |
| 401 | Authentication required or invalid credentials, handled by auth middleware |
| 403 | Authorization or Origin/CSRF boundary denial, handled by the relevant middleware |
| 404 | Safe `Route not found` or resource-not-found `AppError` |
| 409 | Business conflict or SQL unique-key conflict |
| 422 | Explicit client/business validation where the existing service uses it |
| 429 | Centralized rate-limit response with retry metadata |
| 500 | Generic `Internal Server Error` for unexpected/internal failures |

Only the approved client-status `AppError` messages and stable business codes
are returned. An `AppError` outside the approved client set is treated as a
500 and its internal message is not returned. Unexpected errors are logged
with request metadata, error name/type/code and SQL conflict number only; raw
stack, SQL text, secrets, tokens, provider exceptions and sensitive payloads
are not returned to the client. The shared logger redaction boundary remains
active for diagnostic output.

Malformed JSON, oversized request bodies and Multer limit errors receive safe
client responses. If an error occurs after response headers are sent, the
server logs the boundary event and ends the response without appending a raw
error body.

This phase does not redesign service error semantics, invent business rules or
add a new test suite. Health endpoints retain their explicit DB-aware 503
response because readiness is a separate lifecycle contract.

Verification status: source/static review complete;
`MANUAL_CHECK_REQUIRED` for HTTP status mapping and user-visible error flows.
