import type { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { chatWithAssistant, getAssistantStatus } from './assistant.service';

export function getStatus(_req: Request, res: Response): void {
  sendSuccess(res, getAssistantStatus(), 'Assistant status');
}

export async function chat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const actor = req.user ? { userId: req.user.userId, role: req.user.role } : null;
    const result = await chatWithAssistant(req.body, actor);
    sendSuccess(res, result, 'Assistant response');
  } catch (error) {
    next(error);
  }
}
