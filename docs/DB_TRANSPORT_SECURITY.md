# Database Transport Security

Status: PHASE 34 CHECKPOINT / CONFIGURATION BOUNDARY

- `DB_ENCRYPT` is parsed as an explicit boolean. It defaults to `false` in
  development and `true` in production.
- Production startup rejects `DB_ENCRYPT=false`.
- `DB_TRUST_SERVER_CERTIFICATE` defaults to `true` for the existing local
  development setup and `false` in production.
- Production startup rejects `DB_TRUST_SERVER_CERTIFICATE=true`; production
  must use a certificate chain trusted by the runtime rather than bypassing
  certificate validation.
- The same transport policy is applied to trusted Windows connections and SQL
  authentication. It does not change the database name, schema or migration
  chain.

Verification status: source/static review complete;
`MANUAL_CHECK_REQUIRED` for the actual SQL Server certificate and network
configuration. No database connection or migration was run by this phase.
