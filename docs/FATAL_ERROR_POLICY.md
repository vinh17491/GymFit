# Fatal Error Policy

Status: PHASE 40 CHECKPOINT / SOURCE AND STATIC REVIEW

`uncaughtException`, `unhandledRejection`, HTTP server errors and startup
failures are fatal process conditions. The server logs them through the shared
redaction-aware logger, sets a non-zero exit code, and enters the same
idempotent graceful-shutdown path used by `SIGINT` and `SIGTERM`.

The process must not continue serving traffic after an uncaught exception or
unhandled rejection because its state is not considered trustworthy. The
policy does not expose raw stacks, SQL details, tokens, cookies, provider
secrets or sensitive conversation data to users; logger redaction remains the
boundary for diagnostic output.

Database-unavailable startup is intentionally different: the existing
startup policy allows the process to remain live so `/health/live` can report
liveness, while `/health/ready` and the DB-aware `/api/health` report not ready.
That expected dependency condition is not converted into a fatal process exit
by this phase.

Verification status: source/static review complete;
`MANUAL_CHECK_REQUIRED` for fault injection, signal handling and deployment
supervision behavior.
