import { getPool, sql } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import type {
  AdminSellerApplicationFilters,
  SellerApplication,
  SellerApplicationHistory,
  SellerApplicationInput,
  SellerApplicationStatus,
} from './seller-applications.types';
import { createSellerShopInTransaction } from '../shops/shops.service';

const editableStatuses: SellerApplicationStatus[] = ['DRAFT', 'REJECTED', 'WITHDRAWN'];
const submitStatuses: SellerApplicationStatus[] = ['DRAFT', 'REJECTED', 'WITHDRAWN'];
const applicationColumns = `
  sa.id,sa.user_id AS userId,sa.status,sa.business_name AS businessName,sa.business_type AS businessType,
  sa.contact_name AS contactName,sa.contact_email AS contactEmail,sa.contact_phone AS contactPhone,
  sa.business_address AS businessAddress,sa.pickup_address AS pickupAddress,sa.tax_code AS taxCode,
  sa.website_url AS websiteUrl,sa.social_url AS socialUrl,sa.description,sa.review_reason AS reviewReason,
  sa.submitted_at AS submittedAt,sa.reviewed_at AS reviewedAt,sa.reviewed_by_user_id AS reviewedByUserId,
  sa.created_at AS createdAt,sa.updated_at AS updatedAt,
  u.id AS applicantId,u.name AS applicantName,u.email AS applicantEmail,u.role AS applicantRole,u.is_active AS applicantActive`;
const applicationFrom = `FROM dbo.SellerApplications sa JOIN dbo.Users u ON u.id=sa.user_id`;
const applicationSelect = `SELECT ${applicationColumns} ${applicationFrom}`;

const fieldMap: Record<keyof SellerApplicationInput, { column: string; type: (() => sql.ISqlTypeFactoryWithLength) | sql.ISqlTypeFactoryWithLength; length?: number }> = {
  businessName: { column: 'business_name', type: sql.NVarChar, length: 200 },
  businessType: { column: 'business_type', type: sql.NVarChar, length: 30 },
  contactName: { column: 'contact_name', type: sql.NVarChar, length: 200 },
  contactEmail: { column: 'contact_email', type: sql.NVarChar, length: 255 },
  contactPhone: { column: 'contact_phone', type: sql.NVarChar, length: 50 },
  businessAddress: { column: 'business_address', type: sql.NVarChar, length: 500 },
  pickupAddress: { column: 'pickup_address', type: sql.NVarChar, length: 500 },
  taxCode: { column: 'tax_code', type: sql.NVarChar, length: 50 },
  websiteUrl: { column: 'website_url', type: sql.NVarChar, length: 500 },
  socialUrl: { column: 'social_url', type: sql.NVarChar, length: 500 },
  description: { column: 'description', type: sql.NVarChar, length: 2000 },
};

function text(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function mapApplication(row: Record<string, unknown>): SellerApplication {
  return {
    id: Number(row.id),
    userId: Number(row.userId),
    status: row.status as SellerApplicationStatus,
    businessName: row.businessName ? String(row.businessName) : null,
    businessType: row.businessType as SellerApplication['businessType'],
    contactName: row.contactName ? String(row.contactName) : null,
    contactEmail: row.contactEmail ? String(row.contactEmail) : null,
    contactPhone: row.contactPhone ? String(row.contactPhone) : null,
    businessAddress: row.businessAddress ? String(row.businessAddress) : null,
    pickupAddress: row.pickupAddress ? String(row.pickupAddress) : null,
    taxCode: row.taxCode ? String(row.taxCode) : null,
    websiteUrl: row.websiteUrl ? String(row.websiteUrl) : null,
    socialUrl: row.socialUrl ? String(row.socialUrl) : null,
    description: row.description ? String(row.description) : null,
    reviewReason: row.reviewReason ? String(row.reviewReason) : null,
    submittedAt: row.submittedAt as Date | null,
    reviewedAt: row.reviewedAt as Date | null,
    reviewedByUserId: row.reviewedByUserId == null ? null : Number(row.reviewedByUserId),
    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
    applicant: {
      id: Number(row.applicantId),
      name: String(row.applicantName),
      email: String(row.applicantEmail),
      role: String(row.applicantRole),
      isActive: Boolean(row.applicantActive),
    },
    history: [],
  };
}

async function history(request: sql.Request, applicationId: number): Promise<SellerApplicationHistory[]> {
  const result = await request.input('historyApplicationId', sql.Int, applicationId).query(`
    SELECT h.id,h.from_status AS fromStatus,h.to_status AS toStatus,h.actor_user_id AS actorUserId,
      u.name AS actorName,h.reason,h.created_at AS createdAt
    FROM dbo.SellerApplicationStatusHistory h
    LEFT JOIN dbo.Users u ON u.id=h.actor_user_id
    WHERE h.seller_application_id=@historyApplicationId
    ORDER BY h.created_at ASC,h.id ASC`);
  return result.recordset.map(row => ({
    id: Number(row.id),
    fromStatus: row.fromStatus as SellerApplicationStatus | null,
    toStatus: row.toStatus as SellerApplicationStatus,
    actorUserId: row.actorUserId == null ? null : Number(row.actorUserId),
    actorName: row.actorName ? String(row.actorName) : null,
    reason: row.reason ? String(row.reason) : null,
    createdAt: row.createdAt as Date,
  }));
}

async function detailByPredicate(predicate: string, value: number): Promise<SellerApplication | null> {
  const pool = await getPool();
  const parameter = predicate === 'sa.user_id=@lookup' ? 'lookup' : 'lookup';
  const result = await pool.request().input(parameter, sql.Int, value).query(`${applicationSelect} WHERE ${predicate}`);
  if (!result.recordset[0]) return null;
  const application = mapApplication(result.recordset[0]);
  application.history = await history(pool.request(), application.id);
  return application;
}

function bindInput(request: sql.Request, input: SellerApplicationInput, prefix = 'field') {
  const assignments: string[] = [];
  for (const key of Object.keys(input) as Array<keyof SellerApplicationInput>) {
    const definition = fieldMap[key];
    const parameter = `${prefix}${key}`;
    const sqlType = definition.length ? sql.NVarChar(definition.length) : sql.NVarChar;
    request.input(parameter, sqlType, text(input[key] as string | null | undefined));
    assignments.push(`${definition.column}=@${parameter}`);
  }
  return assignments;
}

function assertComplete(row: Record<string, unknown>) {
  const required = ['business_name', 'business_type', 'contact_name', 'contact_email', 'contact_phone', 'business_address', 'pickup_address'];
  const missing = required.filter(field => !text(row[field] as string | null));
  if (missing.length) throw new AppError(400, `Application is incomplete: ${missing.join(', ')}`);
  const email = String(row.contact_email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError(400, 'A valid contact email is required');
}

async function insertHistory(
  transaction: sql.Transaction,
  applicationId: number,
  fromStatus: SellerApplicationStatus | null,
  toStatus: SellerApplicationStatus,
  actorUserId: number | null,
  reason: string | null,
) {
  await transaction.request()
    .input('historyApplication', sql.Int, applicationId)
    .input('historyFrom', sql.NVarChar(20), fromStatus)
    .input('historyTo', sql.NVarChar(20), toStatus)
    .input('historyActor', sql.Int, actorUserId)
    .input('historyReason', sql.NVarChar(1000), reason)
    .query(`INSERT dbo.SellerApplicationStatusHistory
      (seller_application_id,from_status,to_status,actor_user_id,reason,created_at)
      VALUES(@historyApplication,@historyFrom,@historyTo,@historyActor,@historyReason,SYSUTCDATETIME())`);
}

async function insertAudit(
  transaction: sql.Transaction,
  actorUserId: number,
  applicationId: number,
  action: string,
  fromStatus: SellerApplicationStatus | null,
  toStatus: SellerApplicationStatus,
  reason: string | null,
) {
  await transaction.request()
    .input('auditUser', sql.Int, actorUserId)
    .input('auditAction', sql.NVarChar(100), action)
    .input('auditEntity', sql.NVarChar(50), 'SellerApplication')
    .input('auditEntityId', sql.Int, applicationId)
    .input('auditOld', sql.NVarChar(sql.MAX), fromStatus ? JSON.stringify({ status: fromStatus }) : null)
    .input('auditNew', sql.NVarChar(sql.MAX), JSON.stringify({ status: toStatus, reason }))
    .query(`INSERT dbo.AuditLogs(user_id,action,entity_type,entity_id,old_value,new_value,timestamp)
      VALUES(@auditUser,@auditAction,@auditEntity,@auditEntityId,@auditOld,@auditNew,SYSUTCDATETIME())`);
}

export const sellerApplicationsService = {
  async getMine(userId: number) {
    return detailByPredicate('sa.user_id=@lookup', userId);
  },

  async getAdminDetail(applicationId: number) {
    const application = await detailByPredicate('sa.id=@lookup', applicationId);
    if (!application) throw new AppError(404, 'Seller application not found');
    return application;
  },

  async create(userId: number, input: SellerApplicationInput) {
    const pool = await getPool();
    const transaction = pool.transaction();
    let started = false;
    try {
      await transaction.begin();
      started = true;
      const user = await transaction.request().input('userId', sql.Int, userId)
        .query(`SELECT id,role,is_active FROM dbo.Users WITH (UPDLOCK,HOLDLOCK) WHERE id=@userId`);
      if (!user.recordset[0] || !user.recordset[0].is_active) throw new AppError(401, 'Authentication required');
      if (user.recordset[0].role !== 'member') throw new AppError(403, 'Only members may create a seller application');
      const existing = await transaction.request().input('existingUserId', sql.Int, userId)
        .query('SELECT id FROM dbo.SellerApplications WITH (UPDLOCK,HOLDLOCK) WHERE user_id=@existingUserId');
      if (existing.recordset[0]) throw new AppError(409, 'A seller application already exists for this user');
      const request = transaction.request().input('createUserId', sql.Int, userId);
      const assignments = bindInput(request, input, 'create');
      const columns = assignments.map(value => value.split('=')[0]);
      const values = assignments.map(value => value.split('=')[1]);
      const inserted = await request.query<{ id: number }>(`INSERT dbo.SellerApplications
        (user_id,status${columns.length ? `,${columns.join(',')}` : ''},created_at,updated_at)
        OUTPUT INSERTED.id VALUES(@createUserId,N'DRAFT'${values.length ? `,${values.join(',')}` : ''},SYSUTCDATETIME(),SYSUTCDATETIME())`);
      const applicationId = Number(inserted.recordset[0].id);
      await insertHistory(transaction, applicationId, null, 'DRAFT', userId, null);
      await insertAudit(transaction, userId, applicationId, 'seller_application.created', null, 'DRAFT', null);
      await transaction.commit();
      started = false;
      return this.getAdminDetail(applicationId);
    } catch (error) {
      if (started) await transaction.rollback();
      if ([2601, 2627].includes((error as { number?: number }).number ?? 0)) throw new AppError(409, 'A seller application already exists for this user');
      throw error;
    }
  },

  async updateMine(userId: number, input: SellerApplicationInput) {
    const pool = await getPool();
    const transaction = pool.transaction();
    let started = false;
    try {
      await transaction.begin();
      started = true;
      const locked = await transaction.request().input('userId', sql.Int, userId)
        .query(`SELECT id,status FROM dbo.SellerApplications WITH (UPDLOCK,HOLDLOCK) WHERE user_id=@userId`);
      const row = locked.recordset[0];
      if (!row) throw new AppError(404, 'Seller application not found');
      if (!editableStatuses.includes(row.status)) throw new AppError(409, `Application cannot be edited while ${row.status}`);
      const request = transaction.request().input('applicationId', sql.Int, row.id);
      const assignments = bindInput(request, input, 'update');
      await request.query(`UPDATE dbo.SellerApplications SET ${assignments.join(',')},updated_at=SYSUTCDATETIME() WHERE id=@applicationId`);
      await transaction.commit();
      started = false;
      return this.getAdminDetail(Number(row.id));
    } catch (error) {
      if (started) await transaction.rollback();
      throw error;
    }
  },

  async submit(userId: number) {
    const pool = await getPool();
    const transaction = pool.transaction();
    let started = false;
    try {
      await transaction.begin();
      started = true;
      const locked = await transaction.request().input('userId', sql.Int, userId)
        .query(`SELECT * FROM dbo.SellerApplications WITH (UPDLOCK,HOLDLOCK) WHERE user_id=@userId`);
      const row = locked.recordset[0] as Record<string, unknown> | undefined;
      if (!row) throw new AppError(404, 'Seller application not found');
      const fromStatus = row.status as SellerApplicationStatus;
      if (!submitStatuses.includes(fromStatus)) throw new AppError(409, `Application cannot be submitted while ${fromStatus}`);
      assertComplete(row);
      await transaction.request().input('applicationId', sql.Int, row.id).query(`UPDATE dbo.SellerApplications
        SET status=N'PENDING',submitted_at=SYSUTCDATETIME(),review_reason=NULL,reviewed_at=NULL,reviewed_by_user_id=NULL,updated_at=SYSUTCDATETIME()
        WHERE id=@applicationId`);
      await insertHistory(transaction, Number(row.id), fromStatus, 'PENDING', userId, null);
      await insertAudit(transaction, userId, Number(row.id), 'seller_application.submitted', fromStatus, 'PENDING', null);
      await transaction.commit();
      started = false;
      return this.getAdminDetail(Number(row.id));
    } catch (error) {
      if (started) await transaction.rollback();
      throw error;
    }
  },

  async withdraw(userId: number) {
    const pool = await getPool();
    const transaction = pool.transaction();
    let started = false;
    try {
      await transaction.begin();
      started = true;
      const locked = await transaction.request().input('userId', sql.Int, userId)
        .query(`SELECT id,status FROM dbo.SellerApplications WITH (UPDLOCK,HOLDLOCK) WHERE user_id=@userId`);
      const row = locked.recordset[0];
      if (!row) throw new AppError(404, 'Seller application not found');
      if (row.status !== 'PENDING') throw new AppError(409, 'Only a pending application may be withdrawn');
      await transaction.request().input('applicationId', sql.Int, row.id)
        .query(`UPDATE dbo.SellerApplications SET status=N'WITHDRAWN',review_reason=NULL,reviewed_at=NULL,reviewed_by_user_id=NULL,updated_at=SYSUTCDATETIME() WHERE id=@applicationId`);
      await insertHistory(transaction, Number(row.id), 'PENDING', 'WITHDRAWN', userId, null);
      await insertAudit(transaction, userId, Number(row.id), 'seller_application.withdrawn', 'PENDING', 'WITHDRAWN', null);
      await transaction.commit();
      started = false;
      return this.getAdminDetail(Number(row.id));
    } catch (error) {
      if (started) await transaction.rollback();
      throw error;
    }
  },

  async listAdmin(filters: AdminSellerApplicationFilters) {
    const pool = await getPool();
    const request = pool.request()
      .input('status', sql.NVarChar(20), filters.status)
      .input('offset', sql.Int, (filters.page - 1) * filters.limit)
      .input('limit', sql.Int, filters.limit);
    const clauses = ['sa.status=@status'];
    if (filters.search) {
      request.input('search', sql.NVarChar(202), `%${filters.search}%`);
      clauses.push('(sa.business_name LIKE @search OR sa.contact_name LIKE @search OR sa.contact_email LIKE @search)');
    }
    const direction = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const result = await request.query(`SELECT ${applicationColumns},COUNT_BIG(*) OVER() AS totalCount
      ${applicationFrom}
      WHERE ${clauses.join(' AND ')}
      ORDER BY sa.submitted_at ${direction},sa.id ${direction}
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
    return {
      items: result.recordset.map(mapApplication),
      page: filters.page,
      limit: filters.limit,
      total: Number(result.recordset[0]?.totalCount ?? 0),
      totalPages: Math.ceil(Number(result.recordset[0]?.totalCount ?? 0) / filters.limit),
    };
  },

  async approve(applicationId: number, adminId: number) {
    const pool = await getPool();
    const transaction = pool.transaction();
    let started = false;
    try {
      await transaction.begin();
      started = true;
      const application = await transaction.request().input('applicationId', sql.Int, applicationId)
        .query(`SELECT id,user_id,status,business_name,pickup_address,description FROM dbo.SellerApplications WITH (UPDLOCK,HOLDLOCK) WHERE id=@applicationId`);
      const row = application.recordset[0];
      if (!row) throw new AppError(404, 'Seller application not found');
      if (row.status !== 'PENDING') throw new AppError(409, 'Only a pending application may be approved');
      const user = await transaction.request().input('applicantUserId', sql.Int, row.user_id)
        .query(`SELECT id,role,is_active FROM dbo.Users WITH (UPDLOCK,HOLDLOCK) WHERE id=@applicantUserId`);
      if (!user.recordset[0]?.is_active || user.recordset[0].role !== 'member') {
        throw new AppError(409, 'Applicant must still be an active member');
      }
      await transaction.request().input('reviewApplicationId', sql.Int, applicationId).input('reviewerId', sql.Int, adminId)
        .query(`UPDATE dbo.SellerApplications SET status=N'APPROVED',review_reason=NULL,reviewed_at=SYSUTCDATETIME(),
          reviewed_by_user_id=@reviewerId,updated_at=SYSUTCDATETIME() WHERE id=@reviewApplicationId`);
      await transaction.request().input('roleUserId', sql.Int, row.user_id).query(`UPDATE dbo.Users
        SET role=N'seller',token_version=token_version+1,updated_at=SYSUTCDATETIME() WHERE id=@roleUserId`);
      await transaction.request().input('sessionUserId', sql.Int, row.user_id).query(`UPDATE dbo.AuthSessions
        SET revoked_at=COALESCE(revoked_at,SYSUTCDATETIME()) WHERE user_id=@sessionUserId`);
      await insertHistory(transaction, applicationId, 'PENDING', 'APPROVED', adminId, null);
      await insertAudit(transaction, adminId, applicationId, 'seller_application.approved', 'PENDING', 'APPROVED', null);
      await createSellerShopInTransaction(transaction, {
        userId:Number(row.user_id),
        businessName:String(row.business_name),
        pickupAddress:row.pickup_address ? String(row.pickup_address) : null,
        description:row.description ? String(row.description) : null,
      }, adminId);
      await transaction.commit();
      started = false;
      return this.getAdminDetail(applicationId);
    } catch (error) {
      if (started) await transaction.rollback();
      throw error;
    }
  },

  async reject(applicationId: number, adminId: number, reasonValue: string) {
    const reason = reasonValue.trim();
    const pool = await getPool();
    const transaction = pool.transaction();
    let started = false;
    try {
      await transaction.begin();
      started = true;
      const application = await transaction.request().input('applicationId', sql.Int, applicationId)
        .query(`SELECT id,status FROM dbo.SellerApplications WITH (UPDLOCK,HOLDLOCK) WHERE id=@applicationId`);
      const row = application.recordset[0];
      if (!row) throw new AppError(404, 'Seller application not found');
      if (row.status !== 'PENDING') throw new AppError(409, 'Only a pending application may be rejected');
      await transaction.request().input('reviewApplicationId', sql.Int, applicationId)
        .input('reviewerId', sql.Int, adminId).input('reviewReason', sql.NVarChar(1000), reason)
        .query(`UPDATE dbo.SellerApplications SET status=N'REJECTED',review_reason=@reviewReason,reviewed_at=SYSUTCDATETIME(),
          reviewed_by_user_id=@reviewerId,updated_at=SYSUTCDATETIME() WHERE id=@reviewApplicationId`);
      await insertHistory(transaction, applicationId, 'PENDING', 'REJECTED', adminId, reason);
      await insertAudit(transaction, adminId, applicationId, 'seller_application.rejected', 'PENDING', 'REJECTED', reason);
      await transaction.commit();
      started = false;
      return this.getAdminDetail(applicationId);
    } catch (error) {
      if (started) await transaction.rollback();
      throw error;
    }
  },
};
