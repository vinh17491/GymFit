# Pass 4 Baseline

## Scope

This document records the source baseline for the final stabilization pass. It
is descriptive only: it does not change runtime behavior, schema, migrations,
or data.

- Branch: `phan-tich-lan-4`
- Base branch: `phan-tich-lan-3`
- Base/head at pass start: `f5ed4d4825aa7104f1e4b8f5157ad9ce88d83074`
- Migration head: `0119_analytics_retention_runtime.sql`
- Route registrations in `backend/src/routes/registerRoutes.ts`: 53
- Database access: not performed for this pass baseline

The branch was created directly from `phan-tich-lan-3`; no merge or rebase was
used. Numbered migrations `0001` through `0119` are the frozen source
boundary. A new migration is not justified by the current referral contract.

## Pass 3 carry-forward

Pass 3 established the canonical foundation, numbered runtime migrations,
ledger/checksum readiness, canonical workout-program execution tables, and
safe generic readiness errors. Its final findings left six route groups
unresolved because they still depended on legacy objects:

| Route group | Remaining source dependency | Pass 4 target |
| --- | --- | --- |
| `/api/videos` | `Workouts` reads and writes | `Exercises` media projection; legacy mutations retired or deprecated |
| `/api/coach` | `WorkoutSessions` + `Workouts` history branches | `MemberWorkoutSessions` only for required runtime paths |
| `/api/admin/coaches` | legacy session counts | canonical member-session counts |
| `/api/admin/workouts` | legacy session CTE branch | canonical member-session CTE |
| `/api/admin/products` | unconditional `ProductTags` delete | conditional, optional cleanup |
| `/api/seller/products` | unconditional `ProductTags` delete | conditional, optional cleanup |

## Current ownership snapshot

- `Exercises` owns canonical exercise media fields including `video_url` and
  `thumbnail_url`.
- `WorkoutPrograms`, `CoachProgramAssignments`, `CoachProgramSchedules`,
  `MemberWorkoutSessions`, and their exercise/set-log tables own canonical
  workout execution.
- `ProductImages`, `ProductOptions`, inventory, order, reservation, and
  moderation history tables own the product catalog and its invariants.
- Migration `0112` owns `ReferralCodes` and `ReferralTransactions`.
- `Users.referral_code` is still present as a compatibility alias and is read
  by registration/login-facing code.
- The assistant is local-first and already has an unknown-status provider
  probe, but the current probe only rechecks `configured = null`; it does not
  recover from `configured = false`.

## Pass 4 source risks at baseline

1. `migrate.ts` detects an existing migration-owned table without a ledger
   entry and stops with `SCHEMA_ADOPTION_REQUIRED` before the real migration
   can normalize and record that table.
2. Legacy workout tables are still required by runtime queries in the six
   route groups above.
3. `/api/videos/public` returns `{ videos, pagination }`, while the frontend
   service currently treats `data` as an array and converts a valid response
   into an empty list. Its mapper also invents duration and instructor values.
4. Product deletion references `ProductTags` unconditionally even though the
   table is not part of the canonical fresh database.
5. Referral registration generates `Users.referral_code` but does not create
   the matching `ReferralCodes` row; self-service code creation generates a
   second owner value instead of converging on the existing user alias.
6. Assistant recovery does not probe a known-disabled provider under the
   controlled cooldown policy.

## Frozen verification limits

Pass 4 source verification may use static inspection, TypeScript compilation,
backend build/lint, frontend typecheck/build, `git diff --check`, encoding
scans, and secret scans. It must not run business/acceptance/integrity/e2e/
Playwright/Vitest/Jest/chatbot suites, connect to a database, mutate a live
database, or call live providers. Those items remain manual gates.
