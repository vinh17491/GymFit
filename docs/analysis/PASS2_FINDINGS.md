# GYMFIT Pass 2 Findings

Source reviewed: `phan-tich-lan-1` at `f80c4e3fbb3e8379303ceb6a46e4788f5cdb14f2`.

This document records the Phase 74 read-only verification and the subsequent
Pass 2 closure evidence. Statuses are source-level only; manual verification
remains outstanding.

## Findings

| Finding | Status | Evidence |
| --- | --- | --- |
| The migration runner requires foundation tables before it can run the migration chain. | **CONFIRMED** | `backend/src/scripts/migrate.ts:9` defines `REQUIRED_TABLES`; `validateRequiredTables` is called before `ensureTrackingTable` and before pending migrations are applied (`:608`, `:650-651`). An empty database therefore fails with the generic missing-foundation-table error. |
| `db/schema.sql` is destructive and cannot be the canonical install path. | **CONFIRMED** | `db/schema.sql:14-20` drops and recreates `GYMFIT_DB`; `:37-81` drops business tables. Pass 2 now provides the separate non-destructive foundation contract in `db/bootstrap/foundation.sql` and `backend/src/scripts/bootstrap.ts`. |
| The payment flow allowed `FAILED -> UNPAID`. | **FIXED IN PASS 2** | The pre-change transition and customer reset instruction were removed. `FAILED` is now terminal for the order; the safe customer message directs the customer to a new checkout. |
| Customer assistant chat uses optional authentication. | **CONFIRMED** | `backend/src/modules/assistant/assistant.routes.ts:18-20` defines `optionalAuthenticate`; `:24` applies it to `POST /chat`. |
| Assistant chat has no dedicated limiter. | **FIXED IN PASS 2** | `assistantChatLimiter` now runs after optional authentication and keys authenticated requests by `user:<authenticated-user-id>` or guests by `ip:<request-ip>`. `GET /api/assistant/status` remains free of the chat limiter. |
| Assistant status can report AI online after a failure. | **FIXED IN PASS 2** | `currentMode()` now requires `state === 'CLOSED'`, `failureCount === 0` and a known success timestamp before reporting `AI_ONLINE`. |
| The closed chatbot icon has no status dot. | **FIXED IN PASS 2** | The closed `MessageCircle` button now has a small ringed green/red status dot, an accessible mode label and a matching title; the existing open-header text remains. |
| The widget always attempted AI before Local. | **FIXED IN PASS 2** | The widget now keeps one assistant state object, skips AI when configuration is unavailable or the local cooldown is active, gives AI a separate interactive timeout, and falls through to `LocalProvider` without waiting for the provider technical timeout. Recovery is attempted only on a later message after the cooldown. |
| Assistant tool definitions are shared across actors. | **FIXED IN PASS 2** | Tool definitions are selected by the authenticated actor: guests receive public tools, members receive their private tools, coaches receive appointment/order tools, and sellers/admins receive public tools only. The executor applies the same allowlist instead of trusting model-supplied tool names. |

## Scope decision

The findings are limited to the risks listed in the Pass 2 specification. No
business tests were added or run, and no database was connected to or mutated
during this review.
