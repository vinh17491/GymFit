import { NextFunction,Request,Response,Router } from 'express';
import { authenticate,authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { UserRole } from '../../types';
import { reviewsService } from './reviews.service';
import { adminReviewQuery,createReviewBody,moderationBody,orderItemParams,orderParams,reviewIdParams,reviewListQuery,shopOrderParams } from './reviews.validation';

const wrap=(fn:(req:Request,res:Response)=>Promise<void>)=>(req:Request,res:Response,next:NextFunction)=>{void fn(req,res).catch(next);};
export const buyerReviewsRouter=Router();
buyerReviewsRouter.use(authenticate,authorize(UserRole.MEMBER,UserRole.COACH));
buyerReviewsRouter.post('/products/order-items/:orderItemId',validate(orderItemParams,'params'),validate(createReviewBody),wrap(async(req,res)=>{
  res.status(201).json({success:true,data:await reviewsService.createProduct(req.user!.userId,Number(req.params.orderItemId),req.body)});
}));
buyerReviewsRouter.post('/shops/shop-orders/:shopOrderId',validate(shopOrderParams,'params'),validate(createReviewBody),wrap(async(req,res)=>{
  res.status(201).json({success:true,data:await reviewsService.createShop(req.user!.userId,Number(req.params.shopOrderId),req.body)});
}));
buyerReviewsRouter.get('/orders/:orderId/eligibility',validate(orderParams,'params'),wrap(async(req,res)=>{
  res.json({success:true,data:await reviewsService.eligibility(req.user!.userId,Number(req.params.orderId))});
}));
buyerReviewsRouter.get('/mine',wrap(async(req,res)=>{res.json({success:true,data:await reviewsService.mine(req.user!.userId)});}));

export const sellerReviewsRouter=Router();
sellerReviewsRouter.use(authenticate,authorize(UserRole.SELLER));
sellerReviewsRouter.get('/',wrap(async(req,res)=>{res.json({success:true,data:await reviewsService.seller(req.user!.userId)});}));

export const adminReviewsRouter=Router();
adminReviewsRouter.use(authenticate,authorize(UserRole.ADMIN));
adminReviewsRouter.get('/',validate(adminReviewQuery,'query'),wrap(async(req,res)=>{res.json({success:true,data:await reviewsService.adminList(req.query as any)});}));
adminReviewsRouter.get('/:type/:reviewId/history',validate(reviewIdParams,'params'),wrap(async(req,res)=>{
  res.json({success:true,data:await reviewsService.adminHistory(req.params.type.toUpperCase() as any,Number(req.params.reviewId))});
}));
for(const action of ['hide','reject','restore'] as const)adminReviewsRouter.post(`/:type/:reviewId/${action}`,validate(reviewIdParams,'params'),validate(moderationBody),wrap(async(req,res)=>{
  res.json({success:true,data:await reviewsService.moderate(req.params.type.toUpperCase() as any,Number(req.params.reviewId),action,req.body.reason,req.user!.userId)});
}));

export const publicReviewQuery=reviewListQuery;
