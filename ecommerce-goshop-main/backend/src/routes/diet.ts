import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { verifyRolesMiddleware } from "../middleware/verifyRolesMiddleware";
import { validateIdParam, requireBody, sanitizeBody, validatePagination } from "../middleware/validate";
import {
  getAllDietPlans,
  getDietPlanById,
  createDietPlan,
  saveDietPlan,
  unsaveDietPlan,
} from "../controllers/diet";

const router = Router();

// Public routes
router.get("/", validatePagination, getAllDietPlans);
router.get("/:id", validateIdParam("id"), getDietPlanById);

// Protected routes
router.post("/", authMiddleware, verifyRolesMiddleware(["ADMIN", "COACH"]), sanitizeBody, requireBody("title"), createDietPlan);

// Save/unsave routes
router.post("/:id/save", authMiddleware, validateIdParam("id"), saveDietPlan);
router.delete("/:id/save", authMiddleware, validateIdParam("id"), unsaveDietPlan);

export default router;