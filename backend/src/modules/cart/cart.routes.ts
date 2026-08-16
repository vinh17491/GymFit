import { NextFunction, Request, Response, Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { UserRole } from "../../types";
import { cartService, CartConflictError } from "./cart.service";
import {
  addCartItem,
  cartItemIdParam,
  cartMutation,
  mergeGuestCart,
  updateCartItem,
} from "./cart.validation";

const router = Router();
const wrap =
  (
    handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
  ) =>
  (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res, next).catch(async (error: unknown) => {
      if (error instanceof CartConflictError && req.user) {
        try {
          const cart = await cartService.getCart(req.user.userId);
          res.status(409).json({
            success: false,
            code: error.code,
            message: error.message,
            conflict: { cartItemId: error.itemId ?? null },
            data: { cart },
          });
          return;
        } catch (canonicalError) {
          next(canonicalError);
          return;
        }
      }
      next(error);
    });
  };

router.use(authenticate, authorize(UserRole.MEMBER, UserRole.COACH));
router.get(
  "/",
  wrap(async (req, res) => {
    res.json({ success: true, data: await cartService.getCart(req.user!.userId) });
  }),
);
router.post(
  "/items",
  validate(addCartItem),
  wrap(async (req, res) => {
    res.status(201).json({
      success: true,
      data: await cartService.addItem(req.user!.userId, req.body),
    });
  }),
);
router.patch(
  "/items/:cartItemId",
  validate(cartItemIdParam, "params"),
  validate(updateCartItem),
  wrap(async (req, res) => {
    res.json({
      success: true,
      data: await cartService.updateItem(
        req.user!.userId,
        Number(req.params.cartItemId),
        req.body,
      ),
    });
  }),
);
router.delete(
  "/items/:cartItemId",
  validate(cartItemIdParam, "params"),
  validate(cartMutation),
  wrap(async (req, res) => {
    res.json({
      success: true,
      data: await cartService.removeItem(
        req.user!.userId,
        Number(req.params.cartItemId),
        req.body,
      ),
    });
  }),
);
router.delete(
  "/",
  validate(cartMutation),
  wrap(async (req, res) => {
    res.json({
      success: true,
      data: await cartService.clearCart(req.user!.userId, req.body),
    });
  }),
);
router.post(
  "/merge",
  validate(mergeGuestCart),
  wrap(async (req, res) => {
    res.json({
      success: true,
      data: await cartService.mergeGuestCart(req.user!.userId, req.body.items),
    });
  }),
);

export default router;
