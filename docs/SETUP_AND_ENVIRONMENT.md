# Setup and Environment

Prerequisites: Node.js/npm, SQL Server access, and Git. Clone the repository, run `npm install` separately in `backend/` and `frontend/`, configure a local ignored `backend/.env`, and check the selected database with `npm run db:migrate:status` from `backend/`.

Keep `backend/.env` local and ignored. `.env.example` must contain placeholders only. Never copy real values into docs, commits, issues, or logs.

| Group | Variable names | Purpose |
|---|---|---|
| Server | `PORT`, `NODE_ENV` | API port and runtime mode |
| Database | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_TRUSTED_CONNECTION`, `DB_TRUST_SERVER_CERTIFICATE` | SQL Server connection mode/target |
| JWT | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES`, `JWT_ISSUER`, `JWT_AUDIENCE` | Token signing, validation and lifetime |
| CORS/session | `CORS_ORIGIN`, `REDIS_URL` | Allowed frontend and optional Redis session/rate-limit backing |
| Upload | `UPLOAD_DIR`, `MAX_FILE_SIZE` | Upload location and byte limit |
| Backup | `BACKUP_DIR`, `BACKUP_RETENTION_DAYS` | Local backup location/retention |
| Legacy mail | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Legacy membership/module SMTP |
| Product Order mail | `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USER`, `MAIL_APP_PASSWORD`, `ADMIN_NOTIFICATION_EMAIL` | Order notification transport/readiness |
| Bank | `BANK_NAME`, `BANK_ACCOUNT_NAME`, `BANK_ACCOUNT_NUMBER`, `BANK_QR_IMAGE_URL` | Manual bank-transfer instructions/readiness |
| Order | `ORDER_RESERVATION_MINUTES`, `ORDER_EXPIRATION_CRON` | Reservation deadline and expiration schedule |
| Acceptance only | `MAIL_MODE=acceptance` | Deterministic no-network mail adapter; requires `NODE_ENV=test` and a guarded acceptance DB name |
| Marketplace limits | `SELLER_APPLICATION_*_RATE_LIMIT_MAX`, `SELLER_APPLICATION_*_RATE_LIMIT_WINDOW_MS`, `BRAND_REQUEST_RATE_LIMIT_MAX`, `BRAND_REQUEST_RATE_LIMIT_WINDOW_MS` | Backend user+IP mutation thresholds |

`MAIL_*` is deliberately separate from legacy `SMTP_*`. For Gmail, use an App Password, not the normal Gmail login password. Common transport combinations are port 465 with secure enabled or port 587 with secure disabled; use provider requirements. `MAIL_SECURE` must be exactly `true` or `false` and ports must be valid.

`BANK_QR_IMAGE_URL` must be a public root-relative path (for example a deployed `/image/...` asset) or HTTPS URL. Windows paths, protocol-relative URLs and `file:`, `javascript:` or `data:` schemes are invalid.

Start locally with `npm run dev` in both `backend/` and `frontend/`. Production scripts verified from package files are backend `npm run build` then `npm start`, and frontend `npm run build` then `npm run preview`.

Troubleshooting: verify `/api/health`, `CORS_ORIGIN`, JWT expiry, SQL Server host/database identity, upload directory permissions and the distinction between `MAIL_*` readiness and legacy `SMTP_*`. Never print the environment file while diagnosing.

Acceptance uses a separately verified isolated `DB_NAME`; temporary services must be stopped and the database dropped after acceptance.

SELLER-013 commands from `backend/` are `npm run acceptance:seller-013:final -- <security|historical|marketplace|legacy|integrity|all>`. The direct security entry point additionally requires `SELLER013_SECURITY_ACCEPTANCE=1`. Historical backfill uses `npm run db:migrate -- --historical-pre-0105` only on a disposable database, seeds the pre-0105 row, and then migrates forward. Never use partial migration modes to mutate the canonical database.

Canonical migration operations require a verified SQL Server backup outside the workspace before applying a pending migration. Do not log credentials, tokens or environment contents.

Set `CORS_ORIGIN` to an exact comma-separated allowlist; bearer-token mode does not use browser sessions. Never log access/refresh tokens or any environment secret.
