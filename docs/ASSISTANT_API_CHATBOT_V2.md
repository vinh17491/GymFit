# Assistant API / Chatbot V2

PHASE 72 adds the Assistant boundary. The official name is Assistant API; it
is not a blanket public data API.

## Endpoints

- GET /api/assistant/status
- POST /api/assistant/chat

Status is a read-only snapshot. It does not call the AI provider on each
request. It reports configuration, circuit state, last known success/failure
timestamps and whether a controlled recovery probe is available.

Chat accepts only a bounded message and optional user/assistant text history.
The request schema is strict: identity fields such as userId are rejected and
are never used as an authority.

The frontend uses Axios `withCredentials`; backend CORS enables credentials
only for the explicit configured origin allowlist. Wildcard origins are not
accepted. Refresh/logout cookie CSRF and Origin boundaries remain governed by
the deployment topology and are still `MANUAL_CHECK_REQUIRED`.

## Provider boundary

    LLM
     ↓
    Backend Tool Registry
     ↓
    Existing GymFit Service
     ↓
    Repository / Data Layer
     ↓
    SQL Server

The backend uses a lightweight HTTP provider implementation. AI_API_KEY never
enters the frontend. AI_BASE_URL is optional; the provider default is used
when it is absent. The important backend configuration is:

- AI_ENABLED
- AI_API_KEY
- AI_MODEL
- AI_TIMEOUT_MS
- optional AI_BASE_URL

The circuit breaker is centralized at three provider failures followed by a
30-second cooldown and one controlled half-open probe. These values are held
in backend config, not scattered through request code.

## Request limits and status truth

`POST /api/assistant/chat` runs optional authentication, then the dedicated
Assistant limiter, then body validation. Guests are limited by
`ip:<request-ip>` to 10 requests per minute by default; authenticated users are
limited by `user:<authenticated-user-id>` to 30 requests per minute by default.
The thresholds and windows are environment-overridable through the centralized
`ASSISTANT_*_RATE_LIMIT_*` settings. `GET /api/assistant/status` is not subject
to this chat limiter because it does not call the provider; the global API
limiter still applies.

Rate exhaustion returns HTTP `429` with a safe retry-later message. Provider
quota, key, configuration and stack details never cross the response boundary.
The backend reports `AI_ONLINE` only when the circuit is `CLOSED`,
`failureCount` is zero and a known successful provider call exists. Otherwise
the status is `LOCAL_FALLBACK`.

## Read-only tool allowlist

- searchProducts
- getCoachAvailability
- getMyAppointments
- getMyOrders
- getWorkoutContext

Tool arguments use strict schemas. Private tools derive identity only from
req.user populated by the existing JWT/session middleware. userId from a
prompt, frontend payload or model argument is not accepted. Tool outputs are
bounded and omit payment references, addresses, secrets, private notes and
unneeded identifiers.

No generated SQL, arbitrary query, booking, cancellation, order, payment,
refund, replacement, settlement, role, product, inventory or database
mutation tool is exposed.

Prompt injection is not claimed to be detectable or blockable with absolute
certainty. The enforced requirement is that it cannot bypass JWT identity,
session, RBAC, tool allowlist, ownership, data scope, secret boundaries or
mutation restrictions.

## Local fallback and UI mode

The existing local rule engine is wrapped as LocalProvider; the backend
provider is exposed to the widget as AIProvider. The widget starts in:

LOCAL_FALLBACK red indicator

Only a successful AI response changes the indicator to:

AI_ONLINE green indicator

Provider timeout, credentials, quota, 401/429/5xx, connection and circuit
failures are classified internally and fall back silently to the local engine.
Raw provider diagnostics are not shown. The frontend local engine remains
available if the Assistant backend is unreachable. Switching modes preserves
conversation, input context and history; it does not close or reset the
widget.

The frontend gives an interactive AI attempt a separate 7-second abort budget;
the backend provider keeps its own technical timeout. After an AI failure or
Local Mode decision, the next AI attempt is held for the client cooldown rather
than retrying on every message. The next message after the cooldown is the
controlled recovery probe; success returns to `AI_ONLINE`, while failure keeps
`LOCAL_FALLBACK` and starts the cooldown again. Local responses use the main
request signal and do not wait for the AI timer.

Fitness guidance remains general information. The Assistant is not a disease
diagnosis or medical treatment subsystem.

Manual browser and provider verification remain MANUAL_CHECK_REQUIRED.
