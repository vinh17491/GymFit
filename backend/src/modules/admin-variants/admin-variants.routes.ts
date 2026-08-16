import { NextFunction, Request, Response, Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { UserRole } from '../../types';
import { adminVariantsService } from './admin-variants.service';
import { idParam, productIdParam, variantCreate, variantUpdate } from './admin-variants.validation';

const router = Router();
const wrap = (handler: (req: Request, res: Response, next: NextFunction) => Promise<void>) => (req: Request, res: Response, next: NextFunction): void => { void handler(req, res, next).catch(next); };
const productId = (req: Request): number => Number(req.params.productId);
const variantId = (req: Request): number => Number(req.params.variantId);

router.use(authenticate, authorize(UserRole.ADMIN));
router.get('/products/:productId/variants', validate(productIdParam, 'params'), wrap(async (req, res) => { res.json({ success: true, data: await adminVariantsService.list(productId(req)) }); }));
router.post('/products/:productId/variants', validate(productIdParam, 'params'), validate(variantCreate), wrap(async (req, res) => { res.status(201).json({ success: true, data: await adminVariantsService.create(productId(req), req.body) }); }));
router.get('/variants/:variantId', validate(idParam, 'params'), wrap(async (req, res) => { res.json({ success: true, data: await adminVariantsService.get(variantId(req)) }); }));
router.patch('/variants/:variantId', validate(idParam, 'params'), validate(variantUpdate), wrap(async (req, res) => { res.json({ success: true, data: await adminVariantsService.update(variantId(req), req.body) }); }));
router.delete('/variants/:variantId', validate(idParam, 'params'), wrap(async (req, res) => { res.json({ success: true, data: await adminVariantsService.remove(variantId(req)) }); }));
router.post('/variants/:variantId/set-default', validate(idParam, 'params'), wrap(async (req, res) => { res.json({ success: true, data: await adminVariantsService.setDefault(variantId(req)) }); }));

export default router;
