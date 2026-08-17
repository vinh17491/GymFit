# Logging Hardening

Status: PHASE 35 CHECKPOINT / REDACTION BOUNDARY

- Winston and audit transports apply a shared redaction format.
- Redaction covers passwords, access/refresh/CSRF tokens, Bearer values,
  API keys, secrets, authorization headers, cookies, prompts, conversations,
  chat history and message collections.
- Development Morgan output uses a redacted URL token instead of raw
  `originalUrl`, preventing query-string credentials from being printed.
- Unhandled errors are logged through the redacted logger rather than direct
  `console.error` calls. Technical diagnostics remain server-side and are not
  sent in API responses.
- Audit records retain method, redacted URL, IP, user ID, status, duration and
  user-agent metadata; request bodies and raw conversation content are not
  added.

Redaction is defense-in-depth. Callers must still avoid passing secrets or raw
private conversation data into logging metadata. This phase does not claim
`FULLY_SECURE` or complete log privacy verification.

Verification status: source/static review complete;
`MANUAL_CHECK_REQUIRED` for deployed log sinks and retention/access policy.
