import { Request, Response, NextFunction } from 'express';
import { query } from '../../config/database';
import { sendSuccess } from '../../utils/response';

export async function getLogs(req: Request, _res: Response, next: NextFunction) {
  try {
    const { page = 1, limit = 50, user_id, action, entity_type, from, to } = req.query;
    let sql = 'SELECT al.*, u.name as user_name, u.email FROM AuditLogs al LEFT JOIN Users u ON al.user_id=u.id WHERE 1=1';
    const params: Record<string, any> = {};
    if (user_id) { sql += ' AND al.user_id=@uid'; params.uid = parseInt(user_id as string); }
    if (action) { sql += ' AND al.action=@action'; params.action = action; }
    if (entity_type) { sql += ' AND al.entity_type=@et'; params.et = entity_type; }
    if (from) { sql += ' AND al.timestamp>=@from'; params.from = from; }
    if (to) { sql += ' AND al.timestamp<=@to'; params.to = to; }
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    let countSql = 'SELECT COUNT(*) as cnt FROM AuditLogs al WHERE 1=1';
    const countParams: Record<string, any> = {};
    if (user_id) { countSql += ' AND al.user_id=@uid'; countParams.uid = parseInt(user_id as string); }
    if (action) { countSql += ' AND al.action=@action'; countParams.action = action; }
    if (entity_type) { countSql += ' AND al.entity_type=@et'; countParams.et = entity_type; }
    if (from) { countSql += ' AND al.timestamp>=@from'; countParams.from = from; }
    if (to) { countSql += ' AND al.timestamp<=@to'; countParams.to = to; }
    const total = await query(countSql, countParams);
    sql += ' ORDER BY al.timestamp DESC OFFSET @off ROWS FETCH NEXT @lim ROWS ONLY';
    params.off = offset; params.lim = parseInt(limit as string);
    const r = await query(sql, params);
    sendSuccess(_res, { logs: r.recordset, total: total.recordset[0].cnt });
  } catch (err) { next(err); }
}

export async function getActions(_req: Request, _res: Response, next: NextFunction) {
  try {
    const r = await query('SELECT DISTINCT action FROM AuditLogs ORDER BY action');
    sendSuccess(_res, r.recordset.map((a: any) => a.action));
  } catch (err) { next(err); }
}
