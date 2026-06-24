import { Request, Response, NextFunction } from "express";
import { getPool } from "../config/database";
import { BANK_INFO } from "../config/bank";
import { generateQRUrl } from "../services/vietqr";
import { createNotification } from "./notification";

type AuthRequest = Request & { userId?: number; roleName?: string };

// GET /payment/qr-info — public QR info
export const getQrInfo = async (_req: Request, res: Response) => {
  res.status(200).json(BANK_INFO);
};

// POST /payment/confirm — confirm a payment (marks as succeeded)
export const confirmPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { paymentId } = req.body;
    if (!paymentId) return res.status(400).json({ message: "paymentId required" });

    const pool = await getPool();
    const result = await pool.request()
      .input("id", Number(paymentId))
      .query(`UPDATE Payments SET Status = 'SUCCEEDED', UpdatedAt = GETUTCDATE() OUTPUT INSERTED.* WHERE Id = @id`);

    if (result.recordset.length === 0) return res.status(404).json({ message: "Payment not found" });
    res.status(200).json(result.recordset[0]);
  } catch (error) {
    next({ message: "Unable to confirm payment", error });
  }
};

// POST /payment/verify — verify payment (admin)
export const verifyPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { paymentId, status } = req.body;
    if (!paymentId || !status) return res.status(400).json({ message: "paymentId and status required" });

    const pool = await getPool();
    const result = await pool.request()
      .input("id", Number(paymentId))
      .input("status", status)
      .query(`UPDATE Payments SET Status = @status, UpdatedAt = GETUTCDATE() OUTPUT INSERTED.* WHERE Id = @id`);

    if (result.recordset.length === 0) return res.status(404).json({ message: "Payment not found" });

    // If succeeded, update related entities
    if (status === "SUCCEEDED") {
      const payment = result.recordset[0];
      if (payment.PaymentType === "ORDER") {
        await pool.request().input("id", payment.OrderId).query("UPDATE Orders SET Status = 'PROCESSING', UpdatedAt = GETUTCDATE() WHERE Id = @id");
      } else if (payment.PaymentType === "MEMBERSHIP") {
        await pool.request().input("id", payment.Id).query("UPDATE Memberships SET Status = 'ACTIVE' WHERE Id = (SELECT Id FROM Memberships WHERE UserId = @userId ORDER BY Id DESC OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY)");
        await createNotification(payment.UserId, "Payment Confirmed", "Your payment has been confirmed. Thank you!");
      } else if (payment.PaymentType === "BOOKING") {
        await pool.request().input("id", payment.Id).query("UPDATE Bookings SET Status = 'CONFIRMED' WHERE Id = (SELECT Id FROM Bookings WHERE MemberId = @userId ORDER BY Id DESC OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY)");
      }
    }

    res.status(200).json(result.recordset[0]);
  } catch (error) {
    next({ message: "Unable to verify payment", error });
  }
};

// POST /payment/membership/purchase — purchase membership (QR flow)
export const purchaseMembership = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { planId } = req.body;
    if (!planId) return res.status(400).json({ message: "planId required" });

    const pool = await getPool();
    const plan = await pool.request()
      .input("id", Number(planId))
      .query("SELECT * FROM MembershipPlans WHERE Id = @id AND IsActive = 1");
    if (plan.recordset.length === 0) return res.status(404).json({ message: "Plan not found" });

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + Number(plan.recordset[0].DurationDays));

    const membershipResult = await pool.request()
      .input("userId", userId)
      .input("planId", Number(planId))
      .input("startDate", startDate.toISOString().slice(0, 10))
      .input("endDate", endDate.toISOString().slice(0, 10))
      .query(`INSERT INTO Memberships (UserId, PlanId, StartDate, EndDate, Status, CreatedAt) OUTPUT INSERTED.* VALUES (@userId, @planId, @startDate, @endDate, 'PENDING', GETUTCDATE())`);

    const paymentResult = await pool.request()
      .input("userId", userId)
      .input("amount", Number(plan.recordset[0].Price))
      .input("currency", "VND")
      .input("paymentMethod", "BANK_TRANSFER")
      .input("status", "PENDING")
      .input("paymentType", "MEMBERSHIP")
      .query(`INSERT INTO Payments (UserId, Amount, Currency, PaymentMethod, Status, PaymentType, CreatedAt, UpdatedAt) OUTPUT INSERTED.* VALUES (@userId, @amount, @currency, @paymentMethod, @status, @paymentType, GETUTCDATE(), GETUTCDATE())`);

    res.status(201).json({
      membership: membershipResult.recordset[0],
      payment: paymentResult.recordset[0],
      qrInfo: {
        bankName: BANK_INFO.bankName,
        accountNumber: BANK_INFO.accountNumber,
        accountHolder: BANK_INFO.accountHolder,
        amount: Number(plan.recordset[0].Price),
        content: `GYMFIT-MEM-${membershipResult.recordset[0].Id}`,
        qrImageUrl: generateQRUrl({ amount: Number(plan.recordset[0].Price), content: `GYMFIT-MEM-${membershipResult.recordset[0].Id}` }),
      },
    });
  } catch (error) {
    next({ message: "Unable to purchase membership", error });
  }
};

// POST /payment/booking — create booking with QR
export const createBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const memberId = req.userId!;
    const { coachId, scheduleId, bookingDate, notes } = req.body;
    if (!coachId || !scheduleId || !bookingDate) return res.status(400).json({ message: "coachId, scheduleId, bookingDate required" });

    const pool = await getPool();
    const schedule = await pool.request()
      .input("scheduleId", Number(scheduleId))
      .input("coachId", Number(coachId))
      .query("SELECT cs.*, c.HourlyRate FROM CoachSchedules cs JOIN Coaches c ON cs.CoachId = c.Id WHERE cs.Id = @scheduleId AND cs.CoachId = @coachId AND cs.IsBooked = 0");
    if (schedule.recordset.length === 0) return res.status(400).json({ message: "Schedule not found or already booked" });

    const hourlyRate = Number(schedule.recordset[0].HourlyRate) || 0;
    if (hourlyRate <= 0) return res.status(400).json({ message: "Coach hourly rate not set" });

    const bookingResult = await pool.request()
      .input("memberId", memberId)
      .input("coachId", Number(coachId))
      .input("scheduleId", Number(scheduleId))
      .input("bookingDate", bookingDate)
      .input("startTime", schedule.recordset[0].StartTime)
      .input("endTime", schedule.recordset[0].EndTime)
      .input("notes", notes || null)
      .input("amount", hourlyRate)
      .query(`INSERT INTO Bookings (MemberId, CoachId, ScheduleId, BookingDate, StartTime, EndTime, Status, Notes, Amount, CreatedAt) OUTPUT INSERTED.* VALUES (@memberId, @coachId, @scheduleId, @bookingDate, @startTime, @endTime, 'PENDING', @notes, @amount, GETUTCDATE())`);

    const paymentResult = await pool.request()
      .input("userId", memberId)
      .input("amount", hourlyRate)
      .input("currency", "VND")
      .input("paymentMethod", "BANK_TRANSFER")
      .input("status", "PENDING")
      .input("paymentType", "BOOKING")
      .query(`INSERT INTO Payments (UserId, Amount, Currency, PaymentMethod, Status, PaymentType, CreatedAt, UpdatedAt) OUTPUT INSERTED.* VALUES (@userId, @amount, @currency, @paymentMethod, @status, @paymentType, GETUTCDATE(), GETUTCDATE())`);

    await pool.request().input("scheduleId", Number(scheduleId)).query("UPDATE CoachSchedules SET IsBooked = 1 WHERE Id = @scheduleId");

    res.status(201).json({
      booking: bookingResult.recordset[0],
      payment: paymentResult.recordset[0],
      qrInfo: {
        bankName: BANK_INFO.bankName,
        accountNumber: BANK_INFO.accountNumber,
        accountHolder: BANK_INFO.accountHolder,
        amount: hourlyRate,
        content: `GYMFIT-BK-${bookingResult.recordset[0].Id}`,
        qrImageUrl: generateQRUrl({ amount: hourlyRate, content: `GYMFIT-BK-${bookingResult.recordset[0].Id}` }),
      },
    });
  } catch (error) {
    next({ message: "Unable to create booking", error });
  }
};