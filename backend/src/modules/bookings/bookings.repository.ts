import { query, sql } from '../../config/database';
import type { BookingRow } from './bookings.service';

export interface BookingScope {
  clause: string;
  params: Record<string, unknown>;
}

export interface BookingListQuery {
  scope: BookingScope;
  statusFilter: string;
  dateFilter: string;
  filterParams: Record<string, unknown>;
  offset: number;
  limit: number;
}

export interface BookingSummaryQuery {
  scope: BookingScope;
  statusFilter: string;
  dateFilter: string;
  filterParams: Record<string, unknown>;
  today: string;
  localTime: string;
}

export interface BookingOverlapInput {
  coachId: number;
  memberId: number;
  bookingDate: string;
  startTime: string;
  endTime: string;
}

export interface InsertBookingInput extends BookingOverlapInput {
  sessionMode: string;
  location: string | null;
  notes: string | null;
}

export interface StatusLookupInput {
  id: number;
  userId: number;
  ownership: string;
}

export interface StatusUpdateInput extends StatusLookupInput {
  status: string;
  currentStatus: string;
}

interface BookingSummaryRow {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  no_show: number;
  upcoming: number;
  today: number;
}

function bookingSelect(scope: string): string {
  return `SELECT b.id,b.coach_id,b.member_id,b.booking_date,b.start_time,b.end_time,b.session_mode,b.location,b.status,b.notes,b.created_at,b.updated_at,
                 m.name AS member_name,c.name AS coach_name,c.avatar_url AS coach_avatar_url
          FROM dbo.Bookings b
          JOIN dbo.Users m ON m.id=b.member_id
          JOIN dbo.Users c ON c.id=b.coach_id
          WHERE ${scope}`;
}

function executorRequest(executor: sql.ConnectionPool | sql.Transaction): sql.Request {
  return executor instanceof sql.Transaction ? new sql.Request(executor) : executor.request();
}

export async function countMemberBookingsInMonth(
  executor: sql.ConnectionPool | sql.Transaction,
  memberId: number,
  monthStart: string,
  nextMonth: string,
): Promise<number> {
  const result = await executorRequest(executor)
    .input('quotaMemberId', sql.Int, memberId)
    .input('quotaMonthStart', sql.Date, monthStart)
    .input('quotaNextMonth', sql.Date, nextMonth)
    .query<{ used: number }>(`SELECT COUNT_BIG(*) AS used
      FROM dbo.Bookings WITH (UPDLOCK,HOLDLOCK)
      WHERE member_id=@quotaMemberId AND booking_date>=@quotaMonthStart AND booking_date<@quotaNextMonth`);
  return Number(result.recordset[0]?.used ?? 0);
}

export async function coachIsBookable(tx: sql.Transaction, coachId: number): Promise<boolean> {
  const result = await new sql.Request(tx)
    .input('coachId', sql.Int, coachId)
    .query<{ id: number }>(
      `SELECT u.id
       FROM dbo.Users u WITH (UPDLOCK,HOLDLOCK)
       LEFT JOIN dbo.CoachProfiles cp ON cp.coach_id=u.id
       WHERE u.id=@coachId AND u.role=N'coach' AND u.is_active=1
         AND COALESCE(u.coach_status,N'ACTIVE')=N'ACTIVE'
         AND COALESCE(cp.booking_enabled,1)=1`,
    );
  return Boolean(result.recordset[0]);
}

export async function coachHasOverlap(tx: sql.Transaction, input: BookingOverlapInput): Promise<boolean> {
  const result = await new sql.Request(tx)
    .input('coachId', sql.Int, input.coachId)
    .input('bookingDate', sql.Date, input.bookingDate)
    .input('startTime', sql.VarChar(5), input.startTime)
    .input('endTime', sql.VarChar(5), input.endTime)
    .query<{ id: number }>(
      `SELECT TOP 1 id FROM dbo.Bookings WITH (UPDLOCK,HOLDLOCK)
       WHERE coach_id=@coachId AND booking_date=@bookingDate
         AND status IN (N'pending',N'confirmed')
         AND start_time < @endTime AND end_time > @startTime`,
    );
  return Boolean(result.recordset[0]);
}

export async function memberHasOverlap(tx: sql.Transaction, input: BookingOverlapInput): Promise<boolean> {
  const result = await new sql.Request(tx)
    .input('memberId', sql.Int, input.memberId)
    .input('bookingDate', sql.Date, input.bookingDate)
    .input('startTime', sql.VarChar(5), input.startTime)
    .input('endTime', sql.VarChar(5), input.endTime)
    .query<{ id: number }>(
      `SELECT TOP 1 id FROM dbo.Bookings WITH (UPDLOCK,HOLDLOCK)
       WHERE member_id=@memberId AND booking_date=@bookingDate
         AND status IN (N'pending',N'confirmed')
         AND start_time < @endTime AND end_time > @startTime`,
    );
  return Boolean(result.recordset[0]);
}

export async function insertBooking(tx: sql.Transaction, input: InsertBookingInput): Promise<BookingRow> {
  const result = await new sql.Request(tx)
    .input('coachId', sql.Int, input.coachId)
    .input('memberId', sql.Int, input.memberId)
    .input('bookingDate', sql.Date, input.bookingDate)
    .input('startTime', sql.VarChar(5), input.startTime)
    .input('endTime', sql.VarChar(5), input.endTime)
    .input('sessionMode', sql.NVarChar(20), input.sessionMode)
    .input('location', sql.NVarChar(255), input.location)
    .input('notes', sql.NVarChar(500), input.notes)
    .query<BookingRow>(
      `INSERT dbo.Bookings(coach_id,member_id,booking_date,start_time,end_time,session_mode,location,status,notes,created_at,updated_at)
       OUTPUT INSERTED.*
       VALUES(@coachId,@memberId,@bookingDate,@startTime,@endTime,@sessionMode,@location,N'pending',@notes,SYSUTCDATETIME(),SYSUTCDATETIME())`,
    );
  return result.recordset[0];
}

export async function listBookings(input: BookingListQuery): Promise<{ rows: BookingRow[]; total: number }> {
  const list = await query<BookingRow>(
    `${bookingSelect(`${input.scope.clause}${input.statusFilter}${input.dateFilter}`)} ORDER BY b.booking_date ASC,b.start_time ASC,b.id ASC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
    { ...input.scope.params, ...input.filterParams, offset: input.offset, limit: input.limit },
  );
  const total = await query<{ total: number }>(
    `SELECT COUNT(*) AS total FROM dbo.Bookings b WHERE ${input.scope.clause}${input.statusFilter}${input.dateFilter}`,
    { ...input.scope.params, ...input.filterParams },
  );
  return { rows: list.recordset, total: Number(total.recordset[0]?.total ?? 0) };
}

export async function getBookingSummary(input: BookingSummaryQuery): Promise<BookingSummaryRow | undefined> {
  const result = await query<BookingSummaryRow>(
    `SELECT COUNT_BIG(*) AS total,
            SUM(CASE WHEN b.status=N'pending' THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN b.status=N'confirmed' THEN 1 ELSE 0 END) AS confirmed,
            SUM(CASE WHEN b.status=N'completed' THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN b.status=N'cancelled' THEN 1 ELSE 0 END) AS cancelled,
            SUM(CASE WHEN b.status=N'no_show' THEN 1 ELSE 0 END) AS no_show,
            SUM(CASE WHEN b.status IN (N'pending',N'confirmed') AND (b.booking_date>@today OR (b.booking_date=@today AND CONVERT(char(5),b.start_time,108)>=@localTime)) THEN 1 ELSE 0 END) AS upcoming,
            SUM(CASE WHEN b.status IN (N'pending',N'confirmed') AND b.booking_date=@today THEN 1 ELSE 0 END) AS today
     FROM dbo.Bookings b
     WHERE ${input.scope.clause}${input.statusFilter}${input.dateFilter}`,
    { ...input.scope.params, ...input.filterParams, today: input.today, localTime: input.localTime },
  );
  return result.recordset[0];
}

export async function findBookingById(input: { id: number; scope: BookingScope }): Promise<BookingRow | undefined> {
  const result = await query<BookingRow>(
    `${bookingSelect(`b.id=@id AND ${input.scope.clause}`)}`,
    { id: input.id, ...input.scope.params },
  );
  return result.recordset[0];
}

export async function findBookingForStatusUpdate(
  tx: sql.Transaction,
  input: StatusLookupInput,
): Promise<BookingRow | undefined> {
  const result = await new sql.Request(tx)
    .input('id', sql.Int, input.id)
    .input('userId', sql.Int, input.userId)
    .query<BookingRow>(`SELECT TOP 1 b.* FROM dbo.Bookings b WITH (UPDLOCK,HOLDLOCK) WHERE b.id=@id${input.ownership}`);
  return result.recordset[0];
}

export async function updateBookingStatus(
  tx: sql.Transaction,
  input: StatusUpdateInput,
): Promise<BookingRow | undefined> {
  const result = await new sql.Request(tx)
    .input('id', sql.Int, input.id)
    .input('status', sql.VarChar(20), input.status)
    .input('currentStatus', sql.VarChar(20), input.currentStatus)
    .input('userId', sql.Int, input.userId)
    .query<BookingRow>(
      `UPDATE dbo.Bookings
       SET status=@status,updated_at=SYSUTCDATETIME()
       OUTPUT INSERTED.*
       WHERE id=@id AND status=@currentStatus${input.ownership}`,
    );
  return result.recordset[0];
}
