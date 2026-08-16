import { z } from 'zod';

export const orderStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;
export const paymentStatuses = ['UNPAID', 'PENDING', 'PAID', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED'] as const;
const positiveId = z.coerce.number().int().safe().positive();

export const orderIdParam = z.object({ orderId: positiveId });
export const orderListQuery = z.object({
  search: z.string().trim().min(1).max(255).optional(),
  orderStatus: z.enum(orderStatuses).optional(),
  paymentStatus: z.enum(paymentStatuses).optional(),
  userId: positiveId.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sortBy: z.enum(['order_number', 'customer_name', 'total_amount', 'order_status', 'payment_status', 'created_at', 'updated_at']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().refine(value => [10, 20, 50, 100].includes(value), 'limit must be 10, 20, 50, or 100').default(20),
}).superRefine((value, context) => { if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) context.addIssue({ code: z.ZodIssueCode.custom, path: ['dateTo'], message: 'dateTo must be on or after dateFrom' }); });
export const updateOrderStatus = z.object({ status: z.enum(orderStatuses), note: z.string().trim().min(1).max(500).optional() }).strict();
export const shopOrderIdParam=z.object({shopOrderId:positiveId}).strict();
export const shopOrderLogisticsAction=z.object({
  action:z.enum(["PICKED_UP","IN_TRANSIT_TO_HUB","RECEIVED_AT_HUB","HUB_CHECK_PASSED","HUB_CHECK_FAILED"]),
  reason:z.string().trim().min(3).max(500).optional(),
}).strict().superRefine((value,context)=>{
  if(value.action==="HUB_CHECK_FAILED"&&!value.reason)
    context.addIssue({code:z.ZodIssueCode.custom,path:["reason"],message:"Hub check failure reason is required"});
});
export const parentLogisticsAction=z.object({
  action:z.enum(["READY_TO_SHIP","SHIPPED","DELIVERED"]),
  note:z.string().trim().min(1).max(500).optional(),
}).strict();
