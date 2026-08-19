# Pass 4 Frozen Boundaries

The following boundaries are frozen for the final source stabilization pass.
They are constraints on implementation, not a request to redesign the
product.

## Database and migration boundaries

- Do not modify migrations `0001` through `0119`.
- Do not recreate or require `Workouts`, `WorkoutSessions`, or `ProductTags`
  on a fresh database.
- Do not add a new Workout or Video database model.
- Do not create a fake `SchemaMigrations` ledger entry or bypass checksum and
  ledger validation.
- A new migration after `0119` is allowed only when a concrete schema contract
  cannot be satisfied by source changes; the current referral convergence plan
  does not require one.
- Metadata and data preflight must be read-only and fail closed for unknown or
  incompatible objects.

## Runtime and authorization boundaries

- Preserve authentication, refresh-token rotation, session invalidation,
  role checks, owner checks, member scope checks, and generic safe error
  behavior.
- Canonical workout execution remains owned by the program/assignment/schedule
  and member-session tables.
- Product deletion must preserve order, inventory, reservation,
  adjustment, historical, and moderation guards.
- Referral registration remains one transaction: one generated code must be
  written consistently to the user alias and canonical code table.
- Existing differing referral values must be preserved unless a separately
  authorized business migration is introduced.

## Frontend and assistant boundaries

- Keep existing loading, retry, error, identity-keyed persistence, local-first
  assistant engine, circuit breaker, cooldown, and authorization behavior.
- Video DTOs may be corrected and made nullable where canonical data is absent,
  but the change must not invent duration, instructor, or media values.
- Provider recovery must remain controlled by timeout, cooldown, and the
  existing privacy-safe local flow. No raw provider payloads may reach the UI.

## Verification boundaries

- No live database, browser acceptance, external API/provider, business test,
  or destructive data operation is part of source verification.
- Any check requiring one of those systems must be reported as
  `MANUAL_CHECK_REQUIRED` or `DATABASE_MANUAL_CHECK_REQUIRED`.
- Changes outside these boundaries require a written reason in the final
  findings before they are accepted.

## Cross-phase integration rule

Pass 4 may integrate a previous-pass fix only when it is directly required by
the legacy-object convergence, migration fail-safe path, video contract,
referral ownership, or assistant recovery work. Such integration must remain
small, preserve the frozen invariant, and be named in the final findings.
