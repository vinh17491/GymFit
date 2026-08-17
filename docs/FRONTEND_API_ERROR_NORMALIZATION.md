# Frontend API Error Normalization

PHASE 69 records the frontend error boundary used for requests through the
shared Axios client.

## Boundary

- `frontend/src/api/error.ts` exposes `normalizeApiError`, `apiErrorMessage`
  and `safeDisplayMessage`.
- The normalized representation keeps only a numeric status, an allowlisted
  code, a safe user-facing message and validated field errors.
- HTML, SQL-like diagnostics, stack traces, JWT/token text, credentials,
  cookies, provider exceptions and internal-server details are replaced with
  safe status or network messages.
- The Axios response interceptor sanitizes rejected errors locally before they
  reach existing page code. This preserves existing API response shapes while
  preventing legacy `response.data.message` and `error.message` paths from
  exposing raw backend diagnostics.
- Direct exercise/video requests now use the shared `api` client instead of a
  separate hardcoded Axios client, so they share the same timeout, credentials,
  refresh and error boundary.

## Consumer policy

- `useApi`, `ErrorState`, `productsStore` and `notificationsStore` use the
  shared representation directly.
- Existing page-specific fallbacks and field-level handling remain in place;
  they receive the sanitized rejection object and API contracts are unchanged.
- No raw error is logged or sent to the user by this boundary.

## Verification limits

- `git diff --check` is the available static check for this phase.
- The frontend build remains environment-blocked when `vite` is unavailable;
  no dependency installation was performed automatically.
- Browser behavior remains `MANUAL_CHECK_REQUIRED`.
- No automated or business test was added or run.
