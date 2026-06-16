import { Request, Response } from "express";
import stripe from "../config/stripe";
import { getPool } from "../config/database";
import { createNotification } from "./notification";

interface StripeAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

interface StripeCheckoutSession {
  id: string;
  payment_intent: string | null;
  metadata: { 
    customerId?: string; 
    paymentType?: string; 
    planId?: string; 
    planName?: string; 
    durationDays?: string; 
    planPrice?: string;
    memberId?: string;
    coachId?: string;
    scheduleId?: string;
    bookingDate?: string;
    startTime?: string;
    endTime?: string;
    hourlyRate?: string;
    notes?: string;
  } | null;
  amount_total: number | null;
  customer_details: {
    address: StripeAddress | null;
  } | null;
}

const processOrderAddress = (address: StripeAddress | null): string => {
  const line1 = [address?.line1, address?.line2].filter(Boolean).join(", ");
  const line2 = [address?.city, address?.state].filter(Boolean).join(", ");
  const line3 = [address?.postal_code].filter(Boolean).join(", ");
  return [line1, line2, line3].filter(Boolean).join(", ");
};

export const webhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] || "";
  let event: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || "");
  } catch (err) {
    return res.status(400).json(err);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as StripeCheckoutSession;
    const customerId = session.metadata?.customerId;
    if (!customerId) {
      return res.status(200).json({ message: "No customerId in metadata" });
    }

    const paymentType = session.metadata?.paymentType;
    const pool = await getPool();

    // Idempotency check: see if session was already processed
    const existingPayment = await pool.request()
      .input("stripeSessionId", session.id)
      .query("SELECT Id FROM Payments WHERE StripeSessionId = @stripeSessionId");
    if (existingPayment.recordset.length > 0) {
      console.log(`[Webhook] Session ${session.id} already processed.`);
      return res.status(200).json({ received: true });
    }

    // Handle membership purchase
    if (paymentType === "membership") {
      const planId = session.metadata?.planId;
      const durationDays = session.metadata?.durationDays;
      const planPrice = session.metadata?.planPrice;

      if (!planId || !durationDays) {
        return res.status(400).json({ message: "Missing membership metadata" });
      }

      // Idempotency: check if membership already exists for this session
      const existingMembership = await pool.request()
        .input("stripePaymentId", session.id)
        .query("SELECT Id FROM Memberships WHERE StripePaymentId = @stripePaymentId");
      if (existingMembership.recordset.length > 0) {
        return res.status(200).json({ message: "Membership already processed (idempotent)", membership: existingMembership.recordset[0] });
      }

      // Calculate end date
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + Number(durationDays));

      const paymentIntentId = session.payment_intent || session.id;

      // Insert Membership
      const membershipResult = await pool.request()
        .input("userId", Number(customerId))
        .input("planId", Number(planId))
        .input("startDate", startDate.toISOString().slice(0, 10))
        .input("endDate", endDate.toISOString().slice(0, 10))
        .input("status", "ACTIVE")
        .input("stripePaymentId", session.id)
        .query(`
          INSERT INTO Memberships (UserId, PlanId, StartDate, EndDate, Status, StripePaymentId, CreatedAt)
          OUTPUT INSERTED.*
          VALUES (@userId, @planId, @startDate, @endDate, @status, @stripePaymentId, GETUTCDATE())
        `);

      const membership = membershipResult.recordset[0];

      // Insert Payment record
      const amountTotal = session.amount_total || Number(planPrice);
      const paymentResult = await pool.request()
        .input("userId", Number(customerId))
        .input("amount", amountTotal)
        .input("currency", "VND")
        .input("paymentMethod", "STRIPE")
        .input("status", "COMPLETED")
        .input("paymentType", "MEMBERSHIP")
        .input("stripeSessionId", session.id)
        .input("stripePaymentIntentId", paymentIntentId)
        .query(`
          INSERT INTO Payments (UserId, Amount, Currency, PaymentMethod, Status, PaymentType, StripeSessionId, StripePaymentIntentId, CreatedAt)
          OUTPUT INSERTED.*
          VALUES (@userId, @amount, @currency, @paymentMethod, @status, @paymentType, @stripeSessionId, @stripePaymentIntentId, GETUTCDATE())
        `);

      // Create notification for membership activation
      await createNotification(
        Number(customerId),
        "Membership Activated",
        "Your membership has been activated successfully."
      );

      return res.status(201).json({
        membership: membershipResult.recordset[0],
        payment: paymentResult.recordset[0],
      });
    }

    // Handle booking purchase
    if (paymentType === "booking") {
      const memberId = session.metadata?.memberId || customerId;
      const coachId = session.metadata?.coachId;
      const scheduleId = session.metadata?.scheduleId;
      const hourlyRate = session.metadata?.hourlyRate;
      const amountTotal = session.amount_total || Number(hourlyRate || 0);

      if (!coachId || !scheduleId) {
        return res.status(400).json({ message: "Missing booking metadata" });
      }

      // Idempotency: check if booking already exists for this session
      const existingBooking = await pool.request()
        .input("stripePaymentId", session.id)
        .query("SELECT Id FROM Bookings WHERE StripePaymentId = @stripePaymentId");
      if (existingBooking.recordset.length > 0) {
        return res.status(200).json({ message: "Booking already processed (idempotent)", booking: existingBooking.recordset[0] });
      }

      // Mark schedule as booked
      await pool.request()
        .input("scheduleId", Number(scheduleId))
        .query("UPDATE CoachSchedules SET IsBooked = 1 WHERE Id = @scheduleId");

      // Insert Booking
      const bookingResult = await pool.request()
        .input("memberId", Number(memberId))
        .input("coachId", Number(coachId))
        .input("scheduleId", Number(scheduleId))
        .input("bookingDate", session.metadata?.bookingDate || null)
        .input("startTime", session.metadata?.startTime || null)
        .input("endTime", session.metadata?.endTime || null)
        .input("stripePaymentId", session.id)
        .input("notes", session.metadata?.notes || null)
        .input("amount", amountTotal)
        .query(`
          INSERT INTO Bookings (MemberId, CoachId, ScheduleId, BookingDate, StartTime, EndTime, Status, StripePaymentId, Notes, Amount, CreatedAt)
          OUTPUT INSERTED.*
          VALUES (@memberId, @coachId, @scheduleId, @bookingDate, @startTime, @endTime, 'CONFIRMED', @stripePaymentId, @notes, @amount, GETUTCDATE())
        `);

      // Insert Payment record
      const paymentResult = await pool.request()
        .input("userId", Number(memberId))
        .input("amount", amountTotal)
        .input("currency", "VND")
        .input("paymentMethod", "STRIPE")
        .input("status", "COMPLETED")
        .input("paymentType", "BOOKING")
        .input("stripeSessionId", session.id)
        .input("stripePaymentIntentId", session.id)
        .query(`
          INSERT INTO Payments (UserId, Amount, Currency, PaymentMethod, Status, PaymentType, StripeSessionId, StripePaymentIntentId, CreatedAt)
          OUTPUT INSERTED.*
          VALUES (@userId, @amount, @currency, @paymentMethod, @status, @paymentType, @stripeSessionId, @stripePaymentIntentId, GETUTCDATE())
        `);

      // Create notification for booking confirmed
      await createNotification(
        Number(memberId),
        "Booking Confirmed",
        "Your coach booking has been confirmed."
      );

      return res.status(201).json({
        booking: bookingResult.recordset[0],
        payment: paymentResult.recordset[0],
      });
    }

    // Handle order purchase (existing logic)
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);

    // Create order
    const orderResult = await pool.request()
      .input("userId", Number(customerId))
      .input("amount", session.amount_total || 0)
      .input("country", session.customer_details?.address?.country || "")
      .input("address", processOrderAddress(session.customer_details?.address || null))
      .input("sessionId", session.id)
      .input("status", "completed")
      .query(`
        INSERT INTO Orders (UserId, Amount, Country, Address, SessionId, Status, CreatedAt)
        OUTPUT INSERTED.*
        VALUES (@userId, @amount, @country, @address, @sessionId, @status, GETUTCDATE())
      `);

    const order = orderResult.recordset[0];

    // Create order items
    for (const item of lineItems.data) {
      const productResult = await pool.request()
        .input("stripePriceId", item.price?.id || "")
        .query("SELECT Id FROM Supplements WHERE StripePriceId = @stripePriceId");
      if (productResult.recordset.length > 0) {
        await pool.request()
          .input("orderId", order.Id)
          .input("productId", productResult.recordset[0].Id)
          .input("quantity", item.quantity || 1)
          .input("price", item.price?.unit_amount || 0)
          .query(`
            INSERT INTO OrderItems (OrderId, ProductId, Quantity, Price)
            VALUES (@orderId, @productId, @quantity, @price)
          `);
      }
    }

    return res.status(201).json(order);
  }

  res.status(200).json({ message: "Event received and processed!" });
};