import { Request, Response, NextFunction } from 'express';
import { query } from '../../config/database';
import { sendSuccess } from '../../utils/response';

export async function getDashboard(_req: Request, _res: Response, next: NextFunction) {
  try {
    const [dau, mau, revenue, members, churn] = await Promise.all([
      query("SELECT COUNT(DISTINCT user_id) as cnt FROM WorkoutSessions WHERE CAST(started_at AS DATE)=CAST(GETDATE() AS DATE)"),
      query("SELECT COUNT(DISTINCT user_id) as cnt FROM WorkoutSessions WHERE started_at>=DATEADD(month,-1,GETDATE())"),
      query("SELECT ISNULL(SUM(amount),0) as total FROM Payments WHERE status='completed' AND CAST(created_at AS DATE)=CAST(GETDATE() AS DATE)"),
      query("SELECT COUNT(*) as total FROM Memberships WHERE status='active'"),
      query("SELECT CAST(COUNT(CASE WHEN status='cancelled' THEN 1 END) AS FLOAT)/NULLIF(COUNT(*),0)*100 as rate FROM Memberships WHERE created_at>=DATEADD(month,-1,GETDATE())"),
    ]);
    sendSuccess(_res, {
      dau: dau.recordset[0].cnt, mau: mau.recordset[0].cnt, dailyRevenue: revenue.recordset[0].total,
      activeMembers: members.recordset[0].total, churnRate: churn.recordset[0].rate || 0,
    });
  } catch (err) { next(err); }
}

export async function getRevenue(_req: Request, _res: Response, next: NextFunction) {
  try {
    const r = await query("SELECT CAST(created_at AS DATE) as date, SUM(amount) as revenue FROM Payments WHERE status='completed' GROUP BY CAST(created_at AS DATE) ORDER BY date");
    sendSuccess(_res, r.recordset);
  } catch (err) { next(err); }
}

export async function getRetention(_req: Request, _res: Response, next: NextFunction) {
  try {
    const r = await query('SELECT * FROM AnalyticsRetention ORDER BY cohort_date DESC');
    sendSuccess(_res, r.recordset);
  } catch (err) { next(err); }
}

export async function getConversion(_req: Request, _res: Response, next: NextFunction) {
  try {
    const total = await query('SELECT COUNT(*) as cnt FROM Users');
    const members = await query('SELECT COUNT(DISTINCT user_id) as cnt FROM Memberships');
    const paid = await query('SELECT COUNT(DISTINCT user_id) as cnt FROM Payments WHERE status=\'completed\'');
    sendSuccess(_res, { visitors: 0, registrations: total.recordset[0].cnt, members: members.recordset[0].cnt, paid: paid.recordset[0].cnt });
  } catch (err) { next(err); }
}

export async function getUserGrowth(_req: Request, _res: Response, next: NextFunction) {
  try {
    const r = await query("SELECT CAST(created_at AS DATE) as date, COUNT(*) as new_users FROM Users GROUP BY CAST(created_at AS DATE) ORDER BY date");
    sendSuccess(_res, r.recordset);
  } catch (err) { next(err); }
}

export async function exportReport(req: Request, _res: Response, next: NextFunction) {
  try {
    const { format, start, end } = req.query;
    const r = await query(`SELECT * FROM AnalyticsDaily WHERE date BETWEEN @start AND ISNULL(@end, GETDATE())`, { start: start || '2024-01-01', end: end || null });
    if (format === 'csv') {
      const headers = Object.keys(r.recordset[0] || {}).join(',');
      const rows = r.recordset.map((row: any) => Object.values(row).join(',')).join('\n');
      _res.setHeader('Content-Type', 'text/csv');
      _res.setHeader('Content-Disposition', 'attachment; filename=analytics.csv');
      return _res.send(headers + '\n' + rows);
    }
    sendSuccess(_res, r.recordset);
  } catch (err) { next(err); }
}
