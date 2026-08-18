# GymFit Pass 2 Assistant Rate Limit and Status Contract

Status: source-level contract; live traffic and provider verification remain
`MANUAL_CHECK_REQUIRED`.

## Route design

`POST /api/assistant/chat` uses this order:

1. `optionalAuthenticate`;
2. `assistantChatLimiter`;
3. bounded Zod body validation;
4. Assistant controller/provider boundary.

`GET /api/assistant/status` does not use the assistant chat limiter. It reports
the provider-independent circuit snapshot and remains behind the broad global
API limiter installed by the application.

## Key and threshold contract

| Request identity | Key | Default window | Default maximum |
|---|---|---:|---:|
| Authenticated | `user:<authenticated-user-id>` | 60 seconds | 30 |
| Guest | `ip:<request-ip>` | 60 seconds | 10 |

Authenticated identity comes only from the verified `req.user` set by the
optional authentication middleware. The limiter does not inspect request-body
`userId` values, model arguments or frontend-provided identity. All thresholds
and windows are centralized in `backend/src/config/config.ts` and can be
overridden with the `ASSISTANT_*_RATE_LIMIT_*` environment variables.

## 429 contract

The dedicated limiter returns HTTP `429` with the safe message
`Too many assistant requests, please try again later.` and standard retry
metadata. It does not expose provider quotas, API-key state, internal config,
stack traces or raw provider errors.

## AI mode contract

The backend reports `AI_ONLINE` only when all of these are true:

- circuit state is `CLOSED`;
- `failureCount` is zero;
- a known successful provider call exists.

Any open/half-open/failure state remains `LOCAL_FALLBACK`. The status endpoint
does not make a provider call. A provider failure is still translated to Local
Mode at the Assistant service boundary.

## Manual verification required

These cases were not run in this task:

- guest and authenticated limits use their separate keys;
- a body/model `userId` cannot change the limiter key;
- chat returns safe `429` behavior;
- status remains readable without a provider call;
- a closed circuit with nonzero failures never reports `AI_ONLINE`;
- provider recovery returns to `AI_ONLINE` only after a successful probe.
