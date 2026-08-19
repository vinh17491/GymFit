# GymFit Pass 3 Database Installation Contract

The canonical fresh-install path is operator-controlled and ordered:

1. Create an empty SQL Server database outside the repository.
2. Set and verify the `DB_*` environment values in the ignored backend
   environment.
3. Run `npm run db:bootstrap` from `backend` against that explicitly verified
   empty target.
4. Run `npm run db:migrate:status` and review the fail-closed ledger result.
5. Run `npm run db:migrate` to apply the ordered migration chain through the
   current head (`0119`).
6. Add optional demo data only as a separate, deliberate operator action on a
   disposable target.
7. Start the backend.

`db/schema.sql` is not a step in this sequence. It remains a destructive
historical snapshot and is not a canonical provisioning or migration source.
The bootstrap owns only the small foundation; numbered migrations own later
runtime tables. Normal server startup does not create or alter schema, adopt
legacy objects or apply migrations; existing business background runners retain
their separate runtime behavior.

The migration runner must discover and sort all numbered files, verify the
ledger name/checksum, reject unknown/adopted state, stop on a failed migration,
and leave old ledger entries immutable. A live run is
`DATABASE_MANUAL_CHECK_REQUIRED` and is not asserted by static inspection.
