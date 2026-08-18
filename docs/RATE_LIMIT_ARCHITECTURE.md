# Rate-Limit Architecture

Status: PASS 2 PHASE 105-109 SOURCE CHECKPOINT / SINGLE-INSTANCE MEMORY LIMITER

- Core API, Auth and upload thresholds are centralized in
  `backend/src/config/config.ts`.
- Seller application and Brand Request mutation thresholds are centralized in
  the same config object while keeping their existing user+IP key scope.
- Assistant chat has a dedicated limiter after optional authentication. Guest
  requests use `ip:<request-ip>` with a default of 10 requests per minute;
  authenticated requests use `user:<authenticated-user-id>` with a default of
  30 requests per minute. Both windows and maxima are environment-overridable.
- `GET /api/assistant/status` does not use the assistant chat limiter because it
  only reads the provider-independent circuit snapshot. It remains behind the
  broad global API boundary.
- Assistant limiter exhaustion returns HTTP 429 with the safe message
  `Too many assistant requests, please try again later.` and retry metadata;
  provider keys, quotas, configuration and stack details are not returned.
- Environment overrides are positive integers; invalid or missing values use
  the existing safe defaults.
- The default `express-rate-limit` store is process memory. It protects one
  running instance but does not coordinate across workers, containers or
  hosts.
- Redis remains optional infrastructure and is not introduced as an automatic
  dependency or a claim of distributed protection.
- Acceptance-specific Auth overrides remain guarded by the existing explicit
  acceptance environment/database conditions; they are not production policy.

Verification status: source/static review complete;
`MANUAL_CHECK_REQUIRED` for deployment behavior and traffic-policy validation.
