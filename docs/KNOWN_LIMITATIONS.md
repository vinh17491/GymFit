# Known Limitations

Status: CANONICAL
Last verified: 2026-08-04

- The current task implements the minimum Coach/Member Workout business flow. Measurement tracking, medical diagnosis, nutrition, wearables, AI recommendations, camera/pose estimation, automatic rep counting and live coaching remain out of scope.
- Admin Coach Management is scoped to the existing Coach-owned Program model. Admin Program Builder/ownership transfer is intentionally not implemented; governance remains read-only.
- The existing `Users` schema has no specialization/experience profile columns, so Admin detail renders those fields as unavailable rather than inventing a parallel profile model.
- Legacy `WorkoutSessions` remain a separate historical source. Coach monitoring can show legacy rows with an explicit blocked set-summary reason; new Member Workout rows provide snapshot/set/progress facts.
- Frontend has no lint script. The production build may emit a non-blocking Vite large-chunk advisory.
- Frontend TypeScript is currently clean with zero errors. The production build still emits a non-blocking Vite large-chunk advisory.
- Browser acceptance uses disposable deterministic data and must not create fixtures in `GYMFIT_DB`. Marketplace authenticated journeys and payment integrations remain governed by their own supporting documentation.
- Admin acceptance passes on isolated `GYMFIT_DB_ADMIN_COACH_ACCEPTANCE_<timestamp>` databases; visual browser verification remains blocked until the approved browser runtime is available.
- Browser-local token persistence remains a compatibility constraint. A future cookie/CSP redesign requires a separate CSRF/security task.
