import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { scheduleMembershipCron, runMembershipMaintenance } from "./jobs/membershipCron.js";

const PORT = process.env.PORT || 3003;

const start = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`[Server] Running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
    });

    scheduleMembershipCron();

    runMembershipMaintenance().catch((err) =>
      console.error("[Server] Initial membership maintenance run failed:", err.message)
    );

    const shutdown = (signal) => {
      console.log(`[Server] ${signal} received. Shutting down gracefully...`);
      server.close(() => {
        console.log("[Server] Closed remaining connections.");
        process.exit(0);
      });

      setTimeout(() => {
        console.error("[Server] Forcing shutdown.");
        process.exit(1);
      }, 10000).unref();
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    process.on("unhandledRejection", (reason) => {
      console.error("[Server] Unhandled Rejection:", reason);
    });
  } catch (error) {
    console.error("[Server] Failed to start:", error.message);
    process.exit(1);
  }
};

start();