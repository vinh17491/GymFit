import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response';
import { assertBookingDate, COACH_BOOKING_TIME_ZONE } from '../../utils/coachBooking';
import { todayInTimeZone } from '../../utils/timezone';
import * as service from './coach-availability.service';

const actor = (req: Request): number => req.user!.userId;
const numberParam = (req: Request, key: string): number => Number(req.params[key]);

const run = (handler: (req: Request) => Promise<unknown>, statusCode = 200) => async (req: Request, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await handler(req), 'Success', statusCode); } catch (error) { next(error); }
};

export const getPublicAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestedDate = req.query.date as string | undefined;
    const targetDate = requestedDate ?? todayInTimeZone(COACH_BOOKING_TIME_ZONE);
    assertBookingDate(targetDate);
    const snapshot = await service.getAvailabilitySnapshot(Number(req.params.id), targetDate, { includePrivateNotes: false });
    sendSuccess(res, snapshot);
  } catch (error) { next(error); }
};

export const getSelfAvailability = run(req => service.getAvailabilitySnapshot(actor(req), req.query.date as string | undefined, { includePrivateNotes: true }));
export const listRules = run(req => service.listRules(actor(req), (req.query.includeInactive as unknown) === true));
export const createRule = run(req => service.createRule(actor(req), req.body), 201);
export const updateRule = run(req => service.updateRule(actor(req), numberParam(req, 'ruleId'), req.body));
export const deleteRule = run(async req => { await service.deleteRule(actor(req), numberParam(req, 'ruleId')); return null; });
export const listExceptions = run(req => service.listExceptions(actor(req), (req.query.includeInactive as unknown) === true));
export const createException = run(req => service.createException(actor(req), req.body), 201);
export const updateException = run(req => service.updateException(actor(req), numberParam(req, 'exceptionId'), req.body));
export const deleteException = run(async req => { await service.deleteException(actor(req), numberParam(req, 'exceptionId')); return null; });
