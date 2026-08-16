import { Request, Response, NextFunction } from 'express';
import { query } from '../../config/database';
import crypto from 'crypto';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';

export async function list(req: Request, _res: Response, next: NextFunction) {
  try {
    let sql = 'SELECT i.*, u.name as user_name FROM Invoices i JOIN Users u ON i.user_id=u.id WHERE 1=1';
    const params: Record<string, unknown> = {};
    if (req.user!.role !== 'admin') { sql += ' AND i.user_id=@uid'; params.uid = req.user!.userId; }
    sql += ' ORDER BY i.created_at DESC';
    const r = await query(sql, params);
    sendSuccess(_res, r.recordset);
  } catch (err) { next(err); }
}

export async function getById(req: Request, _res: Response, next: NextFunction) {
  try {
    const scoped=req.user!.role==='admin'?'':' AND i.user_id=@uid';
    const r = await query(`SELECT i.*,u.name user_name,u.email FROM Invoices i JOIN Users u ON i.user_id=u.id WHERE i.id=@id${scoped}`, { id: req.params.id,uid:req.user!.userId });
    if (r.recordset.length === 0) throw new AppError(404, 'Invoice not found');
    sendSuccess(_res, r.recordset[0]);
  } catch (err) { next(err); }
}

export async function generate(req: Request, _res: Response, next: NextFunction) {
  try {
    const payment_id=req.body.payment_id;
    const payment=await query<{amount:number}>('SELECT amount FROM Payments WHERE id=@id AND user_id=@uid AND status=\'completed\'',{id:payment_id,uid:req.user!.userId});
    if(!payment.recordset[0])throw new AppError(404,'Payment not found');
    if((await query('SELECT id FROM Invoices WHERE payment_id=@id',{id:payment_id})).recordset[0])throw new AppError(409,'Invoice already exists');
    const amount=Number(payment.recordset[0].amount);const tax=Math.round(amount*0.08*100)/100;const discount=0;const invoiceNumber=`INV-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const r=await query('INSERT Invoices(invoice_number,user_id,payment_id,amount,tax,discount,total) OUTPUT INSERTED.* VALUES(@number,@uid,@payment,@amount,@tax,@discount,@total)',{number:invoiceNumber,uid:req.user!.userId,payment:payment_id,amount,tax,discount,total:amount+tax-discount});
    sendSuccess(_res, r.recordset[0], 'Invoice generated', 201);
  } catch (err) { next(err); }
}

export async function sendEmail(req: Request, _res: Response, next: NextFunction) {
  try {
    const inv = await query('SELECT * FROM Invoices WHERE id=@id', { id: req.params.id });
    if (inv.recordset.length === 0) throw new AppError(404, 'Invoice not found');
    await query('UPDATE Invoices SET email_sent=1 WHERE id=@id', { id: req.params.id });
    sendSuccess(_res, null, 'Invoice email sent');
  } catch (err) { next(err); }
}
