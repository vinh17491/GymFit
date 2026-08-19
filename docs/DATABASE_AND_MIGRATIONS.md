# Database and Migrations

Status: REPOSITORY CONTRACT / LIVE DATABASE UNVERIFIED
Last repository audit: 2026-08-19

Bootstrap source status: `BOOTSTRAP_SOURCE_COMPLETE`
Live database status: `DATABASE_MANUAL_CHECK_REQUIRED`

GymFit uses SQL Server. The database target must be explicitly verified before
any operation; historical documentation may refer to `GYMFIT_DB`, but this
execution does not assert a live database identity or migration ledger state.
The runner in `backend/src/scripts/migrate.ts` reads ordered
`db/migrations/NNNN_description.sql` files, applies each migration
transactionally and records filename/version/SHA-256 in `SchemaMigrations`.
`npm run db:migrate:status` is read-only. The guarded `npm run db:bootstrap`
command and `db/bootstrap/foundation.sql` provide the non-destructive foundation
for an explicitly created empty database; neither command creates the database
itself.

## Role of `db/schema.sql`

`db/schema.sql` is explicitly `DESTRUCTIVE`, `LEGACY`, `NOT CANONICAL` and
`NOT FOR SHARED DATABASE`. It drops and recreates `GYMFIT_DB`, contains demo data, and
must never be run against a canonical or shared database. It is not evidence
that any migration is applied. Forward schema ownership belongs to the ordered
migration chain; the empty-database foundation belongs to
`db/bootstrap/foundation.sql` and the guarded `db:bootstrap` command. Existing
objects still require strict metadata comparison before any adoption decision.

## Database creation and migration order

The normal empty-database forward path is:

1. Create an empty SQL Server database outside the repository.
2. Configure and verify the `DB_*` target identity.
3. Run `npm run db:bootstrap` from `backend/`.
4. Run `npm run db:migrate:status` and review the read-only result.
5. Run `npm run db:migrate` through the normal runner; the repository head is
   currently `0119`.
6. Re-check `dbo.SchemaMigrations`, checksums and schema invariants.
7. Start the backend only after reviewing the migration result; normal server
   startup does not bootstrap or migrate the database automatically.

Phase 01–05 analysis results in `BASELINE_NOT_REQUIRED` for this stabilization:
the current ordered chain explicitly consumes the foundation contract, so
no `0000_baseline.sql` is assumed or created. A future empty-database bootstrap
is now source-complete through the guarded `db:bootstrap` contract, but its live
first-run result remains unverified. A database with migration-owned objects but
no matching ledger entry must stop with `SCHEMA_ADOPTION_REQUIRED`; object
existence is not an applied-migration record.

## Seed and legacy path

Foundation DDL != seed/demo data != numbered migration history.

`db/schema.sql` retains legacy/demo seed data for historical and development
contexts only. It is destructive and is not a migration prerequisite by itself.
`backend/seed_data.json` is retained as a separate data asset. The repository
has no canonical automatic demo-seed command; any demo data load requires a
separate operator decision on an approved disposable target. Deterministic
seed/backfill statements already inside canonical migrations remain part of
those immutable migrations; no new business seed is added to migration history
by this stabilization work.

## Rollback and recovery limitation

The runner has no down-migration mechanism. A failed migration transaction is
rolled back before the error is returned. After a committed migration, recovery
is restore-or-forward-fix using a verified backup and a new ordered migration;
editing or renumbering the applied file is not a rollback strategy.

Never use `DROP DATABASE`, `DROP TABLE` or `TRUNCATE` on a canonical database.
If the target cannot be proven disposable, use static inspection only and report
the blocker rather than selecting a database by assumption.

## Repository migration contract

| Migration | Purpose | State |
|---|---|---|
| `0001`–`0005` | Commerce foundation, inventory, orders, payment history and reservation metadata | Present in repository; live state unverified |
| `0006` | Auth session security and booking-slot uniqueness | Present in repository; live state unverified |
| `0007_coach_programs_assignments_schedules.sql` | Coach programs, days, exercises, assignments and schedules | Present in repository; live state unverified |
| `0008_member_workout_flow.sql` | Member session, immutable exercise snapshot and set-log tables | Present in repository; live state unverified |
| `0009_admin_coach_management.sql` | Bounded Coach status/reason fields and status index | Present in repository; live state unverified |
| `0010_coach_profiles.sql` | Additive Coach public profile and booking-enabled fields | Present in repository; live state unverified |
| `0100`–`0111` | Seller/Marketplace modules | Present in repository; live state unverified |

| `0112_referral_runtime_schema.sql` | Referral code and registration-transaction runtime contract | Present in repository; live state unverified |
| `0113_coupon_runtime_schema.sql` | Coupon and coupon-use runtime contract | Present in repository; live state unverified |
| `0114_loyalty_runtime_schema.sql` | Points, point transactions, rewards and redemptions runtime contract | Present in repository; live state unverified |
| `0115_support_runtime_schema.sql` | Tickets and message runtime contract; attachments remain legacy-only | Present in repository; live state unverified |
| `0116_membership_billing_runtime.sql` | Membership payments and invoices; no marketplace gateway behavior | Present in repository; live state unverified |
| `0117_operations_runtime.sql` | Audit, backup-log and CRM note/task runtime contract | Present in repository; live state unverified |
| `0118_analytics_daily_runtime.sql` | Daily analytics stored projection contract | Present in repository; live state unverified |
| `0119_analytics_retention_runtime.sql` | Retention cohort stored projection contract | Present in repository; live state unverified |

`/health/ready` and `/api/health` require SQL connectivity plus a complete,
checksum-matching `SchemaMigrations` ledger through the deployed head. No live
`SchemaMigrations` result is asserted by this task. Earlier acceptance
and browser statements belong to historical task evidence and require a new
authorized verification before being treated as current. Fresh-install source
is aligned through the guarded foundation contract, but the first live run
remains `DATABASE_MANUAL_CHECK_REQUIRED`; see the migration ownership document.

## Coach/Member data model

`0007` owns `WorkoutPrograms`, `WorkoutProgramDays`, `WorkoutProgramExercises`, `CoachProgramAssignments` and `CoachProgramSchedules`. `0008` owns `MemberWorkoutSessions`, `MemberWorkoutSessionExercises` and `MemberWorkoutSetLogs`. The snapshot copies exercise identity, name, ordering and targets at Start; later template edits do not rewrite history. Unique constraints protect one session per schedule, one active session per Member and one set number per session exercise.

Member and Coach identity is derived from JWT plus backend scope queries. The current assignment requires `ACTIVE`, its date range to include today in its IANA timezone, and its Coach to match the active `CRMCustomers.assigned_coach_id`. Historical sessions remain preserved even when a CRM scope changes.

`0009` is additive to `Users`: `coach_status` is `ACTIVE|SUSPENDED|INACTIVE`, with an optional bounded reason and timestamp. `SUSPENDED` keeps `is_active=1` for administrative visibility but is rejected by live Coach authentication; `INACTIVE` also sets `is_active=0`. No Coach, Exercise, Program, Assignment, Session or Set Log is hard-deleted.

## Safe migration procedure

1. Query and verify the target database identity.
2. Create and verify a `COPY_ONLY CHECKSUM` backup before mutation.
3. Review the migration SQL, runner status and checksum.
4. Apply forward-only through the normal runner; never edit or renumber an applied file.
5. Re-run status and invariant queries.

Acceptance uses isolated names such as `GYMFIT_DB_COACH_E2E_FIX_<timestamp>` or `GYMFIT_DB_ADMIN_COACH_ACCEPTANCE_<timestamp>`, restored from a verified baseline. Seed deterministic data only there, run API/browser acceptance, clean fixture rows, drop the database and verify it is absent. Never print credentials or secrets.

## Integrity rules

Applied checksums are immutable. No reset, drop or manual migration is a fallback. A checksum mismatch blocks completion. Existing Marketplace migrations and commerce invariants remain outside Coach scope and must be unchanged.

## Coach appointment schema addition

Migration `0010_coach_profiles.sql` creates `dbo.CoachProfiles` only when it is absent. It stores public profile/booking-enabled fields, has a unique `coach_id` foreign key to `Users`, and does not create or replace the existing `Bookings` table or `UX_Bookings_ActiveSlot` filtered unique index. The legacy snapshot is not evidence that this migration is applied; existing databases must still be checked with `npm run db:migrate:status` before applying anything.

Coach acceptance scripts refuse the canonical database. Use a disposable database name beginning `GYMFIT_DB_COACH_BOOKING_ACCEPTANCE_`, apply migrations there, verify the ledger with `npm run verify:coach-migration`, start the API against that database, and run `npm run acceptance:coach-booking`. The acceptance environment guard also suppresses the unrelated order-expiration runner. No Marketplace migration is part of this change.
