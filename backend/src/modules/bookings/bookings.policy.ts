import { AppError } from '../../middleware/errorHandler';
import { isValidBookingTransition, type BookingStatus } from '../../utils/coachBooking';

export interface BookingQuotaPolicyInput {
  included: boolean;
  remaining: number | null;
}

export interface BookingNotificationTargetInput {
  coach_id: number;
  member_id: number;
}

export interface BookingNotificationTarget {
  recipientUserId: number;
  actionUrl: string;
}

export function assertCreateBookingQuota(quota: BookingQuotaPolicyInput): void {
  if (!quota.included) {
    throw new AppError(403, 'Coach booking is not included in the active Membership', 'COACH_BOOKING_NOT_INCLUDED');
  }
  if (quota.remaining !== null && quota.remaining <= 0) {
    throw new AppError(409, 'Monthly Coach booking quota has been reached', 'COACH_BOOKING_QUOTA_EXCEEDED');
  }
}

export function assertStatusChangeAllowed(role: string, requestedStatus: BookingStatus): void {
  if (role === 'member' && requestedStatus !== 'cancelled') {
    throw new AppError(403, 'Members may only cancel their own bookings');
  }
}

export function assertStatusTransition(currentStatus: BookingStatus, requestedStatus: BookingStatus): void {
  if (!isValidBookingTransition(currentStatus, requestedStatus)) {
    throw new AppError(409, 'Invalid booking status transition');
  }
}

export function bookingStatusOwnership(role: string): string {
  if (role === 'coach') return ' AND coach_id=@userId';
  if (role === 'member') return ' AND member_id=@userId';
  if (role === 'admin') return '';
  return ' AND 1=0';
}

export function bookingNotificationTarget(
  role: string,
  booking: BookingNotificationTargetInput,
): BookingNotificationTarget {
  return {
    recipientUserId: role === 'member' ? Number(booking.coach_id) : Number(booking.member_id),
    actionUrl: role === 'member' ? '/coach/appointments' : '/appointments',
  };
}
