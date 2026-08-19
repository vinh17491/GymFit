# Pass 4 Installation and Manual Checklist

This checklist documents the two supported operator paths. It is a manual
runbook, not evidence that a database, browser, API, or external provider was
run during source verification.

## Path A: fresh database

1. Create an empty SQL Server database outside the repository.
2. Set and independently verify the ignored backend `DB_*` environment
   values and target database name.
3. From `backend`, run `npm run db:bootstrap` against that target.
4. Run `npm run db:migrate:status` and inspect the required foundation,
   tracking table, pending migrations, compatibility output, and checksums.
5. Run `npm run db:migrate` to apply the ordered chain through migration
   `0119`.
6. Confirm the final ledger and post-migration preflight manually before
   starting application traffic.

Expected fresh-install boundary:

- `Products`, `ProductVariants`, `ProductImages`, `Inventory`, `Brands`, and
  `Categories` are the required foundation tables.
- `Workouts`, `WorkoutSessions`, and `ProductTags` are not required legacy
  tables.
- No compatibility contract should be needed for a table that does not
  already exist.

## Path B: known legacy database

1. Identify the exact target database and take the operator-approved backup
   or rollback checkpoint.
2. Confirm the canonical foundation tables are present; do not point the
   runner at an unknown or partially selected database.
3. Run `npm run db:migrate:status` from `backend` and review every
   `SCHEMA_ADOPTION_REQUIRED`, `SCHEMA_MISMATCH`,
   `SCHEMA_DATA_MISMATCH`, checksum, and pending-migration result.
4. For each pre-existing late migration table, match it to the registry in
   `PASS4_MIGRATION_COMPATIBILITY.md`. Stop for human review if the table is
   absent from the registry or its shape/data is not an exact compatible
   contract.
5. Only after review, run `npm run db:migrate`. The real numbered migration
   must execute and write its own ledger row; operators must not insert a
   synthetic ledger entry.
6. Review the final ledger, preflight, application logs, and rollback outcome
   manually before enabling traffic.

## Required manual flags

- `DATABASE_MANUAL_CHECK_REQUIRED`: both database paths, migration execution,
  ledger/checksum confirmation, data compatibility, rollback, and post-run
  invariants.
- `MANUAL_CHECK_REQUIRED`: mounted route responses, auth/role/scope behavior,
  coach/admin canonical session views, video response shape, product deletion
  history guards, referral registration/code convergence, and chatbot
  configured/disabled/recovery behavior.
- Browser acceptance, live API/provider checks, business acceptance,
  integrity, e2e, Playwright, Vitest, Jest, and chatbot suites are outside
  Pass 4 source verification.
