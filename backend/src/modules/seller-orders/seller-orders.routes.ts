import { NextFunction,Request,Response,Router } from "express";
import { authenticate,authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { UserRole } from "../../types";
import { sellerOrdersService } from "./seller-orders.service";
import type { SellerShopOrderFilters,SellerStockCheckInput } from "./seller-orders.types";
import { sellerShopOrderId,sellerShopOrderList,sellerStockCheck } from "./seller-orders.validation";

const router=Router();
const wrap=(handler:(req:Request,res:Response,next:NextFunction)=>Promise<void>)=>
  (req:Request,res:Response,next:NextFunction):void=>{void handler(req,res,next).catch(next);};

router.use(authenticate,authorize(UserRole.SELLER));
router.get("/",validate(sellerShopOrderList,"query"),wrap(async(req,res)=>{
  if(!req.user){res.status(401).json({success:false,message:"Authentication required"});return;}
  const data=await sellerOrdersService.list(req.user.userId,req.query as unknown as SellerShopOrderFilters);
  res.json({success:true,data});
}));
router.get("/:shopOrderId",validate(sellerShopOrderId,"params"),wrap(async(req,res)=>{
  if(!req.user){res.status(401).json({success:false,message:"Authentication required"});return;}
  const data=await sellerOrdersService.detail(req.user.userId,Number(req.params.shopOrderId));
  res.json({success:true,data});
}));
router.post("/:shopOrderId/stock-check",validate(sellerShopOrderId,"params"),validate(sellerStockCheck),wrap(async(req,res)=>{
  if(!req.user){res.status(401).json({success:false,message:"Authentication required"});return;}
  const data=await sellerOrdersService.stockCheck(req.user.userId,Number(req.params.shopOrderId),req.body as SellerStockCheckInput);
  res.json({success:true,data});
}));
router.post("/:shopOrderId/ready-for-pickup",validate(sellerShopOrderId,"params"),wrap(async(req,res)=>{
  if(!req.user){res.status(401).json({success:false,message:"Authentication required"});return;}
  const data=await sellerOrdersService.readyForPickup(req.user.userId,Number(req.params.shopOrderId));
  res.json({success:true,data});
}));

export default router;
