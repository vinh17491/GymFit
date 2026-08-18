# GymFit Pass 3 Background and Maintenance Database Inventory

The startup source is `backend/src/server.ts`. Unless
`DISABLE_BACKGROUND_RUNNERS=1`, it starts the order-expiration runner and the
coach-overdue runner and stops them during shutdown. This inventory records
only background or maintenance callers; it does not change runner topology.

| Runner or process | Start/entry point | Database objects read or written | Ownership at baseline | Notes |
| --- | --- | --- | --- | --- |
| Order expiration | `modules/orders/order-expiration.runner.ts` -> `runOrderExpirationSweep` | `Orders`, `OrderItems`, `Inventory`, `ShopOrders`, `OrderStatusHistory`, `ShopOrderStatusHistory`, `PaymentStatusHistory` | numbered migrations `0003`/`0004`/`0105`; Inventory is foundation-owned | Expires eligible pending marketplace orders, releases reservations and records existing status history. Preserve checkout/payment terminal boundaries. |
| Coach overdue sweep | `modules/coach-workspace/coach-overdue.runner.ts` -> `runCoachOverdueSweep` | `CoachProgramSchedules`, `MemberWorkoutSessions`, `CoachProgramAssignments`, `Notifications` | `0007`/`0008`; Notifications is foundation-owned | Handles overdue coach schedules and notification side effects. Preserve coach/member ownership and notification behavior. |
| Admin backup API | `/api/backup` -> `backup.controller.ts` | `BackupLogs` plus filesystem backup directory | `BackupLogs` is legacy-only active; filesystem is not SQL | This is admin-triggered API work, not a startup runner. Do not convert it to automatic migration or startup backup behavior. |

No other startup cron or database maintenance runner was found in the scoped
runtime source. Repository scripts and test/verification processes were
excluded from this runtime inventory by the Pass 3 instructions. The two
runners therefore need no new architecture; their missing dependencies are
handled through the same canonical ownership review as API callers.

`DATABASE_MANUAL_CHECK_REQUIRED`: runner behavior still needs a connected SQL
Server check after the relevant migrations are applied. This static inventory
does not claim that a live database has been queried or mutated.
