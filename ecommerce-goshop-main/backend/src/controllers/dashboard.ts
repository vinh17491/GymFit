import { NextFunction, Request, Response } from "express";
import { getPool } from "../config/database";

type AuthRequest = Request & { userId?: number; roleName?: string; roleId?: number };

export const getWorkoutLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const pool = await getPool();
    const result = await pool.request()
      .input("userId", userId)
      .query(`SELECT wp.*, ws.CompletedAt, ws.Id as SessionId
              FROM WorkoutSessions ws
              JOIN WorkoutPrograms wp ON ws.ProgramId = wp.Id
              WHERE ws.UserId = @userId AND CAST(ws.CompletedAt AS DATE) = CAST(GETDATE() AS DATE)
              ORDER BY ws.CompletedAt DESC`);
    res.status(200).json(result.recordset);
  } catch (error) {
    // table may not exist â€” return empty
    res.status(200).json([]);
  }
};

export const getDietLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const pool = await getPool();
    const result = await pool.request()
      .input("userId", userId)
      .query(`SELECT * FROM DietLogs
              WHERE UserId = @userId AND CAST(LoggedAt AS DATE) = CAST(GETDATE() AS DATE)
              ORDER BY LoggedAt DESC`);
    res.status(200).json(result.recordset);
  } catch (error) {
    // table may not exist â€” return empty
    res.status(200).json([]);
  }
};

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
      pool.request().query("SELECT ISNULL(SUM(Amount),0) totalRevenue FROM Payments WHERE Status='SUCCEEDED'"),
      pool.request().query("SELECT FORMAT(CreatedAt,'yyyy-MM') month, SUM(Amount) revenue FROM Payments WHERE Status='SUCCEEDED' GROUP BY FORMAT(CreatedAt,'yyyy-MM') ORDER BY month"),
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

    // DietPlans may not exist â€” catch gracefully
    let dietPlans: unknown[] = [];
    try {
      const dietResult = await pool.request()
        .input("userId", userId)
        .query("SELECT * FROM DietPlans WHERE UserId=@userId");
      dietPlans = dietResult.recordset;
    } catch {
      dietPlans = [];
    }

    // Health profile
    let healthProfile = null;
    try {
      const healthResult = await pool.request()
        .input("userId", userId)
        .query("SELECT * FROM HealthProfiles WHERE UserId=@userId");
      if (healthResult.recordset.length > 0) {
        healthProfile = healthResult.recordset[0];
      }
    } catch {
      healthProfile = null;
    }

    res.status(200).json({
      memberships: membershipsResult.recordset,
      bookings: bookingsResult.recordset,
      savedWorkouts: savedWorkoutsResult.recordset,
      dietPlans,
      healthProfile
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
        .query("SELECT ISNULL(SUM(p.Amount),0) monthlyRevenue FROM Payments p JOIN Bookings b ON p.UserId = b.MemberId AND p.PaymentType='BOOKING' WHERE b.CoachId=@coachId AND p.Status='SUCCEEDED'"),
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
// GET /dashboard — redirect based on role
export const getDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const roleName = authReq.roleName;
    const userId = authReq.userId;

    const pool = await getPool();

    if (roleName === "ADMIN") {
      const memberships = await pool.request().query("SELECT COUNT(*) AS Total FROM Memberships WHERE Status = 'ACTIVE'");
      const users = await pool.request().query("SELECT COUNT(*) AS Total FROM Users WHERE IsActive = 1");
      const revenue = await pool.request().query("SELECT ISNULL(SUM(Amount), 0) AS Total FROM Payments WHERE Status = 'SUCCEEDED'");
      const bookings = await pool.request().query("SELECT COUNT(*) AS Total FROM Bookings WHERE Status = 'CONFIRMED'");
      return res.json({ role: "ADMIN", stats: { memberships: memberships.recordset[0].Total, users: users.recordset[0].Total, revenue: revenue.recordset[0].Total, bookings: bookings.recordset[0].Total } });
    }

    if (roleName === "COACH") {
      const coachResult = await pool.request().input("userId", userId).query("SELECT Id FROM Coaches WHERE UserId = @userId");
      if (coachResult.recordset.length === 0) return res.json({ role: "COACH", students: [], bookings: [] });
      const coachId = coachResult.recordset[0].Id;
      const students = await pool.request().input("coachId", coachId).query("SELECT u.Id, u.FullName, u.Email, u.Avatar FROM CoachStudentAssignments csa JOIN Users u ON csa.StudentId = u.Id WHERE csa.CoachId = @coachId");
      const bookings = await pool.request().input("coachId", coachId).query("SELECT b.*, u.FullName AS MemberName FROM Bookings b JOIN Users u ON b.MemberId = u.Id WHERE b.CoachId = @coachId ORDER BY b.CreatedAt DESC");
      return res.json({ role: "COACH", students: students.recordset, bookings: bookings.recordset });
    }

    // MEMBER
    const workouts = await pool.request().input("userId", userId).query("SELECT COUNT(*) AS Total FROM WorkoutLogs WHERE UserId = @userId AND CAST(LogDate AS DATE) = CAST(GETUTCDATE() AS DATE)");
    const calories = await pool.request().input("userId", userId).query("SELECT ISNULL(SUM(Calories), 0) AS Total FROM MealLogs WHERE UserId = @userId AND CAST(LogDate AS DATE) = CAST(GETUTCDATE() AS DATE)");
    const membership = await pool.request().input("userId", userId).query("SELECT TOP 1 m.*, mp.Name AS PlanName FROM Memberships m JOIN MembershipPlans mp ON m.PlanId = mp.Id WHERE m.UserId = @userId ORDER BY m.CreatedAt DESC");
    res.json({ role: "MEMBER", stats: { workoutsToday: workouts.recordset[0].Total, caloriesToday: calories.recordset[0].Total, membership: membership.recordset[0] || null } });
  } catch (error) {
    next({ message: "Unable to get dashboard", error });
  }
};