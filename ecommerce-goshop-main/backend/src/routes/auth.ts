import { Router } from "express";
import { register, login, refreshToken, registerWithGoogle } from "../controllers/auth";
const router = Router();

router.post("/register", register);
router.post("/register/google", registerWithGoogle);
router.post("/google", registerWithGoogle);
router.post("/login", login);
router.post("/refresh-token", refreshToken);

export default router;