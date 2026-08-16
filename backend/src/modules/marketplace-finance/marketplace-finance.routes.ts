import {Router} from "express";
import {z} from "zod";
import {authenticate,authorize} from "../../middleware/auth";
import {validate} from "../../middleware/validate";
import {UserRole} from "../../types";
import {marketplaceFinanceService,type DateFilters} from "./marketplace-finance.service";

const status=z.enum(["PENDING","HELD","ELIGIBLE","PAID"]);
const filters=z.object({from:z.string().date().optional(),to:z.string().date().optional(),status:status.optional(),page:z.coerce.number().int().positive().optional(),pageSize:z.coerce.number().int().min(1).max(100).optional(),search:z.string().trim().max(100).optional(),shopId:z.coerce.number().int().positive().optional()}).strict();
const settlementId=z.object({settlementId:z.coerce.number().int().positive()});
const adjustmentId=z.object({adjustmentId:z.coerce.number().int().positive()});
const batchId=z.object({batchId:z.coerce.number().int().positive()});
const reason=z.object({reason:z.string().trim().min(3).max(500)}).strict();
const hold=reason.extend({sourceType:z.string().trim().max(50).optional(),sourceId:z.string().trim().max(100).optional()}).strict();
const adjustment=z.object({shopId:z.number().int().positive(),signedAmount:z.number().finite().refine(value=>value!==0),reason:z.string().trim().min(3).max(500),internalNote:z.string().trim().max(1000).optional(),sourceShopOrderId:z.number().int().positive().optional(),sourceSettlementId:z.number().int().positive().optional(),sourcePaidSettlementId:z.number().int().positive().optional(),sourceRefundId:z.number().int().positive().optional(),sourceReference:z.string().trim().max(255).optional()}).strict();
const apply=z.object({targetSettlementId:z.number().int().positive()}).strict();
const batch=z.object({periodStart:z.string().date(),periodEnd:z.string().date(),settlementIds:z.array(z.number().int().positive()).min(1).max(500)}).strict();
const paid=reason.extend({externalReference:z.string().trim().max(255).optional()}).strict();

const sellerRouter=Router();
sellerRouter.use(authenticate,authorize(UserRole.SELLER));
sellerRouter.get("/summary",validate(filters.omit({shopId:true}),"query"),async(req,res,next)=>{try{res.json({success:true,data:await marketplaceFinanceService.sellerSummary(req.user!.userId,req.query as DateFilters)});}catch(error){next(error);}});
sellerRouter.get("/settlements",validate(filters.omit({shopId:true}),"query"),async(req,res,next)=>{try{res.json({success:true,data:await marketplaceFinanceService.sellerList(req.user!.userId,req.query as DateFilters)});}catch(error){next(error);}});
sellerRouter.get("/settlements/:settlementId",validate(settlementId,"params"),async(req,res,next)=>{try{res.json({success:true,data:await marketplaceFinanceService.sellerDetail(req.user!.userId,Number(req.params.settlementId))});}catch(error){next(error);}});
sellerRouter.get("/adjustments",async(req,res,next)=>{try{res.json({success:true,data:await marketplaceFinanceService.sellerAdjustments(req.user!.userId)});}catch(error){next(error);}});

const adminRouter=Router();
adminRouter.use(authenticate,authorize(UserRole.ADMIN));
adminRouter.get("/settlements",validate(filters,"query"),async(req,res,next)=>{try{res.json({success:true,data:await marketplaceFinanceService.list(req.query as DateFilters)});}catch(error){next(error);}});
adminRouter.post("/settlements/refresh-eligibility",async(_req,res,next)=>{try{res.json({success:true,data:await marketplaceFinanceService.refreshEligibility()});}catch(error){next(error);}});
adminRouter.get("/settlements/:settlementId",validate(settlementId,"params"),async(req,res,next)=>{try{res.json({success:true,data:await marketplaceFinanceService.detail(Number(req.params.settlementId))});}catch(error){next(error);}});
adminRouter.post("/settlements/:settlementId/hold",validate(settlementId,"params"),validate(hold),async(req,res,next)=>{try{res.json({success:true,data:await marketplaceFinanceService.hold(Number(req.params.settlementId),req.user!.userId,req.body)});}catch(error){next(error);}});
adminRouter.post("/settlements/:settlementId/release",validate(settlementId,"params"),validate(reason),async(req,res,next)=>{try{res.json({success:true,data:await marketplaceFinanceService.release(Number(req.params.settlementId),req.user!.userId,req.body)});}catch(error){next(error);}});
adminRouter.post("/adjustments",validate(adjustment),async(req,res,next)=>{try{res.status(201).json({success:true,data:await marketplaceFinanceService.createAdjustment(req.user!.userId,req.body)});}catch(error){next(error);}});
adminRouter.post("/adjustments/:adjustmentId/apply",validate(adjustmentId,"params"),validate(apply),async(req,res,next)=>{try{res.json({success:true,data:await marketplaceFinanceService.applyAdjustment(Number(req.params.adjustmentId),req.body.targetSettlementId,req.user!.userId)});}catch(error){next(error);}});
adminRouter.post("/adjustments/:adjustmentId/void",validate(adjustmentId,"params"),validate(reason),async(req,res,next)=>{try{res.json({success:true,data:await marketplaceFinanceService.voidAdjustment(Number(req.params.adjustmentId),req.user!.userId,req.body.reason)});}catch(error){next(error);}});
adminRouter.post("/settlement-batches",validate(batch),async(req,res,next)=>{try{res.status(201).json({success:true,data:await marketplaceFinanceService.createBatch(req.user!.userId,req.body)});}catch(error){next(error);}});
adminRouter.get("/settlement-batches",async(_req,res,next)=>{try{res.json({success:true,data:await marketplaceFinanceService.batches()});}catch(error){next(error);}});
adminRouter.get("/settlement-batches/:batchId",validate(batchId,"params"),async(req,res,next)=>{try{res.json({success:true,data:await marketplaceFinanceService.batchDetail(Number(req.params.batchId))});}catch(error){next(error);}});
adminRouter.post("/settlement-batches/:batchId/mark-paid",validate(batchId,"params"),validate(paid),async(req,res,next)=>{try{res.json({success:true,data:await marketplaceFinanceService.markBatchPaid(Number(req.params.batchId),req.user!.userId,req.body)});}catch(error){next(error);}});

export {sellerRouter as sellerFinanceRouter,adminRouter as adminFinanceRouter};
