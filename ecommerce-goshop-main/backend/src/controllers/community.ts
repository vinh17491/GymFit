import { NextFunction, Request, Response } from "express";
import { getPool } from "../config/database";

type AuthRequest = Request & { userId?: number; roleName?: string };

export const createCommunityPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const { title, content, tags } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }
    if (title.length > 300 || content.length > 10000) {
      return res.status(400).json({ message: "Title max 300 chars, content max 10000 chars" });
    }
    const pool = await getPool();
    const result = await pool.request()
      .input("userId", userId)
      .input("title", title.trim())
      .input("content", content.trim())
      .input("tags", tags || null)
      .query(`INSERT INTO QAPosts (UserId,Title,Content,Tags) OUTPUT INSERTED.* VALUES (@userId,@title,@content,@tags)`);
    res.status(201).json(result.recordset[0]);
  } catch (err) { next(err); }
};

export const getCommunityPosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, search, tag } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const pool = await getPool();
    let query = `SELECT p.*, u.FullName as AuthorName, u.Avatar as AuthorAvatar,
      (SELECT COUNT(*) FROM QAAnswers a WHERE a.PostId = p.Id) as AnswerCount
      FROM QAPosts p LEFT JOIN Users u ON p.UserId = u.Id WHERE 1=1`;
    const request = pool.request();
    if (search) { query += ` AND (p.Title LIKE @search OR p.Content LIKE @search)`; request.input("search", `%${search}%`); }
    if (tag) { query += ` AND p.Tags LIKE @tag`; request.input("tag", `%${tag}%`); }
    query += ` ORDER BY p.IsPinned DESC, p.CreatedAt DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
    request.input("offset", Number(offset)).input("limit", Number(limit));
    const result = await request.query(query);
    const countResult = await pool.request().query(`SELECT COUNT(*) as total FROM QAPosts`);
    res.json({ posts: result.recordset, total: countResult.recordset[0].total });
  } catch (err) { next(err); }
};

export const getCommunityPostById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    await pool.request().input("id", req.params.id).query(`UPDATE QAPosts SET ViewCount = ViewCount + 1 WHERE Id = @id`);
    const postResult = await pool.request().input("id", req.params.id)
      .query(`SELECT p.*, u.FullName as AuthorName, u.Avatar as AuthorAvatar FROM QAPosts p LEFT JOIN Users u ON p.UserId = u.Id WHERE p.Id = @id`);
    if (!postResult.recordset[0]) return res.status(404).json({ message: "Post not found" });
    const answersResult = await pool.request().input("postId", req.params.id)
      .query(`SELECT a.*, u.FullName as AuthorName, u.Avatar as AuthorAvatar FROM QAAnswers a LEFT JOIN Users u ON a.UserId = u.Id WHERE a.PostId = @postId ORDER BY a.Upvotes DESC`);
    res.json({ ...postResult.recordset[0], answers: answersResult.recordset });
  } catch (err) { next(err); }
};

export const updateCommunityPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const roleName = (req as AuthRequest).roleName;
    const pool = await getPool();
    const existing = await pool.request().input("id", req.params.id).query(`SELECT * FROM QAPosts WHERE Id = @id`);
    if (!existing.recordset[0]) return res.status(404).json({ message: "Post not found" });
    if (existing.recordset[0].UserId !== userId && roleName !== "ADMIN") return res.status(403).json({ message: "Unauthorized" });
    const { title, content, tags } = req.body;
    const result = await pool.request()
      .input("id", req.params.id)
      .input("title", title).input("content", content).input("tags", tags)
      .query(`UPDATE QAPosts SET Title=@title,Content=@content,Tags=@tags,UpdatedAt=GETUTCDATE() OUTPUT INSERTED.* WHERE Id=@id`);
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
};

export const deleteCommunityPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const roleName = (req as AuthRequest).roleName;
    const pool = await getPool();
    const existing = await pool.request().input("id", req.params.id).query(`SELECT * FROM QAPosts WHERE Id = @id`);
    if (!existing.recordset[0]) return res.status(404).json({ message: "Post not found" });
    if (existing.recordset[0].UserId !== userId && roleName !== "ADMIN") return res.status(403).json({ message: "Unauthorized" });
    await pool.request().input("id", req.params.id).query(`DELETE FROM QAPosts WHERE Id = @id`);
    res.json({ message: "Post deleted" });
  } catch (err) { next(err); }
};

export const createAnswer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Content is required" });
    }
    if (content.length > 5000) {
      return res.status(400).json({ message: "Content max 5000 chars" });
    }
    const pool = await getPool();
    const result = await pool.request()
      .input("postId", req.params.postId)
      .input("userId", userId)
      .input("content", content)
      .query(`INSERT INTO QAAnswers (PostId,UserId,Content) OUTPUT INSERTED.* VALUES (@postId,@userId,@content)`);
    res.status(201).json(result.recordset[0]);
  } catch (err) { next(err); }
};

export const upvoteAnswer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("id", req.params.id)
      .query(`UPDATE QAAnswers SET Upvotes = Upvotes + 1 OUTPUT INSERTED.* WHERE Id = @id`);
    if (!result.recordset[0]) return res.status(404).json({ message: "Answer not found" });
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
};

export const acceptAnswer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const pool = await getPool();
    const answer = await pool.request().input("id", req.params.id)
      .query(`SELECT a.*, p.UserId as PostAuthorId FROM QAAnswers a JOIN QAPosts p ON a.PostId = p.Id WHERE a.Id = @id`);
    if (!answer.recordset[0]) return res.status(404).json({ message: "Answer not found" });
    if (answer.recordset[0].PostAuthorId !== userId) return res.status(403).json({ message: "Only post author can accept" });
    await pool.request().input("postId", answer.recordset[0].PostId)
      .query(`UPDATE QAAnswers SET IsAccepted = 0 WHERE PostId = @postId`);
    const result = await pool.request().input("id", req.params.id)
      .query(`UPDATE QAAnswers SET IsAccepted = 1 OUTPUT INSERTED.* WHERE Id = @id`);
    await pool.request().input("postId", answer.recordset[0].PostId)
      .query(`UPDATE QAPosts SET IsVerified = 1 WHERE Id = @postId`);
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
};

export const likePost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("id", req.params.id)
      .query(`UPDATE QAPosts SET Likes = ISNULL(Likes, 0) + 1 OUTPUT INSERTED.* WHERE Id = @id`);
    if (!result.recordset[0]) return res.status(404).json({ message: "Post not found" });
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
};