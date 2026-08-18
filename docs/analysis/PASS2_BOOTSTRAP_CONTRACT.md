# GYMFIT Canonical Foundation Bootstrap Contract

This is the Phase 77 contract for a fresh SQL Server database. It is a
separate provisioning step from the numbered migration chain.

## Canonical lifecycle

```text
EMPTY SQL SERVER DATABASE
        |
        v
FOUNDATION BOOTSTRAP
        |
        v
MIGRATION RUNNER
        |
        v
0001 -> ... -> 0017 -> 0100 -> ... -> 0111
```

## Bootstrap input

- The operator selects and verifies an explicitly named empty SQL Server
  database.
- The connection targets that database directly; the bootstrap does not create
  or select a database by name.
- The target is expected to have no `dbo.SchemaMigrations` ledger and no
  migration-owned object.

## Bootstrap output

The bootstrap creates only the legacy/base foundation objects required by the
dependency graph:

`Users`, `Products`, `ProductVariants`, `ProductImages`, `Inventory`, `Brands`,
`Categories`, `Exercises`, `Bookings`, `Plans`, `Notifications`,
`CRMCustomers`, and `Memberships`.

Each foundation object must use an explicit, reviewed compatibility shape that
supports the SQL references in `0001`-`0017` and `0100`-`0111`. The bootstrap
must not add migration-owned columns, tables, indexes, constraints, triggers,
or deterministic migration backfill rows that belong to a numbered file.

## Explicit non-goals

The foundation bootstrap:

- contains no demo, test, product, account, or business seed data;
- does not create `SchemaMigrations` or insert migration history;
- does not create `ProductOptions`, `Orders`, `SellerApplications`, `Shops`,
  `ShopOrders`, `Refunds`, `Settlements`, `Complaints`, `Reviews`, or any
  other object owned by a numbered migration;
- does not create legacy stored procedures unless a later reviewed contract
  proves one is a true foundation runtime dependency;
- does not run the migration runner implicitly;
- does not drop, truncate, reset, overwrite, or recreate a database or business
  table.

## Operator sequence

1. Create an empty SQL Server database using the operator's approved SQL
   Server procedure.
2. Configure `DB_*` to that database and verify the target identity.
3. Run the explicit foundation bootstrap command once.
4. Run migration status and inspect the fail-closed result.
5. Run the ordered migration command.
6. Run status again and inspect checksums and pending state.
7. Seed demo data only through a separately approved operator action, if a
   demo environment needs it.

The bootstrap command must be explicit and idempotent only for compatible
missing foundation objects. An existing object is not success by itself; its
shape must be checked, and an incompatible or ambiguous object must stop.

## Handoff invariant

After a successful bootstrap, the migration runner should see all foundation
roots, no migration ledger, and no migration-owned object. The runner remains
the only component that creates numbered migration objects and records
`SchemaMigrations` rows.

Fresh-install source completion is not the same as database verification. A
real disposable-database run is required before claiming a fresh-install pass.
