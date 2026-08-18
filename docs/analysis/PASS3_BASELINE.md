# GymFit Pass 3 Baseline

Status: read-only baseline for phases 133–140. No source behavior or database
state was changed while recording this baseline.

## Git and source

- Repository: `https://github.com/vinh17491/GymFit`
- Pass 2 source branch: `phan-tich-lan-2`
- Pass 2 remote checkpoint: `origin/phan-tich-lan-2`
- Pass 2 final commit: `f7c8c482a7e0fa10eda2406bf46eada6ea8495cb`
- Pass 3 working branch: `phan-tich-lan-3`
- Pass 3 baseline HEAD: `f7c8c482a7e0fa10eda2406bf46eada6ea8495cb`
- Worktree at baseline: clean
- Database state: not connected, queried, migrated or mutated in this task

## Database source at baseline

The current installation contract is:

`empty SQL Server database -> db/bootstrap/foundation.sql -> db:bootstrap -> db:migrate:status -> db:migrate`.

`db/bootstrap/foundation.sql` is a guarded, non-destructive foundation script
for 13 root tables:

`Users`, `Plans`, `Brands`, `Categories`, `Products`, `ProductVariants`,
`ProductImages`, `Inventory`, `Exercises`, `Bookings`, `Notifications`,
`CRMCustomers`, `Memberships`.

The numbered migration directory contains 32 files: `0001`–`0017` and
`0100`–`0111`. The migration runner discovers files, validates the ledger and
checksums, refuses unknown/adopted state and does not auto-bootstrap or edit
old migration history. `db/schema.sql` remains a destructive legacy snapshot,
not a canonical installation source.

## Backend registration source

The authoritative registrar is `backend/src/routes/registerRoutes.ts`. It
mounts 53 route registrations under `/api`; the exact prefix/module inventory
is recorded in `PASS3_BACKEND_ROUTE_INVENTORY.md`.

Background database callers are started from `backend/src/server.ts`:

- `order-expiration.runner` handles expired pending marketplace orders;
- `coach-overdue.runner` handles overdue coach schedules.

The backup module is an admin API and filesystem backup path, not a startup
database runner. The detailed runner inventory is in
`PASS3_BACKGROUND_DATABASE_INVENTORY.md`.

## Frontend route source

`frontend/src/App.tsx` mounts `ChatbotWidget`, `CommandMenu` and the route
groups from `frontend/src/routes/routeGroups.tsx`. The route groups are the
authoritative frontend surface:

- public marketing, membership, coach discovery, exercises, products, shops
  and cart;
- guest login and registration;
- protected member, coach, seller and admin layouts with access policy checks;
- explicit not-found and access-denied routes.

The exact route-family/consumer classification is recorded in
`PASS3_FRONTEND_FEATURE_SURFACES.md`.

## Pass 2 handoff

The previous handoff is [PHAN_TICH_LAN_2_RESULT.md](../../PHAN_TICH_LAN_2_RESULT.md).
It records the guarded bootstrap, payment/inventory state hardening, Assistant
limiter/status work, fast Local fallback, actor-specific tools and the green/
red chatbot indicator. Those areas are frozen for Pass 3 unless runtime schema
integration evidence requires a narrowly scoped change.

## Phase 133–140 evidence set

- `PASS3_BASELINE.md` — this snapshot;
- `PASS3_FROZEN_BOUNDARIES.md` — Pass 2 areas not to rewrite;
- `PASS3_BACKEND_ROUTE_INVENTORY.md` — exact registered backend prefixes;
- `PASS3_FRONTEND_FEATURE_SURFACES.md` — reachable UI classification;
- `PASS3_RUNTIME_SQL_TABLE_REFERENCES.md` — runtime table references;
- `PASS3_RUNTIME_PROCEDURE_INVENTORY.md` — runtime stored procedure calls;
- `PASS3_BACKGROUND_DATABASE_INVENTORY.md` — startup/maintenance callers;
- `PASS3_RUNTIME_SCHEMA_MATRIX.md` — combined ownership matrix.

No schema change is authorized by this baseline alone. Runtime schema changes
begin only after the ownership matrix and orphan/duplicate review are complete.
