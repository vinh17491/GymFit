import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { UserRole } from '../../types';
import { detailAdmin,getMine,getPublic,listAdmin,patchMine,statusAdmin,verificationAdmin } from './shops.controller';
import { adminShopListSchema,sellerShopPatchSchema,shopIdSchema,shopSlugSchema,shopStatusSchema,shopVerificationSchema } from './shops.validation';
import { shopProductQuerySchema } from '../products/products.validation';
import { reviewsService } from '../reviews/reviews.service';
import { publicShopParams,reviewListQuery } from '../reviews/reviews.validation';

export const sellerShopRouter=Router();
sellerShopRouter.use(authenticate,authorize(UserRole.SELLER));
sellerShopRouter.get('/',getMine);
sellerShopRouter.patch('/',validate(sellerShopPatchSchema),patchMine);

export const publicShopRouter=Router();
publicShopRouter.get('/:shopSlug/reviews',validate(publicShopParams,'params'),validate(reviewListQuery,'query'),async(req,res,next)=>{try{
  res.json({success:true,data:await reviewsService.publicShop(req.params.shopSlug,req.query as any)});
}catch(e){next(e);}});
publicShopRouter.get('/:shopSlug',validate(shopSlugSchema,'params'),validate(shopProductQuerySchema,'query'),getPublic);

export const adminShopRouter=Router();
adminShopRouter.use(authenticate,authorize(UserRole.ADMIN));
adminShopRouter.get('/',validate(adminShopListSchema,'query'),listAdmin);
adminShopRouter.get('/:shopId',validate(shopIdSchema,'params'),detailAdmin);
adminShopRouter.patch('/:shopId/status',validate(shopIdSchema,'params'),validate(shopStatusSchema),statusAdmin);
adminShopRouter.patch('/:shopId/verification',validate(shopIdSchema,'params'),validate(shopVerificationSchema),verificationAdmin);
