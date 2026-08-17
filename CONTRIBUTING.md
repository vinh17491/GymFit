# Contributing to GymFit

## Branches and commits

- Branch from the verified task baseline recorded in `PROJECT_STATUS.md`. The
  current stabilization branch is `fix/gymfit-stabilization-chatbot-v2`; the
  source branch is `main`.
- Use a scoped `feat/`, `fix/` or `docs/` branch name and never mix unrelated modules.
- Do not push directly to `main`. Do not push, force-push, reset or discard
  user changes without explicit authorization. Use explicit paths with
  `git add`; never use `git add .` or `git add -A`.
- Example commits: `feat: add workout program builder`, `fix: enforce member session ownership`, `docs: update TASK-008 handoff`.

Never commit `.env`, secrets, raw `.log` files, backups, uploads, test databases, browser profiles, acceptance artifacts, `node_modules`, or `dist`.

## Code conventions

- Backend: TypeScript Express modules with routes, validation, and service/controller boundaries matching the current module; async failures go to central error handling; parameterize SQL; derive identity from JWT; enforce authorization and ownership in the backend.
- Frontend: typed React components, React Router routes, API service functions, Zustand only for shared state, inline validation and React dialogs/toasts. Do not use `window.alert`/`window.confirm` for new TASK-008 flows.
- Preserve inventory invariant `available = on_hand - reserved` and existing commerce transitions.

## Migrations and verification

- Use the next ordered migration only after verifying the ledger. Coach uses `0007`; Member Workout execution is additive `0008`. Never modify an applied migration or its checksum.
- Back up and verify before applying. Status checks are read-only. Never run acceptance mutations against `GYMFIT_DB`.
- Use a specifically identified disposable database for any authorized
  migration verification. If the target cannot be proven disposable, perform
  static inspection only. Never mutate the canonical database.

Allowed automatic evidence is limited to build, typecheck, lint, encoding,
import/reference and secret scans, plus `git diff --check`. Do not create or
run automated business tests, acceptance tests, integrity tests, E2E tests,
Playwright, Jest or Vitest suites for this stabilization task. Existing test
and acceptance scripts are retained as historical/guarded artifacts.

Authorization, ownership/IDOR, transition, concurrency, validation, timezone,
and browser flows require manual verification and must remain
`MANUAL_CHECK_REQUIRED` until actually performed.

Every completed task must update the canonical docs index, relevant module
handover, migration notes when applicable, API overview, status and known
limitations. Before handoff: validate links, scan changed files for secrets,
run `git diff --check`, review paths, and report whether a local checkpoint
commit was made. Push only when explicitly requested.
