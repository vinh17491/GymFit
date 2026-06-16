import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { verifyRolesMiddleware } from "../middleware/verifyRolesMiddleware";
import {
  getAllDietPlans,
  getDietPlanById,
  createDietPlan,
  saveDietPlan,
  unsaveDietPlan,
} from "../controllers/diet";

const router = Router();

// Public routes
router.get("/", getAllDietPlans);
router.get("/:id", getDietPlanById);

// Protected routes
router.post("/", authMiddleware, verifyRolesMiddleware(["ADMIN", "COACH"]), createDietPlan);

// Save/unsave routes
router.post("/:id/save", authMiddleware, saveDietPlan);
router.delete("/:id/save", authMiddleware, unsaveDietPlan);

export default router;