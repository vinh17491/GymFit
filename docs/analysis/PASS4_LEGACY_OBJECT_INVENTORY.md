# Pass 4 Legacy Object Inventory

This is the exact source inventory at the Pass 4 baseline. Acceptance scripts
are listed separately because they are not mounted application runtime
callers; they still require manual fixture review if the compatibility routes
are retired.

## Mounted runtime callers

| Legacy object | Runtime caller | Current use | Required disposition |
| --- | --- | --- | --- |
| `Workouts` | `backend/src/modules/videos/videos.controller.ts:20-33` | public/admin/coach video list and count | project from `Exercises` |
| `Workouts` | `backend/src/modules/videos/videos.controller.ts:48-60` | video detail | project from `Exercises` |
| `Workouts` | `backend/src/modules/videos/videos.controller.ts:63-101` | video create/update/delete | retire or deprecate legacy mutations |
| `Workouts` | `backend/src/modules/videos/videos.controller.ts:104-108` | video categories | derive from `Exercises.muscle_group` |
| `WorkoutSessions` + `Workouts` | `backend/src/modules/coach-workspace/coach-workspace.service.ts:344-348` | no-workout attention exclusion | canonical member-session exclusion |
| `WorkoutSessions` + `Workouts` | `backend/src/modules/coach-workspace/coach-workspace.service.ts:424-439` | coach dashboard recent sessions | canonical member sessions |
| `WorkoutSessions` + `Workouts` | `backend/src/modules/coach-workspace/coach-workspace.service.ts:994-998` | member session count | canonical member sessions |
| `WorkoutSessions` + `Workouts` | `backend/src/modules/coach-workspace/coach-workspace.service.ts:1392-1427` | member session list | canonical member sessions |
| `WorkoutSessions` + `Workouts` | `backend/src/modules/coach-workspace/coach-workspace.service.ts:1432-1446` | legacy source/detail branch | retire required legacy branch; keep only explicit safe compatibility if justified |
| `WorkoutSessions` + `Workouts` | `backend/src/modules/coach-workspace/coach-workspace.service.ts:1449-1453` | progress totals | canonical member-session totals |
| `WorkoutSessions` + `Workouts` | `backend/src/modules/admin-coaches/admin-coaches.service.ts:21-24` | recent coach session count | canonical member sessions |
| `WorkoutSessions` + `Workouts` | `backend/src/modules/admin-coaches/admin-coaches.service.ts:56-62` | completed sessions summary | canonical member sessions |
| `WorkoutSessions` + `Workouts` | `backend/src/modules/admin-workouts/admin-workouts.service.ts:57-70` | admin sessions/progress CTE | canonical member sessions |
| `ProductTags` | `backend/src/modules/admin-products/admin-products.service.ts:184` | product-delete child cleanup | conditional optional cleanup only |
| `ProductTags` | `backend/src/modules/products/seller-products.service.ts:162` | seller product-delete child cleanup | conditional optional cleanup only |
| `Users.referral_code` | `backend/src/modules/auth/auth.controller.ts:12,35,42,57,61,68` | user alias, referrer lookup, session DTO | preserve as compatibility alias and converge |
| `ReferralCodes` | `backend/src/modules/auth/auth.controller.ts:41-44` | requested-code lookup | canonical owner lookup |
| `ReferralCodes` | `backend/src/modules/referral/referral.controller.ts:9-20` | self-service read/create | canonical owner, reuse compatible user alias |

## Non-runtime acceptance fixtures

The following scripts intentionally construct legacy fixtures and are excluded
from the mounted runtime inventory. They must not be used as evidence that a
fresh database requires legacy tables:

- `backend/src/scripts/auth-rbac-acceptance.ts:28`
- `backend/src/scripts/coach-role-acceptance.ts:26-45,76`
- `backend/src/scripts/coach-performance-acceptance.ts:131-133`

Updating or retiring those scripts is outside the source stabilization scope
unless a later manual acceptance plan explicitly requests it.

## Migration-owned referral objects

`migrate.ts` currently records `ReferralCodes` and
`ReferralTransactions` as migration `0112` objects. The Pass 4 compatibility
registry must validate those known objects strictly before allowing migration
`0112` to execute against an existing legacy-compatible schema. It must not
adopt any unregistered object.
