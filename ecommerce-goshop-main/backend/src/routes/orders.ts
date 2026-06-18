import { Router } from "express";
import { getAllOrders, getOrdersByUserId } from "../controllers/orders";
import { authMiddleware } from "../middleware/authMiddleware";
import { verifyRolesMiddleware } from "../middleware/verifyRolesMiddleware";
import { validateIdParam, validatePagination } from "../middleware/validate";
const router = Router();

router.use(authMiddleware);
router.get("/", verifyRolesMiddleware(["ADMIN"]), validatePagination, getAllOrders);
router.get("/user/:id", validateIdParam("id"), getOrdersByUserId);

export default router;