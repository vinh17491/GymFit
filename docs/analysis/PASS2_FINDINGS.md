# GYMFIT Pass 2 Findings

Source reviewed: `phan-tich-lan-1` at `f80c4e3fbb3e8379303ceb6a46e4788f5cdb14f2`.

This document records the Phase 74 read-only verification. It does not claim
that any finding has been fixed.

## Findings

| Finding | Status | Evidence |
| --- | --- | --- |
| The migration runner requires foundation tables before it can run the migration chain. | **CONFIRMED** | `backend/src/scripts/migrate.ts:9` defines `REQUIRED_TABLES`; `validateRequiredTables` is called before `ensureTrackingTable` and before pending migrations are applied (`:608`, `:650-651`). An empty database therefore fails with the generic missing-foundation-table error. |
| `db/schema.sql` is destructive and cannot be the canonical install path. | **CONFIRMED** | `db/schema.sql:14-20` drops and recreates `GYMFIT_DB`; `:37-81` drops business tables. Existing README and database documents already describe it as legacy, but a separate non-destructive bootstrap contract is not yet present. |
| The payment flow allows `FAILED -> UNPAID`. | **CONFIRMED** | `backend/src/modules/orders/payment.service.ts:214-219` includes `(previous === "FAILED" && input.status === "UNPAID")`; customer notification also tells users at `:119-123` that Admin can reset FAILED to UNPAID. |
| Customer assistant chat uses optional authentication. | **CONFIRMED** | `backend/src/modules/assistant/assistant.routes.ts:18-20` defines `optionalAuthenticate`; `:24` applies it to `POST /chat`. |
| Assistant chat has no dedicated limiter. | **CONFIRMED** | `backend/src/modules/assistant/assistant.routes.ts:24` has no assistant-specific limiter. The only matching global control is the broad API limiter in `backend/src/app.ts:28`, while `backend/src/middleware/rateLimiter.ts` defines API/auth/upload limiters only. |
| Assistant status can report AI online after a failure. | **CONFIRMED** | `backend/src/modules/assistant/assistant.service.ts:74-76` derives `AI_ONLINE` from `state === 'CLOSED'` and any `lastKnownSuccessAt`, without checking `failureCount` or whether `lastKnownFailureAt` is newer. |
| The closed chatbot icon has no status dot. | **CONFIRMED** | `frontend/src/features/chatbot/ChatbotWidget.tsx:180-188` renders only the closed `MessageCircle` button and icon; the green/red status text exists only in the open header at `:198`. |
| The widget always attempts AI before Local. | **CONFIRMED** | `frontend/src/features/chatbot/ChatbotWidget.tsx:107-135` calls `AIProvider.chat` first; `LocalProvider.chat` is called only afterward at `:136`. No client cooldown or open-circuit short-circuit exists in this send path. |
| Admin can receive the private `getMyAppointments` assistant tool. | **CONFIRMED** | `backend/src/modules/assistant/assistant.tools.ts:162` allows `MEMBER`, `COACH`, and `ADMIN`; `backend/src/modules/bookings/bookings.service.ts:184-187` maps Admin to `1=1`, so the tool can return system-wide appointments. |

## Scope decision

The findings are limited to the risks listed in the Pass 2 specification. No
business tests were added or run, and no database was connected to or mutated
during this review.
