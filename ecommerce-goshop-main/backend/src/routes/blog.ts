import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { verifyRolesMiddleware } from "../middleware/verifyRolesMiddleware";
import * as blogController from "../controllers/blog";

const router = Router();

// Public endpoints - no auth required
router.get("/", blogController.getBlogs);
router.get("/search", blogController.searchBlogs);
router.get("/:id", blogController.getBlogById);
router.get("/:id/comments", blogController.getComments);

// Authenticated endpoints
router.post("/:id/comment", authMiddleware, blogController.createComment);
router.post("/:id/like", authMiddleware, blogController.likeBlog);
router.delete("/:id/like", authMiddleware, blogController.unlikeBlog);

// ADMIN only
router.post("/admin", authMiddleware, verifyRolesMiddleware(["ADMIN"]), blogController.createBlog);
router.put("/admin/:id", authMiddleware, verifyRolesMiddleware(["ADMIN"]), blogController.updateBlog);
router.delete("/admin/:id", authMiddleware, verifyRolesMiddleware(["ADMIN"]), blogController.deleteBlog);

export default router;