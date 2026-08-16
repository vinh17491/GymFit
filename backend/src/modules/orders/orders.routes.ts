import { NextFunction, Request, Response, Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { UserRole } from "../../types";
import { validate } from "../../middleware/validate";
import { ordersService } from "./orders.service";
import {
  createOrder,
  customerCancelOrder,
  customerOrderListQuery,
  orderIdParam,
  paymentNotification,
} from "./orders.validation";
import type {
  CustomerCancelOrderInput,
  CustomerOrderListFilters,
} from "./orders.types";
import { expireEligibleOrders } from "./order-expiration.service";
const router = Router();
const wrap =
  (
    handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
  ) =>
  (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res, next).catch(next);
  };
router.use(authenticate, authorize(UserRole.MEMBER, UserRole.COACH));
router.post(
  "/",
  validate(createOrder),
  wrap(async (req, res) => {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, message: "Authentication required" });
      return;
    }
    const order = await ordersService.createOrder(req.user.userId, req.body);
    const metadata = await ordersService.getReservationMetadata(order.id);
    res
      .status(201)
      .json({
        success: true,
        data: { ...order, reservationExpiresAt: metadata.reservationExpiresAt },
      });
  }),
);
router.get(
  "/",
  validate(customerOrderListQuery, "query"),
  wrap(async (req, res) => {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, message: "Authentication required" });
      return;
    }
    await expireEligibleOrders();
    const data = await ordersService.listCustomerOrders(
      req.user.userId,
      req.query as unknown as CustomerOrderListFilters,
    );
    res.json({ success: true, data });
  }),
);
router.get(
  "/:orderId",
  validate(orderIdParam, "params"),
  wrap(async (req, res) => {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, message: "Authentication required" });
      return;
    }
    await expireEligibleOrders();
    const orderId = Number(req.params.orderId);
    const data = await ordersService.getCustomerOrder(orderId, req.user.userId);
    const metadata = await ordersService.getReservationMetadata(orderId);
    res.json({ success: true, data: { ...data, ...metadata } });
  }),
);
router.post(
  "/:orderId/payment-notification",
  validate(orderIdParam, "params"),
  validate(paymentNotification),
  wrap(async (req, res) => {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, message: "Authentication required" });
      return;
    }
    const data = await ordersService.notifyPayment(
      Number(req.params.orderId),
      req.user.userId,
      req.body,
    );
    res.json({ success: true, data });
  }),
);
router.patch(
  "/:orderId/cancel",
  validate(orderIdParam, "params"),
  validate(customerCancelOrder),
  wrap(async (req, res) => {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, message: "Authentication required" });
      return;
    }
    const data = await ordersService.cancelCustomerOrder(
      Number(req.params.orderId),
      req.user.userId,
      req.body as CustomerCancelOrderInput,
    );
    res.json({ success: true, data });
  }),
);
export default router;
