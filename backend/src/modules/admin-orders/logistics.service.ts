import { getPool,sql } from "../../config/database";
import { AppError } from "../../middleware/errorHandler";
import type { Transaction } from "mssql";
import {createSettlementsForDeliveredOrder} from "../marketplace-finance/marketplace-finance.service";

export type ShopOrderLogisticsAction =
  "PICKED_UP"|"IN_TRANSIT_TO_HUB"|"RECEIVED_AT_HUB"|"HUB_CHECK_PASSED"|"HUB_CHECK_FAILED";
export type ParentLogisticsAction="READY_TO_SHIP"|"SHIPPED"|"DELIVERED";

const shopExpected:Record<ShopOrderLogisticsAction,readonly string[]>={
  PICKED_UP:["READY_FOR_PICKUP"],
  IN_TRANSIT_TO_HUB:["PICKED_UP"],
  RECEIVED_AT_HUB:["IN_TRANSIT_TO_HUB"],
  HUB_CHECK_PASSED:["RECEIVED_AT_HUB","HUB_CHECK_FAILED"],
  HUB_CHECK_FAILED:["RECEIVED_AT_HUB"],
};
const shopTimestamp:Record<ShopOrderLogisticsAction,string>={
  PICKED_UP:"picked_up_at",
  IN_TRANSIT_TO_HUB:"in_transit_to_hub_at",
  RECEIVED_AT_HUB:"received_at_hub_at",
  HUB_CHECK_PASSED:"hub_checked_at",
  HUB_CHECK_FAILED:"hub_checked_at",
};

async function consumeActiveReservations(tx:Transaction,orderId:number,adminId:number,orderNumber:string):Promise<void>{
  const items=await tx.request().input("deliveryOrderId",sql.Int,orderId).query<{itemId:number;variantId:number;quantity:number}>(
    "SELECT oi.id AS itemId,oi.variant_id AS variantId,oi.quantity FROM dbo.OrderItems oi WITH (UPDLOCK,HOLDLOCK) JOIN dbo.ShopOrders so WITH (UPDLOCK,HOLDLOCK) ON so.id=oi.shop_order_id WHERE oi.order_id=@deliveryOrderId AND so.status=N'HUB_CHECK_PASSED' AND oi.reservation_released_at IS NULL ORDER BY oi.variant_id,oi.id",
  );
  if(!items.recordset.length)throw new AppError(409,"No active reservations remain to deliver");
  for(const item of items.recordset){
    const inventory=(await tx.request().input("deliveryVariantId",sql.Int,item.variantId).query<{id:number;onHand:number;reserved:number}>(
      "SELECT id,on_hand AS onHand,reserved FROM dbo.Inventory WITH (UPDLOCK,HOLDLOCK) WHERE variant_id=@deliveryVariantId",
    )).recordset[0];
    if(!inventory)throw new AppError(404,"Inventory not found");
    if(inventory.reserved<item.quantity)throw new AppError(409,"Inventory reservation is inconsistent");
    if(inventory.onHand<item.quantity)throw new AppError(409,"Insufficient stock to deliver this order");
    const next=inventory.onHand-item.quantity;
    await tx.request().input("deliveryInventoryId",sql.Int,inventory.id).input("deliveryQuantity",sql.Int,item.quantity).query(
      "UPDATE dbo.Inventory SET on_hand=on_hand-@deliveryQuantity,reserved=reserved-@deliveryQuantity,updated_at=SYSUTCDATETIME() WHERE id=@deliveryInventoryId AND reserved>=@deliveryQuantity AND on_hand>=@deliveryQuantity; IF @@ROWCOUNT<>1 THROW 50802,'Concurrent delivery inventory change detected.',1;",
    );
    await tx.request().input("deliveredItemId",sql.Int,item.itemId).input("deliveredBy",sql.Int,adminId).query(
      "UPDATE dbo.OrderItems SET reservation_released_at=SYSUTCDATETIME(),reservation_released_by=@deliveredBy,reservation_release_reason=N'ORDER_DELIVERED' WHERE id=@deliveredItemId AND reservation_released_at IS NULL; IF @@ROWCOUNT<>1 THROW 50803,'Concurrent delivery marker change detected.',1;",
    );
    await tx.request().input("adjustmentInventoryId",sql.Int,inventory.id).input("adjustmentVariantId",sql.Int,item.variantId)
      .input("adjustmentDelta",sql.Int,-item.quantity).input("adjustmentPrevious",sql.Int,inventory.onHand)
      .input("adjustmentNext",sql.Int,next).input("adjustmentReference",sql.NVarChar(100),orderNumber)
      .input("adjustmentAdmin",sql.Int,adminId).query(
        "INSERT dbo.InventoryAdjustments(inventory_id,variant_id,adjustment_type,quantity_delta,previous_on_hand,new_on_hand,reason,reference_type,reference_id,performed_by,created_at) VALUES(@adjustmentInventoryId,@adjustmentVariantId,N'MANUAL_CORRECTION',@adjustmentDelta,@adjustmentPrevious,@adjustmentNext,N'Parent logistics delivered',N'ORDER_FULFILLMENT',@adjustmentReference,@adjustmentAdmin,SYSUTCDATETIME())",
      );
  }
}

export const logisticsService={
  async transitionShopOrder(shopOrderId:number,action:ShopOrderLogisticsAction,adminId:number,reason?:string):Promise<number>{
    const note=reason?.trim();
    if(action==="HUB_CHECK_FAILED"&&!note)throw new AppError(400,"Hub check failure reason is required");
    const pool=await getPool(),tx=pool.transaction();let started=false;
    try{
      await tx.begin();started=true;
      const row=(await tx.request().input("shopOrderId",sql.Int,shopOrderId).query<{id:number;orderId:number;status:string}>(
        "SELECT id,order_id AS orderId,status FROM dbo.ShopOrders WITH (UPDLOCK,HOLDLOCK) WHERE id=@shopOrderId",
      )).recordset[0];
      if(!row)throw new AppError(404,"ShopOrder not found");
      if(row.status===action){await tx.commit();started=false;return row.orderId;}
      if(!shopExpected[action].includes(row.status))throw new AppError(409,`Cannot transition ShopOrder from ${row.status} to ${action}`);
      const timestamp=shopTimestamp[action];
      const setTimestamp=timestamp==="hub_checked_at"?`${timestamp}=SYSUTCDATETIME()`:`${timestamp}=COALESCE(${timestamp},SYSUTCDATETIME())`;
      await tx.request().input("transitionShopOrderId",sql.Int,shopOrderId).input("transitionStatus",sql.NVarChar(30),action).query(
        `UPDATE dbo.ShopOrders SET status=@transitionStatus,${setTimestamp},updated_at=SYSUTCDATETIME() WHERE id=@transitionShopOrderId`,
      );
      await tx.request().input("historyShopOrderId",sql.Int,shopOrderId).input("historyPrevious",sql.NVarChar(30),row.status)
        .input("historyNew",sql.NVarChar(30),action).input("historyAdmin",sql.Int,adminId)
        .input("historyNote",sql.NVarChar(500),note||null).query(
          "INSERT dbo.ShopOrderStatusHistory(shop_order_id,previous_status,new_status,changed_by,note,created_at) VALUES(@historyShopOrderId,@historyPrevious,@historyNew,@historyAdmin,@historyNote,SYSUTCDATETIME())",
        );
      await tx.commit();started=false;return row.orderId;
    }catch(error){if(started)await tx.rollback();throw error;}
  },

  async transitionParent(orderId:number,action:ParentLogisticsAction,adminId:number,note?:string):Promise<void>{
    const expected:Record<ParentLogisticsAction,string>={READY_TO_SHIP:"WAITING_FOR_SHOPS",SHIPPED:"READY_TO_SHIP",DELIVERED:"SHIPPED"};
    const pool=await getPool(),tx=pool.transaction();let started=false;
    try{
      await tx.begin();started=true;
      const order=(await tx.request().input("logisticsOrderId",sql.Int,orderId).query<{id:number;orderNumber:string;orderStatus:string;paymentStatus:string;logisticsStatus:string|null}>(
        "SELECT id,order_number AS orderNumber,order_status AS orderStatus,payment_status AS paymentStatus,logistics_status AS logisticsStatus FROM dbo.Orders WITH (UPDLOCK,HOLDLOCK) WHERE id=@logisticsOrderId",
      )).recordset[0];
      if(!order)throw new AppError(404,"Order not found");
      if(order.orderStatus==="CANCELLED"||!order.logisticsStatus)throw new AppError(409,"Cancelled Order cannot continue logistics");
      if(order.logisticsStatus===action){await tx.commit();started=false;return;}
      if(order.logisticsStatus!==expected[action])throw new AppError(409,`Cannot transition Parent from ${order.logisticsStatus} to ${action}`);
      if(action==="READY_TO_SHIP"){
        if(order.paymentStatus!=="PAID")throw new AppError(409,"Parent payment must be PAID");
        const children=(await tx.request().input("childrenOrderId",sql.Int,orderId).query<{id:number;status:string}>(
          "SELECT id,status FROM dbo.ShopOrders WITH (UPDLOCK,HOLDLOCK) WHERE order_id=@childrenOrderId ORDER BY id",
        )).recordset.filter(child=>child.status!=="CANCELLED");
        if(!children.length)throw new AppError(409,"Parent has no active ShopOrder");
        const blockers=children.filter(child=>child.status!=="HUB_CHECK_PASSED");
        if(blockers.length)throw new AppError(409,`Blocking ShopOrders: ${blockers.map(child=>`${child.id}:${child.status}`).join(", ")}`);
      }
      if(action==="DELIVERED")await consumeActiveReservations(tx,orderId,adminId,order.orderNumber);
      const timestamp=action==="READY_TO_SHIP"?"ready_to_ship_at":action==="SHIPPED"?"shipped_at":"delivered_at";
      const legacy=action==="SHIPPED"?",order_status=N'SHIPPED'":action==="DELIVERED"?",order_status=N'DELIVERED',reservation_expires_at=NULL":"";
      await tx.request().input("updateLogisticsOrderId",sql.Int,orderId).input("updateLogisticsStatus",sql.NVarChar(30),action).query(
        `UPDATE dbo.Orders SET logistics_status=@updateLogisticsStatus,${timestamp}=COALESCE(${timestamp},SYSUTCDATETIME())${legacy},updated_at=SYSUTCDATETIME() WHERE id=@updateLogisticsOrderId`,
      );
      if(action==="DELIVERED")await tx.request().input("deliveredShopParentId",sql.Int,orderId).query(
        "UPDATE dbo.ShopOrders SET delivered_at=COALESCE(delivered_at,SYSUTCDATETIME()),updated_at=SYSUTCDATETIME() WHERE order_id=@deliveredShopParentId AND status=N'HUB_CHECK_PASSED'",
      );
      if(action==="DELIVERED")await createSettlementsForDeliveredOrder(tx,orderId);
      await tx.request().input("historyOrderId",sql.Int,orderId).input("historyPrevious",sql.NVarChar(30),order.logisticsStatus)
        .input("historyNew",sql.NVarChar(30),action).input("historyAdmin",sql.Int,adminId)
        .input("historyNote",sql.NVarChar(500),note?.trim()||null).query(
          "INSERT dbo.OrderLogisticsStatusHistory(order_id,previous_status,new_status,changed_by,note,created_at) VALUES(@historyOrderId,@historyPrevious,@historyNew,@historyAdmin,@historyNote,SYSUTCDATETIME())",
        );
      await tx.commit();started=false;
    }catch(error){if(started)await tx.rollback();throw error;}
  },
};
