import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { verifyRolesMiddleware } from "../middleware/verifyRolesMiddleware";
import { getAllCoaches, getCoachById, getCoachSchedules, createCoach, updateCoach, deleteCoach } from "../controllers/coach";
import { validateIdParam, validatePagination, requireBody } from "../middleware/validate";

const router = Router();

// Public routes
router.get("/", validatePagination, getAllCoaches);
router.get("/:id", validateIdParam("id"), getCoachById);
router.get("/:id/schedules", validateIdParam("id"), getCoachSchedules);

// Admin routes
router.post("/admin", authMiddleware, verifyRolesMiddleware(["ADMIN"]), requireBody("name", "specialty"), createCoach);
router.put("/admin/:id", authMiddleware, verifyRolesMiddleware(["ADMIN"]), validateIdParam("id"), updateCoach);
router.delete("/admin/:id", authMiddleware, verifyRolesMiddleware(["ADMIN"]), validateIdParam("id"), deleteCoach);

export default router;