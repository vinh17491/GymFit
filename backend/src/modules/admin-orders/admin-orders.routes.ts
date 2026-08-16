import { NextFunction, Request, Response, Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { UserRole } from '../../types';
import { adminOrdersService } from './admin-orders.service';
import type { AdminOrderFilters, UpdateOrderStatusInput } from './admin-orders.types';
import { orderIdParam, orderListQuery, parentLogisticsAction, shopOrderIdParam, shopOrderLogisticsAction, updateOrderStatus } from './admin-orders.validation';
import { ordersService } from '../orders/orders.service';
import { adminPaymentStatus } from '../orders/admin-payment.validation';
import type { AdminPaymentStatusInput } from '../orders/orders.types';
import { expireEligibleOrders } from '../orders/order-expiration.service';
import { getAdminPaymentConfigurationStatus } from '../orders/payment-configuration';
import { logisticsService,ParentLogisticsAction,ShopOrderLogisticsAction } from './logistics.service';

const router = Router();
const wrap = (handler: (req: Request, res: Response, next: NextFunction) => Promise<void>) => (req: Request, res: Response, next: NextFunction): void => { void handler(req, res, next).catch(next); };
const orderId = (req: Request): number => Number(req.params.orderId);

router.use(authenticate, authorize(UserRole.ADMIN));
router.get('/payment-configuration', wrap(async (_req, res) => { res.json({ success:true, data:getAdminPaymentConfigurationStatus() }); }));
router.get('/orders', validate(orderListQuery, 'query'), wrap(async (req, res) => { await expireEligibleOrders(); const result = await adminOrdersService.list(req.query as unknown as AdminOrderFilters); res.json({ success: true, data: result }); }));
router.get('/orders/:orderId', validate(orderIdParam, 'params'), wrap(async (req, res) => { await expireEligibleOrders(); res.json({ success: true, data: await adminOrdersService.detail(orderId(req)) }); }));
router.patch('/orders/:orderId/status', validate(orderIdParam, 'params'), validate(updateOrderStatus), wrap(async (req, res) => { if (!req.user) { res.status(401).json({ success: false, message: 'Authentication required' }); return; } const data = await adminOrdersService.updateStatus(orderId(req), req.body as UpdateOrderStatusInput, req.user.userId); res.json({ success: true, data, message: 'Order status updated' }); }));
router.patch('/orders/:orderId/payment-status', validate(orderIdParam, 'params'), validate(adminPaymentStatus), wrap(async (req, res) => { if (!req.user) { res.status(401).json({ success: false, message: 'Authentication required' }); return; } const data = await ordersService.updatePaymentStatus(orderId(req), req.user.userId, req.body as AdminPaymentStatusInput); res.json({ success: true, data }); }));
router.post('/shop-orders/:shopOrderId/logistics',validate(shopOrderIdParam,'params'),validate(shopOrderLogisticsAction),wrap(async(req,res)=>{
  if(!req.user){res.status(401).json({success:false,message:'Authentication required'});return;}
  const parentId=await logisticsService.transitionShopOrder(Number(req.params.shopOrderId),req.body.action as ShopOrderLogisticsAction,req.user.userId,req.body.reason);
  res.json({success:true,data:await adminOrdersService.detail(parentId)});
}));
router.post('/orders/:orderId/logistics',validate(orderIdParam,'params'),validate(parentLogisticsAction),wrap(async(req,res)=>{
  if(!req.user){res.status(401).json({success:false,message:'Authentication required'});return;}
  await logisticsService.transitionParent(orderId(req),req.body.action as ParentLogisticsAction,req.user.userId,req.body.note);
  res.json({success:true,data:await adminOrdersService.detail(orderId(req))});
}));

export default router;
