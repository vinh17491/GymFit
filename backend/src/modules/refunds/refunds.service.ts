import {getPool,sql} from "../../config/database";
import {AppError} from "../../middleware/errorHandler";

export type RefundStatus="PENDING"|"COMPLETED"|"FAILED";

export const refundsService={
  async list(status?:RefundStatus){
    const request=(await getPool()).request();
    const where=status?(request.input("status",sql.NVarChar(20),status),"WHERE r.status=@status"):"";
    return (await request.query(`SELECT r.id,r.order_id AS orderId,r.shop_order_id AS shopOrderId,r.buyer_id AS buyerId,o.order_number AS orderNumber,r.merchandise_amount AS merchandiseAmount,r.shipping_amount AS shippingAmount,r.total_amount AS totalAmount,r.currency,r.status,r.reason,r.external_reference AS externalReference,r.created_at AS createdAt,r.updated_at AS updatedAt,r.completed_at AS completedAt FROM dbo.Refunds r JOIN dbo.Orders o ON o.id=r.order_id ${where} ORDER BY r.created_at DESC,r.id DESC`)).recordset;
  },
  async detail(id:number){
    const pool=await getPool();
    const refund=(await pool.request().input("id",sql.BigInt,id).query("SELECT r.id,r.order_id AS orderId,r.shop_order_id AS shopOrderId,r.buyer_id AS buyerId,o.order_number AS orderNumber,r.merchandise_amount AS merchandiseAmount,r.shipping_amount AS shippingAmount,r.total_amount AS totalAmount,r.currency,r.status,r.reason,r.external_reference AS externalReference,r.created_at AS createdAt,r.updated_at AS updatedAt,r.completed_at AS completedAt FROM dbo.Refunds r JOIN dbo.Orders o ON o.id=r.order_id WHERE r.id=@id")).recordset[0];
    if(!refund)throw new AppError(404,"Refund not found");
    const history=(await pool.request().input("historyId",sql.BigInt,id).query("SELECT id,previous_status AS previousStatus,new_status AS newStatus,changed_by AS changedBy,reason,external_reference AS externalReference,created_at AS createdAt FROM dbo.RefundStatusHistory WHERE refund_id=@historyId ORDER BY created_at DESC,id DESC")).recordset;
    return {...refund,history};
  },
  async update(id:number,adminId:number,input:{status:RefundStatus;reason:string;externalReference?:string}){
    const pool=await getPool(),tx=pool.transaction();let started=false;
    try{
      await tx.begin();started=true;
      const result=await tx.request().input("id",sql.BigInt,id).query<{status:RefundStatus}>("SELECT status FROM dbo.Refunds WITH (UPDLOCK,HOLDLOCK) WHERE id=@id");
      const current=result.recordset[0];if(!current)throw new AppError(404,"Refund not found");
      if(current.status===input.status){await tx.commit();started=false;return this.detail(id);}
      const allowed=current.status==="PENDING"&&(input.status==="COMPLETED"||input.status==="FAILED")||current.status==="FAILED"&&input.status==="PENDING";
      if(!allowed)throw new AppError(409,`Invalid refund transition: ${current.status} to ${input.status}`);
      await tx.request().input("id",sql.BigInt,id).input("status",sql.NVarChar(20),input.status).input("reference",sql.NVarChar(255),input.externalReference?.trim()||null).query("UPDATE dbo.Refunds SET status=@status,external_reference=COALESCE(@reference,external_reference),completed_at=CASE WHEN @status=N'COMPLETED' THEN SYSUTCDATETIME() ELSE NULL END,updated_at=SYSUTCDATETIME() WHERE id=@id");
      await tx.request().input("id",sql.BigInt,id).input("previous",sql.NVarChar(20),current.status).input("status",sql.NVarChar(20),input.status).input("adminId",sql.Int,adminId).input("reason",sql.NVarChar(500),input.reason.trim()).input("reference",sql.NVarChar(255),input.externalReference?.trim()||null).query("INSERT dbo.RefundStatusHistory(refund_id,previous_status,new_status,changed_by,reason,external_reference,created_at) VALUES(@id,@previous,@status,@adminId,@reason,@reference,SYSUTCDATETIME())");
      await tx.commit();started=false;return this.detail(id);
    }catch(error){if(started)await tx.rollback();throw error;}
  },
};
