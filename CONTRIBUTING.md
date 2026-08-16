# Contributing to GymFit

## Branches and commits

- Branch from the verified task baseline recorded in `PROJECT_STATUS.md`. The current Coach documentation cleanup branch is `coach1`; implementation and verification commits are recorded in `docs/coach/COACH_MODULE_HANDOVER.md`.
- Use a scoped `feat/`, `fix/` or `docs/` branch name and never mix unrelated modules.
- Do not push directly to `main`. Use explicit paths with `git add`; never use `git add .` or `git add -A`.
- Example commits: `feat: add workout program builder`, `fix: enforce member session ownership`, `docs: update TASK-008 handoff`.

Never commit `.env`, secrets, raw `.log` files, backups, uploads, test databases, browser profiles, acceptance artifacts, `node_modules`, or `dist`.

## Code conventions

- Backend: TypeScript Express modules with routes, validation, and service/controller boundaries matching the current module; async failures go to central error handling; parameterize SQL; derive identity from JWT; enforce authorization and ownership in the backend.
- Frontend: typed React components, React Router routes, API service functions, Zustand only for shared state, inline validation and React dialogs/toasts. Do not use `window.alert`/`window.confirm` for new TASK-008 flows.
- Preserve inventory invariant `available = on_hand - reserved` and existing commerce transitions.

## Migrations and acceptance

- Use the next ordered migration only after verifying the ledger. Coach uses `0007`; Member Workout execution is additive `0008`. Never modify an applied migration or its checksum.
- Back up and verify before applying. Status checks are read-only. Never run acceptance mutations against `GYMFIT_DB`.
- Use `GYMFIT_DB_COACH_E2E_FIX_<timestamp>` for this acceptance, verify database identity before mutation, then clean it up and re-check canonical integrity.

Run targeted typecheck/lint/tests while developing. Use Build Gate A/B/C at subtask boundaries and one final build, as specified; do not repeatedly rebuild after each file. Authorization, ownership/IDOR, transition, concurrency, validation, timezone, and browser flows are required where affected.

Every completed task must update the canonical docs index, the module handover, migration notes when applicable, API overview, status and known limitations. Before handoff: validate links, scan changed files for secrets, run `git diff --check`, review staged paths, commit explicitly, and report the exact commit. Push only when explicitly requested.
