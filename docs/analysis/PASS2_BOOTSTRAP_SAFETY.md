# GYMFIT Foundation Bootstrap Safety Conditions

Phase 78 defines the refusal contract for the canonical foundation bootstrap.
These conditions are intentionally stricter than `IF OBJECT_ID IS NULL THEN
CREATE` because an existing object may belong to another schema version.

## Refusal conditions

The bootstrap must return a safe refusal and make no schema mutation when any
of the following is true:

| Condition | Result |
| --- | --- |
| `dbo.SchemaMigrations` exists | `BOOTSTRAP_REFUSED` |
| Any numbered migration-owned table exists | `BOOTSTRAP_REFUSED` |
| Any numbered migration-owned trigger, view, procedure, or index is present | `BOOTSTRAP_REFUSED` |
| A required foundation table exists with missing/incompatible columns, types, nullability, keys, or required foreign keys | `BOOTSTRAP_SCHEMA_CONFLICT` |
| An unexpected user table or schema object exists outside the approved foundation contract | `BOOTSTRAP_SCHEMA_CONFLICT` |
| A foundation object is ambiguous because metadata cannot be inspected safely | `BOOTSTRAP_SCHEMA_CONFLICT` |
| The connection cannot prove the intended target database identity | `BOOTSTRAP_REFUSED` |
| The target is not SQL Server or the bootstrap cannot run in one transaction | `BOOTSTRAP_REFUSED` |

The bootstrap must not drop, truncate, alter destructively, overwrite, adopt,
or repair any object after a refusal.

## Allowed states

Only these states are valid for an individual foundation object:

```text
object missing
    -> create the reviewed foundation definition

object present and metadata-compatible
    -> leave it unchanged

object present and metadata-incompatible or unknown
    -> BOOTSTRAP_SCHEMA_CONFLICT
```

An existing object is never treated as successful merely because its name
matches. At minimum, metadata comparison must cover the approved columns,
SQL types, lengths/precision/scale, nullability, identity/rowversion behavior,
primary keys, unique keys, required foreign keys, and foundation-owned checks.

## Migration-owned detection

The guard must use the ownership inventory and actual SQL object names, not
only the six-table `REQUIRED_TABLES` list. It must detect the migration-owned
tables from `MIGRATION_TABLE_OWNERS` and the migration-owned triggers/indexes
created by the numbered files. This prevents a partially migrated database
from being mistaken for an empty database.

The guard must also inspect `dbo.SchemaMigrations` before attempting to create
any foundation object. It must not create or modify the ledger; ledger history
belongs exclusively to the migration runner.

## Transaction and error behavior

- Metadata inspection happens before mutation.
- Foundation creation runs in one explicit transaction.
- Any create failure rolls back the foundation transaction.
- Errors are stable operator-facing codes with no raw SQL, credentials,
  connection strings, or stack traces in the normal command output.
- A successful command reports only that the compatible foundation exists; it
  does not claim migrations were applied.

## Safety conclusion

The bootstrap is an opt-in initializer for an empty or already-compatible
foundation database. It is not a reset tool, schema adoption tool, migration
runner, seed command, or repair command.
