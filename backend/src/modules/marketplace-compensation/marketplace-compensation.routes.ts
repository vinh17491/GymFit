import {Router} from "express";
import {authenticate,authorize} from "../../middleware/auth";
import {UserRole} from "../../types";
import {compensationVoucherService} from "./marketplace-compensation.service";

const router=Router();
router.get("/vouchers",authenticate,authorize(UserRole.MEMBER,UserRole.COACH),async(req,res,next)=>{
  try{
    if(!req.user){res.status(401).json({success:false,message:"Authentication required"});return;}
    res.json({success:true,data:await compensationVoucherService.listForBuyer(req.user.userId)});
  }catch(error){next(error);}
});
export default router;
