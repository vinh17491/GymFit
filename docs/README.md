# GymFit Documentation Index

AI MUST READ:

1. [`README.md`](../README.md)
2. [`PROJECT_STATUS.md`](../PROJECT_STATUS.md)
3. [`ROADMAP.md`](../ROADMAP.md)
4. `docs/README.md` (this file)
5. The canonical handover for the module being changed

AI MUST NOT USE AS CURRENT SOURCE OF TRUTH:

- `docs/archive/**`
- `logs/**`
- Codex prompts and temporary packages
- `skill/**` and `skills/**`

## Active documentation

- Project overview: [`README.md`](../README.md)
- Current status: [`PROJECT_STATUS.md`](../PROJECT_STATUS.md)
- Roadmap: [`ROADMAP.md`](../ROADMAP.md)
- Architecture: [`ARCHITECTURE.md`](ARCHITECTURE.md)
- API and authorization: [`API_AND_AUTHORIZATION.md`](API_AND_AUTHORIZATION.md)
- Database and migrations: [`DATABASE_AND_MIGRATIONS.md`](DATABASE_AND_MIGRATIONS.md)
- Known limitations: [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md)
- Setup and environment: [`SETUP_AND_ENVIRONMENT.md`](SETUP_AND_ENVIRONMENT.md)
- Developer workflow: [`DEVELOPER_WORKFLOW.md`](DEVELOPER_WORKFLOW.md)
- Contributing: [`CONTRIBUTING.md`](../CONTRIBUTING.md)
- Coach module: [`COACH_MODULE_HANDOVER.md`](coach/COACH_MODULE_HANDOVER.md)
- Coach reassignment decision: [`ADR_COACH_REASSIGNMENT_ASSIGNMENT_LIFECYCLE.md`](coach/ADR_COACH_REASSIGNMENT_ASSIGNMENT_LIFECYCLE.md)

## Marketplace reference

Marketplace documentation is protected and is not edited, renamed, merged or archived by Coach documentation work. Use the existing [`MARKETPLACE_MVP_FINAL_HANDOVER.md`](marketplace/MARKETPLACE_MVP_FINAL_HANDOVER.md) and its existing supporting files as the Marketplace source set.

## Archive and history

`docs/archive/**` and `logs/**` preserve historical evidence only. They must not be linked as current implementation truth except through this Archive/History reference. Current milestones remain in [`logs/PROJECT_HISTORY.md`](../logs/PROJECT_HISTORY.md).

## Documentation governance

- Source code, migrations and verified database state override documentation conflicts.
- Keep one canonical handover per active module and one index here.
- Put historical evidence under `docs/archive/**` with a `HISTORICAL` header and `DO NOT USE AS CURRENT SOURCE OF TRUTH` marker.
- Keep logs concise and human-readable; never store secrets, passwords, raw tokens or raw acceptance payloads.
- Do not commit temporary prompts, generated packages, inventories or cleanup reports as active project documentation.
- When contracts or migration state change, update this index, the module handover and the root status documents together.
