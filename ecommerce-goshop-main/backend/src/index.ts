import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
dotenv.config({ path: require("path").resolve(__dirname, "../.env") });

// --- Validate critical env vars at startup ---
const requiredEnvVars = ["JWT_SECRET", "DB_USER", "DB_PASSWORD", "DB_HOST", "DB_NAME"];
const missing = requiredEnvVars.filter((v) => !process.env[v]);
if (missing.length > 0) {
    console.error(`FATAL: Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
}

import { errorMiddleware } from "./middleware/errorMiddleware";
import { logger } from "./config/logger";
import productRoutes from "./routes/products";
import usersRoutes from "./routes/users";
import checkoutRoutes from "./routes/checkout";
import ordersRoutes from "./routes/orders";
import authRoutes from "./routes/auth";
import categoryRoutes from "./routes/category";
import membershipRoutes from "./routes/membership";
import coachRoutes from "./routes/coach";
import bookingRoutes from "./routes/booking";
import { webhook } from "./controllers/webhook";
import workoutRoutes from "./routes/workout";
import blogRoutes from "./routes/blog";
import dashboardRoutes from "./routes/dashboard";
import notificationRoutes from "./routes/notification";
import dietRoutes from "./routes/diet";
import healthRoutes from "./routes/health";
import communityRoutes from "./routes/community";
import videoRoutes from "./routes/video";
import chatRoutes from "./routes/chat";
import coachStudentsRoutes from "./routes/coachStudents";
import creditsRoutes from "./routes/credits";
import aiRoutes from "./routes/ai";
import logbookRoutes from "./routes/logbook";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

const app = express();
const PORT = process.env.PORT || 3000;

// --- Security headers ---
app.use(helmet());

// --- CORS ---
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:4173",
    process.env.FRONTEND_URL || "",
].filter(Boolean);

const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin only in development
        if ((!origin && process.env.NODE_ENV !== "production") || (origin && allowedOrigins.includes(origin))) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// --- Rate limiting ---
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
});
app.use(globalLimiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many auth attempts, please try again later." },
});

// --- Health check (before auth middleware) ---
app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- Cloudinary ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- Webhook needs raw body, must come before json parser ---
app.post("/webhook", express.raw({ type: "application/json" }), webhook);

// --- Body parsers ---
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads/", express.static(path.join(process.cwd(), "/uploads/")));

// --- Apply stricter rate limit to auth routes ---
app.use("/auth", authLimiter, authRoutes);

// --- API routes ---
app.use("/products", productRoutes);
app.use("/users", usersRoutes);
app.use("/orders", ordersRoutes);
app.use("/checkout", checkoutRoutes);
app.use("/category", categoryRoutes);
app.use("/membership", membershipRoutes);
app.use("/coaches", coachRoutes);
app.use("/bookings", bookingRoutes);
app.use("/workouts", workoutRoutes);
app.use("/blogs", blogRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/notifications", notificationRoutes);
app.use("/diet", dietRoutes);
app.use("/health", healthRoutes);
app.use("/community", communityRoutes);
app.use("/videos", videoRoutes);
app.use("/chat", chatRoutes);
app.use("/coach-students", coachStudentsRoutes);
app.use("/credits", creditsRoutes);
app.use("/ai", aiRoutes);
app.use("/logbook", logbookRoutes);

// --- Error handler (must be last) ---
app.use(errorMiddleware);

const server = app.listen({ address: "0.0.0.0", port: Number(PORT) }, () => {
    logger.info(`Server running on port: ${PORT}`);
});

// --- Graceful shutdown ---
const shutdown = (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
        logger.info("HTTP server closed.");
        process.exit(0);
    });
    // Force exit after 10s
    setTimeout(() => {
        logger.error("Forced shutdown after timeout.");
        process.exit(1);
    }, 10_000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
    logger.error("Uncaught Exception:", err);
    shutdown("uncaughtException");
});
