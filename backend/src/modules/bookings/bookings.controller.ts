import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../middleware/errorHandler';
import { bookingActor, readBookingId, readBookingStatus, readCreateBookingBody, sendBookingSuccess } from './bookings.http';
import * as bookingService from './bookings.service';
import type { BookingFilters } from './bookings.service';
import { getCoaches as getPublicCoaches, getCoachAvailability as getPublicCoachAvailability } from '../coaches/coach.controller';
import { isDateString, type BookingStatus } from '../../utils/coachBooking';
import { bookingToday } from './bookings.time-policy';

export const getCoaches = getPublicCoaches;
export const getCoachAvailability = getPublicCoachAvailability;

// Keep the existing controller exports stable for legacy scripts/importers while the
// mapper and booking domain operations live in the service boundary.
export { mapBooking } from './bookings.service';
export type { BookingFilters, BookingRow, BookingDto, CoachBookingQuota } from './bookings.service';

function parseBookingFilters(req: Request): BookingFilters {
  const statusText = typeof req.query.status === 'string' ? req.query.status : '';
  const statuses = statusText ? statusText.split(',').filter(Boolean) : [];
  const validStatuses = new Set<BookingStatus>(['pending', 'confirmed', 'completed', 'cancelled', 'no_show']);
  if (statuses.some(status => !validStatuses.has(status as BookingStatus))) throw new AppError(400, 'Invalid booking status filter');
  const fromDate = typeof req.query.fromDate === 'string' ? req.query.fromDate : '';
  const toDate = typeof req.query.toDate === 'string' ? req.query.toDate : '';
  if (fromDate && !isDateString(fromDate)) throw new AppError(400, 'fromDate must be a valid YYYY-MM-DD date');
  if (toDate && !isDateString(toDate)) throw new AppError(400, 'toDate must be a valid YYYY-MM-DD date');
  if (fromDate && toDate && fromDate > toDate) throw new AppError(400, 'fromDate must not be after toDate');
  const statusParams = Object.fromEntries(statuses.map((status, index) => [`status${index}`, status]));
  const statusFilter = statuses.length ? ` AND b.status IN (${statuses.map((_, index) => `@status${index}`).join(',')})` : '';
  const dateFilter = `${fromDate ? ' AND b.booking_date>=@fromDate' : ''}${toDate ? ' AND b.booking_date<=@toDate' : ''}`;
  return { statusFilter, dateFilter, params: { ...statusParams, ...(fromDate ? { fromDate } : {}), ...(toDate ? { toDate } : {}) } };
}

export async function getBookingQuota(req: Request, res: Response, next: NextFunction) {
  try {
    const date = typeof req.query.date === 'string' && req.query.date ? req.query.date : bookingToday();
    const actor = bookingActor(req);
    sendBookingSuccess(res, await bookingService.getBookingQuota(actor.userId, date), 'Coach booking quota fetched');
  } catch (error) {
    next(error);
  }
}

/** HTTP adapter: request parsing stays here; booking orchestration stays in the service. */
export async function createBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const body = readCreateBookingBody(req);
    const actor = bookingActor(req);
    const booking = await bookingService.createBooking({
      coachId: Number(body.coach_id),
      memberId: actor.userId,
      bookingDate: body.booking_date,
      startTime: body.start_time,
      endTime: body.end_time,
      sessionMode: body.session_mode,
      notes: body.notes,
    });
    sendBookingSuccess(res, booking, 'Booking created', 201);
  } catch (error) {
    next(error);
  }
}

export async function getMyBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = bookingActor(req);
    const filters = parseBookingFilters(req);
    const pageValue = Number(req.query.page);
    const limitValue = Number(req.query.limit);
    const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = Number.isSafeInteger(limitValue) && limitValue > 0 ? Math.min(limitValue, 100) : 50;
    const result = await bookingService.listBookings({ actor, filters, page, limit });
    sendBookingSuccess(res, result.items, 'Bookings fetched', 200, { pagination: result.pagination });
  } catch (error) {
    next(error);
  }
}

export async function getBookingSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = bookingActor(req);
    const summary = await bookingService.getBookingSummary({ actor, filters: parseBookingFilters(req) });
    sendBookingSuccess(res, summary, 'Booking summary fetched');
  } catch (error) {
    next(error);
  }
}

export async function getBookingById(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await bookingService.getBookingById({ actor: bookingActor(req), id: readBookingId(req) });
    sendBookingSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function updateBookingStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await bookingService.updateBookingStatus({
      actor: bookingActor(req),
      id: readBookingId(req),
      requestedStatus: readBookingStatus(req),
    });
    sendBookingSuccess(res, result, 'Booking updated');
  } catch (error) {
    next(error);
  }
}
