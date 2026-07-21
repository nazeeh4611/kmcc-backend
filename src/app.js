import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import xssClean from "xss-clean";
import hpp from "hpp";

import routes from "./routes/index.js";
import { notFound, errorHandler } from "./middlewares/errorHandler.js";
import { globalLimiter } from "./middlewares/rateLimiter.js";
import { sendPasswordResetEmail } from "./services/emailService.js";

const app = express();

// Trust proxy (needed for correct secure cookies / rate-limit IPs behind Railway/Vercel/ALB)
app.set("trust proxy", 1);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS - only allow the configured frontend origin, with credentials for cookies
const allowedOrigins = (process.env.CLIENT_URL || "").split(",").map((o) => o.trim());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Sanitization against NoSQL injection & XSS
app.use(mongoSanitize());
app.use(xssClean());
app.use(hpp());

// Logging
if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

// Global rate limiting
app.use("/api", globalLimiter);

// Make email helpers available to controllers via req.app.locals
app.locals.sendPasswordResetEmail = sendPasswordResetEmail;

// Routes
app.use("/api", routes);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Global KMCC Anganganadi Panchayath API is running",
  });
});

// 404 + centralized error handler (must be last)
app.use(notFound);
app.use(errorHandler);

export default app;
