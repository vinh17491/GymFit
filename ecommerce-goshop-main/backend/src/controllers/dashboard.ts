import { NextFunction, Request, Response } from "express";
import { getPool } from "../config/database";

type AuthRequest = Request & { userId?: number; roleName?: string; roleId?: number };

// ======================== ADMIN DASHBOARD ========================

export const getAdminDashboard = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();

    const [
      totalUsersResult,
      totalMembersResult,
      totalCoachesResult,
      activeMembershipsResult,
      totalBookingsResult,
      completedBookingsResult,
      totalRevenueResult,
      monthlyRevenueResult,
      popularPlansResult,
    ] = await Promise.all([
      pool.request().query("SELECT COUNT(*) totalUsers FROM Users"),
      pool.request().query("SELECT COUNT(*) totalMembers FROM Users u JOIN Roles r ON u.RoleId = r.Id WHERE r.Name = 'MEMBER'"),
      pool.request().query("SELECT COUNT(*) totalCoaches FROM Coaches"),
      pool.request().query("SELECT COUNT(*) activeMemberships FROM Memberships WHERE Status='ACTIVE'"),
      pool.request().query("SELECT COUNT(*) totalBookings FROM Bookings"),
      pool.request().query("SELECT COUNT(*) completedBookings FROM Bookings WHERE Status='COMPLETED'"),
      pool.request().query("SELECT ISNULL(SUM(Amount),0) totalRevenue FROM Payments WHERE Status='COMPLETED'"),
      pool.request().query("SELECT FORMAT(CreatedAt,'yyyy-MM') month, SUM(Amount) revenue FROM Payments WHERE Status='COMPLETED' GROUP BY FORMAT(CreatedAt,'yyyy-MM') ORDER BY month"),
      pool.request().query("SELECT TOP 5 mp.Name planName, COUNT(*) total FROM Memberships m JOIN MembershipPlans mp ON m.PlanId = mp.Id GROUP BY mp.Name ORDER BY total DESC"),
    ]);

    res.status(200).json({
      totalUsers: totalUsersResult.recordset[0].totalUsers,
      totalMembers: totalMembersResult.recordset[0].totalMembers,
      totalCoaches: totalCoachesResult.recordset[0].totalCoaches,
      activeMemberships: activeMembershipsResult.recordset[0].activeMemberships,
      totalBookings: totalBookingsResult.recordset[0].totalBookings,
      completedBookings: completedBookingsResult.recordset[0].completedBookings,
      totalRevenue: totalRevenueResult.recordset[0].totalRevenue,
      monthlyRevenue: monthlyRevenueResult.recordset,
      popularPlans: popularPlansResult.recordset,
    });
  } catch (error) {
    next({ message: "Unable to fetch admin dashboard", error });
  }
};

// ======================== MEMBER DASHBOARD ========================

export const getMemberDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const pool = await getPool();

    const membershipsResult = await pool.request()
      .input("userId", userId)
      .query("SELECT * FROM Memberships WHERE UserId=@userId");

    const bookingsResult = await pool.request()
      .input("userId", userId)
      .query("SELECT * FROM Bookings WHERE MemberId=@userId");

    const savedWorkoutsResult = await pool.request()
      .input("userId", userId)
      .query("SELECT wp.* FROM WorkoutProgramSaves s JOIN WorkoutPrograms wp ON s.ProgramId = wp.Id WHERE s.UserId=@userId");

    // DietPlans may not exist — catch gracefully
    let dietPlans: unknown[] = [];
    try {
      const dietResult = await pool.request()
        .input("userId", userId)
        .query("SELECT * FROM DietPlans WHERE UserId=@userId");
      dietPlans = dietResult.recordset;
    } catch {
      dietPlans = [];
    }

    res.status(200).json({
      memberships: membershipsResult.recordset,
      bookings: bookingsResult.recordset,
      savedWorkouts: savedWorkoutsResult.recordset,
      dietPlans,
    });
  } catch (error) {
    next({ message: "Unable to fetch member dashboard", error });
  }
};

// ======================== COACH DASHBOARD ========================

export const getCoachDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const pool = await getPool();

    // Find coach id
    const coachResult = await pool.request()
      .input("userId", userId)
      .query("SELECT Id FROM Coaches WHERE UserId=@userId");

    if (coachResult.recordset.length === 0) {
      return res.status(404).json({ message: "Coach profile not found" });
    }

    const coachId = coachResult.recordset[0].Id;

    const [
      totalClientsResult,
      upcomingBookingsResult,
      completedBookingsResult,
      monthlyRevenueResult,
    ] = await Promise.all([
      pool.request()
        .input("coachId", coachId)
        .query("SELECT COUNT(DISTINCT MemberId) totalClients FROM Bookings WHERE CoachId=@coachId"),
      pool.request()
        .input("coachId", coachId)
        .query("SELECT COUNT(*) upcomingBookings FROM Bookings WHERE CoachId=@coachId AND Status='CONFIRMED'"),
      pool.request()
        .input("coachId", coachId)
        .query("SELECT COUNT(*) completedBookings FROM Bookings WHERE CoachId=@coachId AND Status='COMPLETED'"),
      pool.request()
        .input("coachId", coachId)
        .query("SELECT ISNULL(SUM(p.Amount),0) monthlyRevenue FROM Payments p JOIN Bookings b ON p.StripeSessionId = b.StripePaymentId WHERE b.CoachId=@coachId AND p.Status='COMPLETED'"),
    ]);

    res.status(200).json({
      totalClients: totalClientsResult.recordset[0].totalClients,
      upcomingBookings: upcomingBookingsResult.recordset[0].upcomingBookings,
      completedBookings: completedBookingsResult.recordset[0].completedBookings,
      monthlyRevenue: monthlyRevenueResult.recordset[0].monthlyRevenue,
    });
  } catch (error) {
    next({ message: "Unable to fetch coach dashboard", error });
  }
};