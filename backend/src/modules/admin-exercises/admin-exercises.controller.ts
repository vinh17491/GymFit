import { NextFunction, Request, Response } from 'express';
import * as service from './admin-exercises.service';
import { sendSuccess } from '../../utils/response';

const run = (handler: (req: Request) => Promise<unknown>, code = 200) => async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await handler(req), 'Success', code); } catch (error) { next(error); } };
const id = (req: Request) => Number(req.params.exerciseId);
export const list = run(req => service.list({ search: req.query.search as string | undefined, status: req.query.status as 'ACTIVE' | 'INACTIVE' | undefined, muscleGroup: req.query.muscleGroup as string | undefined, difficulty: req.query.difficulty as string | undefined, page: Number(req.query.page), limit: Number(req.query.limit) }));
export const detail = run(req => service.get(id(req)));
export const create = run(req => service.create(req.body), 201);
export const update = run(req => service.update(id(req), req.body));
export const activate = run(req => service.update(id(req), { is_active: true }));
export const deactivate = run(req => service.update(id(req), { is_active: false }));
