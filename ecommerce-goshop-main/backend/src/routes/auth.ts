import { Router } from "express";
import { register, login, refreshToken, registerWithGoogle, getCurrentUser } from "../controllers/auth";
import { requireBody, validateEmail, sanitizeBody } from "../middleware/validate";
import { authMiddleware } from "../middleware/authMiddleware";
const router = Router();

router.post("/register", sanitizeBody, requireBody("email", "password"), validateEmail, register);
router.post("/register/google", sanitizeBody, requireBody("email"), registerWithGoogle);
router.post("/google", sanitizeBody, requireBody("email"), registerWithGoogle);
router.post("/login", sanitizeBody, requireBody("email", "password"), validateEmail, login);
router.get("/me", authMiddleware, getCurrentUser);
router.post("/refresh-token", sanitizeBody, requireBody("token"), refreshToken);

export default router;