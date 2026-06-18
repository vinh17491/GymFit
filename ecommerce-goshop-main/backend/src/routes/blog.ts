import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { verifyRolesMiddleware } from "../middleware/verifyRolesMiddleware";
import { validateIdParam, validatePagination, sanitizeBody, requireBody } from "../middleware/validate";
import * as blogController from "../controllers/blog";

const router = Router();

// Public endpoints - no auth required
router.get("/", validatePagination, blogController.getBlogs);
router.get("/search", blogController.searchBlogs);
router.get("/:id", validateIdParam("id"), blogController.getBlogById);
router.get("/:id/comments", validateIdParam("id"), blogController.getComments);

// Authenticated endpoints
router.post("/:id/comment", authMiddleware, validateIdParam("id"), sanitizeBody, requireBody("content"), blogController.createComment);
router.post("/:id/like", authMiddleware, validateIdParam("id"), blogController.likeBlog);
router.delete("/:id/like", authMiddleware, validateIdParam("id"), blogController.unlikeBlog);

// ADMIN only
router.post("/admin", authMiddleware, verifyRolesMiddleware(["ADMIN"]), sanitizeBody, requireBody("title"), blogController.createBlog);
router.put("/admin/:id", authMiddleware, verifyRolesMiddleware(["ADMIN"]), validateIdParam("id"), sanitizeBody, blogController.updateBlog);
router.delete("/admin/:id", authMiddleware, verifyRolesMiddleware(["ADMIN"]), validateIdParam("id"), blogController.deleteBlog);

export default router;