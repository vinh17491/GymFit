# GymFit Pass 3 Runtime Stored Procedure Inventory

The runtime scan covered `executeProc`, `EXEC` and `EXECUTE` in active backend
source and excluded tests, acceptance/integrity/verification scripts and the
legacy schema snapshot as a runtime caller.

| Procedure | Caller | Domain | Legacy definition | Canonical owner at baseline | Classification / risk |
| --- | --- | --- | --- | --- | --- |
| `sp_SpendPoints` | baseline caller was `backend/src/modules/loyalty/loyalty.controller.ts`; no caller after phase 159 | loyalty reward redemption | `db/schema.sql` (`CREATE OR ALTER PROCEDURE`) | intentionally none; `0114_loyalty_runtime_schema.sql` owns the tables and TypeScript transaction | `DEAD_LEGACY` for active runtime; archive review only, do not create a second authority |
| `sp_GenerateInvoice` | no active caller found; invoice controller generates invoices in application code | membership invoice snapshot | `db/schema.sql` | intentionally none; `0116_membership_billing_runtime.sql` owns the tables | `DEAD_LEGACY`; archive review only, do not create dual invoice authority |

`executeProc` was the only active runtime stored-procedure invocation at the
phase 133 baseline. Phase 157 selected the smallest controlled change: move
the spend behavior into the same serializable TypeScript transaction that
locks the reward and points rows, records the PointTransaction, decrements
stock and inserts the redemption. `executeProc` remains a generic database
helper for any future explicitly owned procedure, but it is not used by
loyalty after phase 159.

Other `EXEC`/`EXECUTE` matches were comments, generic request `.execute`
methods or non-database code rather than stored-procedure dependencies. No
procedure is created by `db/bootstrap/foundation.sql` or migrations `0001`
through `0119`.

The redemption transaction now locks reward stock and the member balance in a
single database transaction. There is no new reward seed, no second stored
procedure implementation and no gateway or reward fulfillment redesign.
