import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { verifyRolesMiddleware } from "../middleware/verifyRolesMiddleware";
import { validatePagination, requireBody, validatePositiveNumber } from "../middleware/validate";
import * as creditsCtrl from "../controllers/credits";

const router = Router();

router.get("/", authMiddleware, creditsCtrl.getCreditOverview);
router.get("/balance", authMiddleware, creditsCtrl.getCreditBalance);
router.get("/history", authMiddleware, validatePagination, creditsCtrl.getCreditTransactions);
router.get("/rewards", authMiddleware, validatePagination, creditsCtrl.getRewardsCatalog);
router.post("/purchase", authMiddleware, requireBody("amount"), validatePositiveNumber("amount"), creditsCtrl.purchaseCredits);
router.post("/redeem", authMiddleware, requireBody("rewardId"), creditsCtrl.redeemReward);
router.post("/admin/adjust", authMiddleware, verifyRolesMiddleware(["ADMIN"]), requireBody("userId", "amount", "reason"), validatePositiveNumber("amount"), creditsCtrl.adminAdjustCredits);

export default router;
