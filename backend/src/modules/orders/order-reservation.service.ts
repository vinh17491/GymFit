import type { Transaction } from 'mssql';
import { sql } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

async function releaseItems(
  transaction:Transaction,
  whereSql:string,
  idName:string,
  id:number,
  changedBy:number|null,
  reason:string,
):Promise<number>{
  const items=await transaction.request()
    .input(idName,sql.Int,id)
    .query<{id:number;variantId:number;quantity:number}>(
      `SELECT oi.id,oi.variant_id AS variantId,oi.quantity
       FROM dbo.OrderItems oi WITH (UPDLOCK,HOLDLOCK)
       WHERE ${whereSql} AND oi.reservation_released_at IS NULL
       ORDER BY oi.variant_id,oi.id`,
    );
  if(items.recordset.length===0)return 0;
  for(const item of items.recordset){
    const inventory=await transaction.request().input('releaseVariantId',sql.Int,item.variantId).query<{id:number;reserved:number}>('SELECT id,reserved FROM dbo.Inventory WITH (UPDLOCK,HOLDLOCK) WHERE variant_id=@releaseVariantId');
    const row=inventory.recordset[0];
    if(!row)throw new AppError(404,'Inventory not found');
    if(row.reserved<item.quantity)throw new AppError(409,'Inventory reservation is inconsistent');
    await transaction.request().input('releaseInventoryId',sql.Int,row.id).input('releaseQuantity',sql.Int,item.quantity).query('UPDATE dbo.Inventory SET reserved=reserved-@releaseQuantity,updated_at=SYSUTCDATETIME() WHERE id=@releaseInventoryId');
    await transaction.request()
      .input('releasedItemId',sql.Int,item.id)
      .input('releasedBy',sql.Int,changedBy)
      .input('releaseReason',sql.NVarChar(100),reason)
      .query("UPDATE dbo.OrderItems SET reservation_released_at=SYSUTCDATETIME(),reservation_released_by=@releasedBy,reservation_release_reason=@releaseReason WHERE id=@releasedItemId AND reservation_released_at IS NULL; IF @@ROWCOUNT<>1 THROW 50701,'Concurrent reservation release detected.',1;");
  }
  return items.recordset.length;
}

export async function releaseOrderReservation(transaction:Transaction,orderId:number,changedBy:number|null=null,reason='PARENT_CANCELLED'):Promise<number>{
  return releaseItems(transaction,'oi.order_id=@releaseOrderId','releaseOrderId',orderId,changedBy,reason);
}

export async function releaseReservationForShopOrder(transaction:Transaction,shopOrderId:number,changedBy:number|null,reason:string):Promise<number>{
  return releaseItems(transaction,'oi.shop_order_id=@releaseShopOrderId','releaseShopOrderId',shopOrderId,changedBy,reason);
}

export async function insertOrderStatusHistory(transaction:Transaction,input:{orderId:number;previousStatus:string;newStatus:string;changedBy:number|null;note:string}):Promise<void>{
  await transaction.request().input('statusHistoryOrderId',sql.Int,input.orderId).input('statusHistoryPrevious',sql.NVarChar(30),input.previousStatus).input('statusHistoryNew',sql.NVarChar(30),input.newStatus).input('statusHistoryChangedBy',sql.Int,input.changedBy).input('statusHistoryNote',sql.NVarChar(500),input.note).query('INSERT dbo.OrderStatusHistory(order_id,previous_status,new_status,changed_by,note,created_at) VALUES(@statusHistoryOrderId,@statusHistoryPrevious,@statusHistoryNew,@statusHistoryChangedBy,@statusHistoryNote,SYSUTCDATETIME())');
}

export async function cancelParentShopOrders(
  transaction:Transaction,
  orderId:number,
  changedBy:number|null,
  note:string,
):Promise<number>{
  const rows=await transaction.request()
    .input('cancelShopOrderParentId',sql.Int,orderId)
    .query<{id:number;status:string}>("SELECT id,status FROM dbo.ShopOrders WITH (UPDLOCK,HOLDLOCK) WHERE order_id=@cancelShopOrderParentId AND status<>N'CANCELLED' ORDER BY id");
  for(const row of rows.recordset){
    await transaction.request()
      .input('cancelShopOrderId',sql.Int,row.id)
      .query("UPDATE dbo.ShopOrders SET status=N'CANCELLED',updated_at=SYSUTCDATETIME() WHERE id=@cancelShopOrderId");
    await transaction.request()
      .input('cancelHistoryShopOrderId',sql.Int,row.id)
      .input('cancelHistoryPrevious',sql.NVarChar(30),row.status)
      .input('cancelHistoryChangedBy',sql.Int,changedBy)
      .input('cancelHistoryNote',sql.NVarChar(500),note)
      .query("INSERT dbo.ShopOrderStatusHistory(shop_order_id,previous_status,new_status,changed_by,note,created_at) VALUES(@cancelHistoryShopOrderId,@cancelHistoryPrevious,N'CANCELLED',@cancelHistoryChangedBy,@cancelHistoryNote,SYSUTCDATETIME())");
  }
  return rows.recordset.length;
}
