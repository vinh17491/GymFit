import { Request, Response, NextFunction } from 'express';
import { query } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import type { VideoListQuery } from './videos.schemas';

export async function getVideos(req: Request, res: Response, next: NextFunction) {
  try {
    const { category, search, difficulty, page, limit } = req.query as unknown as VideoListQuery;
    const safePage = Number.isSafeInteger(page) ? Math.max(1, page) : 1;
    const safeLimit = Number.isSafeInteger(limit) ? Math.min(50, Math.max(1, limit)) : 20;
    const offset = (safePage - 1) * safeLimit;
    let where = 'WHERE e.is_active = 1';
    const params: Record<string, unknown> = {};

    if (category) {
      where += ' AND e.muscle_group = @category';
      params.category = category;
    }
    if (difficulty) { where += ' AND e.difficulty = @difficulty'; params.difficulty = difficulty; }
    if (search) { where += ' AND (e.name LIKE @search OR e.description LIKE @search OR e.instructions LIKE @search)'; params.search = `%${search}%`; }

    const result = await query(
      `SELECT e.id,e.name AS title,e.description,e.muscle_group AS category,e.difficulty,
              CAST(NULL AS INT) AS duration_minutes,CAST(NULL AS INT) AS instructor_id,
              e.is_active,e.created_at,e.video_url,e.thumbnail_url,
              CAST(NULL AS NVARCHAR(100)) AS instructor_name
       FROM dbo.Exercises e
       ${where}
       ORDER BY e.created_at DESC,e.id DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { ...params, offset, limit: safeLimit }
    );

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM dbo.Exercises e ${where}`,
      params
    );

    sendSuccess(res, {
      videos: result.recordset,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: countResult.recordset[0].total,
        totalPages: Math.ceil(countResult.recordset[0].total / safeLimit)
      }
    });
  } catch (err) { next(err); }
}

export async function getVideoById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT e.id,e.name AS title,e.description,e.muscle_group AS category,e.difficulty,
              CAST(NULL AS INT) AS duration_minutes,CAST(NULL AS INT) AS instructor_id,
              e.is_active,e.created_at,e.video_url,e.thumbnail_url,
              CAST(NULL AS NVARCHAR(100)) AS instructor_name
       FROM dbo.Exercises e
       WHERE e.id=@id`,
      { id }
    );
    if (result.recordset.length === 0) throw new AppError(404, 'Video not found');
    sendSuccess(res, result.recordset[0]);
  } catch (err) { next(err); }
}

export function retireVideoMutation(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError(409, 'Video mutations are retired; manage canonical exercise media through the exercise admin API', 'VIDEO_MUTATIONS_RETIRED'));
}

export async function getVideoCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query('SELECT DISTINCT muscle_group FROM dbo.Exercises WHERE is_active=1 AND muscle_group IS NOT NULL ORDER BY muscle_group');
    sendSuccess(res, result.recordset.map((r: { muscle_group: string }) => r.muscle_group));
  } catch (err) { next(err); }
}
