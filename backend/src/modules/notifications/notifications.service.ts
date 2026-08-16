import { getPool, query, sql } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export interface NotificationCreateInput {
  recipientUserId: number;
  type: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  deduplicationKey?: string | null;
}

export interface NotificationCreateResult {
  created: boolean;
  id: number | null;
}

export interface NotificationListItem {
  id: number;
  recipient_user_id: number;
  type: string;
  title: string;
  message: string;
  action_url: string | null;
  is_read: boolean;
  read_at: string | Date | null;
  created_at: string | Date;
}

export interface NotificationListResult {
  items: NotificationListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type Executor = sql.ConnectionPool | sql.Transaction;

const requestFor = (executor: Executor) => executor instanceof sql.Transaction ? new sql.Request(executor) : executor.request();

const isUniqueConstraintError = (error: unknown): boolean => {
  const number = (error as { number?: number }).number;
  return number === 2601 || number === 2627;
};

const safeText = (value: string, maxLength: number, field: string): string => {
  const text = value.trim();
  if (!text || text.length > maxLength) throw new AppError(400, `${field} is invalid`);
  return text;
};

const scope = '(n.recipient_user_id=@userId OR (n.recipient_user_id IS NULL AND n.user_id=@userId))';

export async function createNotification(executor: Executor, input: NotificationCreateInput): Promise<NotificationCreateResult> {
  const title = safeText(input.title, 200, 'Notification title');
  const message = safeText(input.message, 4000, 'Notification message');
  const type = safeText(input.type, 50, 'Notification type');
  const actionUrl = input.actionUrl?.trim() || null;
  const deduplicationKey = input.deduplicationKey?.trim() || null;
  if (actionUrl && actionUrl.length > 500) throw new AppError(400, 'Notification action URL is invalid');
  if (deduplicationKey && deduplicationKey.length > 255) throw new AppError(400, 'Notification deduplication key is invalid');

  try {
    const result = await requestFor(executor)
      .input('recipientUserId', sql.Int, input.recipientUserId)
      .input('title', sql.NVarChar(200), title)
      .input('message', sql.NVarChar(4000), message)
      .input('type', sql.NVarChar(50), type)
      .input('actionUrl', sql.NVarChar(500), actionUrl)
      .input('deduplicationKey', sql.NVarChar(255), deduplicationKey)
      .query<{ id: number }>(
        `INSERT dbo.Notifications(user_id,recipient_user_id,title,message,type,is_read,action_url,read_at,deduplication_key,created_at)
         OUTPUT INSERTED.id
         VALUES(@recipientUserId,@recipientUserId,@title,@message,@type,0,@actionUrl,NULL,@deduplicationKey,SYSUTCDATETIME())`,
      );
    return { created: true, id: Number(result.recordset[0]?.id ?? 0) || null };
  } catch (error) {
    if (deduplicationKey && isUniqueConstraintError(error)) return { created: false, id: null };
    throw error;
  }
}

function normalizedPage(page: number, limit: number): { page: number; limit: number } {
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const safeLimit = Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, 50) : 20;
  return { page: safePage, limit: safeLimit };
}

export async function listNotifications(userId: number, page: number, limit: number, unreadOnly = false): Promise<NotificationListResult> {
  const normalized = normalizedPage(page, limit);
  const unreadFilter = unreadOnly ? ' AND n.is_read=0' : '';
  const params = { userId, offset: (normalized.page - 1) * normalized.limit, limit: normalized.limit };
  const [rows, count] = await Promise.all([
    query<NotificationListItem>(
      `SELECT n.id,COALESCE(n.recipient_user_id,n.user_id) AS recipient_user_id,n.type,n.title,n.message,
              n.action_url,n.is_read,n.read_at,n.created_at
       FROM dbo.Notifications n
       WHERE ${scope}${unreadFilter}
       ORDER BY n.created_at DESC,n.id DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      params,
    ),
    query<{ total: number }>(`SELECT COUNT_BIG(*) AS total FROM dbo.Notifications n WHERE ${scope}${unreadFilter}`, { userId }),
  ]);
  const total = Number(count.recordset[0]?.total ?? 0);
  return { items: rows.recordset, page: normalized.page, limit: normalized.limit, total, totalPages: Math.ceil(total / normalized.limit) };
}

export async function unreadCount(userId: number): Promise<number> {
  const result = await query<{ total: number }>(`SELECT COUNT_BIG(*) AS total FROM dbo.Notifications n WHERE ${scope} AND n.is_read=0`, { userId });
  return Number(result.recordset[0]?.total ?? 0);
}

export async function markNotificationRead(userId: number, notificationId: number): Promise<{ id: number; is_read: boolean; read_at: string | Date | null }> {
  const result = await query<{ id: number; is_read: boolean; read_at: string | Date | null }>(
    `UPDATE n
     SET is_read=1,read_at=COALESCE(read_at,SYSUTCDATETIME()),recipient_user_id=COALESCE(recipient_user_id,user_id)
     OUTPUT INSERTED.id,INSERTED.is_read,INSERTED.read_at
     FROM dbo.Notifications n
     WHERE id=@notificationId AND ${scope}`,
    { notificationId, userId },
  );
  if (!result.recordset[0]) throw new AppError(404, 'Notification not found');
  return result.recordset[0];
}

export async function markAllNotificationsRead(userId: number): Promise<{ updated: number }> {
  const result = await query(
    `UPDATE n
     SET is_read=1,read_at=COALESCE(read_at,SYSUTCDATETIME()),recipient_user_id=COALESCE(recipient_user_id,user_id)
     FROM dbo.Notifications n
     WHERE ${scope} AND n.is_read=0`,
    { userId },
  );
  return { updated: Number(result.rowsAffected[0] ?? 0) };
}

export async function createNotificationForPool(input: NotificationCreateInput): Promise<NotificationCreateResult> {
  return createNotification(await getPool(), input);
}
