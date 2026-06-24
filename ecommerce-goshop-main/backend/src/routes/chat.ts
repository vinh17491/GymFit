import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { validateIdParam, validatePagination, requireBody } from "../middleware/validate";
import * as chatCtrl from "../controllers/chat";

const router = Router();

router.get("/", chatCtrl.getConversations);
router.get("/conversations", authMiddleware, validatePagination, chatCtrl.getConversations);
router.get("/conversations/:id/messages", authMiddleware, validateIdParam("id"), validatePagination, chatCtrl.getMessages);
router.post("/conversations/:id/messages", authMiddleware, validateIdParam("id"), requireBody("content"), chatCtrl.sendMessage);
router.post("/conversations", authMiddleware, requireBody("coachId"), chatCtrl.getOrCreateConversation);
router.put("/conversations/:id/read", authMiddleware, validateIdParam("id"), chatCtrl.markAsRead);
router.get("/unread-count", authMiddleware, chatCtrl.getUnreadCount);

export default router;
