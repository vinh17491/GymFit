import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import * as service from './notifications.service';

const positiveId = (value: unknown): number => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new AppError(400, 'Notification ID must be a positive integer');
  return id;
};

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const unreadOnly = req.query.unreadOnly === 'true';
    sendSuccess(res, await service.listNotifications(req.user!.userId, Number(req.query.page), Number(req.query.limit), unreadOnly));
  } catch (error) { next(error); }
}

export async function unreadCount(req: Request, res: Response, next: NextFunction) {
  try { sendSuccess(res, { unread: await service.unreadCount(req.user!.userId) }); } catch (error) { next(error); }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
  try { sendSuccess(res, await service.markNotificationRead(req.user!.userId, positiveId(req.params.id)), 'Notification marked as read'); } catch (error) { next(error); }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction) {
  try { sendSuccess(res, await service.markAllNotificationsRead(req.user!.userId), 'Notifications marked as read'); } catch (error) { next(error); }
}
