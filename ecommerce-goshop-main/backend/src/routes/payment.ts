import { Router } from "express";
import { confirmPayment, getQrInfo, verifyPayment, purchaseMembership, createBooking } from "../controllers/webhook";
import { authMiddleware } from "../middleware/authMiddleware";
import { verifyRolesMiddleware } from "../middleware/verifyRolesMiddleware";
const router = Router();

// Payment routes
router.get("/qr-info", getQrInfo);
router.post("/confirm", authMiddleware, confirmPayment);
router.post("/verify", authMiddleware, verifyRolesMiddleware(["ADMIN"]), verifyPayment);

// Membership
router.post("/membership/purchase", authMiddleware, verifyRolesMiddleware(["MEMBER"]), purchaseMembership);

// Booking
router.post("/booking", authMiddleware, verifyRolesMiddleware(["MEMBER"]), createBooking);

export default router;