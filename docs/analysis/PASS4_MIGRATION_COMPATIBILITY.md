# Pass 4 Migration Compatibility Contract

Pass 4 adds a narrow compatibility registry for migration-owned tables that
may already exist before their numbered migration is recorded. The registry
is not a schema adoption mechanism and it does not create a synthetic
`SchemaMigrations` row.

## Registry coverage

`backend/src/scripts/migration-compatibility.ts` covers the migration-owned
tables introduced by the current late migration range:

| Migration | Tables covered |
| --- | --- |
| `0112` | `ReferralCodes`, `ReferralTransactions` |
| `0113` | `Coupons`, `CouponUsages` |
| `0114` | `Points`, `PointTransactions`, `RewardsCatalog`, `RewardRedemptions` |
| `0115` | `Tickets`, `TicketMessages` |
| `0116` | `Payments`, `Invoices` |
| `0117` | `AuditLogs`, `BackupLogs`, `CRMNotes`, `CRMTasks` |
| `0118` | `AnalyticsDaily` |
| `0119` | `AnalyticsRetention` |

Every contract specifies the expected columns and SQL Server metadata where
it matters: data type, length or precision/scale, nullability, identity,
primary key, unique keys and filtered predicates, foreign keys, check
constraints, and read-only data validity/duplicate/orphan queries.

## Runner policy

For an existing migration-owned table whose owner is not in
`dbo.SchemaMigrations`, `backend/src/scripts/migrate.ts` follows this order:

1. Look up the exact `(table, migration)` contract.
2. Stop with `SCHEMA_ADOPTION_REQUIRED` if no contract exists.
3. Run metadata and data validation only. A mismatch stops with
   `SCHEMA_MISMATCH` or `SCHEMA_DATA_MISMATCH`.
4. If validation passes, execute the real numbered migration in its normal
   transaction.
5. Record the actual migration filename, checksum, and timestamp in the
   normal ledger after the migration succeeds.

Thus a compatible pre-existing object may pass through the forward migration
path, but the migration itself remains the owner of DDL and ledger state.
Unknown objects, incompatible objects, checksum drift, and invalid data fail
closed. The validator does not mutate rows, indexes, constraints, or the
ledger.

## Fresh versus known legacy databases

- Fresh database: create an explicitly verified empty target, run the
  canonical bootstrap, review migration status, then run the ordered chain
  through `0119`. No `Workouts`, `WorkoutSessions`, or `ProductTags` table is
  required by the Pass 4 source boundary.
- Known legacy database: verify the target and backup/rollback procedure,
  confirm the canonical foundation is present, run status/preflight, and
  review every compatibility result before allowing the real migration run.
  A known legacy table is accepted only when its exact registry contract and
  data rules pass. There is no automatic rename, backfill, deletion, or fake
  ledger adoption.
- Unknown database: stop and escalate for a separately authorized database
  migration decision. Source verification does not claim this path is safe.

Live database execution, migration-ledger confirmation, and rollback drills
remain `DATABASE_MANUAL_CHECK_REQUIRED` for this pass.
