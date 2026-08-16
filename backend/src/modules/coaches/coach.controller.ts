import { Request, Response, NextFunction } from 'express';
import { query } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';

interface PublicCoachRow {
  id: number;
  name: string;
  avatarUrl: string | null;
  specialty: string | null;
  bio: string | null;
  experienceYears: number | null;
  sessionMode: 'ONLINE' | 'IN_PERSON' | 'BOTH' | null;
  location: string | null;
  bookingEnabled: boolean;
}
const coachStatusSql = "COALESCE(u.coach_status, CASE WHEN u.is_active = 1 THEN N'ACTIVE' ELSE N'INACTIVE' END)";
const coachWhereSql = `u.role = N'coach' AND u.is_active = 1 AND ${coachStatusSql} = N'ACTIVE'`;

function parsePositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}
function mapCoach(row: PublicCoachRow): PublicCoachRow {
  return {
    id: Number(row.id),
    name: row.name,
    avatarUrl: row.avatarUrl ?? null,
    specialty: row.specialty ?? null,
    bio: row.bio ?? null,
    experienceYears: row.experienceYears === null ? null : Number(row.experienceYears),
    sessionMode: row.sessionMode ?? null,
    location: row.location ?? null,
    bookingEnabled: Boolean(row.bookingEnabled),
  };
}

async function findPublicCoach(coachId: number): Promise<PublicCoachRow | null> {
  const result = await query<PublicCoachRow>(
    `SELECT u.id,u.name,u.avatar_url AS avatarUrl,
            cp.specialty,cp.bio,cp.experience_years AS experienceYears,
            cp.session_mode AS sessionMode,cp.location,
            CAST(COALESCE(cp.booking_enabled,1) AS bit) AS bookingEnabled
     FROM dbo.Users u
     LEFT JOIN dbo.CoachProfiles cp ON cp.coach_id=u.id
     WHERE u.id=@coachId AND ${coachWhereSql}`,
    { coachId },
  );
  return result.recordset[0] ? mapCoach(result.recordset[0]) : null;
}

/** Canonical public Coach list. This is the only Coach list/query used by the app. */
export async function getCoaches(req: Request, res: Response, next: NextFunction) {
  try {
    const rawSearch = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const page = parsePositiveInteger(req.query.page, 1);
    const limit = Math.min(parsePositiveInteger(req.query.limit, 20), 100);
    const offset = (page - 1) * limit;
    const params: Record<string, unknown> = { offset, limit };
    const search = rawSearch ? ' AND (u.name LIKE @search OR cp.specialty LIKE @search)' : '';
    if (rawSearch) params.search = `%${rawSearch}%`;

    const result = await query<PublicCoachRow>(
      `SELECT u.id,u.name,u.avatar_url AS avatarUrl,
              cp.specialty,cp.bio,cp.experience_years AS experienceYears,
              cp.session_mode AS sessionMode,cp.location,
              CAST(COALESCE(cp.booking_enabled,1) AS bit) AS bookingEnabled
       FROM dbo.Users u
       LEFT JOIN dbo.CoachProfiles cp ON cp.coach_id=u.id
       WHERE ${coachWhereSql}${search}
       ORDER BY u.name ASC,u.id ASC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      params,
    );
    const count = await query<{ total: number }>(
      `SELECT COUNT(*) AS total
       FROM dbo.Users u
       LEFT JOIN dbo.CoachProfiles cp ON cp.coach_id=u.id
       WHERE ${coachWhereSql}${search}`,
      rawSearch ? { search: `%${rawSearch}%` } : undefined,
    );
    const total = Number(count.recordset[0]?.total ?? 0);
    const coaches = result.recordset.map(mapCoach);
    sendSuccess(res, {
      items: coaches,
      coaches,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}

/** Canonical public Coach detail. Suspended/inactive Coaches are intentionally indistinguishable from missing IDs. */
export async function getCoachById(req: Request, res: Response, next: NextFunction) {
  try {
    const coachId = Number(req.params.id);
    if (!Number.isSafeInteger(coachId) || coachId <= 0) throw new AppError(400, 'Coach ID must be a positive integer');
    const coach = await findPublicCoach(coachId);
    if (!coach) throw new AppError(404, 'Coach not found');
    sendSuccess(res, coach);
  } catch (error) {
    next(error);
  }
}

export { getPublicAvailability as getCoachAvailability } from './coach-availability.controller';
