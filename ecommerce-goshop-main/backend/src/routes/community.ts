import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { validateIdParam, validatePagination, requireBody } from "../middleware/validate";
import * as communityCtrl from "../controllers/community";

const router = Router();

// Public - read only
router.get("/posts", validatePagination, communityCtrl.getCommunityPosts);
router.get("/posts/:id", validateIdParam("id"), communityCtrl.getCommunityPostById);

// Authenticated
router.post("/posts", authMiddleware, requireBody("title"), communityCtrl.createCommunityPost);
router.put("/posts/:id", authMiddleware, validateIdParam("id"), communityCtrl.updateCommunityPost);
router.delete("/posts/:id", authMiddleware, validateIdParam("id"), communityCtrl.deleteCommunityPost);
router.post("/posts/:postId/answers", authMiddleware, validateIdParam("postId"), communityCtrl.createAnswer);
router.post("/answers/:answerId/upvote", authMiddleware, validateIdParam("answerId"), communityCtrl.upvoteAnswer);
router.post("/answers/:answerId/accept", authMiddleware, validateIdParam("answerId"), communityCtrl.acceptAnswer);

export default router;