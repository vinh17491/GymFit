# Coach1 Completion Baseline

Captured: `2026-08-05`
Checkpoint: `0dfc201 docs(coach): record coach1 completion baseline`

## Repository baseline

- Required branch: `coach1`.
- Starting HEAD: `5944d17 feat(ui): stabilize shell and overhaul dashboard UX`.
- Tracked worktree: clean before Phase 00 documentation was created.
- User-owned untracked prompt, plan and document files: preserved and excluded from staging.
- Scope: Coach, Coach-facing Membership/Entitlement/Booking, Member Workout and Admin Coach surfaces.
- Excluded: Marketplace Backend, Seller Backend, migrations `0100`-`0111`, framework/database replacement, microservices, AI, realtime chat and video call.

## Baseline verification

| Check | Result |
|---|---|
| Backend `npm run build` | PASS |
| Backend `npm run lint` | PASS with 0 errors and 452 pre-existing warnings |
| Frontend `npx tsc --noEmit` | PASS |
| Frontend `npm run build` | PASS |
| `npm run test:coach-booking-unit` | PASS |
| Canonical migration status | PASS/read-only: 22 applied, 0 pending, 0 checksum mismatches |
| `0010_coach_profiles.sql` | APPLIED with matching checksum |
| Marketplace/Seller `0100`-`0111` | Present/applied; not changed by Phase 00 |

Role, Member E2E, Admin Coach and Booking acceptance scripts require guarded disposable databases. They were intentionally not run against the canonical database during Phase 00; each later phase records its isolated fixture and cleanup evidence in `COACH_COMPLETION_PROGRESS.md`.

## Baseline classification

- Confirmed source gaps and defects were recorded in the Master Prompt and Phase 00 progress entry.
- Marketplace/Seller migration behavior was classified as outside Coach scope.
- No production code or canonical database data was changed in Phase 00.
