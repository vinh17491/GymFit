import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../../middleware/auth';
import { UserRole } from '../../types';
import { AppError } from '../../middleware/errorHandler';
import { config } from '../../config/config';
import { adminProductsService } from './admin-products.service';
import { validate } from '../../middleware/validate';
import {
  adminProductCreateSchema,
  adminProductIdSchema,
  adminProductImageIdSchema,
  adminProductListSchema,
  adminProductUpdateSchema,
} from './admin-products.validation';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.upload.maxFileSize, files: 8 }, fileFilter: (_req, file, cb) => ['image/jpeg','image/png','image/webp'].includes(file.mimetype) ? cb(null, true) : cb(new Error('Only JPEG, PNG and WebP images are allowed')) });
router.use(authenticate, authorize(UserRole.ADMIN));
const id = (value: string, name='id') => { const parsed=Number(value); if(!Number.isSafeInteger(parsed)||parsed<0) throw new AppError(400,`${name} is invalid`); return parsed; };
const wrap = (fn: (req:Request,res:Response)=>Promise<void>) => (req:Request,res:Response,next:NextFunction) => fn(req,res).catch(next);

router.get('/filters', wrap(async (_req,res)=>{res.json({success:true,data:await adminProductsService.filters()});}));
router.get('/', validate(adminProductListSchema,'query'), wrap(async (req,res)=>{const result=await adminProductsService.list(req.query);res.json({success:true,data:result.products,pagination:{page:result.page,limit:result.limit,total:result.total,pages:Math.ceil(result.total/result.limit)}});}));
router.get('/:id', validate(adminProductIdSchema,'params'), wrap(async (req,res)=>{res.json({success:true,data:await adminProductsService.get(id(req.params.id))});}));
router.post('/', validate(adminProductCreateSchema), wrap(async (req,res)=>{res.status(201).json({success:true,data:await adminProductsService.create(req.body),message:'Product created'});}));
router.patch('/:id', validate(adminProductIdSchema,'params'), validate(adminProductUpdateSchema), wrap(async (req,res)=>{res.json({success:true,data:await adminProductsService.update(id(req.params.id),req.body),message:'Product updated'});}));
router.delete('/:id', validate(adminProductIdSchema,'params'), wrap(async (req,res)=>{res.json({success:true,data:await adminProductsService.remove(id(req.params.id)),message:'Product deleted'});}));
router.post('/:id/images', validate(adminProductIdSchema,'params'), (req,res,next)=>upload.array('images',8)(req,res,error=>error?next(new AppError(400,error.message)):next()), wrap(async(req,res)=>{res.status(201).json({success:true,data:await adminProductsService.addImages(id(req.params.id),req.files as Express.Multer.File[]),message:'Images uploaded'});}));
router.patch('/:id/images/:imageId/primary', validate(adminProductImageIdSchema,'params'), wrap(async(req,res)=>{res.json({success:true,data:await adminProductsService.setPrimary(id(req.params.id),id(req.params.imageId,'imageId')),message:'Primary image updated'});}));
router.delete('/:id/images/:imageId', validate(adminProductImageIdSchema,'params'), wrap(async(req,res)=>{res.json({success:true,data:await adminProductsService.removeImage(id(req.params.id),id(req.params.imageId,'imageId')),message:'Image deleted'});}));
export default router;
