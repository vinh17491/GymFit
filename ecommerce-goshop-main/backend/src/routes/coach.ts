import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { verifyRolesMiddleware } from "../middleware/verifyRolesMiddleware";
import { getAllCoaches, getCoachById, getCoachSchedules, createCoach, updateCoach, deleteCoach } from "../controllers/coach";

const router = Router();

// Public routes
router.get("/", getAllCoaches);
router.get("/:id", getCoachById);
router.get("/:id/schedules", getCoachSchedules);

// Admin routes
router.post("/admin", authMiddleware, verifyRolesMiddleware(["ADMIN"]), createCoach);
router.put("/admin/:id", authMiddleware, verifyRolesMiddleware(["ADMIN"]), updateCoach);
router.delete("/admin/:id", authMiddleware, verifyRolesMiddleware(["ADMIN"]), deleteCoach);

export default router;