import { NextFunction, Request, Response, Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { UserRole } from '../../types';
import { adminInventoryService } from './admin-inventory.service';
import { adjustment, historyQuery, listQuery, threshold, variantIdParam } from './admin-inventory.validation';

const router = Router();
const wrap = (handler: (req: Request, res: Response, next: NextFunction) => Promise<void>) => (req: Request, res: Response, next: NextFunction): void => { void handler(req, res, next).catch(next); };
const variantId = (req: Request): number => Number(req.params.variantId);
type InventoryQuery = Record<string, string | number | boolean | Date | undefined>;
const query = (req: Request): InventoryQuery => {
  const result: InventoryQuery = {};
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value instanceof Date) result[key] = value;
  }
  return result;
};
const paginated = (result: { data: unknown; page: number; limit: number; total: number }) => ({ success: true, data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total, pages: Math.ceil(result.total / result.limit) } });

router.use(authenticate, authorize(UserRole.ADMIN));
router.get('/inventory', validate(listQuery, 'query'), wrap(async (req, res) => { res.json(paginated(await adminInventoryService.list(query(req)))); }));
router.get('/inventory/low-stock', validate(listQuery, 'query'), wrap(async (req, res) => { res.json(paginated(await adminInventoryService.list({ ...query(req), lowStock: true }))); }));
router.get('/variants/:variantId/inventory', validate(variantIdParam, 'params'), wrap(async (req, res) => { res.json({ success: true, data: await adminInventoryService.detail(variantId(req)) }); }));
router.post('/variants/:variantId/inventory/adjustments', validate(variantIdParam, 'params'), validate(adjustment), wrap(async (req, res) => { if (!req.user) { res.status(401).json({ success: false, message: 'Authentication required' }); return; } res.status(201).json({ success: true, data: await adminInventoryService.adjust(variantId(req), req.body, req.user.userId) }); }));
router.get('/variants/:variantId/inventory/adjustments', validate(variantIdParam, 'params'), validate(historyQuery, 'query'), wrap(async (req, res) => { res.json(paginated(await adminInventoryService.history(variantId(req), query(req)))); }));
router.patch('/variants/:variantId/inventory/threshold', validate(variantIdParam, 'params'), validate(threshold), wrap(async (req, res) => { res.json({ success: true, data: await adminInventoryService.threshold(variantId(req), req.body.lowStockThreshold) }); }));

export default router;
