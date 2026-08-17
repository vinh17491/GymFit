# Sanitization Boundary

Status: PHASE 31 CHECKPOINT / SOURCE REVIEW ONLY

This document records the current input/output boundary. It is not a claim of
complete XSS prevention or full security verification.

## Primary controls

- Route-level Zod schemas validate structured body, query and parameter input
  where the current route has a schema.
- SQL access uses parameterized queries and service/repository boundaries.
- React renders ordinary text through its escaping behavior; no new
  `dangerouslySetInnerHTML` sink is introduced by this task.
- PHASE 30 CSP restricts scripts to same-origin sources and blocks inline
  script attributes.
- URL, image, upload and other browser-sensitive values require
  context-specific validation at the owning feature boundary. A generic regex
  cannot replace that decision.

## Generic middleware limitation

`backend/src/middleware/sanitize.ts` remains a defense-in-depth normalizer for
legacy routes. Its markup/protocol stripping is not treated as the primary XSS
control and must not be described as complete sanitization.

Password, access-token, refresh-token, CSRF-token, API-key, secret and cookie
fields are opaque: the generic normalizer does not trim or rewrite them. The
same rule covers common snake_case spellings and case variants.

Do not log, echo or render these values. Authentication uses HttpOnly refresh
cookies and runtime access tokens; user identity and authorization still come
from the backend session/JWT boundary.

## Verification status

- Source/reference review: complete for PHASE 31.
- Browser/security verification: `MANUAL_CHECK_REQUIRED`.
- No automated tests were created or executed.
