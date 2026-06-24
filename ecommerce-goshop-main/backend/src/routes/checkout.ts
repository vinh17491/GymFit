import { Router } from "express";
import { createOrder, getMyOrders, getOrderDetail } from "../controllers/checkout";
import { authMiddleware } from "../middleware/authMiddleware";
const router = Router();

router.use(authMiddleware);
router.post("/create-order", createOrder);
router.get("/my-orders", getMyOrders);
router.get("/order/:id", getOrderDetail);

export default router;