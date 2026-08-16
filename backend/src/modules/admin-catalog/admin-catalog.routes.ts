import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { UserRole } from '../../types';
import { adminCatalogService } from './admin-catalog.service';

const router = Router();
const id = z.object({ id: z.coerce.number().int().positive() });
const input = z.object({ name: z.string().trim().min(1).max(200), slug: z.string().trim().max(200).optional(), description: z.string().trim().max(1000).nullable().optional(), image_url: z.string().url().max(1000).nullable().optional(), logo_url: z.string().url().max(1000).nullable().optional(), is_active: z.boolean().optional(), sort_order: z.number().int().min(0).optional() });
const partial = input.partial().refine(value => Object.keys(value).length > 0, 'At least one field is required');
router.use(authenticate, authorize(UserRole.ADMIN));
for (const entity of ['categories', 'brands'] as const) {
  router.get(`/${entity}`, async (req,res,next)=>{try{const result=await adminCatalogService.list(entity,req.query);res.json({success:true,data:result.data,pagination:{page:result.page,limit:result.limit,total:result.total,pages:Math.ceil(result.total/result.limit)}})}catch(e){next(e)}});
  router.post(`/${entity}`, validate(input), async(req,res,next)=>{try{res.status(201).json({success:true,data:await adminCatalogService.create(entity,req.body)})}catch(e){next(e)}});
  router.get(`/${entity}/:id`, validate(id,'params'), async(req,res,next)=>{try{res.json({success:true,data:await adminCatalogService.get(entity,Number(req.params.id))})}catch(e){next(e)}});
  router.patch(`/${entity}/:id`, validate(id,'params'), validate(partial), async(req,res,next)=>{try{res.json({success:true,data:await adminCatalogService.update(entity,Number(req.params.id),req.body)})}catch(e){next(e)}});
  router.delete(`/${entity}/:id`, validate(id,'params'), async(req,res,next)=>{try{res.json({success:true,data:await adminCatalogService.remove(entity,Number(req.params.id))})}catch(e){next(e)}});
}
export default router;
