import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { verifyRolesMiddleware } from "../middleware/verifyRolesMiddleware";
import * as workoutController from "../controllers/workout";

const router = Router();

// Public endpoints - no auth required
router.get("/", workoutController.getAllWorkouts);
router.get("/:id", workoutController.getWorkoutById);
router.get("/:id/exercises", workoutController.getWorkoutExercises);

// MEMBER only
router.post("/save/:id", authMiddleware, verifyRolesMiddleware(["MEMBER"]), workoutController.saveWorkout);
router.delete("/unsave/:id", authMiddleware, verifyRolesMiddleware(["MEMBER"]), workoutController.unsaveWorkout);
router.get("/saved", authMiddleware, verifyRolesMiddleware(["MEMBER"]), workoutController.getMySavedWorkouts);
router.post("/favorite/:id", authMiddleware, verifyRolesMiddleware(["MEMBER"]), workoutController.favoriteWorkout);
router.get("/favorites", authMiddleware, verifyRolesMiddleware(["MEMBER"]), workoutController.getMyFavoriteWorkouts);
router.post("/:id/complete", authMiddleware, verifyRolesMiddleware(["MEMBER"]), workoutController.completeWorkout);

// ADMIN/COACH only
router.post("/", authMiddleware, verifyRolesMiddleware(["ADMIN", "COACH"]), workoutController.createWorkout);
router.put("/:id", authMiddleware, verifyRolesMiddleware(["ADMIN", "COACH"]), workoutController.updateWorkout);
router.delete("/:id", authMiddleware, verifyRolesMiddleware(["ADMIN", "COACH"]), workoutController.deleteWorkout);
router.post("/:id/exercises", authMiddleware, verifyRolesMiddleware(["ADMIN", "COACH"]), workoutController.addExercise);
router.put("/exercises/:exerciseId", authMiddleware, verifyRolesMiddleware(["ADMIN", "COACH"]), workoutController.updateExercise);
router.delete("/exercises/:exerciseId", authMiddleware, verifyRolesMiddleware(["ADMIN", "COACH"]), workoutController.deleteExercise);

export default router;