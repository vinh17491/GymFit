import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { verifyRolesMiddleware } from "../middleware/verifyRolesMiddleware";
import {
  createBooking,
  getMyBookings,
  getBookingHistory,
  cancelBooking,
  getCoachBookings,
  completeBooking,
  getAllBookings,
} from "../controllers/booking";

const router = Router();

// Member routes (require auth)
router.post("/", authMiddleware, verifyRolesMiddleware(["MEMBER"]), createBooking);
router.get("/my", authMiddleware, getMyBookings);
router.get("/history", authMiddleware, getBookingHistory);
router.post("/:id/cancel", authMiddleware, cancelBooking);

// Coach routes
router.get("/coach", authMiddleware, getCoachBookings);
router.post("/:id/complete", authMiddleware, completeBooking);

// Admin routes
router.get("/admin", authMiddleware, verifyRolesMiddleware(["ADMIN"]), getAllBookings);

export default router;