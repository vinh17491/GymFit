import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { validateIdParam, validatePagination } from "../middleware/validate";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/notification";

const router = Router();

// All notification routes require authentication
router.get("/", authMiddleware, validatePagination, getNotifications);
router.post("/read/:id", authMiddleware, validateIdParam("id"), markAsRead);
router.post("/read-all", authMiddleware, markAllAsRead);

export default router;
