import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/notification";

const router = Router();

// All notification routes require authentication
router.get("/", authMiddleware, getNotifications);
router.post("/read/:id", authMiddleware, markAsRead);
router.post("/read-all", authMiddleware, markAllAsRead);

export default router;