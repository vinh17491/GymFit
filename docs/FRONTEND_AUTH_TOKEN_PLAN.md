# Frontend Auth Token Transition Plan

Status: PHASE 28 CHECKPOINT / LOGOUT AND SESSION CLEANUP

## Current implementation

- `frontend/src/stores/authStore.ts` keeps the access token in the Axios
  module's runtime memory. Legacy `token` and `refreshToken` localStorage
  values are removed when the bundle loads; no new Auth token is persisted.
- `initUser()` uses the HttpOnly refresh-cookie path when no runtime access
  token exists, then calls `/auth/me`. Invalid or missing cookie sessions are
  cleared safely.
- `frontend/src/api/axios.ts` reads the runtime access token before each
  request and sends `Authorization: Bearer ...`.
- A `401` response triggers one retry per request through a shared
  `refreshPromise`; the refresh request uses a separate credentialed Axios
  client with the same 15-second timeout and sends no refresh-token body field.
- Login, registration, refresh and logout are excluded from the automatic
  retry path. `_retry` prevents an infinite loop if the retried request also
  receives `401`.
- A successful refresh writes only the new access token to runtime memory. The
  rotated refresh token is returned only in the `Set-Cookie` response header
  and is inaccessible to frontend JavaScript.
  A failed refresh clears auth state and invokes the store failure handler.
- `logout()` uses the current access token when available. If the runtime token
  is missing or expired, it uses the HttpOnly refresh path once before calling
  `/auth/logout`; the backend revokes the session and clears the cookie. The
  frontend always clears runtime auth state and user state in `finally`.
  Product/cart initialization is reset independently and must not be confused
  with Auth persistence.

## Current risks and constraints

- The refresh token is no longer readable by browser JavaScript. A page reload
  now depends on a valid browser cookie and a reachable backend refresh path;
  if either is unavailable, the user is safely treated as signed out.
- Concurrent expired requests share one refresh request. A failed refresh
  clears runtime auth once and notifies the auth store once; a later successful
  login or refresh resets that notification guard.
- The existing single-flight refresh promise prevents duplicate refresh calls
  inside one page instance, but multi-tab coordination is not a new feature
  requirement and must not be redesigned without evidence.
- `_retry` prevents an infinite request loop. Any transport replacement must
  preserve this bound and the existing auth-failure callback.
- The backend response returns access token and user data; refresh rotation is
  conveyed through `Set-Cookie`. Auth behavior and `AuthSessions` semantics
  remain intact while only refresh transport changes.
- `sessionStorage` used by pending membership-plan navigation and chatbot
  storage is unrelated to Auth token persistence and must not be cleared by
  token migration work.

## Sequential transition plan

1. **PHASE 24 — remove refresh token from frontend JavaScript storage**
   Identify every refresh-token read/write/clear site and remove only the
   refresh-token persistence path. Do not rewrite Auth or remove access-token
   runtime behavior before its assigned phase.
2. **PHASE 25 — HttpOnly refresh cookie and transport boundary**
   Backend sets/clears the refresh cookie; Axios uses `withCredentials`;
   backend CORS enables credentials with an explicit origin allowlist and no
   wildcard. SameSite/Secure is selected from deployment topology. Review
   Origin/CSRF boundaries for refresh and logout.
3. **PHASE 26 — access token runtime storage (current)**
   Keep the access token in memory only. Initialization/reload uses the cookie
   refresh path when valid; no access or refresh token is written to browser
   persistent storage.
4. **PHASE 27 — refresh/retry flow (current)**
   Preserve `401 -> refresh -> new access token -> retry`, the single-flight
   race guard and the one-retry loop bound. Treat refresh failure as a safe
   session transition, not a crash.
5. **PHASE 28 — logout/session cleanup (current)**
   Revoke the backend session, clear the cookie server-side, clear in-memory
   access state and clear frontend user state. If an expired access token is
   encountered, allow one cookie-backed restoration before logout.

No phase may change public frontend URLs, backend RBAC, `tokenVersion`,
`AuthSessions`, rotation, replay detection, inactive-user checks or ownership
behavior. Manual Auth verification remains `MANUAL_CHECK_REQUIRED`.
