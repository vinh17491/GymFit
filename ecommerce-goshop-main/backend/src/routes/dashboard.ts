import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { verifyRolesMiddleware } from "../middleware/verifyRolesMiddleware";
import { getAdminDashboard, getMemberDashboard, getCoachDashboard } from "../controllers/dashboard";

const router = Router();

router.get("/admin", authMiddleware, verifyRolesMiddleware(["ADMIN"]), getAdminDashboard);
router.get("/member", authMiddleware, verifyRolesMiddleware(["MEMBER"]), getMemberDashboard);
router.get("/coach", authMiddleware, verifyRolesMiddleware(["COACH"]), getCoachDashboard);

export default router;