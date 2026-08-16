import { NextFunction,Request,Response,Router } from 'express';
import multer from 'multer';
import { config } from '../../config/config';
import { authenticate,authorize } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { validate } from '../../middleware/validate';
import { UserRole } from '../../types';
import { sellerProductsService } from './seller-products.service';
import {
  sellerImagePathSchema,sellerInventoryAdjustmentSchema,sellerProductCreateSchema,sellerProductIdSchema,
  sellerProductListSchema,sellerProductUpdateSchema,sellerVariantCreateSchema,sellerVariantPathSchema,sellerVariantUpdateSchema,
} from './seller-products.validation';

const router=Router();
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:config.upload.maxFileSize,files:8},fileFilter:(_req,file,callback)=>['image/jpeg','image/png','image/webp'].includes(file.mimetype)?callback(null,true):callback(new Error('Only JPEG, PNG and WebP images are allowed'))});
const wrap=(handler:(req:Request,res:Response)=>Promise<void>)=>(req:Request,res:Response,next:NextFunction)=>handler(req,res).catch(next);
const productId=(req:Request)=>Number(req.params.productId),variantId=(req:Request)=>Number(req.params.variantId),imageId=(req:Request)=>Number(req.params.imageId);
router.use(authenticate,authorize(UserRole.SELLER));

router.get('/filters',wrap(async(req,res)=>{res.json({success:true,data:await sellerProductsService.filters(req.user!.userId)});}));
router.get('/',validate(sellerProductListSchema,'query'),wrap(async(req,res)=>{const result=await sellerProductsService.list(req.user!.userId,req.query as never);res.json({success:true,data:result.items,shop:result.shop,pagination:{page:result.page,limit:result.limit,total:result.total,pages:Math.ceil(result.total/result.limit)}});}));
router.post('/',validate(sellerProductCreateSchema),wrap(async(req,res)=>{res.status(201).json({success:true,data:await sellerProductsService.create(req.user!.userId,req.body)});}));
router.get('/:productId',validate(sellerProductIdSchema,'params'),wrap(async(req,res)=>{res.json({success:true,data:await sellerProductsService.detail(req.user!.userId,productId(req))});}));
router.patch('/:productId',validate(sellerProductIdSchema,'params'),validate(sellerProductUpdateSchema),wrap(async(req,res)=>{res.json({success:true,data:await sellerProductsService.update(req.user!.userId,productId(req),req.body)});}));
router.delete('/:productId',validate(sellerProductIdSchema,'params'),wrap(async(req,res)=>{res.json({success:true,data:await sellerProductsService.remove(req.user!.userId,productId(req))});}));
router.post('/:productId/submit',validate(sellerProductIdSchema,'params'),wrap(async(req,res)=>{res.json({success:true,data:await sellerProductsService.submit(req.user!.userId,productId(req))});}));

router.post('/:productId/variants',validate(sellerProductIdSchema,'params'),validate(sellerVariantCreateSchema),wrap(async(req,res)=>{res.status(201).json({success:true,data:await sellerProductsService.createVariant(req.user!.userId,productId(req),req.body)});}));
router.patch('/:productId/variants/:variantId',validate(sellerVariantPathSchema,'params'),validate(sellerVariantUpdateSchema),wrap(async(req,res)=>{res.json({success:true,data:await sellerProductsService.updateVariant(req.user!.userId,productId(req),variantId(req),req.body)});}));
router.delete('/:productId/variants/:variantId',validate(sellerVariantPathSchema,'params'),wrap(async(req,res)=>{res.json({success:true,data:await sellerProductsService.removeVariant(req.user!.userId,productId(req),variantId(req))});}));

router.post('/:productId/images',validate(sellerProductIdSchema,'params'),(req,res,next)=>upload.array('images',8)(req,res,error=>error?next(new AppError(400,error.message)):next()),wrap(async(req,res)=>{res.status(201).json({success:true,data:await sellerProductsService.addImages(req.user!.userId,productId(req),req.files as Express.Multer.File[])});}));
router.patch('/:productId/images/:imageId/primary',validate(sellerImagePathSchema,'params'),wrap(async(req,res)=>{res.json({success:true,data:await sellerProductsService.setPrimaryImage(req.user!.userId,productId(req),imageId(req))});}));
router.delete('/:productId/images/:imageId',validate(sellerImagePathSchema,'params'),wrap(async(req,res)=>{res.json({success:true,data:await sellerProductsService.removeImage(req.user!.userId,productId(req),imageId(req))});}));
router.post('/:productId/variants/:variantId/inventory/adjustments',validate(sellerVariantPathSchema,'params'),validate(sellerInventoryAdjustmentSchema),wrap(async(req,res)=>{res.status(201).json({success:true,data:await sellerProductsService.adjustInventory(req.user!.userId,productId(req),variantId(req),req.body.quantityDelta,req.body.reason)});}));
export default router;
