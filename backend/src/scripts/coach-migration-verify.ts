import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { closePool, getPool } from '../config/database';

const coachBoundaryStart = '0010';
const coachBoundaryEnd = '0099';

async function main(): Promise<void> {
  if (process.env.COACH_BOOKING_ACCEPTANCE !== '1' && process.env.COACH_FINAL_CLOSURE_ACCEPTANCE !== '1') {
    throw new Error('COACH_BOOKING_ACCEPTANCE=1 or COACH_FINAL_CLOSURE_ACCEPTANCE=1 is required');
  }
  const pool = await getPool();
  const migrationDir = path.resolve(__dirname, '../../../db/migrations');
  const files = (await fs.readdir(migrationDir)).filter(file => /^\d{4}_.+\.sql$/i.test(file)).sort();
  const migrations = files.map(filename => ({ version: filename.slice(0, 4), filename }));
  const rows = await pool.request().query<{ version: string; name: string; checksum: string }>(
    'SELECT version,name,checksum FROM dbo.SchemaMigrations ORDER BY version',
  );
  const stored = new Map(rows.recordset.map(row => [row.version, row]));
  const pending = migrations.filter(migration => !stored.has(migration.version)).map(migration => migration.version);
  const mismatches: string[] = [];
  for (const migration of migrations) {
    const checksum = createHash('sha256').update(await fs.readFile(path.join(migrationDir, migration.filename))).digest('hex');
    const row = stored.get(migration.version);
    if (row && row.checksum !== checksum) mismatches.push(migration.version);
  }
  const coachPending = pending.filter(version => version >= coachBoundaryStart && version <= coachBoundaryEnd);
  const coachMismatches = mismatches.filter(version => version >= coachBoundaryStart && version <= coachBoundaryEnd);

  const object = await pool.request().query<{
    database_name: string;
    coach_profiles: number;
    coach_availability_rules: number;
    coach_availability_exceptions: number;
    plan_entitlements: number;
    coach_member_contexts: number;
    notifications: number;
    workout_programs: number;
    booking_session_mode: number;
    booking_location: number;
    booking_snapshot_check: number;
    notification_recipient_user_id: number;
    notification_action_url: number;
    notification_read_at: number;
    notification_deduplication_key: number;
    workout_root_program_id: number;
    workout_version_number: number;
    workout_lifecycle_status: number;
    workout_published_at: number;
    workout_cloned_from_program_id: number;
    unique_indexes: number;
    availability_indexes: number;
    plan_entitlement_indexes: number;
    context_indexes: number;
    performance_indexes: number;
    required_foreign_keys: number;
    required_unique_constraints: number;
    required_check_constraints: number;
    priority_rows: number;
  }>(
    `SELECT DB_NAME() AS database_name,
            CASE WHEN OBJECT_ID(N'dbo.CoachProfiles',N'U') IS NULL THEN 0 ELSE 1 END AS coach_profiles,
            CASE WHEN OBJECT_ID(N'dbo.CoachAvailabilityRules',N'U') IS NULL THEN 0 ELSE 1 END AS coach_availability_rules,
            CASE WHEN OBJECT_ID(N'dbo.CoachAvailabilityExceptions',N'U') IS NULL THEN 0 ELSE 1 END AS coach_availability_exceptions,
            CASE WHEN OBJECT_ID(N'dbo.PlanEntitlements',N'U') IS NULL THEN 0 ELSE 1 END AS plan_entitlements,
            CASE WHEN OBJECT_ID(N'dbo.CoachMemberContexts',N'U') IS NULL THEN 0 ELSE 1 END AS coach_member_contexts,
            CASE WHEN OBJECT_ID(N'dbo.Notifications',N'U') IS NULL THEN 0 ELSE 1 END AS notifications,
            CASE WHEN OBJECT_ID(N'dbo.WorkoutPrograms',N'U') IS NULL THEN 0 ELSE 1 END AS workout_programs,
            (SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.Bookings') AND name=N'session_mode') AS booking_session_mode,
            (SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.Bookings') AND name=N'location') AS booking_location,
            (SELECT COUNT(*) FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'dbo.Bookings') AND name=N'CK_Bookings_SessionMode') AS booking_snapshot_check,
            (SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.Notifications') AND name=N'recipient_user_id') AS notification_recipient_user_id,
            (SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.Notifications') AND name=N'action_url') AS notification_action_url,
            (SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.Notifications') AND name=N'read_at') AS notification_read_at,
            (SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.Notifications') AND name=N'deduplication_key') AS notification_deduplication_key,
            (SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.WorkoutPrograms') AND name=N'root_program_id') AS workout_root_program_id,
            (SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.WorkoutPrograms') AND name=N'version_number') AS workout_version_number,
            (SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.WorkoutPrograms') AND name=N'lifecycle_status') AS workout_lifecycle_status,
            (SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.WorkoutPrograms') AND name=N'published_at') AS workout_published_at,
            (SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.WorkoutPrograms') AND name=N'cloned_from_program_id') AS workout_cloned_from_program_id,
            (SELECT COUNT(*) FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.CoachProfiles') AND is_unique=1) AS unique_indexes,
            (SELECT COUNT(*) FROM sys.indexes WHERE object_id IN (OBJECT_ID(N'dbo.CoachAvailabilityRules'),OBJECT_ID(N'dbo.CoachAvailabilityExceptions')) AND name IN (N'IX_CoachAvailabilityRules_CoachDayActive',N'IX_CoachAvailabilityExceptions_CoachDateActive')) AS availability_indexes,
            (SELECT COUNT(*) FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.PlanEntitlements') AND name=N'IX_PlanEntitlements_KeyValue') AS plan_entitlement_indexes,
            (SELECT COUNT(*) FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.CoachMemberContexts') AND name=N'IX_CoachMemberContexts_MemberUpdated') AS context_indexes,
            (SELECT COUNT(*) FROM sys.indexes WHERE name IN (N'IX_CRMCustomers_AssignedCoachUser',N'IX_Users_RoleActiveName',N'IX_Bookings_CoachStatusDate',N'IX_Bookings_MemberStatusDate',N'IX_Memberships_UserStatusDates')) AS performance_indexes,
            (SELECT COUNT(*) FROM sys.foreign_keys WHERE name IN (N'FK_CoachProfiles_Coach',N'FK_CoachAvailabilityRules_Coach',N'FK_CoachAvailabilityExceptions_Coach',N'FK_PlanEntitlements_Plan',N'FK_CoachMemberContexts_Coach',N'FK_CoachMemberContexts_Member',N'FK_Notifications_RecipientUser')) AS required_foreign_keys,
            (SELECT COUNT(*) FROM sys.key_constraints WHERE name IN (N'UQ_CoachProfiles_Coach',N'UQ_CoachAvailabilityRules_Exact',N'UQ_CoachAvailabilityExceptions_Exact',N'UQ_PlanEntitlements_PlanKey',N'UQ_CoachMemberContexts_CoachMember')) AS required_unique_constraints,
            (SELECT COUNT(*) FROM sys.check_constraints WHERE name IN (N'CK_CoachProfiles_SessionMode',N'CK_CoachAvailabilityRules_Mode',N'CK_CoachAvailabilityExceptions_Mode',N'CK_PlanEntitlements_Key',N'CK_PlanEntitlements_Value',N'CK_CoachMemberContexts_DifferentUsers',N'CK_Bookings_SessionMode')) AS required_check_constraints,
            (SELECT COUNT(*) FROM dbo.PlanEntitlements WHERE entitlement_key=N'COACH_PRIORITY_BOOKING') AS priority_rows`,
  );

  const row = object.recordset[0];
  const requiredShape = {
    coach_profiles: Number(row.coach_profiles) === 1,
    coach_availability_rules: Number(row.coach_availability_rules) === 1,
    coach_availability_exceptions: Number(row.coach_availability_exceptions) === 1,
    plan_entitlements: Number(row.plan_entitlements) === 1,
    coach_member_contexts: Number(row.coach_member_contexts) === 1,
    notifications: Number(row.notifications) === 1,
    workout_programs: Number(row.workout_programs) === 1,
    booking_snapshot: Number(row.booking_session_mode) === 1 && Number(row.booking_location) === 1 && Number(row.booking_snapshot_check) === 1,
    notification_columns: [row.notification_recipient_user_id, row.notification_action_url, row.notification_read_at, row.notification_deduplication_key].every(value => Number(value) === 1),
    workout_version_columns: [row.workout_root_program_id, row.workout_version_number, row.workout_lifecycle_status, row.workout_published_at, row.workout_cloned_from_program_id].every(value => Number(value) === 1),
    indexes: Number(row.unique_indexes) >= 1 && Number(row.availability_indexes) === 2 && Number(row.plan_entitlement_indexes) === 1 && Number(row.context_indexes) === 1 && Number(row.performance_indexes) === 5,
    foreign_keys: Number(row.required_foreign_keys) === 7,
    unique_constraints: Number(row.required_unique_constraints) === 5,
    check_constraints: Number(row.required_check_constraints) === 7,
    priority_contract: Number(row.priority_rows) === 0,
  };
  const missingShape = Object.entries(requiredShape).filter(([, present]) => !present).map(([name]) => name);
  const evidence = {
    ...row,
    applied: rows.recordset.length,
    pending,
    coach_pending: coachPending,
    checksum_mismatches: mismatches,
    coach_checksum_mismatches: coachMismatches,
    required_shape: requiredShape,
    missing_shape: missingShape,
    migration_0010: stored.get('0010') ? 'APPLIED' : 'PENDING',
  };
  console.log(`COACH_MIGRATION_VERIFY ${JSON.stringify(evidence)}`);
  if (coachPending.length !== 0 || mismatches.length !== 0 || missingShape.length !== 0) throw new Error('Coach migration verification failed');
}

main()
  .catch(error => {
    console.error('[COACH MIGRATION VERIFY FAIL]', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => { await closePool(); });
