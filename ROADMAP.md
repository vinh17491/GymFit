# GymFit Roadmap

Updated: 2026-08-04. Historical checkpoints are under `docs/archive/2026-08/` and `logs/`; current documentation is indexed by [`docs/README.md`](docs/README.md).

## Completed

| Workstream | Status | Evidence |
|---|---|---|
| Core gym/auth/RBAC and TASK-001–TASK-007 | COMPLETE | Existing source and historical evidence |
| Coach Program, Assignment and Schedule authoring | COMPLETE | Migration `0007`, Coach module handover |
| Member Workout execution and Progress | COMPLETE | Migration `0008`, Coach module handover |
| Admin Coach list/detail/status | COMPLETE | Migration `0009`, Admin acceptance |
| Admin Member assign/reassign | COMPLETE | Transaction/concurrency/IDOR acceptance |
| Admin Exercise Library | COMPLETE | Create/edit/activate/deactivate acceptance |
| Admin Workout Governance | COMPLETE — READ-ONLY | Programs, Assignments, Schedules, Sessions, Progress acceptance |
| Coach documentation consolidation | COMPLETE | `docs/coach/COACH_MODULE_HANDOVER.md` |

## Blocked

| Workstream | Status | Owner | Action |
|---|---|---|---|
| Full-project clean migration install | BLOCKED_BY_MARKETPLACE_MIGRATION_0100 | Marketplace/Seller | Resolve `SellerApplications` baseline conflict separately |
| Admin Program Builder | BLOCKED_ADMIN_PROGRAM_OWNERSHIP_MODEL | Coach/Admin architecture | Define and test an explicit Admin ownership model before adding features |
| Browser visual verification | COMPLETE | Coach acceptance fixture | Guest, Member, Coach and Admin route checks passed at 375/768/1440; console has only React Router upgrade warnings |

## Next

- Keep Coach contracts, migrations and authorization acceptance green.
- Resolve Marketplace migration `0100` only on a separate Marketplace-owned workstream.

Marketplace, Seller, Video, Payment, Refund and Settlement remain protected/out of scope for Coach work.

## Coach appointment delivery

- Public Coach discovery now has one canonical data source and filters inactive or suspended Coaches.
- Booking is a real pending appointment with fixed 60-minute slots, overlap/concurrency protection, ownership checks and lowercase state transitions.
- Member appointment and Coach appointment routes are separate from Workout Schedule routes.
- Migration `0010_coach_profiles.sql` is additive and must be applied only to a disposable/approved target after backup and status verification.
- Browser acceptance passed against the guarded `GYMFIT_DB_COACH_BOOKING_ACCEPTANCE_20260804212823` fixture. The Member flow created a real pending booking, the Coach confirmed it, self-profile booking was toggled off/on and public behavior was verified.

## Coach completion evidence

- Migration `0010_coach_profiles.sql`: applied transactionally on the isolated Coach Booking database; 22 applied, 0 pending and 0 checksum mismatches, with the unique Coach profile key verified.
- Runtime: Coach Role, Member Workout E2E, Admin Coach, Coach Booking and regression-02/03 acceptance passed on disposable databases; each acceptance database was dropped after use.
- Frontend: Guest `/coaches` search/detail/login guard, Member booking/detail/cancel, Coach appointment actions/profile, and Coach/Member/Admin workspace routes passed in the browser.
- Latest audited implementation base: `47417e26452cf4646ed51ec03a2891410e304823`; final task commit is reported at handoff.
