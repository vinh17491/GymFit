import { Router } from "express";
import { getUserById, updateUser, deleteUser, getAllUsers } from "../controllers/users";
import { multerUpload } from "../middleware/multerMiddleware";
import { processImageUpload } from "../middleware/processImageUpload";
import { authMiddleware } from "../middleware/authMiddleware";
import { verifyRolesMiddleware } from "../middleware/verifyRolesMiddleware";

const router = Router();

router.get("/", authMiddleware, verifyRolesMiddleware(["ADMIN"]), getAllUsers);
router.get("/:id", authMiddleware, getUserById);
router.patch("/:id", authMiddleware, multerUpload.single("avatar"), processImageUpload, updateUser);
router.delete("/:id", authMiddleware, verifyRolesMiddleware(["ADMIN"]), deleteUser);

export default router;