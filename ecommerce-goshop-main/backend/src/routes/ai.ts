import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireBody, validatePagination } from "../middleware/validate";
import * as aiCtrl from "../controllers/ai";

const router = Router();

router.post("/generate-workout", authMiddleware, requireBody("fitnessLevel", "goal"), aiCtrl.generateWorkout);
router.post("/generate-meal-plan", authMiddleware, requireBody("dietaryPreference", "calories"), aiCtrl.generateMealPlan);
router.get("/music-recommendations", authMiddleware, validatePagination, aiCtrl.getMusicRecommendations);

export default router;
