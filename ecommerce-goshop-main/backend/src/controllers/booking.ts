import { NextFunction, Request, Response } from "express";
import { getPool } from "../config/database";
import stripe from "../config/stripe";

// POST /bookings - Create Stripe Checkout Session for booking
export const createBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberId = req.userId!;
    const { coachId, scheduleId, bookingDate, notes } = req.body;

    if (!coachId || !scheduleId || !bookingDate) {
      return res.status(400).json({ message: "coachId, scheduleId, and bookingDate are required" });
    }

    const pool = await getPool();

    // Check schedule exists and is not booked
    const scheduleResult = await pool.request()
      .input("scheduleId", Number(scheduleId))
      .input("coachId", Number(coachId))
      .query(`
        SELECT cs.*, c.HourlyRate, c.UserId AS CoachUserId
        FROM CoachSchedules cs
        JOIN Coaches c ON cs.CoachId = c.Id
        WHERE cs.Id = @scheduleId AND cs.CoachId = @coachId AND cs.IsBooked = 0
      `);
    if (scheduleResult.recordset.length === 0) {
      return res.status(400).json({ message: "Schedule not found or already booked" });
    }

    const schedule = scheduleResult.recordset[0];
    const hourlyRate = Number(schedule.HourlyRate) || 0;

    if (hourlyRate <= 0) {
      return res.status(400).json({ message: "Coach hourly rate is not set" });
    }

    // Create Stripe Checkout Session with VND currency
    const session = await stripe.checkout.sessions.create({
      success_url: (process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : "http://localhost:5173") + "/bookings/success?id={CHECKOUT_SESSION_ID}",
      cancel_url: (process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : "http://localhost:5173") + "/bookings/cancel",
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "vnd",
            product_data: {
              name: "Personal Training Session",
              description: `Booking with Coach (${schedule.StartTime} - ${schedule.EndTime}) on ${bookingDate}`,
            },
            unit_amount: hourlyRate,
          },
          quantity: 1,
        },
      ],
      metadata: {
        paymentType: "booking",
        memberId: String(memberId),
        coachId: String(coachId),
        scheduleId: String(scheduleId),
        bookingDate: bookingDate,
        startTime: schedule.StartTime,
        endTime: schedule.EndTime,
        hourlyRate: String(hourlyRate),
        notes: notes || "",
      },
    });

    res.status(201).json({
      sessionId: session.id,
      checkoutUrl: session.url,
    });
  } catch (error) {
    next({ message: "Unable to create booking checkout session", error });
  }
};

// GET /bookings/my - Get my bookings
export const getMyBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberId = req.userId!;
    const pool = await getPool();
    const result = await pool.request()
      .input("memberId", memberId)
      .query(`
        SELECT b.*, u.FullName AS CoachName, u.Avatar AS CoachAvatar,
               c.Specialization, cs.StartTime, cs.EndTime, cs.SpecificDate
        FROM Bookings b
        JOIN Coaches c ON b.CoachId = c.Id
        JOIN Users u ON c.UserId = u.Id
        JOIN CoachSchedules cs ON b.ScheduleId = cs.Id
        WHERE b.MemberId = @memberId
        ORDER BY b.CreatedAt DESC
      `);
    res.status(200).json(result.recordset);
  } catch (error) {
    next({ message: "Unable to fetch bookings", error });
  }
};

// GET /bookings/history - Get my booking history
export const getBookingHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberId = req.userId!;
    const pool = await getPool();
    const result = await pool.request()
      .input("memberId", memberId)
      .query(`
        SELECT b.*, u.FullName AS CoachName, u.Avatar AS CoachAvatar,
               c.Specialization, cs.StartTime, cs.EndTime, cs.SpecificDate,
               p.Amount, p.Currency, p.Status AS PaymentStatus
        FROM Bookings b
        JOIN Coaches c ON b.CoachId = c.Id
        JOIN Users u ON c.UserId = u.Id
        JOIN CoachSchedules cs ON b.ScheduleId = cs.Id
        LEFT JOIN Payments p ON b.StripePaymentId = p.StripeSessionId
        WHERE b.MemberId = @memberId
        ORDER BY b.CreatedAt DESC
      `);
    res.status(200).json(result.recordset);
  } catch (error) {
    next({ message: "Unable to fetch booking history", error });
  }
};

// POST /bookings/:id/cancel - Cancel a booking (member or admin)
export const cancelBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const roleName = req.roleName!;
    const bookingId = Number(req.params.id);
    const pool = await getPool();

    // Check booking exists
    const booking = await pool.request()
      .input("id", bookingId)
      .query("SELECT * FROM Bookings WHERE Id = @id");
    if (booking.recordset.length === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const bookingData = booking.recordset[0];

    // Check ownership: member must own booking, admin can cancel any
    if (roleName !== "ADMIN" && bookingData.MemberId !== userId) {
      return res.status(403).json({ message: "Forbidden: you can only cancel your own booking" });
    }

    if (bookingData.Status !== "CONFIRMED") {
      return res.status(400).json({ message: "Booking is not confirmed" });
    }

    // Update booking status
    await pool.request()
      .input("id", bookingId)
      .query("UPDATE Bookings SET Status = 'CANCELLED', UpdatedAt = GETUTCDATE() WHERE Id = @id");

    // Unlock schedule
    await pool.request()
      .input("scheduleId", bookingData.ScheduleId)
      .query("UPDATE CoachSchedules SET IsBooked = 0 WHERE Id = @scheduleId");

    res.status(200).json({ message: "Booking cancelled successfully" });
  } catch (error) {
    next({ message: "Unable to cancel booking", error });
  }
};

// ============= COACH ENDPOINTS =============

// GET /bookings/coach - Get coach's bookings
export const getCoachBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const pool = await getPool();

    // Get coach profile for this user
    const coachResult = await pool.request()
      .input("userId", userId)
      .query("SELECT Id FROM Coaches WHERE UserId = @userId");
    if (coachResult.recordset.length === 0) {
      return res.status(404).json({ message: "Coach profile not found" });
    }

    const coachId = coachResult.recordset[0].Id;

    const result = await pool.request()
      .input("coachId", coachId)
      .query(`
        SELECT b.*, u.FullName AS MemberName, u.Email AS MemberEmail, u.Avatar AS MemberAvatar,
               cs.StartTime, cs.EndTime, cs.SpecificDate
        FROM Bookings b
        JOIN Users u ON b.MemberId = u.Id
        JOIN CoachSchedules cs ON b.ScheduleId = cs.Id
        WHERE b.CoachId = @coachId
        ORDER BY b.CreatedAt DESC
      `);
    res.status(200).json(result.recordset);
  } catch (error) {
    next({ message: "Unable to fetch coach bookings", error });
  }
};

// POST /bookings/:id/complete - Mark booking as completed (coach)
export const completeBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const bookingId = Number(req.params.id);
    const pool = await getPool();

    // Get coach profile
    const coachResult = await pool.request()
      .input("userId", userId)
      .query("SELECT Id FROM Coaches WHERE UserId = @userId");
    if (coachResult.recordset.length === 0) {
      return res.status(404).json({ message: "Coach profile not found" });
    }

    const coachId = coachResult.recordset[0].Id;

    // Check booking exists and belongs to this coach
    const booking = await pool.request()
      .input("id", bookingId)
      .input("coachId", coachId)
      .query("SELECT * FROM Bookings WHERE Id = @id AND CoachId = @coachId");
    if (booking.recordset.length === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.recordset[0].Status !== "CONFIRMED") {
      return res.status(400).json({ message: "Booking is not confirmed" });
    }

    await pool.request()
      .input("id", bookingId)
      .query("UPDATE Bookings SET Status = 'COMPLETED', UpdatedAt = GETUTCDATE() WHERE Id = @id");

    res.status(200).json({ message: "Booking completed successfully" });
  } catch (error) {
    next({ message: "Unable to complete booking", error });
  }
};

// ============= ADMIN ENDPOINTS =============

// GET /bookings/admin - Get all bookings (admin)
export const getAllBookings = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT b.*, 
               mu.FullName AS MemberName, mu.Email AS MemberEmail,
               cu.FullName AS CoachName, cu.Email AS CoachEmail,
               cs.StartTime, cs.EndTime, cs.SpecificDate
        FROM Bookings b
        JOIN Users mu ON b.MemberId = mu.Id
        JOIN Coaches c ON b.CoachId = c.Id
        JOIN Users cu ON c.UserId = cu.Id
        JOIN CoachSchedules cs ON b.ScheduleId = cs.Id
        ORDER BY b.CreatedAt DESC
      `);
    res.status(200).json(result.recordset);
  } catch (error) {
    next({ message: "Unable to fetch all bookings", error });
  }
};