import { NextFunction, Request, Response, Router } from "express";
import { z } from "zod";

import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { UserRole } from "../../types";
import { complaintsService } from "./complaints.service";

const idParams = z.object({ complaintId: z.coerce.number().int().positive() }).strict();
const replacementParams = z.object({ replacementId: z.coerce.number().int().positive() }).strict();
const reasonBody = z.object({ reason: z.string().trim().min(3).max(1000) }).strict();
const handle =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

export const complaintsRouter = Router();
complaintsRouter.use(authenticate, authorize(UserRole.MEMBER, UserRole.COACH));
complaintsRouter.post(
  "/",
  validate(
    z
      .object({
        orderItemId: z.coerce.number().int().positive(),
        category: z.enum(["DAMAGED", "WRONG_ITEM", "MISSING_QUANTITY", "QUALITY_ISSUE", "OTHER"]),
        affectedQuantity: z.coerce.number().int().positive(),
        description: z.string().trim().min(10).max(2000),
      })
      .strict(),
  ),
  handle(async (req, res) => {
    const complaint = await complaintsService.create(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: complaint });
  }),
);
complaintsRouter.get(
  "/",
  handle(async (req, res) => {
    res.json({ success: true, data: await complaintsService.listBuyer(req.user!.userId) });
  }),
);
complaintsRouter.get(
  "/:complaintId",
  validate(idParams, "params"),
  handle(async (req, res) => {
    res.json({ success: true, data: await complaintsService.detailBuyer(req.user!.userId, Number(req.params.complaintId)) });
  }),
);

export const sellerComplaintsRouter = Router();
sellerComplaintsRouter.use(authenticate, authorize(UserRole.SELLER));
sellerComplaintsRouter.get(
  "/",
  handle(async (req, res) => {
    res.json({ success: true, data: await complaintsService.listSeller(req.user!.userId) });
  }),
);
sellerComplaintsRouter.get(
  "/:complaintId",
  validate(idParams, "params"),
  handle(async (req, res) => {
    res.json({ success: true, data: await complaintsService.detailSeller(req.user!.userId, Number(req.params.complaintId)) });
  }),
);
sellerComplaintsRouter.post(
  "/replacements/:replacementId/ready-for-pickup",
  validate(replacementParams, "params"),
  handle(async (req, res) => {
    res.json({
      success: true,
      data: await complaintsService.sellerReady(Number(req.params.replacementId), req.user!.userId),
    });
  }),
);

export const adminComplaintsRouter = Router();
adminComplaintsRouter.use(authenticate, authorize(UserRole.ADMIN));
adminComplaintsRouter.get(
  "/",
  validate(
    z
      .object({
        status: z
          .enum(["OPEN", "UNDER_REVIEW", "REPLACEMENT_REQUIRED", "RESOLVED", "REJECTED"])
          .optional(),
        faultParty: z
          .enum(["UNDETERMINED", "SELLER_FAULT", "BUYER_FAULT", "GYMFIT_OR_CARRIER"])
          .optional(),
        search: z.string().trim().max(100).optional(),
        from: z.string().date().optional(),
        to: z.string().date().optional(),
      })
      .strict(),
    "query",
  ),
  handle(async (req, res) => {
    res.json({ success: true, data: await complaintsService.listAdmin(req.query as any) });
  }),
);
adminComplaintsRouter.get(
  "/:complaintId",
  validate(idParams, "params"),
  handle(async (req, res) => {
    res.json({ success: true, data: await complaintsService.detailAdmin(Number(req.params.complaintId)) });
  }),
);
adminComplaintsRouter.post(
  "/:complaintId/start-review",
  validate(idParams, "params"),
  validate(reasonBody),
  handle(async (req, res) => {
    res.json({
      success: true,
      data: await complaintsService.startReview(
        Number(req.params.complaintId),
        req.user!.userId,
        req.body.reason,
      ),
    });
  }),
);
adminComplaintsRouter.post(
  "/:complaintId/decisions/seller-fault",
  validate(idParams, "params"),
  validate(
    z
      .object({
        reason: z.string().trim().min(3).max(1000),
        replacementQuantity: z.coerce.number().int().positive(),
      })
      .strict(),
  ),
  handle(async (req, res) => {
    res.json({
      success: true,
      data: await complaintsService.decideSellerFault(
        Number(req.params.complaintId),
        req.user!.userId,
        req.body,
      ),
    });
  }),
);
adminComplaintsRouter.post(
  "/:complaintId/decisions/buyer-fault",
  validate(idParams, "params"),
  validate(reasonBody),
  handle(async (req, res) => {
    res.json({
      success: true,
      data: await complaintsService.decideBuyerFault(
        Number(req.params.complaintId),
        req.user!.userId,
        req.body.reason,
      ),
    });
  }),
);
adminComplaintsRouter.post(
  "/:complaintId/reject",
  validate(idParams, "params"),
  validate(reasonBody),
  handle(async (req, res) => {
    res.json({
      success: true,
      data: await complaintsService.decideBuyerFault(
        Number(req.params.complaintId),
        req.user!.userId,
        req.body.reason,
      ),
    });
  }),
);
adminComplaintsRouter.post(
  "/:complaintId/decisions/gymfit-carrier",
  validate(idParams, "params"),
  validate(reasonBody),
  handle(async (req, res) => {
    res.json({
      success: true,
      data: await complaintsService.decideGymfitFault(
        Number(req.params.complaintId),
        req.user!.userId,
        req.body.reason,
      ),
    });
  }),
);
adminComplaintsRouter.post(
  "/replacements/:replacementId/actions",
  validate(replacementParams, "params"),
  validate(
    z
      .object({
        action: z.enum([
          "PICKED_UP",
          "IN_TRANSIT_TO_HUB",
          "RECEIVED_AT_HUB",
          "HUB_CHECK_PASSED",
          "HUB_CHECK_FAILED",
          "SHIPPED",
          "DELIVERED",
          "FAILED",
        ]),
        reason: z.string().trim().min(3).max(1000).optional(),
      })
      .strict(),
  ),
  handle(async (req, res) => {
    res.json({
      success: true,
      data: await complaintsService.transitionReplacement(
        Number(req.params.replacementId),
        req.user!.userId,
        req.body.action,
        req.body.reason,
      ),
    });
  }),
);
adminComplaintsRouter.post(
  "/:complaintId/refund-fallback",
  validate(idParams, "params"),
  validate(
    z
      .object({
        amount: z.coerce.number().positive().optional(),
        reason: z.string().trim().min(3).max(1000),
      })
      .strict(),
  ),
  handle(async (req, res) => {
    res.status(201).json({
      success: true,
      data: await complaintsService.createRefund(
        Number(req.params.complaintId),
        req.user!.userId,
        req.body,
      ),
    });
  }),
);
adminComplaintsRouter.post(
  "/:complaintId/resolve",
  validate(idParams, "params"),
  validate(
    z
      .object({
        resolutionType: z.enum(["REFUND", "MANUAL_SUPPORT"]),
        reason: z.string().trim().min(3).max(1000),
      })
      .strict(),
  ),
  handle(async (req, res) => {
    res.json({
      success: true,
      data: await complaintsService.resolve(
        Number(req.params.complaintId),
        req.user!.userId,
        req.body,
      ),
    });
  }),
);
