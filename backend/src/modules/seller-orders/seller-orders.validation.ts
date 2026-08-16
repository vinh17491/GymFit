import { z } from "zod";

const status=z.enum(["PENDING_PAYMENT","PENDING_STOCK_CHECK","PREPARING","READY_FOR_PICKUP","PICKED_UP","IN_TRANSIT_TO_HUB","RECEIVED_AT_HUB","HUB_CHECK_PASSED","HUB_CHECK_FAILED","UNABLE_TO_FULFILL","CANCELLED"]);
export const sellerShopOrderId=z.object({shopOrderId:z.coerce.number().int().safe().positive()}).strict();
export const sellerShopOrderList=z.object({
  page:z.coerce.number().int().positive().default(1),
  limit:z.coerce.number().refine(value=>[10,20,50].includes(value)).default(10),
  status:status.optional(),
  sortOrder:z.enum(["asc","desc"]).default("desc"),
}).strict();
export const sellerStockCheck=z.object({
  action:z.enum(["SUFFICIENT","UNABLE_TO_FULFILL"]),
  reason:z.string().trim().min(5).max(500).optional(),
}).strict().superRefine((value,context)=>{
  if(value.action==="UNABLE_TO_FULFILL"&&!value.reason)
    context.addIssue({code:z.ZodIssueCode.custom,path:["reason"],message:"Reason is required when stock is unavailable"});
});
