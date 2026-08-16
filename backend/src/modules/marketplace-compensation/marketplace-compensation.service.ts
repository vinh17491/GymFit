import { randomUUID } from "crypto";
import type { Transaction } from "mssql";
import { getPool,sql } from "../../config/database";
import { AppError } from "../../middleware/errorHandler";

export interface CompensationConfiguration {
  amount:number;
  expiryDays:number;
  minimumOrderAmount:number;
  maxPerParentOrder:number;
}

export async function loadCompensationConfiguration(transaction?:Transaction):Promise<CompensationConfiguration>{
  const request=transaction?transaction.request():(await getPool()).request();
  const result=await request.query<{setting_key:string;setting_value:number}>(
    "SELECT setting_key,setting_value FROM dbo.MarketplaceSettings WHERE setting_key IN (N'compensation_voucher_amount',N'compensation_voucher_expiry_days',N'compensation_voucher_min_order_amount',N'compensation_voucher_max_per_parent_order')",
  );
  const settings=new Map(result.recordset.map(row=>[row.setting_key,Number(row.setting_value)]));
  const value=(key:string):number=>{
    const current=settings.get(key);
    if(current===undefined)throw new AppError(500,`Marketplace setting is missing: ${key}`);
    return current;
  };
  const config={
    amount:value("compensation_voucher_amount"),
    expiryDays:value("compensation_voucher_expiry_days"),
    minimumOrderAmount:value("compensation_voucher_min_order_amount"),
    maxPerParentOrder:value("compensation_voucher_max_per_parent_order"),
  };
  if(config.amount<=0||!Number.isInteger(config.expiryDays)||config.expiryDays<1||config.minimumOrderAmount<0||config.maxPerParentOrder!==1)
    throw new AppError(500,"Compensation voucher configuration is invalid");
  return config;
}

export async function issueCompensationVoucher(
  transaction:Transaction,
  input:{buyerId:number;orderId:number;shopOrderId:number},
):Promise<{id:number;code:string;amount:number;minimumOrderAmount:number;expiresAt:Date;created:boolean}>{
  const existing=await transaction.request()
    .input("sourceOrderId",sql.Int,input.orderId)
    .query<{id:number;code:string;amount:number;minimumOrderAmount:number;expiresAt:Date}>(
      "SELECT id,code,amount,minimum_order_amount AS minimumOrderAmount,expires_at AS expiresAt FROM dbo.CompensationVouchers WITH (UPDLOCK,HOLDLOCK) WHERE source_order_id=@sourceOrderId AND compensation_type=N'SELLER_UNABLE_TO_FULFILL'",
    );
  if(existing.recordset[0])return {...existing.recordset[0],created:false};
  const config=await loadCompensationConfiguration(transaction);
  const code=`GYMFIT-${randomUUID().replace(/-/g,"").slice(0,20).toUpperCase()}`;
  const result=await transaction.request()
    .input("code",sql.NVarChar(64),code)
    .input("buyerId",sql.Int,input.buyerId)
    .input("amount",sql.Decimal(18,2),config.amount)
    .input("minimum",sql.Decimal(18,2),config.minimumOrderAmount)
    .input("expiryDays",sql.Int,config.expiryDays)
    .input("sourceOrderId",sql.Int,input.orderId)
    .input("sourceShopOrderId",sql.Int,input.shopOrderId)
    .query<{id:number;code:string;amount:number;minimumOrderAmount:number;expiresAt:Date}>(
      "INSERT dbo.CompensationVouchers(code,buyer_id,amount,minimum_order_amount,issued_at,expires_at,status,source_order_id,source_shop_order_id,compensation_type,is_stackable,merchandise_only,created_at) OUTPUT INSERTED.id,INSERTED.code,INSERTED.amount,INSERTED.minimum_order_amount AS minimumOrderAmount,INSERTED.expires_at AS expiresAt VALUES(@code,@buyerId,@amount,@minimum,SYSUTCDATETIME(),DATEADD(DAY,@expiryDays,SYSUTCDATETIME()),N'AVAILABLE',@sourceOrderId,@sourceShopOrderId,N'SELLER_UNABLE_TO_FULFILL',0,1,SYSUTCDATETIME())",
    );
  return {...result.recordset[0],created:true};
}

export const compensationVoucherService={
  async listForBuyer(buyerId:number){
    const result=await (await getPool()).request().input("buyerId",sql.Int,buyerId).query(
      "SELECT id,code,amount,minimum_order_amount AS minimumOrderAmount,issued_at AS issuedAt,expires_at AS expiresAt,CASE WHEN status=N'AVAILABLE' AND expires_at<=SYSUTCDATETIME() THEN N'EXPIRED' ELSE status END AS status,used_at AS usedAt,used_order_id AS usedOrderId,source_order_id AS sourceOrderId,merchandise_only AS merchandiseOnly,is_stackable AS isStackable FROM dbo.CompensationVouchers WHERE buyer_id=@buyerId ORDER BY issued_at DESC,id DESC",
    );
    return result.recordset;
  },
};
