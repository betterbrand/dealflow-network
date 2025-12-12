// Vercel serverless function entry point
import express from 'express';
import cookieParser from 'cookie-parser';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { magicLinkRouter } from '../server/_core/magic-link-routes.js';
import { appRouter } from '../server/routers.js';
import { createContext } from '../server/_core/context.js';

const app = express();

// Configure body parser with larger size limit for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Magic link authentication routes
app.use('/api/auth/magic-link', magicLinkRouter);

// Telegram webhook (if configured)
try {
  const { default: telegramWebhookRouter } = await import('../server/telegramWebhook.js');
  app.use('/api/telegram', telegramWebhookRouter);
} catch (err) {
  // Telegram webhook not configured, skip
}

// tRPC API
app.use(
  '/api/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Export for Vercel
export default app;
