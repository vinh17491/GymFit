# Rate-Limit Architecture

Status: PHASE 32 CHECKPOINT / SINGLE-INSTANCE MEMORY LIMITER

- Core API, Auth and upload thresholds are centralized in
  `backend/src/config/config.ts`.
- Seller application and Brand Request mutation thresholds are centralized in
  the same config object while keeping their existing user+IP key scope.
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
