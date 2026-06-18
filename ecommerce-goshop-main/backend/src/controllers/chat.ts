import { NextFunction, Request, Response } from "express";
import { getPool } from "../config/database";

type AuthRequest = Request & { userId?: number; roleName?: string };

export const getConversations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const roleName = (req as AuthRequest).roleName;
    const pool = await getPool();
    let query = `SELECT c.*, 
      u1.FullName as UserName, u1.Avatar as UserAvatar,
      u2.FullName as CoachName, u2.Avatar as CoachAvatar,
      (SELECT TOP 1 Content FROM ChatMessages WHERE ConversationId=c.Id ORDER BY CreatedAt DESC) as LastMessage,
      (SELECT TOP 1 CreatedAt FROM ChatMessages WHERE ConversationId=c.Id ORDER BY CreatedAt DESC) as LastMessageAt
      FROM ChatConversations c
      JOIN Users u1 ON c.UserId = u1.Id
      JOIN Users u2 ON c.CoachId = u2.Id
      WHERE c.UserId = @userId`;
    if (roleName === "COACH") query = `SELECT c.*, 
      u1.FullName as UserName, u1.Avatar as UserAvatar,
      u2.FullName as CoachName, u2.Avatar as CoachAvatar,
      (SELECT TOP 1 Content FROM ChatMessages WHERE ConversationId=c.Id ORDER BY CreatedAt DESC) as LastMessage,
      (SELECT TOP 1 CreatedAt FROM ChatMessages WHERE ConversationId=c.Id ORDER BY CreatedAt DESC) as LastMessageAt
      FROM ChatConversations c
      JOIN Users u1 ON c.UserId = u1.Id
      JOIN Users u2 ON c.CoachId = u2.Id
      WHERE c.CoachId = @userId`;
    const result = await pool.request().input("userId", userId).query(query);
    res.json(result.recordset);
  } catch (err) { next(err); }
};

export const getOrCreateConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const { coachId } = req.body;
    const pool = await getPool();
    let existing = await pool.request()
      .input("userId", userId).input("coachId", coachId)
      .query("SELECT * FROM ChatConversations WHERE UserId=@userId AND CoachId=@coachId");
    if (existing.recordset.length > 0) return res.json(existing.recordset[0]);
    const result = await pool.request()
      .input("userId", userId).input("coachId", coachId)
      .query("INSERT INTO ChatConversations (UserId, CoachId) OUTPUT INSERTED.* VALUES (@userId, @coachId)");
    res.status(201).json(result.recordset[0]);
  } catch (err) { next(err); }
};

export const getMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conversationId = req.params.id;
    const userId = (req as AuthRequest).userId!;
    const pool = await getPool();
    const conv = await pool.request().input("id", conversationId)
      .query("SELECT * FROM ChatConversations WHERE Id=@id");
    if (!conv.recordset[0]) return res.status(404).json({ message: "Conversation not found" });
    const c = conv.recordset[0];
    if (c.UserId !== userId && c.CoachId !== userId) return res.status(403).json({ message: "Access denied" });
    const messages = await pool.request().input("conversationId", conversationId)
      .query("SELECT m.*, u.FullName, u.Avatar FROM ChatMessages m JOIN Users u ON m.SenderId=u.Id WHERE m.ConversationId=@conversationId ORDER BY m.CreatedAt");
    res.json(messages.recordset);
  } catch (err) { next(err); }
};

export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const senderId = (req as AuthRequest).userId!;
    const { conversationId, content } = req.body;
    const pool = await getPool();
    const conv = await pool.request().input("id", conversationId)
      .query("SELECT * FROM ChatConversations WHERE Id=@id");
    if (!conv.recordset[0]) return res.status(404).json({ message: "Conversation not found" });
    const c = conv.recordset[0];
    const receiverId = senderId === c.UserId ? c.CoachId : c.UserId;
    const result = await pool.request()
      .input("conversationId", conversationId).input("senderId", senderId).input("receiverId", receiverId).input("content", content)
      .query("INSERT INTO ChatMessages (ConversationId, SenderId, ReceiverId, Content) OUTPUT INSERTED.* VALUES (@conversationId, @senderId, @receiverId, @content)");
    res.status(201).json(result.recordset[0]);
  } catch (err) { next(err); }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const conversationId = req.params.id;
    const pool = await getPool();
    await pool.request()
      .input("conversationId", conversationId).input("userId", userId)
      .query("UPDATE ChatMessages SET IsRead=1 WHERE ConversationId=@conversationId AND SenderId!=@userId AND IsRead=0");
    res.json({ message: "Marked as read" });
  } catch (err) { next(err); }
};

export const getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const roleName = (req as AuthRequest).roleName;
    const pool = await getPool();
    let query = `SELECT COUNT(*) as unread FROM ChatMessages m JOIN ChatConversations c ON m.ConversationId=c.Id WHERE m.IsRead=0 AND m.SenderId!=@userId`;
    if (roleName === "COACH") query += ` AND c.CoachId=@userId`;
    else query += ` AND c.UserId=@userId`;
    const result = await pool.request().input("userId", userId).query(query);
    res.json({ unread: result.recordset[0].unread });
  } catch (err) { next(err); }
};