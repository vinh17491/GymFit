import { NextFunction, Request, Response } from "express";
import { getPool } from "../config/database";

// GET /notifications - Get current user's notifications
export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const pool = await getPool();
    const result = await pool.request()
      .input("userId", userId)
      .query(`
        SELECT Id, UserId, Title, Message, IsRead, CreatedAt
        FROM Notifications
        WHERE UserId = @userId
        ORDER BY CreatedAt DESC
      `);
    res.status(200).json(result.recordset);
  } catch (error) {
    next({ message: "Unable to fetch notifications", error });
  }
};

// POST /notifications/read/:id - Mark a single notification as read
export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const notificationId = Number(req.params.id);
    const pool = await getPool();

    // Verify ownership
    const notification = await pool.request()
      .input("id", notificationId)
      .input("userId", userId)
      .query("SELECT Id FROM Notifications WHERE Id = @id AND UserId = @userId");

    if (notification.recordset.length === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await pool.request()
      .input("id", notificationId)
      .query("UPDATE Notifications SET IsRead = 1 WHERE Id = @id");

    res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    next({ message: "Unable to mark notification as read", error });
  }
};

// POST /notifications/read-all - Mark all notifications as read for current user
export const markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const pool = await getPool();

    await pool.request()
      .input("userId", userId)
      .query("UPDATE Notifications SET IsRead = 1 WHERE UserId = @userId AND IsRead = 0");

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    next({ message: "Unable to mark all notifications as read", error });
  }
};

// Helper function to create a notification (used by webhook)
export const createNotification = async (
  userId: number,
  title: string,
  message: string
): Promise<void> => {
  const pool = await getPool();
  await pool.request()
    .input("userId", userId)
    .input("title", title)
    .input("message", message)
    .query(`
      INSERT INTO Notifications (UserId, Title, Message, IsRead, CreatedAt)
      VALUES (@userId, @title, @message, 0, GETUTCDATE())
    `);
};