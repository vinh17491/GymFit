import { NextFunction, Request, Response } from "express";
import { getPool } from "../config/database";
import stripe from "../config/stripe";

// GET /membership/plans - Get all active plans (public)
export const getAllPlans = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query("SELECT * FROM MembershipPlans WHERE IsActive = 1 ORDER BY Price ASC");
    res.status(200).json(result.recordset);
  } catch (error) {
    next({ message: "Unable to fetch membership plans", error });
  }
};

// GET /membership/plans/:id - Get plan by ID (public)
export const getPlanById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("id", Number(req.params.id))
      .query("SELECT * FROM MembershipPlans WHERE Id = @id AND IsActive = 1");
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Membership plan not found" });
    }
    res.status(200).json(result.recordset[0]);
  } catch (error) {
    next({ message: "Unable to fetch membership plan", error });
  }
};

// POST /membership/purchase - Create Stripe Checkout Session for membership
export const purchaseMembership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ message: "planId is required" });
    }

    const pool = await getPool();

    // Check if user already has an ACTIVE membership
    const activeMembership = await pool.request()
      .input("userId", userId)
      .query(`
        SELECT Id FROM Memberships 
        WHERE UserId = @userId AND Status = 'ACTIVE' AND EndDate >= CAST(GETUTCDATE() AS DATE)
      `);
    if (activeMembership.recordset.length > 0) {
      return res.status(400).json({ message: "You already have an active membership" });
    }

    // Get plan details
    const planResult = await pool.request()
      .input("planId", Number(planId))
      .query("SELECT * FROM MembershipPlans WHERE Id = @planId AND IsActive = 1");
    if (planResult.recordset.length === 0) {
      return res.status(404).json({ message: "Membership plan not found" });
    }

    const plan = planResult.recordset[0];

    // Create Stripe Checkout Session with VND currency
    const session = await stripe.checkout.sessions.create({
      success_url: (process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : "http://localhost:5173") + "/membership/success?id={CHECKOUT_SESSION_ID}",
      cancel_url: (process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : "http://localhost:5173") + "/membership/cancel",
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "vnd",
            product_data: {
              name: plan.Name,
              description: plan.Description || "",
            },
            unit_amount: Number(plan.Price),
          },
          quantity: 1,
        },
      ],
      metadata: {
        customerId: String(userId),
        paymentType: "membership",
        planId: String(plan.Id),
        planName: plan.Name,
        durationDays: String(plan.DurationDays),
        planPrice: String(plan.Price),
      },
    });

    res.status(201).json({
      sessionId: session.id,
      checkoutUrl: session.url,
    });
  } catch (error) {
    next({ message: "Unable to create checkout session", error });
  }
};

// GET /membership/my - Get current user's membership
export const getMyMembership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const pool = await getPool();
    const result = await pool.request()
      .input("userId", userId)
      .query(`
        SELECT m.*, mp.Name AS PlanName, mp.Description AS PlanDescription, 
               mp.DurationDays, mp.Price, mp.MaxSessionsPerWeek,
               mp.IncludesPersonalTraining, mp.IncludesDietPlan
        FROM Memberships m
        JOIN MembershipPlans mp ON m.PlanId = mp.Id
        WHERE m.UserId = @userId
        ORDER BY m.CreatedAt DESC
      `);
    res.status(200).json(result.recordset);
  } catch (error) {
    next({ message: "Unable to fetch memberships", error });
  }
};

// GET /membership/history - Get current user's membership payment history
export const getMembershipHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const pool = await getPool();
    const result = await pool.request()
      .input("userId", userId)
      .query(`
        SELECT p.*, mp.Name AS PlanName
        FROM Payments p
        LEFT JOIN Memberships m ON p.StripeSessionId = m.StripePaymentId
        LEFT JOIN MembershipPlans mp ON m.PlanId = mp.Id
        WHERE p.UserId = @userId AND p.PaymentType = 'MEMBERSHIP'
        ORDER BY p.CreatedAt DESC
      `);
    res.status(200).json(result.recordset);
  } catch (error) {
    next({ message: "Unable to fetch payment history", error });
  }
};

// POST /membership/:id/cancel - Cancel a membership
export const cancelMembership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const membershipId = Number(req.params.id);
    const pool = await getPool();

    // Verify ownership
    const membership = await pool.request()
      .input("id", membershipId)
      .input("userId", userId)
      .query("SELECT * FROM Memberships WHERE Id = @id AND UserId = @userId");
    if (membership.recordset.length === 0) {
      return res.status(404).json({ message: "Membership not found" });
    }
    if (membership.recordset[0].Status !== "ACTIVE") {
      return res.status(400).json({ message: "Membership is not active" });
    }

    await pool.request()
      .input("id", membershipId)
      .query("UPDATE Memberships SET Status = 'CANCELLED' WHERE Id = @id");

    res.status(200).json({ message: "Membership cancelled successfully" });
  } catch (error) {
    next({ message: "Unable to cancel membership", error });
  }
};

// ============= ADMIN ENDPOINTS =============

// POST /membership/admin/plans - Create a new membership plan
export const createPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { Name, Description, DurationDays, Price, MaxSessionsPerWeek, IncludesPersonalTraining, IncludesDietPlan } = req.body;
    if (!Name || !DurationDays || !Price) {
      return res.status(400).json({ message: "Name, DurationDays, and Price are required" });
    }
    const pool = await getPool();
    const result = await pool.request()
      .input("name", Name)
      .input("description", Description || null)
      .input("durationDays", Number(DurationDays))
      .input("price", Number(Price))
      .input("maxSessionsPerWeek", MaxSessionsPerWeek ? Number(MaxSessionsPerWeek) : null)
      .input("includesPT", IncludesPersonalTraining ? 1 : 0)
      .input("includesDiet", IncludesDietPlan ? 1 : 0)
      .query(`
        INSERT INTO MembershipPlans (Name, Description, DurationDays, Price, MaxSessionsPerWeek, IncludesPersonalTraining, IncludesDietPlan)
        OUTPUT INSERTED.*
        VALUES (@name, @description, @durationDays, @price, @maxSessionsPerWeek, @includesPT, @includesDiet)
      `);
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    next({ message: "Unable to create membership plan", error });
  }
};

// PUT /membership/admin/plans/:id - Update a membership plan
export const updatePlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const planId = Number(req.params.id);
    const { Name, Description, DurationDays, Price, MaxSessionsPerWeek, IncludesPersonalTraining, IncludesDietPlan, IsActive } = req.body;
    const pool = await getPool();

    // Check plan exists
    const existing = await pool.request()
      .input("id", planId)
      .query("SELECT Id FROM MembershipPlans WHERE Id = @id");
    if (existing.recordset.length === 0) {
      return res.status(404).json({ message: "Membership plan not found" });
    }

    const result = await pool.request()
      .input("id", planId)
      .input("name", Name)
      .input("description", Description !== undefined ? Description : null)
      .input("durationDays", DurationDays !== undefined ? Number(DurationDays) : null)
      .input("price", Price !== undefined ? Number(Price) : null)
      .input("maxSessionsPerWeek", MaxSessionsPerWeek !== undefined ? (MaxSessionsPerWeek ? Number(MaxSessionsPerWeek) : null) : null)
      .input("includesPT", IncludesPersonalTraining !== undefined ? (IncludesPersonalTraining ? 1 : 0) : null)
      .input("includesDiet", IncludesDietPlan !== undefined ? (IncludesDietPlan ? 1 : 0) : null)
      .input("isActive", IsActive !== undefined ? (IsActive ? 1 : 0) : null)
      .query(`
        UPDATE MembershipPlans SET
          Name = COALESCE(@name, Name),
          Description = CASE WHEN @description IS NULL AND @name IS NULL THEN Description ELSE @description END,
          DurationDays = COALESCE(@durationDays, DurationDays),
          Price = COALESCE(@price, Price),
          MaxSessionsPerWeek = CASE WHEN @maxSessionsPerWeek IS NULL AND @name IS NULL THEN MaxSessionsPerWeek ELSE @maxSessionsPerWeek END,
          IncludesPersonalTraining = COALESCE(@includesPT, CASE WHEN IncludesPersonalTraining = 1 THEN 1 ELSE 0 END),
          IncludesDietPlan = COALESCE(@includesDiet, CASE WHEN IncludesDietPlan = 1 THEN 1 ELSE 0 END),
          IsActive = COALESCE(@isActive, CASE WHEN IsActive = 1 THEN 1 ELSE 0 END)
        OUTPUT INSERTED.*
        WHERE Id = @id
      `);
    res.status(200).json(result.recordset[0]);
  } catch (error) {
    next({ message: "Unable to update membership plan", error });
  }
};

// DELETE /membership/admin/plans/:id - Delete a membership plan
export const deletePlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const planId = Number(req.params.id);
    const pool = await getPool();

    // Check if plan has memberships
    const memberships = await pool.request()
      .input("planId", planId)
      .query("SELECT Id FROM Memberships WHERE PlanId = @planId");
    if (memberships.recordset.length > 0) {
      // Soft delete - deactivate instead
      await pool.request()
        .input("id", planId)
        .query("UPDATE MembershipPlans SET IsActive = 0 WHERE Id = @id");
      return res.status(200).json({ message: "Membership plan deactivated (has existing memberships)" });
    }

    await pool.request()
      .input("id", planId)
      .query("DELETE FROM MembershipPlans WHERE Id = @id");
    res.status(200).json({ message: "Membership plan deleted successfully" });
  } catch (error) {
    next({ message: "Unable to delete membership plan", error });
  }
};

// GET /membership/admin/memberships - Get all memberships for admin
export const getAllMemberships = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT m.*, u.FullName AS UserName, u.Email AS UserEmail,
               mp.Name AS PlanName, mp.Price AS PlanPrice
        FROM Memberships m
        JOIN Users u ON m.UserId = u.Id
        JOIN MembershipPlans mp ON m.PlanId = mp.Id
        ORDER BY m.CreatedAt DESC
      `);
    res.status(200).json(result.recordset);
  } catch (error) {
    next({ message: "Unable to fetch memberships", error });
  }
};