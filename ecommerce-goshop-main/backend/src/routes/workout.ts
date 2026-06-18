import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { verifyRolesMiddleware } from "../middleware/verifyRolesMiddleware";
import { validateIdParam, requireBody, validatePagination, sanitizeBody } from "../middleware/validate";
import * as workoutController from "../controllers/workout";

const router = Router();

// Public endpoints - no auth required
router.get("/", validatePagination, workoutController.getAllWorkouts);
router.get("/:id", validateIdParam("id"), workoutController.getWorkoutById);
router.get("/:id/exercises", validateIdParam("id"), workoutController.getWorkoutExercises);

// MEMBER only
router.post("/save/:id", authMiddleware, verifyRolesMiddleware(["MEMBER"]), validateIdParam("id"), workoutController.saveWorkout);
router.delete("/unsave/:id", authMiddleware, verifyRolesMiddleware(["MEMBER"]), validateIdParam("id"), workoutController.unsaveWorkout);
router.get("/saved", authMiddleware, verifyRolesMiddleware(["MEMBER"]), validatePagination, workoutController.getMySavedWorkouts);
router.post("/favorite/:id", authMiddleware, verifyRolesMiddleware(["MEMBER"]), validateIdParam("id"), workoutController.favoriteWorkout);
router.get("/favorites", authMiddleware, verifyRolesMiddleware(["MEMBER"]), validatePagination, workoutController.getMyFavoriteWorkouts);
router.post("/:id/complete", authMiddleware, verifyRolesMiddleware(["MEMBER"]), validateIdParam("id"), workoutController.completeWorkout);

// ADMIN/COACH only
router.post("/", authMiddleware, verifyRolesMiddleware(["ADMIN", "COACH"]), sanitizeBody, requireBody("title"), workoutController.createWorkout);
router.put("/:id", authMiddleware, verifyRolesMiddleware(["ADMIN", "COACH"]), validateIdParam("id"), sanitizeBody, workoutController.updateWorkout);
router.delete("/:id", authMiddleware, verifyRolesMiddleware(["ADMIN", "COACH"]), validateIdParam("id"), workoutController.deleteWorkout);
router.post("/:id/exercises", authMiddleware, verifyRolesMiddleware(["ADMIN", "COACH"]), validateIdParam("id"), sanitizeBody, workoutController.addExercise);
router.put("/exercises/:exerciseId", authMiddleware, verifyRolesMiddleware(["ADMIN", "COACH"]), workoutController.updateExercise);
router.delete("/exercises/:exerciseId", authMiddleware, verifyRolesMiddleware(["ADMIN", "COACH"]), workoutController.deleteExercise);

export default router;