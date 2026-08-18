# GYMFIT Stabilization Pass 2 Handoff

## Status

`PASS2_SOURCE_COMPLETE`

`MANUAL_CHECK_REQUIRED`

`DATABASE_MANUAL_CHECK_REQUIRED`

This handoff records source-level completion only. No database was connected to
or mutated, and no business test suite was added or executed.

## Branch and source

- Pass 1 source branch: `phan-tich-lan-1`
- Pass 1 source commit: `f80c4e3fbb3e8379303ceb6a46e4788f5cdb14f2`
- Pass 2 branch: `phan-tich-lan-2`
- Remote: `origin/phan-tich-lan-2`
- Parent of the final handoff checkpoint: `4ff9d85`
- Final handoff checkpoint message: `chore(gymfit): complete stabilization pass 2`

The exact final commit hash is the hash printed by `git log -1` for the commit
containing this file. A commit cannot embed its own hash without a later
history rewrite, so the delivery record reports that value directly.

## Checkpoint history

1. `1c5edbc` — `chore(db): establish safe GymFit bootstrap foundation`
2. `b819a69` — `docs(db): finalize bootstrap and migration contract`
3. `a40b1a` — `fix(payment): prevent invalid cancelled payment states`
4. `a5ac117` — `fix(orders): harden payment and reservation state integrity`
5. `5c99ec4` — `fix(assistant): add rate limits and correct AI status state`
6. `cf4b50d` — `fix(chatbot): make local fallback fast and recover AI safely`
7. `4ff9d85` — `refactor(chatbot): separate orchestration and expose mode status`
8. Final handoff — `chore(gymfit): complete stabilization pass 2`

## Files changed

Pass 2 changes are grouped below; this is the complete source/documentation
scope from the Pass 1 source commit through the final handoff:

- `PROJECT_STATUS.md`, `README.md`
- `backend/package.json`
- `backend/src/config/config.ts`
- `backend/src/middleware/rateLimiter.ts`
- `backend/src/modules/assistant/assistant.routes.ts`
- `backend/src/modules/assistant/assistant.service.ts`
- `backend/src/modules/assistant/assistant.tools.ts`
- `backend/src/modules/orders/payment.service.ts`
- `backend/src/scripts/bootstrap.ts`, `backend/src/scripts/migrate.ts`
- `db/bootstrap/foundation.sql`, `db/schema.sql`
- `docs/ASSISTANT_API_CHATBOT_V2.md`
- `docs/DATABASE_AND_MIGRATIONS.md`, `docs/DATABASE_MIGRATION_OWNERSHIP.md`
- `docs/RATE_LIMIT_ARCHITECTURE.md`, `docs/SETUP_AND_ENVIRONMENT.md`
- `docs/marketplace/ORDER_SERVICE_READ_ONLY_REVIEW.md`
- `docs/analysis/PASS2_ASSISTANT_RATE_LIMIT_AND_STATUS.md`
- `docs/analysis/PASS2_BOOTSTRAP_CONTRACT.md`,
  `docs/analysis/PASS2_BOOTSTRAP_SAFETY.md`
- `docs/analysis/PASS2_CHATBOT_FALLBACK_AND_RECOVERY.md`,
  `docs/analysis/PASS2_CHATBOT_ORCHESTRATOR_AND_ACTOR_TOOLS.md`
- `docs/analysis/PASS2_DATABASE_DEPENDENCY_GRAPH.md`,
  `docs/analysis/PASS2_DATABASE_INVENTORY.md`
- `docs/analysis/PASS2_FINDINGS.md`,
  `docs/analysis/PASS2_FINAL_MANUAL_QA_CHECKLIST.md`
- `docs/analysis/PASS2_PAYMENT_STATE_MATRIX.md`
- `frontend/src/features/chatbot/ChatbotWidget.tsx`
- `frontend/src/features/chatbot/chatbotOrchestrator.ts`
- `frontend/src/features/chatbot/chatbotProviders.ts`
- `PHAN_TICH_LAN_2_RESULT.md`

## Resolution summary

### Database bootstrap

The canonical empty-database sequence is now documented and guarded:

`empty SQL Server database -> db:bootstrap -> migration status -> db:migrate`.

The bootstrap creates only the 13 non-destructive foundation root tables,
refuses migration-owned or unexpected existing objects, verifies the runtime
database identity, uses a transaction and never runs migrations, inserts demo
data, edits migration history, drops a database or adopts an unknown schema.
The legacy `db/schema.sql` remains explicitly destructive, legacy and
non-canonical.

### Payment and inventory state

The payment service no longer resets failed orders to unpaid. Payment
confirmation refuses cancelled orders and released reservations, customer
notifications are guarded, and the failed path keeps reservation release,
ShopOrder cancellation, Parent cancellation/history and payment history in one
transaction. No implicit re-reservation was added.

### Assistant rate limiting and status

Assistant chat has a dedicated limiter after optional authentication: guests use
an IP key and authenticated requests use the verified user id. The status route
does not call the provider. `AI_ONLINE` requires a healthy closed circuit, zero
failures and a success timestamp newer than the last failure. Secrets, raw
provider diagnostics and internal stack details remain outside the response.

### Fast Local fallback and recovery

The frontend orchestrator separates the seven-second interactive AI tolerance
from the backend technical timeout. Disabled, unavailable, open-circuit and
cooldown paths go directly to the local engine. After an AI failure, only a
later message after the retry window may make the controlled recovery attempt.
Mode changes preserve conversation and context; identity changes retain the
existing privacy reset boundary.

### Green/red status indicator

The closed chat button has a small ringed dot: green for `AI_ONLINE`, red for
`LOCAL_FALLBACK` or an unknown status. The button title and accessible label
carry the mode meaning, so the indicator is not color-only.

### Tool scope and data minimization

Tool definitions are selected by verified actor. Guests receive public product
and coach-availability tools; members receive their private appointment/order/
workout tools; coaches receive appointment/order tools; sellers and admins
receive public tools only. The executor repeats the allowlist check. Admin
cannot invoke `getMyAppointments`, and the private implementation accepts only
Member or Coach actors. Outputs are bounded and limited to fields needed for
the answer; sensitive identity, credential, session and internal metadata are
not forwarded.

## Static checks

The final static gate is limited to the permitted checks:

- backend build: passed;
- backend lint: passed with 0 errors and 461 existing warnings;
- frontend typecheck: passed;
- frontend build: passed;
- text encoding scan: passed with 0 unresolved HIGH findings;
- `git diff --check`: passed;
- staged secret/path scan: passed.

No business tests were run. No database bootstrap, migration, provider call,
browser check or live rate-limit exercise was performed.

## Manual checks outstanding

Use [the final manual QA checklist](docs/analysis/PASS2_FINAL_MANUAL_QA_CHECKLIST.md)
for empty-database bootstrap, migration ordering, Auth, payment/inventory,
guest/member rate limits, Local fallback latency, AI recovery, status-dot
semantics, mode/history preservation, role-specific tool exposure and Admin
appointment isolation.

## Remaining risks and recommendation

Remaining risk is operational/manual: database identity and migration state are
unknown in this execution; browser/provider behavior, deployment cookie/CORS
topology and live rate-limit behavior still need controlled verification. The
source is ready for a controlled manual QA run. Do not treat this handoff as a
production-safety or full-verification conclusion.
