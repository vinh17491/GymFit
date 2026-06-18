import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { verifyRolesMiddleware } from "../middleware/verifyRolesMiddleware";
import { validateIdParam, commonGetValidation } from "../middleware/validate";
import * as coachStudentsCtrl from "../controllers/coachStudents";

const router = Router();

// Coach only
router.get("/", authMiddleware, verifyRolesMiddleware(["COACH"]), commonGetValidation, coachStudentsCtrl.getCoachStudents);
router.get("/:studentId", authMiddleware, verifyRolesMiddleware(["COACH"]), validateIdParam("studentId"), coachStudentsCtrl.getCoachStudentDetail);
router.post("/assign", authMiddleware, verifyRolesMiddleware(["COACH"]), validateIdParam("studentId"), coachStudentsCtrl.assignStudent);
router.delete("/:studentId", authMiddleware, verifyRolesMiddleware(["COACH"]), validateIdParam("studentId"), coachStudentsCtrl.removeStudent);
router.put("/workout-plan/:studentId", authMiddleware, verifyRolesMiddleware(["COACH"]), validateIdParam("studentId"), coachStudentsCtrl.overrideWorkoutPlan);
router.put("/meal-plan/:studentId", authMiddleware, verifyRolesMiddleware(["COACH"]), validateIdParam("studentId"), coachStudentsCtrl.overrideMealPlan);
router.get("/:studentId/overrides", authMiddleware, verifyRolesMiddleware(["COACH"]), validateIdParam("studentId"), coachStudentsCtrl.getCoachOverrides);

export default router;