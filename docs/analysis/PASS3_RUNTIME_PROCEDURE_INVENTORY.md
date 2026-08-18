# GymFit Pass 3 Runtime Stored Procedure Inventory

The runtime scan covered `executeProc`, `EXEC` and `EXECUTE` in active backend
source and excluded tests, acceptance/integrity/verification scripts and the
legacy schema snapshot as a runtime caller.

| Procedure | Caller | Domain | Legacy definition | Canonical owner at baseline | Classification / risk |
| --- | --- | --- | --- | --- | --- |
| `sp_SpendPoints` | `backend/src/modules/loyalty/loyalty.controller.ts` through `executeProc` in `backend/src/config/database.ts` | loyalty reward redemption | `db/schema.sql` (`CREATE OR ALTER PROCEDURE`) | none; Points and PointTransactions are also legacy-only | `LEGACY_REQUIRED`; concurrency, insufficient-balance and redemption atomicity require a Senior review |

`executeProc` is the only active runtime stored-procedure invocation found in
the scoped search. The procedure reads and updates `Points` and inserts a
`PointTransactions` row. Its eventual owner must be the same canonical loyalty
domain migration that owns those tables. The current source behavior is not
rewritten or semantically expanded by this inventory.

Other `EXEC`/`EXECUTE` matches were comments, generic request `.execute`
methods or non-database code rather than stored-procedure dependencies. No
procedure is created by `db/bootstrap/foundation.sql` or migrations `0001`
through `0111`.

The following questions remain `BUSINESS_RULE_REQUIRES_CONFIRMATION` until the
loyalty design pass: whether reward stock is reserved inside the same database
transaction, whether a failed redemption may leave a pending row, and the
authoritative idempotency key for repeated redemption requests.
