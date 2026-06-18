import { NextFunction, Request, Response } from "express";
import { getPool } from "../config/database";

type AuthRequest = Request & { userId?: number; roleName?: string };

export const getVideos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, category, search, isPremium } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const pool = await getPool();
    let query = `SELECT v.*, u.FullName as CoachName FROM Videos v LEFT JOIN Users u ON v.UploadedBy = u.Id WHERE 1=1`;
    const request = pool.request();
    if (category) { query += ` AND v.Category = @category`; request.input("category", category); }
    if (search) { query += ` AND (v.Title LIKE @search OR v.Description LIKE @search)`; request.input("search", `%${search}%`); }
    if (isPremium !== undefined) { query += ` AND v.IsPremium = @isPremium`; request.input("isPremium", isPremium === "true" ? 1 : 0); }
    query += ` ORDER BY v.CreatedAt DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
    request.input("offset", Number(offset)).input("limit", Number(limit));
    const result = await request.query(query);
    const countResult = await pool.request().query(`SELECT COUNT(*) as total FROM Videos`);
    res.json({ videos: result.recordset, total: countResult.recordset[0].total });
  } catch (err) { next(err); }
};

export const getVideoById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    await pool.request().input("id", req.params.id).query(`UPDATE Videos SET ViewCount = ViewCount + 1 WHERE Id = @id`);
    const result = await pool.request().input("id", req.params.id)
      .query(`SELECT v.*, u.FullName as CoachName, u.Avatar as CoachAvatar FROM Videos v LEFT JOIN Users u ON v.UploadedBy = u.Id WHERE v.Id = @id`);
    if (!result.recordset[0]) return res.status(404).json({ message: "Video not found" });
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
};

export const createVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const { title, description, videoUrl, thumbnailUrl, category, durationSec, difficulty, isPremium } = req.body;
    const pool = await getPool();
    const result = await pool.request()
      .input("uploadedBy", userId)
      .input("title", title)
      .input("description", description || null)
      .input("videoUrl", videoUrl)
      .input("thumbnailUrl", thumbnailUrl || null)
      .input("category", category || null)
      .input("durationSec", durationSec || null)
      .input("difficulty", difficulty || 'BEGINNER')
      .input("isPremium", isPremium ? 1 : 0)
      .query(`INSERT INTO Videos (UploadedBy,Title,Description,VideoUrl,ThumbnailUrl,Category,DurationSec,Difficulty,IsPremium) OUTPUT INSERTED.*
        VALUES (@uploadedBy,@title,@description,@videoUrl,@thumbnailUrl,@category,@durationSec,@difficulty,@isPremium)`);
    res.status(201).json(result.recordset[0]);
  } catch (err) { next(err); }
};

export const updateVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const roleName = (req as AuthRequest).roleName;
    const pool = await getPool();
    const existing = await pool.request().input("id", req.params.id).query(`SELECT * FROM Videos WHERE Id = @id`);
    if (!existing.recordset[0]) return res.status(404).json({ message: "Video not found" });
    if (existing.recordset[0].UploadedBy !== userId && roleName !== "ADMIN") return res.status(403).json({ message: "Unauthorized" });
    const { title, description, thumbnailUrl, category, durationSec, difficulty, isPremium } = req.body;
    const result = await pool.request()
      .input("id", req.params.id)
      .input("title", title).input("description", description).input("thumbnailUrl", thumbnailUrl)
      .input("category", category).input("durationSec", durationSec).input("difficulty", difficulty || 'BEGINNER')
      .input("isPremium", isPremium ? 1 : 0)
      .query(`UPDATE Videos SET Title=@title,Description=@description,ThumbnailUrl=@thumbnailUrl,
        Category=@category,DurationSec=@durationSec,Difficulty=@difficulty,IsPremium=@isPremium,
        UpdatedAt=GETUTCDATE() OUTPUT INSERTED.* WHERE Id=@id`);
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
};

export const deleteVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const roleName = (req as AuthRequest).roleName;
    const pool = await getPool();
    const existing = await pool.request().input("id", req.params.id).query(`SELECT * FROM Videos WHERE Id = @id`);
    if (!existing.recordset[0]) return res.status(404).json({ message: "Video not found" });
    if (existing.recordset[0].UploadedBy !== userId && roleName !== "ADMIN") return res.status(403).json({ message: "Unauthorized" });
    await pool.request().input("id", req.params.id).query(`DELETE FROM Videos WHERE Id = @id`);
    res.json({ message: "Video deleted" });
  } catch (err) { next(err); }
};

export const getVideoCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`SELECT DISTINCT Category FROM Videos WHERE Category IS NOT NULL ORDER BY Category`);
    res.json(result.recordset.map((r: any) => r.Category));
  } catch (err) { next(err); }
};