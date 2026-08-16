import { Request, Response, NextFunction } from 'express';
import { query } from '../../config/database';
import { sendSuccess } from '../../utils/response';

export async function getDashboard(_req: Request, _res: Response, next: NextFunction) {
  try {
    const [totalRevenue, monthlyRevenue, dailyRevenue, newCustomers, activeSubs, churn] = await Promise.all([
      query("SELECT ISNULL(SUM(amount),0) as total FROM Payments WHERE status='completed'"),
      query("SELECT ISNULL(SUM(amount),0) as total FROM Payments WHERE status='completed' AND MONTH(created_at)=MONTH(GETDATE()) AND YEAR(created_at)=YEAR(GETDATE())"),
      query("SELECT ISNULL(SUM(amount),0) as total FROM Payments WHERE status='completed' AND CAST(created_at AS DATE)=CAST(GETDATE() AS DATE)"),
      query("SELECT COUNT(*) as cnt FROM Users WHERE CAST(created_at AS DATE)=CAST(GETDATE() AS DATE)"),
      query("SELECT COUNT(*) as cnt FROM Memberships WHERE status='active'"),
      query("SELECT CAST(COUNT(CASE WHEN status='cancelled' THEN 1 END) AS FLOAT)/NULLIF(COUNT(*),0)*100 as rate FROM Memberships WHERE created_at>=DATEADD(month,-1,GETDATE())"),
    ]);
    sendSuccess(_res, {
      totalRevenue: totalRevenue.recordset[0].total,
      monthlyRevenue: monthlyRevenue.recordset[0].total,
      dailyRevenue: dailyRevenue.recordset[0].total,
      newCustomers: newCustomers.recordset[0].cnt,
      activeSubscriptions: activeSubs.recordset[0].cnt,
      churnRate: Math.round((churn.recordset[0].rate || 0) * 100) / 100,
    });
  } catch (err) { next(err); }
}

export async function getRevenueTrend(_req: Request, _res: Response, next: NextFunction) {
  try {
    const r = await query("SELECT CAST(created_at AS DATE) as date, SUM(amount) as revenue FROM Payments WHERE status='completed' GROUP BY CAST(created_at AS DATE) ORDER BY date");
    sendSuccess(_res, r.recordset);
  } catch (err) { next(err); }
}

export async function getMembershipSales(_req: Request, _res: Response, next: NextFunction) {
  try {
    const r = await query("SELECT p.name as plan_name, COUNT(*) as count, SUM(pay.amount) as revenue FROM Payments pay JOIN Plans p ON pay.plan_id=p.id WHERE pay.status='completed' GROUP BY p.name");
    sendSuccess(_res, r.recordset);
  } catch (err) { next(err); }
}

export async function getConversionFunnel(_req: Request, _res: Response, next: NextFunction) {
  try {
    const [reg, trial, paid] = await Promise.all([
      query('SELECT COUNT(*) as cnt FROM Users'),
      query('SELECT COUNT(*) as cnt FROM Memberships'),
      query("SELECT COUNT(DISTINCT user_id) as cnt FROM Payments WHERE status='completed'"),
    ]);
    sendSuccess(_res, { registrations: reg.recordset[0].cnt, memberships: trial.recordset[0].cnt, paid: paid.recordset[0].cnt });
  } catch (err) { next(err); }
}
