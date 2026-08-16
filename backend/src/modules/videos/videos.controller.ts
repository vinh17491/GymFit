import { Request, Response, NextFunction } from 'express';
import { query } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';

export async function getVideos(req: Request, res: Response, next: NextFunction) {
  try {
    const { category, search, difficulty, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let where = 'WHERE w.is_active = 1';
    const params: Record<string, unknown> = {};

    if (category) {
      where += ' AND w.plan_type = @category';
      params.category = category;
    }
    if (difficulty) { where += ' AND w.difficulty = @difficulty'; params.difficulty = difficulty; }
    if (search) { where += ' AND (w.name LIKE @search OR w.description LIKE @search)'; params.search = `%${search}%`; }

    const result = await query(
      `SELECT w.id, w.name as title, w.description, w.plan_type as category, w.difficulty, w.duration_minutes, w.coach_id as instructor_id, w.is_active, w.created_at,
              NULL as video_url, NULL as thumbnail_url, NULL as instructor_name
       FROM Workouts w
       LEFT JOIN Users u ON w.coach_id = u.id
       ${where}
       ORDER BY w.created_at DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      { ...params, offset, limit: Number(limit) }
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM Workouts w ${where}`,
      params
    );

    sendSuccess(res, {
      videos: result.recordset,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: countResult.recordset[0].total,
        totalPages: Math.ceil(countResult.recordset[0].total / Number(limit))
      }
    });
  } catch (err) { next(err); }
}

export async function getVideoById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT w.id, w.name as title, w.description, w.plan_type as category, w.difficulty, w.duration_minutes, w.coach_id as instructor_id, w.is_active, w.created_at,
              NULL as video_url, NULL as thumbnail_url, NULL as instructor_name
       FROM Workouts w LEFT JOIN Users u ON w.coach_id = u.id
       WHERE w.id = @id`,
      { id }
    );
    if (result.recordset.length === 0) throw new AppError(404, 'Video not found');
    sendSuccess(res, result.recordset[0]);
  } catch (err) { next(err); }
}

export async function createVideo(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, description, plan_type, duration_minutes, difficulty } = req.body;
    const coach_id=req.user!.role==='admin' ? (req.body.coach_id||null) : req.user!.userId;
    if(coach_id){const owner=await query("SELECT id FROM Users WHERE id=@id AND role='coach' AND is_active=1",{id:coach_id});if(!owner.recordset[0])throw new AppError(400,'Invalid coach owner');}
    const result = await query(
      `INSERT INTO Workouts (name, description, plan_type, duration_minutes, difficulty, coach_id, is_active, created_at)
       OUTPUT INSERTED.*
       VALUES (@name, @description, @plan_type, @duration_minutes, @difficulty, @coach_id, 1, GETDATE())`,
      { name, description, plan_type, duration_minutes, difficulty: difficulty || 'beginner', coach_id }
    );
    sendSuccess(res, result.recordset[0], 'Video created', 201);
  } catch (err) { next(err); }
}

export async function updateVideo(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, description, plan_type, duration_minutes, difficulty, is_active } = req.body;
    const coach_id=req.user!.role==='admin' ? (req.body.coach_id||null) : req.user!.userId;
    if(coach_id){const owner=await query("SELECT id FROM Users WHERE id=@owner AND role='coach' AND is_active=1",{owner:coach_id});if(!owner.recordset[0])throw new AppError(400,'Invalid coach owner');}
    const ownership=req.user!.role==='coach'?' AND coach_id=@actor':'';
    const result = await query(
      `UPDATE Workouts SET name=@name, description=@description, plan_type=@plan_type, duration_minutes=@duration_minutes, difficulty=@difficulty, coach_id=@coach_id, is_active=@is_active
       OUTPUT INSERTED.* WHERE id=@id${ownership}`,
      { id, name, description, plan_type, duration_minutes, difficulty, coach_id, is_active:is_active??true,actor:req.user!.userId }
    );
    if (result.recordset.length === 0) throw new AppError(404, 'Video not found');
    sendSuccess(res, result.recordset[0], 'Video updated');
  } catch (err) { next(err); }
}

export async function deleteVideo(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM Workouts WHERE id=@id', { id });
    if (result.rowsAffected[0] === 0) throw new AppError(404, 'Video not found');
    sendSuccess(res, null, 'Video deleted');
  } catch (err) { next(err); }
}

export async function getVideoCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query('SELECT DISTINCT plan_type FROM Workouts WHERE is_active = 1 AND plan_type IS NOT NULL');
    sendSuccess(res, result.recordset.map((r: { plan_type: string }) => r.plan_type));
  } catch (err) { next(err); }
}
