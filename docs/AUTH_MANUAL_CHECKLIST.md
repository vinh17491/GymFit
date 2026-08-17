# Auth Manual Verification Checklist

Status: `MANUAL_CHECK_REQUIRED`

This checklist is a human/browser verification artifact for the PHASE 29
checkpoint. It is not an automated test and does not claim that any item has
passed. Use only an approved development or disposable environment. Do not
use an unverified canonical database, and do not copy tokens, cookies,
passwords or private response data into notes or logs.

## Environment and transport

- [ ] `MANUAL_CHECK_REQUIRED` — Confirm the browser is using the intended
  frontend origin and the backend `CORS_ORIGIN` allowlist contains that exact
  origin.
- [ ] `MANUAL_CHECK_REQUIRED` — Confirm the current deployment topology before
  judging SameSite behavior. Same-site deployments should use the configured
  Lax policy when appropriate; cross-site deployments require an explicit
  review of `SameSite=None; Secure`.
- [ ] `MANUAL_CHECK_REQUIRED` — Confirm login/register responses expose an
  access token only to the current frontend response handling and do not expose
  the refresh token in JSON. Inspect cookie attributes without copying values:
  HttpOnly, Path `/api/auth`, configured SameSite and configured Secure.
- [ ] `MANUAL_CHECK_REQUIRED` — Confirm a disallowed Origin does not receive a
  credentialed CORS response and refresh/logout are rejected by the Origin
  boundary.

## Registration and login

- [ ] `MANUAL_CHECK_REQUIRED` — Register a new disposable member account. Check
  the expected user state, access-token runtime behavior and refresh cookie.
- [ ] `MANUAL_CHECK_REQUIRED` — Log in with valid credentials and confirm the
  authenticated UI loads.
- [ ] `MANUAL_CHECK_REQUIRED` — Try invalid credentials and an inactive test
  account. Confirm the safe generic auth response and no authenticated UI.
- [ ] `MANUAL_CHECK_REQUIRED` — Confirm frontend role guards only affect UX;
  verify backend authorization remains the authority for protected data.

## Reload, refresh and race behavior

- [ ] `MANUAL_CHECK_REQUIRED` — Reload while authenticated. Confirm the app
  restores through the refresh cookie and `/auth/me` without requiring a
  persistent access token.
- [ ] `MANUAL_CHECK_REQUIRED` — Let an access token expire or use an approved
  controlled dev setup to trigger `401`. Confirm one cookie refresh obtains a
  new access token and retries the original request once.
- [ ] `MANUAL_CHECK_REQUIRED` — Trigger multiple protected requests around the
  same expiry. Confirm they share one refresh request and do not loop.
- [ ] `MANUAL_CHECK_REQUIRED` — Use an invalid, expired or replayed refresh
  cookie in the approved environment. Confirm the cookie is cleared and the
  user is moved safely to signed-out state without raw provider/technical
  details.

## Logout and revocation

- [ ] `MANUAL_CHECK_REQUIRED` — Log out normally. Confirm backend logout is
  credentialed, the current AuthSessions row is revoked, the refresh cookie is
  cleared, runtime access state is cleared and the UI is signed out.
- [ ] `MANUAL_CHECK_REQUIRED` — Log out after access expiry but while the
  refresh cookie is valid. Confirm the cookie-backed restoration/logout path
  revokes the session and the next reload remains signed out.
- [ ] `MANUAL_CHECK_REQUIRED` — After logout, call a previously authorized UI
  action and reload. Confirm backend authorization fails and no session is
  silently restored.
- [ ] `MANUAL_CHECK_REQUIRED` — Change password or revoke a session in the
  approved environment. Confirm the old access and refresh credentials no
  longer authenticate.
- [ ] `MANUAL_CHECK_REQUIRED` — Change a disposable user's role or inactive
  state through the existing authorized flow. Confirm live authorization and
  refresh behavior reflect the backend state.

## Recording result

Until the user performs the browser checks above, retain exactly:

```text
MANUAL_CHECK_REQUIRED
```

Build, lint, typecheck, static inspection and this checklist cannot establish
`PRODUCTION_SAFE`, `PRODUCTION_READY`, `FULLY_SECURE` or `FULLY_VERIFIED`.
