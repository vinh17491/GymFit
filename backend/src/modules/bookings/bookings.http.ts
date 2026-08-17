import type { Request, Response } from 'express';
import { AppError } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/response';
import type { BookingStatus } from '../../utils/coachBooking';

export interface NormalizedCreateBooking {
  coach_id: number;
  booking_date: string;
  start_time: string;
  end_time?: string;
  session_mode?: 'ONLINE' | 'IN_PERSON';
  notes?: string;
}

export interface BookingActor {
  userId: number;
  role: string;
}

export function bookingActor(req: Request): BookingActor {
  if (!req.user) throw new AppError(401, 'Authentication required');
  return { userId: req.user.userId, role: req.user.role };
}

export function readCreateBookingBody(req: Request): NormalizedCreateBooking {
  return req.body as NormalizedCreateBooking;
}

export function readBookingId(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) throw new AppError(400, 'Booking ID must be a positive integer');
  return id;
}

export function readBookingStatus(req: Request): BookingStatus {
  return (req.body as { status: BookingStatus }).status;
}

export function sendBookingSuccess(
  res: Response,
  data: unknown,
  message = 'Success',
  statusCode = 200,
  extra?: unknown,
) {
  return sendSuccess(res, data, message, statusCode, extra);
}
