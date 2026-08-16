import { getPool,sql } from '../../config/database';
import type { ExpirationBatchResult,ExpiredOrderResult } from './orders.types';
import { orderReservationConfig } from './order-reservation.config';
import { cancelParentShopOrders,insertOrderStatusHistory,releaseOrderReservation } from './order-reservation.service';

async function expireOrder(orderId:number):Promise<ExpiredOrderResult>{
  const pool=await getPool();
  const transaction=pool.transaction();
  let started=false;
  try{
    await transaction.begin();started=true;
    const result=await transaction.request().input('orderId',sql.Int,orderId).query<{id:number}>('SELECT id FROM dbo.Orders WITH (UPDLOCK,HOLDLOCK) WHERE id=@orderId AND order_status=N\'PENDING\' AND payment_status=N\'UNPAID\' AND reservation_expires_at IS NOT NULL AND reservation_expires_at<=SYSUTCDATETIME()');
    if(!result.recordset[0]){await transaction.commit();started=false;return {orderId,expired:false};}
    await releaseOrderReservation(transaction,orderId);
    await transaction.request().input('orderId',sql.Int,orderId).query("UPDATE dbo.Orders SET order_status=N'CANCELLED',logistics_status=NULL,reservation_expires_at=NULL,updated_at=SYSUTCDATETIME() WHERE id=@orderId");
    await insertOrderStatusHistory(transaction,{orderId,previousStatus:'PENDING',newStatus:'CANCELLED',changedBy:null,note:'AUTO_EXPIRED_RESERVATION'});
    await cancelParentShopOrders(transaction,orderId,null,'AUTO_EXPIRED_RESERVATION');
    await transaction.commit();started=false;
    return {orderId,expired:true};
  }catch(error:unknown){if(started)await transaction.rollback();return {orderId,expired:false,error:error instanceof Error?error.message:'Unexpected expiration error'};}
}

export async function expireEligibleOrders(limit=orderReservationConfig.expirationBatchSize):Promise<ExpirationBatchResult>{
  const safeLimit=Math.min(Math.max(1,Math.trunc(limit)),orderReservationConfig.expirationBatchSize);
  const pool=await getPool();
  const candidates=await pool.request().input('limit',sql.Int,safeLimit).query<{id:number}>('SELECT TOP (@limit) id FROM dbo.Orders WHERE order_status=N\'PENDING\' AND payment_status=N\'UNPAID\' AND reservation_expires_at IS NOT NULL AND reservation_expires_at<=SYSUTCDATETIME() ORDER BY reservation_expires_at ASC,id ASC');
  const results:ExpiredOrderResult[]=[];
  for(const candidate of candidates.recordset)results.push(await expireOrder(candidate.id));
  return {selected:candidates.recordset.length,expired:results.filter(item=>item.expired).length,failed:results.filter(item=>Boolean(item.error)).length,results};
}
