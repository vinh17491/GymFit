# Setup and Environment

Prerequisites are Node.js/npm, SQL Server access and Git. Install dependencies
separately in `backend/` and `frontend/`, configure a local ignored
`backend/.env`, and verify the selected database target before any migration
operation.

Keep `backend/.env` local and ignored. `.env.example` contains placeholders
only. Never copy real values into docs, commits, issues or logs.

## Backend configuration

| Group | Variable names | Purpose |
|---|---|---|
| Server | `PORT`, `NODE_ENV`, `TRUST_PROXY` | API port, runtime mode and explicit reverse-proxy trust boundary |
| Database | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_TRUSTED_CONNECTION`, `DB_ENCRYPT`, `DB_TRUST_SERVER_CERTIFICATE` | SQL Server connection mode, encryption policy and explicit target |
| JWT | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES`, `JWT_ISSUER`, `JWT_AUDIENCE` | Token signing, validation and lifetime |
| CORS/session support | `CORS_ORIGIN`, `REFRESH_COOKIE_NAME`, `REFRESH_COOKIE_SAMESITE`, `REFRESH_COOKIE_SECURE`, `REDIS_URL`, `DISABLE_BACKGROUND_RUNNERS` | Explicit CORS allowlist, HttpOnly refresh-cookie policy, optional Redis backing and controlled runner lifecycle |
| Core rate limits | `API_RATE_LIMIT_*`, `AUTH_RATE_LIMIT_*`, `UPLOAD_RATE_LIMIT_*` | Centralized in-memory single-instance request thresholds |
| Upload | `UPLOAD_DIR`, `MAX_FILE_SIZE` | Upload location and byte limit |
| Backup | `BACKUP_DIR`, `BACKUP_RETENTION_DAYS` | Local backup location and retention |
| Legacy mail | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Legacy membership/module SMTP |
| Product Order mail | `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USER`, `MAIL_APP_PASSWORD`, `ADMIN_NOTIFICATION_EMAIL` | Order notification transport/readiness |
| Bank | `BANK_NAME`, `BANK_ACCOUNT_NAME`, `BANK_ACCOUNT_NUMBER`, `BANK_QR_IMAGE_URL` | Manual bank-transfer instructions/readiness |
| Order | `ORDER_RESERVATION_MINUTES`, `ORDER_EXPIRATION_CRON`, `ORDER_EXPIRATION_BATCH_SIZE`, `ORDER_EXPIRATION_INTERVAL_SECONDS` | Reservation and expiration runner settings |
| Marketplace limits | `SELLER_APPLICATION_*_RATE_LIMIT_MAX`, `SELLER_APPLICATION_*_RATE_LIMIT_WINDOW_MS`, `BRAND_REQUEST_RATE_LIMIT_MAX`, `BRAND_REQUEST_RATE_LIMIT_WINDOW_MS` | Backend user+IP mutation thresholds |

Rate-limit thresholds and windows are resolved once in
`backend/src/config/config.ts` and consumed by the individual limiters. The
default store is process memory: it is suitable for a single demo/staging
instance only and does not coordinate limits across multiple processes or
hosts. Redis is not added automatically; a distributed limiter requires a
separate operational decision.

The current config requires `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` when
`NODE_ENV=production`; development fallbacks are not production security
evidence. Set `DB_NAME` explicitly for every non-local target. The legacy
default database name is preserved for compatibility and must not be treated as
the canonical target without a read-only identity check.

`TRUST_PROXY` is disabled by default. If the API is behind a reviewed reverse
proxy, configure `loopback` or an explicit comma-separated proxy/CIDR value.
The configuration rejects bare `TRUST_PROXY=true`; forwarded IP, protocol and
secure-cookie decisions must not trust an unspecified network boundary.

SQL Server transport is environment-sensitive. Development defaults preserve
the current local setup (`DB_ENCRYPT=false` and certificate trust enabled when
not overridden). Production requires `DB_ENCRYPT=true` and rejects
`DB_TRUST_SERVER_CERTIFICATE=true`; use a certificate chain trusted by the
runtime instead. These settings do not prove that a live database connection
has been verified.

Helmet CSP now restricts executable scripts to same-origin sources and blocks
inline script attributes. The current React/Framer Motion UI still uses
dynamic style attributes, so `style-src` retains its narrowly documented
compatibility exception until a separate style migration is justified. This
is a PHASE 30 hardening boundary, not a claim of complete CSP verification.

`CORS_ORIGIN` is parsed as an explicit comma-separated origin allowlist. The
PHASE 25 transport sends the refresh cookie through Axios `withCredentials`;
backend CORS enables `credentials:true` and rejects wildcard origins. Refresh
and logout also require an `Origin` value in that explicit allowlist. The
current local Vite `/api` proxy is same-site, so development defaults to
`SameSite=Lax`; production must explicitly choose `REFRESH_COOKIE_SAMESITE`
for its actual deployment topology. `SameSite=None` is accepted only with
`REFRESH_COOKIE_SECURE=true`. This is a focused CSRF/Origin boundary review,
not a claim that a full CSRF framework is present.

`VITE_API_PROXY_TARGET` is a frontend development proxy target only. It must
not be treated as a production API authorization or CORS control. Production
deployment must provide an explicit frontend/backend topology and origin
configuration.

`UPLOAD_DIR` and `BACKUP_DIR` may be relative to the backend process working
directory. Verify their resolved locations and permissions before use; never
point them at a canonical database backup or business-data directory without an
approved operational decision.

`MAIL_*` is separate from legacy `SMTP_*`. For Gmail, use an App Password, not
the normal account password. `MAIL_MODE=acceptance` is test-only and must not be
enabled in production. `BANK_QR_IMAGE_URL` must be a root-relative public path
or HTTPS URL; Windows paths and `file:`, `javascript:` or `data:` schemes are
invalid.

## Assistant configuration

PHASE 72 consumes the following backend-only settings. AI provider keys never
belong in frontend VITE_* configuration:

- `AI_ENABLED`
- `AI_API_KEY`
- `AI_MODEL`
- `AI_TIMEOUT_MS`

`AI_BASE_URL` is optional when the provider implementation has a valid default
endpoint. A provider SDK or HTTP client may be used according to the existing
architecture; an unnecessary heavy dependency is not required. Never expose
`AI_API_KEY`, `VITE_AI_API_KEY`, `VITE_OPENAI_API_KEY` or equivalent secrets to
the frontend.

## Database initialization

The canonical empty-database sequence is operator-controlled and must target an
explicitly verified SQL Server database:

1. Create an empty SQL Server database outside this repository.
2. Configure `DB_HOST`, `DB_PORT`, `DB_NAME` and the remaining `DB_*` values in
   the ignored `backend/.env`.
3. From `backend/`, run `npm run db:bootstrap`.
4. Run `npm run db:migrate:status` and review the read-only result.
5. Run `npm run db:migrate` to apply the ordered chain.
6. Seed demo data only when an operator deliberately chooses it for an approved
   disposable target.

`db:bootstrap` is guarded and non-destructive: it creates foundation tables only,
does not create the database, does not create the migration ledger, does not run
migrations and does not insert demo data. It refuses an ambiguous or already
populated target. `db/schema.sql` is explicitly `DESTRUCTIVE`, `LEGACY`,
`NOT CANONICAL` and `NOT FOR SHARED DATABASE`; it is never the canonical install
path.
The repository has no canonical automatic demo-seed command. `db/schema.sql` and
`backend/seed_data.json` remain separate historical/data assets and require a
separate operator decision.

## Local commands

Start the backend and frontend separately after the database sequence:

```powershell
cd backend
npm install
npm run dev
```

```powershell
cd frontend
npm install
npm run dev
```

Static commands available for the current task are backend build/lint,
frontend build/typecheck where dependencies are installed, encoding/import/
secret scans and `git diff --check`. Do not use business acceptance,
integrity or test scripts as automatic evidence under the current execution
policy.

Troubleshooting may inspect `/api/health`, CORS configuration, JWT expiry,
SQL Server host/database identity, upload permissions and mail readiness, but
must not print `.env`, credentials, tokens, cookies, raw provider errors or
private conversation data.

Manual browser and deployment verification remains `MANUAL_CHECK_REQUIRED`.
