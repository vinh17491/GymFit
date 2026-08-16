import { NextFunction, Request, Response } from 'express';
import * as service from './member-workout.service';
import { sendSuccess } from '../../utils/response';

const actor = (req: Request) => req.user!.userId;
const param = (req: Request, name: string) => Number(req.params[name]);
const run = (handler: (req: Request) => Promise<unknown>, statusCode = 200) => async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await handler(req), 'Success', statusCode); } catch (error) { next(error); }
};

export const getCurrent = run(req => service.getCurrent(actor(req)));
export const listSchedules = run(req => service.listSchedules(actor(req), Number(req.query.page), Number(req.query.limit), req.query.fromDate as string | undefined, req.query.toDate as string | undefined, req.query.status as string | undefined));
export const getSchedule = run(req => service.getSchedule(actor(req), param(req, 'scheduleId')));
export const startSession = run(req => service.startSession(actor(req), param(req, 'scheduleId')), 201);
export const listSessions = run(req => service.listSessions(actor(req), Number(req.query.page), Number(req.query.limit)));
export const listProgressSessions = run(req => service.listProgressSessions(actor(req), Number(req.query.page), Number(req.query.limit), req.query.status as string | undefined, req.query.fromDate as string | undefined, req.query.toDate as string | undefined, req.query.programId ? Number(req.query.programId) : undefined, req.query.day as string | undefined));
export const getSession = run(req => service.getSession(actor(req), param(req, 'sessionId')));
export const completeSession = run(req => service.completeSession(actor(req), param(req, 'sessionId')));
export const abandonSession = run(req => service.abandonSession(actor(req), param(req, 'sessionId')));
export const getProgress = run(req => service.getProgress(actor(req)));
export const getExerciseProgress = run(req => service.getExerciseProgress(actor(req), param(req, 'exerciseId')));
export const createSet = run(req => service.createSet(actor(req), param(req, 'sessionId'), param(req, 'sessionExerciseId'), req.body), 201);
export const updateSet = run(req => service.updateSet(actor(req), param(req, 'sessionId'), param(req, 'sessionExerciseId'), param(req, 'setId'), req.body));
export const deleteSet = run(req => service.deleteSet(actor(req), param(req, 'sessionId'), param(req, 'sessionExerciseId'), param(req, 'setId')));
