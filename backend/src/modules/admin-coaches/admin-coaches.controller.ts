import { NextFunction, Request, Response } from 'express';
import * as service from './admin-coaches.service';
import { sendSuccess } from '../../utils/response';

const numberParam = (req: Request, name: string) => Number(req.params[name]);
const run = (handler: (req: Request) => Promise<unknown>, statusCode = 200) => async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await handler(req), 'Success', statusCode); } catch (error) { next(error); }
};

export const summary = run(() => service.getSummary());
export const list = run(req => service.listCoaches({ search: req.query.search as string | undefined, status: req.query.status as service.AdminCoachStatus | undefined, page: Number(req.query.page), limit: Number(req.query.limit) }));
export const detail = run(req => service.getCoach(numberParam(req, 'coachId')));
export const status = run(req => service.setCoachStatus(numberParam(req, 'coachId'), req.body.status, req.body.reason), 200);
export const members = run(req => service.listCoachMembers(numberParam(req, 'coachId'), { search: req.query.search as string | undefined, page: Number(req.query.page), limit: Number(req.query.limit) }));
export const unassigned = run(req => service.listUnassignedMembers({ search: req.query.search as string | undefined, page: Number(req.query.page), limit: Number(req.query.limit) }));
export const assign = run(req => service.assignMember(numberParam(req, 'coachId'), numberParam(req, 'memberId')), 201);
export const reassign = run(req => service.reassignMember({ currentCoachId: numberParam(req, 'coachId'), memberId: numberParam(req, 'memberId'), ...req.body, assignedBy: req.user!.userId }));
