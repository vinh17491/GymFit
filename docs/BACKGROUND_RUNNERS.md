# Background Runner Inventory

Status: PHASE 42 CHECKPOINT / LIFECYCLE SAFETY

The production server currently registers two background runners. Registration
is centralized in `backend/src/server.ts` and is skipped when
`DISABLE_BACKGROUND_RUNNERS=1`.

| Runner | Runtime module | Interval / batch | Work delegated to | Data effect | Stop path |
|---|---|---|---|---|---|
| Order Expiration | `modules/orders/order-expiration.runner.ts` | `ORDER_EXPIRATION_INTERVAL_SECONDS`, default 60 seconds; batch default 100 | `expireEligibleOrders` | Releases order reservations, cancels eligible unpaid orders, writes order status history and related parent/shop transitions | `stopOrderExpirationRunner()` clears its timer |
| Coach Overdue | `modules/coach-workspace/coach-overdue.runner.ts` | `COACH_OVERDUE_INTERVAL_SECONDS`, default 60 seconds; batch default 100 | `reconcileOverdueSchedules` | Marks overdue scheduled workouts as skipped and creates deduplicated Coach/Member notifications | `stopCoachOverdueRunner()` clears its timer |

Both runners:

- guard against registering a second timer in the same process;
- call one batch immediately after registration, then use `setInterval`;
- call `unref()` on their timer so the timer alone does not keep Node alive;
- prevent overlapping batches with a module-local `running` flag;
- log failures and do not expose raw errors through an API response.

The server invokes and awaits both stop hooks during the graceful-shutdown
path. Each stop hook is idempotent, shares a stop promise for concurrent calls,
prevents a restart while draining, clears future scheduling and awaits a batch
already in flight before HTTP/database cleanup continues.
No other production `setInterval`, `node-cron` schedule or worker registration
was found outside these two modules. Timer usage under `backend/src/scripts/**`
belongs to acceptance, verification or utility tooling and is not registered
by the runtime server.

Database-unavailable startup remains allowed by the current health lifecycle
policy. Because the server can start runners after a failed initial pool
connection, a runner may log a failed batch and retry on its next interval;
this behavior is preserved and remains a deployment/runtime observation.

Verification status: source/static review complete;
`MANUAL_CHECK_REQUIRED` for runner scheduling, duplicate-start behavior,
shutdown timing and database dependency behavior.
