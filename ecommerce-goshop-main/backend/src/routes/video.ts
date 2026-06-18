import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { verifyRolesMiddleware } from "../middleware/verifyRolesMiddleware";
import { validateIdParam, validatePagination, requireBody } from "../middleware/validate";
import * as videoCtrl from "../controllers/video";

const router = Router();

// Public - view
router.get("/categories", videoCtrl.getVideoCategories);
router.get("/", validatePagination, videoCtrl.getVideos);
router.get("/:id", validateIdParam("id"), videoCtrl.getVideoById);

// Coach / Admin - CRUD
router.post("/", authMiddleware, verifyRolesMiddleware(["COACH", "ADMIN"]), requireBody("title"), videoCtrl.createVideo);
router.put("/:id", authMiddleware, validateIdParam("id"), verifyRolesMiddleware(["COACH", "ADMIN"]), videoCtrl.updateVideo);
router.delete("/:id", authMiddleware, validateIdParam("id"), verifyRolesMiddleware(["ADMIN"]), videoCtrl.deleteVideo);

export default router;
