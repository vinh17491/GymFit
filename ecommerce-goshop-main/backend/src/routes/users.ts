import { Router } from "express";
import { getUserById, updateUser, deleteUser, getAllUsers } from "../controllers/users";
import { multerUpload } from "../middleware/multerMiddleware";
import { processImageUpload } from "../middleware/processImageUpload";
import { authMiddleware } from "../middleware/authMiddleware";
import { verifyRolesMiddleware } from "../middleware/verifyRolesMiddleware";
import { validateIdParam, validatePagination, sanitizeBody, validateEmail, validateRole } from "../middleware/validate";

const router = Router();

router.get("/", authMiddleware, verifyRolesMiddleware(["ADMIN"]), validatePagination, getAllUsers);
router.get("/:id", authMiddleware, validateIdParam("id"), getUserById);
router.patch("/:id", authMiddleware, validateIdParam("id"), sanitizeBody, multerUpload.single("avatar"), processImageUpload, validateEmail, validateRole, updateUser);
router.delete("/:id", authMiddleware, verifyRolesMiddleware(["ADMIN"]), validateIdParam("id"), deleteUser);

export default router;