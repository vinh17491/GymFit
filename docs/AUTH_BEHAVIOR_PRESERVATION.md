# Auth Behavior Preservation

Status: PHASE 25 CHECKPOINT / AUTH BEHAVIOR PRESERVED, REFRESH COOKIE TRANSPORT ADDED

This document records the backend Auth behavior that later transport hardening
must preserve. It is a source-level contract, not a claim that live database or
browser verification has been performed.

## Registration

- Email is trimmed and normalized to lowercase.
- Passwords are bcrypt-hashed with the current cost factor before storage.
- New users are created as `member`, active, with `token_version = 0`.
- Referral handling and user/session creation are in the registration
  transaction; a failed transaction is rolled back.
- Registration creates a hashed refresh-session record, sets the HttpOnly
  refresh cookie and returns the access token plus user data. The opaque refresh
  value is not returned to frontend JavaScript.

## Login and access authorization

- Login compares against a dummy bcrypt hash when the user is absent, then
  rejects invalid credentials or inactive users with the existing generic
  response.
- Access JWT claims include authenticated user identity, role, `tokenVersion`
  and `sessionId`; issuer, audience, algorithm and expiry remain configured
  through the existing backend config.
- `authenticate` requires the Bearer header, verifies the JWT, then performs a
  live database check for the user, `AuthSessions` row, active state,
  `token_version`, session expiry/revocation and active Coach status.
- `authorize(...)` remains the backend role gate. Frontend guards are UX only.
- Resource services must continue deriving ownership and scope from `req.user`
  and server-side queries, never from an untrusted client identity field.

## Refresh rotation and replay detection

- The refresh endpoint reads the opaque token from the configured HttpOnly
  cookie. PHASE 25 changed only this transport boundary; the AuthSessions
  lookup, rotation and replay semantics remain unchanged.
- Refresh tokens are random opaque values; only SHA-256 hashes are stored in
  `AuthSessions`.
- Refresh lookup and rotation run in a serializable transaction with row/key
  locking. A successful refresh inserts the next session record, revokes the
  old record and links `replaced_by_session_id` within the same transaction.
- A missing, expired or inactive session is rejected. Reuse of a revoked token
  is treated as replay and revokes the complete token family.
- `token_family`, expiry, revocation, replacement and last-used fields remain
  part of the session contract.

## Revocation behavior

- Logout revokes the authenticated session by both session ID and user ID and
  remains idempotent through the existing `COALESCE` update.
- Password change increments `Users.token_version` and revokes all user
  sessions, invalidating prior access and refresh credentials.
- Admin security changes and Seller promotion preserve the existing
  token-version/session-revocation behavior.
- Inactive users and suspended/inactive Coaches fail the live authentication
  query even if a JWT has not expired.

## Transport transition guardrails

The later refresh transport change must preserve all behavior above. It must not
rewrite the Auth model, remove `AuthSessions`, weaken role/ownership checks or
accept user identity from a prompt, frontend field or tool argument. The planned
cookie flow is separately scoped to PHASE 24–28 and must review:

- Axios `withCredentials`;
- backend CORS `credentials:true`;
- explicit origin allowlist with no wildcard when credentials are enabled;
- deployment-topology-dependent SameSite/Secure policy;
- Origin/CSRF boundaries on refresh and logout;
- concurrent refresh race/infinite-loop behavior.

The current frontend token persistence remains a PHASE 23–28 concern and is not
presented as final security evidence here.

## Verification status

- Source/static review: recorded through PHASE 28.
- Database migration execution: not run.
- Auth API/browser verification: `MANUAL_CHECK_REQUIRED`; checklist:
  `docs/AUTH_MANUAL_CHECKLIST.md`.
- No business acceptance, integrity or new automated test suite was created or
  executed.
