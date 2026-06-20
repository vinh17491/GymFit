import { Router } from "express";
import { getPoolStats, getPool } from "../config/database";
import { authMiddleware } from "../middleware/authMiddleware";
import { verifyRolesMiddleware } from "../middleware/verifyRolesMiddleware";

const router = Router();

/**
 * GET /api/health
 * Deep health check — no auth required, for load balancers / k8s probes.
 * Returns: { status, uptime, timestamp, db, memory }
 */
router.get("/", (_req, res) => {
  const healthCheck: any = {
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: { status: "unknown" },
    memory: process.memoryUsage(),
  };

  try {
    const poolStats = getPoolStats();
    healthCheck.db = {
      status: poolStats.connected ? "connected" : "disconnected",
      size: poolStats.size ?? 0,
      available: poolStats.available ?? 0,
      pending: poolStats.pending ?? 0,
    };

    if (!poolStats.connected) {
      healthCheck.status = "degraded";
    }
  } catch (err: any) {
    healthCheck.status = "unhealthy";
    healthCheck.db.status = "error";
    healthCheck.db.error = err.message;
  }

  const statusCode = healthCheck.status === "unhealthy" ? 503 : 200;
  res.status(statusCode).json(healthCheck);
});

/**
 * GET /api/health/detail
 * Detailed health check — admin only, tests actual DB query.
 */
router.get("/detail", authMiddleware, verifyRolesMiddleware(["admin"]), async (_req, res) => {
  const details: any = {
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: {},
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
  };

  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT 1 AS ok");
    details.db = {
      status: "connected",
      queryResult: result.recordset[0].ok === 1 ? "ok" : "failed",
      ...getPoolStats(),
    };
  } catch (err: any) {
    details.status = "unhealthy";
    details.db = { status: "error", error: err.message };
  }

  const statusCode = details.status === "unhealthy" ? 503 : 200;
  res.status(statusCode).json(details);
});


import { HealthController } from "../controllers/health";
import { sanitizeBody } from "../middleware/validate";

const healthCtrl = new HealthController();

// User health features (require auth)
router.get("/profile", authMiddleware, healthCtrl.getHealthProfile);
router.post("/profile", authMiddleware, sanitizeBody, healthCtrl.updateHealthProfile);
router.post("/bmi-calculate", authMiddleware, sanitizeBody, healthCtrl.calculateBMI);
router.post("/bodyfat-calculate", authMiddleware, sanitizeBody, healthCtrl.calculateBodyFat);
router.get("/trial", authMiddleware, healthCtrl.getFreeTrialStatus);
router.post("/trial/start", authMiddleware, healthCtrl.startFreeTrial);

export default router;