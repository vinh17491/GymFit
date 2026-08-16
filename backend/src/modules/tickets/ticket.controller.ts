import { Request, Response, NextFunction } from 'express';
import { query } from '../../config/database';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';

export async function create(req: Request, _res: Response, next: NextFunction) {
  try {
    const r = await query(`INSERT INTO Tickets (user_id, subject, category, priority) OUTPUT INSERTED.* VALUES (@uid, @sub, @cat, @pri)`, {
      uid: req.user!.userId, sub: req.body.subject, cat: req.body.category || 'general', pri: req.body.priority || 'medium'
    });
    const ticket = r.recordset[0];
    await query(`INSERT INTO TicketMessages (ticket_id, sender_id, message) VALUES (@tid, @uid, @msg)`, { tid: ticket.id, uid: req.user!.userId, msg: req.body.description });
    sendSuccess(_res, ticket, 'Ticket created', 201);
  } catch (err) { next(err); }
}

export async function list(req: Request, _res: Response, next: NextFunction) {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM Tickets WHERE 1=1';
    const params: Record<string, unknown> = {};
    if (req.user!.role === 'member') { sql += ' AND user_id=@uid'; params.uid = req.user!.userId; }
    else if(req.user!.role==='coach'){sql+=' AND assigned_to=@uid';params.uid=req.user!.userId;}
    if (status) { sql += ' AND status=@st'; params.st = status; }
    sql += ' ORDER BY updated_at DESC';
    const r = await query(sql, params);
    sendSuccess(_res, r.recordset);
  } catch (err) { next(err); }
}

export async function getById(req: Request, _res: Response, next: NextFunction) {
  try {
    const role=req.user!.role; const scoped=role==='member'?' AND user_id=@uid':role==='coach'?' AND assigned_to=@uid':'';
    const r = await query(`SELECT * FROM Tickets WHERE id=@id${scoped}`, { id: req.params.id,uid:req.user!.userId });
    if (r.recordset.length === 0) throw new AppError(404, 'Ticket not found');
    const ticket = r.recordset[0];
    const messages = await query('SELECT tm.*, u.name as sender_name FROM TicketMessages tm JOIN Users u ON tm.sender_id=u.id WHERE tm.ticket_id=@tid AND (tm.is_internal=0 OR @role!=\'member\') ORDER BY tm.created_at', { tid: req.params.id, role: req.user!.role });
    sendSuccess(_res, { ...ticket, messages: messages.recordset });
  } catch (err) { next(err); }
}

export async function reply(req: Request, _res: Response, next: NextFunction) {
  try {
    const role=req.user!.role; const scoped=role==='member'?' AND user_id=@uid':role==='coach'?' AND assigned_to=@uid':'';
    const ticket = await query(`SELECT * FROM Tickets WHERE id=@id${scoped}`, { id: req.params.id,uid:req.user!.userId });
    if (ticket.recordset.length === 0) throw new AppError(404, 'Ticket not found');
    const tk = ticket.recordset[0];
    const msg = await query(`INSERT INTO TicketMessages (ticket_id, sender_id, message, is_internal) OUTPUT INSERTED.* VALUES (@tid, @uid, @msg, @int)`, {
      tid: req.params.id, uid: req.user!.userId, msg: req.body.message, int: req.user!.role==='admin' ? Boolean(req.body.is_internal) : false
    });
    if (tk.status === 'closed') await query('UPDATE Tickets SET status=\'pending\', updated_at=GETDATE() WHERE id=@id', { id: req.params.id });
    else await query('UPDATE Tickets SET updated_at=GETDATE() WHERE id=@id', { id: req.params.id });
    sendSuccess(_res, msg.recordset[0], 'Reply sent');
  } catch (err) { next(err); }
}

export async function updateStatus(req: Request, _res: Response, next: NextFunction) {
  try {
    const { status } = req.body;
    const scope=req.user!.role==='coach'?' AND assigned_to=@uid':'';
    const r = await query(`UPDATE Tickets SET status=@st,updated_at=GETDATE() OUTPUT INSERTED.* WHERE id=@id${scope}`, { st: status, id: req.params.id,uid:req.user!.userId });
    if (r.recordset.length === 0) throw new AppError(404, 'Ticket not found');
    sendSuccess(_res, r.recordset[0], 'Status updated');
  } catch (err) { next(err); }
}
