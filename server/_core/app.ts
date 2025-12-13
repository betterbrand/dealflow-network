import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { magicLinkRouter } from "./magic-link-routes";
import { appRouter } from "../routers";
import { createContext } from "./context";

export function createApp() {
  const app = express();
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());
  
  // Magic link authentication routes
  app.use("/api/auth/magic-link", magicLinkRouter);
  
  // Telegram webhook (try to import, skip if not available)
  import("../telegramWebhook")
    .then(({ default: telegramWebhookRouter }) => {
      app.use("/api/telegram", telegramWebhookRouter);
    })
    .catch(() => {
      // Telegram webhook not configured, skip
    });
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });
  
  return app;
}
