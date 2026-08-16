# Coach1 Database Deployment Notes

## Deployment boundary

The Coach completion work is additive and remains on branch `coach1`. Canonical `GYMFIT_DB` was inspected read-only during final validation. No canonical migration was applied by the acceptance process, and `migrationRunning=false` at handover.

## Coach migration sequence

| Migration | Purpose | Final validation |
|---|---|---|
| `0010_coach_profiles.sql` | CoachProfiles readiness | APPLIED on disposable; canonical already applied |
| `0011_coach_availability.sql` | Availability rules and exceptions | Applied/idempotent on disposable |
| `0012_membership_entitlements.sql` | Structured Plan entitlements | Applied/idempotent on disposable |
| `0013_coach_member_context.sql` | Coach member goals/private context | Applied/idempotent on disposable |
| `0014_notifications.sql` | Additive upgrade of Notifications | Applied/idempotent on disposable |
| `0015_workout_program_versioning.sql` | Draft/Published/Archived versions | Applied/idempotent on disposable |
| `0016_coach_performance_indexes.sql` | Evidence-backed Coach query indexes | Applied/idempotent on disposable |

The disposable Phase 29 migration run completed through `0016`, was rerun without pending migrations or checksum mismatches, and was dropped. Canonical status showed `0010` applied and `0011`-`0016` pending, so deployment of those migrations requires the normal database owner/release approval.

The final disposable verifier run on `GYMFIT_DB_COACH_ACCEPTANCE_FINAL_VERIFY_20260807` returned the required Coach shape and index counts with no pending migrations or checksum mismatches. The canonical verifier reports a nonzero result until `0011`-`0016` are deployed; that result is the expected read-only deployment boundary, not permission to apply migrations automatically.

## Safety and rollback

- Do not rewrite a migration that has been applied. Use an additive forward-fix migration if a deployment issue is found.
- Apply and verify `0011`-`0016` on a disposable clone before canonical deployment.
- Record `SchemaMigrations` checksum and pending status before and after deployment.
- For `0016`, remove only the named Coach indexes through an approved compensating script if a query-plan review proves a write regression; do not remove unrelated indexes.
- Keep `0100`-`0111` outside the Coach deployment bundle. They were not changed in this completion work.

## Required deployment checks

1. Confirm the target database and branch are the intended release targets.
2. Run migration status and checksum verification.
3. Apply only the approved Coach migration range.
4. Rerun status, FK/unique/index checks and Coach acceptance on a controlled smoke database.
5. Capture the deployment result before enabling the next environment.
