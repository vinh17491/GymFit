import { NextFunction,Request,Response } from 'express';
import { productModerationService } from './product-moderation.service';
import { ModerationAction,ModerationQuery } from './product-moderation.types';
const wrap=(handler:(req:Request,res:Response)=>Promise<void>)=>(req:Request,res:Response,next:NextFunction)=>{void handler(req,res).catch(next);};
export const listModeration=wrap(async(req,res)=>{const result=await productModerationService.list(req.query as unknown as ModerationQuery);res.json({success:true,data:result.items,pagination:{page:result.page,limit:result.limit,total:result.total,pages:Math.ceil(result.total/result.limit)}});});
export const detailModeration=wrap(async(req,res)=>{res.json({success:true,data:await productModerationService.detail(Number(req.params.productId))});});
export const transitionModeration=(action:ModerationAction)=>wrap(async(req,res)=>{const note=action==='reject'||action==='suspend'?req.body.reason:req.body.note;res.json({success:true,data:await productModerationService.transition(Number(req.params.productId),req.user!.userId,action,note)});});
