import { NextFunction, Request, Response } from 'express';
import * as service from './admin-workouts.service';
import { sendSuccess } from '../../utils/response';

const common = (req: Request) => ({ page: Number(req.query.page), limit: Number(req.query.limit), coachId: req.query.coachId ? Number(req.query.coachId) : undefined, memberId: req.query.memberId ? Number(req.query.memberId) : undefined, status: req.query.status as string | undefined, fromDate: req.query.fromDate as string | undefined, toDate: req.query.toDate as string | undefined });
const run = (handler: (req: Request) => Promise<unknown>) => async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await handler(req), 'Success'); } catch (error) { next(error); } };
export const programs = run(req => service.programs({ ...common(req), q: req.query.q as string | undefined }));
export const assignments = run(req => service.assignments(common(req)));
export const schedules = run(req => service.schedules(common(req)));
export const sessions = run(req => service.sessions(common(req)));
export const progress = run(req => service.progress(common(req)));
