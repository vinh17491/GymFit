# Health and Lifecycle

Status: PHASE 39 CHECKPOINT / LIVE, READY AND SHUTDOWN LIFECYCLE

`GET /health/live` returns HTTP 200 when the Express process is serving the
request. It intentionally does not open SQL Server, inspect migrations, query
business tables or claim that the application is ready for traffic.

The existing `/api/health` response shape is preserved on success, but it now
checks the same database readiness boundary and returns HTTP 503/not-ready
when SQL Server is unavailable; it must not report healthy in that state.
`GET /health/ready` performs a minimal `SELECT 1` through the existing SQL
Server pool. It returns HTTP 200 with `status: ready` only when that check
succeeds; database failure returns HTTP 503 with a safe `not_ready` response.
It does not expose connection errors or SQL details.

The process may remain running while the database is unavailable so
`/health/live` can report process liveness. Deployment routing must use
`/health/ready` (or the DB-aware `/api/health`) for application readiness.

On `SIGINT` or `SIGTERM`, the server performs an idempotent graceful shutdown:
background runner timers are stopped and any current batch is drained, the
HTTP server stops accepting new connections and closes existing connections
within the bounded shutdown window, and the SQL pool is closed. A second
signal does not start a second cleanup sequence. The runner business logic and
database data are not mutated by this lifecycle handling.

Verification status: source/static review complete;
`MANUAL_CHECK_REQUIRED` for process probes, signal handling, and deployment
behavior.
