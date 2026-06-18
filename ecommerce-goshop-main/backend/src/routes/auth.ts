import { Router } from "express";
import { register, login, refreshToken, registerWithGoogle } from "../controllers/auth";
import { requireBody, validateEmail, sanitizeBody } from "../middleware/validate";
const router = Router();

router.post("/register", sanitizeBody, requireBody("email", "password"), validateEmail, register);
router.post("/register/google", sanitizeBody, requireBody("email"), registerWithGoogle);
router.post("/google", sanitizeBody, requireBody("email"), registerWithGoogle);
router.post("/login", sanitizeBody, requireBody("email", "password"), validateEmail, login);
router.post("/refresh-token", sanitizeBody, requireBody("token"), refreshToken);

export default router;