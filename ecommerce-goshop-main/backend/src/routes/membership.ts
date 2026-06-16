import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { verifyRolesMiddleware } from "../middleware/verifyRolesMiddleware";
import {
  getAllPlans,
  getPlanById,
  purchaseMembership,
  getMyMembership,
  getMembershipHistory,
  cancelMembership,
  createPlan,
  updatePlan,
  deletePlan,
  getAllMemberships,
} from "../controllers/membership";

const router = Router();

// Public routes
router.get("/plans", getAllPlans);
router.get("/plans/:id", getPlanById);

// Member routes (require auth + MEMBER role only)
router.post("/purchase", authMiddleware, verifyRolesMiddleware(["MEMBER"]), purchaseMembership);
router.get("/my", authMiddleware, getMyMembership);
router.get("/history", authMiddleware, getMembershipHistory);
router.post("/:id/cancel", authMiddleware, cancelMembership);

// Admin routes
router.post("/admin/plans", authMiddleware, verifyRolesMiddleware(["ADMIN"]), createPlan);
router.put("/admin/plans/:id", authMiddleware, verifyRolesMiddleware(["ADMIN"]), updatePlan);
router.delete("/admin/plans/:id", authMiddleware, verifyRolesMiddleware(["ADMIN"]), deletePlan);
router.get("/admin/memberships", authMiddleware, verifyRolesMiddleware(["ADMIN"]), getAllMemberships);

export default router;