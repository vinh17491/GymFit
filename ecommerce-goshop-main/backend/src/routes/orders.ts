import { Router } from "express";
import { getAllOrders, getOrderById, getOrdersByUserId } from "../controllers/orders";
import { authMiddleware } from "../middleware/authMiddleware";
import { verifyRolesMiddleware } from "../middleware/verifyRolesMiddleware";
import { validateIdParam, validatePagination } from "../middleware/validate";
const router = Router();

router.use(authMiddleware);
router.get("/", authMiddleware, verifyRolesMiddleware(["ADMIN"]), validatePagination, getAllOrders);
router.get("/:id", authMiddleware, validateIdParam("id"), getOrderById);
router.get("/user/:id", authMiddleware, verifyRolesMiddleware(["ADMIN"]), validateIdParam("id"), getOrdersByUserId);

export default router;