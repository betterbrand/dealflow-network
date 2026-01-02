import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { getPoolMetrics } from "../db";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => {
      const poolMetrics = getPoolMetrics();
      return {
        ok: true,
        database: poolMetrics ? {
          status: "connected",
          connectionLimit: poolMetrics.connectionLimit,
        } : {
          status: "not_initialized",
        },
        timestamp: Date.now(),
      };
    }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
