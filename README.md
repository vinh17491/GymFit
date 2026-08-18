# GymFit

GymFit is a full-stack fitness, coaching, membership and marketplace platform
with Member, Coach, Seller and Admin surfaces. The current stabilization target
is demo/staging stable with production-oriented hardening while preserving the
existing business, authentication, API and database contracts.

This repository is being implemented through the approved sequential plan:
PHASE 01 → PHASE 02 → … → PHASE 72, followed by the Pass 2 stabilization range
PHASE 73 → PHASE 132. A phase-range heading is only a summary; implementation
and review remain one phase at a time.

## Source of truth and current boundaries

- Source code, migration files and verified database state override prose when
  they disagree.
- Backend authorization is authoritative. Frontend guards provide navigation
  UX only and do not replace RBAC or ownership checks.
- Auth behavior is preserved, including `tokenVersion`, `AuthSessions`, session
  revocation, refresh rotation/replay detection, role authorization and inactive
  user checks. Refresh-token transport changes are restricted to PHASE 24–28.
- The current chatbot is a frontend local/rule-based engine. Its catalog,
  parser, normalizer, adapters, storage and types are retained.
- PHASE 72 now provides the Assistant API, backend-only provider, centralized
  circuit breaker, strict read-only tool layer and LocalProvider/AIProvider
  fallback boundary. No frontend AI secret is used.
- Assistant chat has separate guest-IP and authenticated-user rate limits;
  Assistant status is a read-only snapshot and remains lighter than chat.
- Manual/browser verification that has not actually been performed remains
  `MANUAL_CHECK_REQUIRED`.

## Technology

- Frontend: React 18, TypeScript, Vite, React Router, Zustand, Axios and
  Tailwind CSS.
- Backend: Node.js, Express, TypeScript, SQL Server (`mssql`), Zod, JWT and
  Nodemailer.
- Database: SQL Server with ordered, checksummed migrations from
  `db/migrations/0001` through `0017` and `0100` through `0111`.

## Local setup

Prerequisites are Node.js/npm, SQL Server access and Git. Keep secrets in the
ignored `backend/.env`; never commit or copy real credentials into docs, logs or
issues. See [`docs/SETUP_AND_ENVIRONMENT.md`](docs/SETUP_AND_ENVIRONMENT.md) for
the configuration matrix and the complete database contract.

For a new target, the operator-controlled sequence is:

1. Create an empty SQL Server database outside this repository.
2. Configure and verify `DB_*` in the ignored `backend/.env`.
3. Run the guarded foundation bootstrap.
4. Run migration status and review the result.
5. Run the ordered migration chain.
6. Add demo data only as a separate, deliberate operator action on an approved
   disposable target.

```powershell
cd backend
npm install
npm run db:bootstrap
npm run db:migrate:status
npm run db:migrate
npm run dev
```

`db:bootstrap` creates foundation tables only; it does not create a database,
run migrations, or add demo data. It refuses an ambiguous or already-populated
target. Do not use `db/schema.sql` for canonical setup: it is a destructive
legacy/dev-seed artifact and is not for a shared database. The repository has no
canonical automatic demo-seed step; `db/schema.sql` and `backend/seed_data.json`
remain separate historical/data assets that require an explicit operator
decision.

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Static quality commands available in the repository include:

```powershell
cd backend
npm run build
npm run lint

cd ..\frontend
npm run build
npm run typecheck

cd ..
npm run check:encoding
```

The repository contains legacy `test:*`, `acceptance:*`, `integrity:*` and
verification scripts. The current execution policy does not create or run
business test suites; those scripts must not be treated as evidence for a
manual or production conclusion.

## Database safety

Read [`docs/DATABASE_AND_MIGRATIONS.md`](docs/DATABASE_AND_MIGRATIONS.md) and
[`docs/DATABASE_MIGRATION_OWNERSHIP.md`](docs/DATABASE_MIGRATION_OWNERSHIP.md)
before database work.

- `db/migrations` is the forward migration source of truth.
- `db/bootstrap/foundation.sql` plus the guarded `db:bootstrap` command is the
  non-destructive empty-database foundation source of truth.
- `TABLE EXISTS != MIGRATION APPLIED`; adoption requires full schema metadata
  compatibility and otherwise stops with `SCHEMA_MISMATCH`.
- Applied/canonical migrations are immutable. Schema changes require a new
  ordered migration unless a not-yet-canonical file is proven safe to edit.
- `db/schema.sql` is a destructive legacy snapshot/dev-seed artifact, not the
  canonical provisioning path. Never run it against a canonical or shared
  database.
- Never use `DROP DATABASE`, `DROP TABLE` or `TRUNCATE` on canonical business
  data. If a disposable target has not been explicitly identified, use static
  inspection only.

## Health, auth and Assistant boundaries

The health boundary exposes `GET /health/live` for process liveness,
`GET /health/ready` for minimal SQL readiness and the existing
`GET /api/health` compatibility response. A process-live response must not be
interpreted as database readiness.

The implemented refresh-cookie flow uses Axios `withCredentials`, backend CORS
credentials and an explicit origin allowlist. SameSite is selected from the
deployment topology, with CSRF/Origin boundaries reviewed at refresh and
logout. Browser and deployment verification remain `MANUAL_CHECK_REQUIRED`.

The official name is `ASSISTANT API`, not “Public Assistant API”. Its read-only
tools run through the backend tool registry and existing GymFit services; the
model does not generate SQL, choose user identity, or perform booking, order,
payment, refund, settlement, role, inventory or database mutations. Local
fallback remains a valid operating mode.

## Documentation

Start with [`docs/README.md`](docs/README.md), then consult:

- [`PROJECT_STATUS.md`](PROJECT_STATUS.md) for current evidence and blockers;
- [`ROADMAP.md`](ROADMAP.md) for workstream sequencing;
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for module boundaries;
- [`docs/API_AND_AUTHORIZATION.md`](docs/API_AND_AUTHORIZATION.md) for API and
  authorization contracts;
- [`CONTRIBUTING.md`](CONTRIBUTING.md) for branch, safety and review rules.

Historical prompts, superseded plans and academic artifacts are retained under
`docs/archive/` and must not be used as current implementation truth.

## Completion language

Build, lint, typecheck and static inspection do not establish
`PRODUCTION_SAFE`, `PRODUCTION_READY`, `FULLY_SECURE` or `FULLY_VERIFIED`.
Until the user performs the relevant manual checks, the result is
`MANUAL_CHECK_REQUIRED`.
