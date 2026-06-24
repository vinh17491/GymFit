import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { verifyRolesMiddleware } from "../middleware/verifyRolesMiddleware";
import { getAdminDashboard, getMemberDashboard, getCoachDashboard, getWorkoutLogs, getDietLogs } from "../controllers/dashboard";

const router = Router();

router.get("/workout-logs", authMiddleware, getWorkoutLogs);
router.get("/diet-logs", authMiddleware, getDietLogs);
router.get("/admin", authMiddleware, verifyRolesMiddleware(["ADMIN"]), getAdminDashboard);
router.get("/member", authMiddleware, verifyRolesMiddleware(["MEMBER"]), getMemberDashboard);
router.get("/coach", authMiddleware, verifyRolesMiddleware(["COACH"]), getCoachDashboard);

export default router;