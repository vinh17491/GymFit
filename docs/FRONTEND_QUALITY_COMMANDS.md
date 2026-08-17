# Frontend Quality Commands

PHASE 70 keeps the existing frontend build command and adds an explicit
TypeScript-only check:

```text
npm run build
npm run typecheck
```

`build` remains the Vite production bundle command. `typecheck` runs the
existing strict `frontend/tsconfig.json` with `noEmit`; it does not create
output files.

No frontend lint command was added in this phase because the frontend has no
ESLint configuration or ESLint dependency. Adding a new lint stack would be a
separate tooling decision, not a safe normalization of an existing command.

The repository's existing backend lint command and historical acceptance,
integrity and test scripts are preserved. This phase adds no automated test
suite and does not run any business verification command.

Environment or browser limitations remain explicit: if the local dependency
installation is absent, build/typecheck may report a missing executable, and
manual UI verification remains `MANUAL_CHECK_REQUIRED`.
