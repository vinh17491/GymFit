import type * as sql from 'mssql';
import { closePool, query } from '../config/database';
import { config } from '../config/config';

if (process.env.REGRESSION02_CANONICAL_READONLY !== '1') {
  throw new Error('REGRESSION02_CANONICAL_READONLY=1 is required');
}
if (config.db.database !== 'GYMFIT_DB') {
  throw new Error('Canonical read-only integrity check requires GYMFIT_DB');
}

async function main() {
  const summary = await query(`
    SELECT DB_NAME() database_name,
      (SELECT COUNT(*) FROM dbo.Users) users,
      (SELECT COUNT(*) FROM dbo.Users WHERE role IS NULL OR role NOT IN(N'member',N'coach',N'admin',N'seller')) invalid_roles,
      (SELECT COUNT(*) FROM dbo.Users WHERE NULLIF(LTRIM(RTRIM(email)),N'') IS NULL) empty_emails,
      (SELECT COUNT(*) FROM (
        SELECT LOWER(LTRIM(RTRIM(email))) normalized_email FROM dbo.Users
        GROUP BY LOWER(LTRIM(RTRIM(email))) HAVING COUNT(*)>1
      ) duplicates) duplicate_normalized_emails,
      (SELECT COUNT(*) FROM dbo.Users WHERE NULLIF(password,N'') IS NULL) missing_passwords,
      (SELECT COUNT(*) FROM dbo.Users WHERE LEN(password)<50) short_password_values,
      (SELECT COUNT(*) FROM dbo.Users WHERE is_active NOT IN(0,1)) invalid_active_status,
      (SELECT COUNT(*) FROM dbo.AuthSessions) sessions,
      (SELECT COUNT(*) FROM dbo.AuthSessions s LEFT JOIN dbo.Users u ON u.id=s.user_id WHERE u.id IS NULL) orphan_sessions,
      (SELECT COUNT(*) FROM dbo.Users u WHERE u.role=N'seller'
        AND NOT EXISTS(SELECT 1 FROM dbo.Shops s WHERE s.owner_user_id=u.id)) sellers_without_shop,
      (SELECT COUNT(*) FROM dbo.Users WHERE email LIKE N'%REGRESSION-02%') regression02_users,
      (SELECT COUNT(*) FROM sys.databases WHERE name LIKE N'GYMFIT_REGRESSION_02_%') leftover_regression02_databases`);
  const metadata = await query(`
    SELECT SUM(CASE WHEN is_disabled=1 OR is_not_trusted=1 THEN 1 ELSE 0 END) bad_checks
    FROM sys.check_constraints
    WHERE parent_object_id IN(OBJECT_ID(N'dbo.Users'),OBJECT_ID(N'dbo.AuthSessions'));
    SELECT SUM(CASE WHEN is_disabled=1 OR is_not_trusted=1 THEN 1 ELSE 0 END) bad_fks
    FROM sys.foreign_keys
    WHERE parent_object_id IN(OBJECT_ID(N'dbo.Users'),OBJECT_ID(N'dbo.AuthSessions'));
    SELECT i.name,i.is_unique
    FROM sys.indexes i
    JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id
    JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
    WHERE i.object_id=OBJECT_ID(N'dbo.Users') AND c.name=N'email'
    ORDER BY i.is_unique DESC,i.name`);
  const sets=metadata.recordsets as sql.IRecordSet<any>[];
  console.log(`REGRESSION02_CANONICAL_AUTH_INTEGRITY ${JSON.stringify({
    summary: summary.recordset[0],
    checks: sets[0][0],
    foreignKeys: sets[1][0],
    emailIndexes: sets[2],
  })}`);
}

main()
  .finally(closePool)
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Canonical integrity check failed');
    process.exitCode = 1;
  });
