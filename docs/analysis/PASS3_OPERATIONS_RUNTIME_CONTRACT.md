# GymFit Pass 3 Operations Runtime Contract

Phase 177 gives the active operations and CRM child tables one forward owner:
`db/migrations/0117_operations_runtime.sql`.

| Object | Runtime callers | Contract |
| --- | --- | --- |
| `AuditLogs` | auth, seller/admin mutation transactions, audit route | append-only event payload with optional actor, entity and before/after JSON |
| `BackupLogs` | admin backup API | backup metadata and filesystem path; the database backup/restore infrastructure is unchanged |
| `CRMNotes` | CRM customer detail and note creation | child of foundation `CRMCustomers`, actor-owned note content |
| `CRMTasks` | CRM customer detail and task creation | child of foundation `CRMCustomers`, optional active admin/coach assignee and task status |

The migration contains no demo rows and does not copy `db/schema.sql`.
Indexes follow the existing filter/order paths. `BackupLogs` remains metadata
only: the existing controller still creates the backup directory, executes the
operator-authorized SQL Server backup/restore commands and records the file
path; no startup runner or backup redesign was added.

`CRMCustomers` remains the foundation root. Notes and tasks are additive child
tables and do not widen coach customer scope. Existing source authorization is
unchanged.

`DATABASE_MANUAL_CHECK_REQUIRED` remains until an operator checks the live
ledger and migration state read-only.
