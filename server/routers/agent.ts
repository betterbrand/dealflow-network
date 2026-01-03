/**
 * Agent tRPC Router
 * Handles conversational AI agent interactions
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  createSession,
  getSession,
  getUserSessions,
  updateSessionStatus,
  getFindings,
  reviewFinding,
  addConversationMessage,
  getConversationHistory,
  getOrCreateConversationalSession,
} from "../services/agent/db";
import { parseMessage } from "../services/agent/conversation/intent-parser";
import {
  generateResponse,
  generateGreetingResponse,
  generateControlResponse,
  generateErrorResponse,
} from "../services/agent/conversation/response-generator";
import type { AgentResponse } from "@shared/_core/agent-types";

export const agentRouter = router({
  /**
   * Send a chat message and get agent response
   */
  chat: protectedProcedure
    .input(
      z.object({
        sessionId: z.number().optional(),
        message: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ input, ctx }): Promise<AgentResponse> => {
      const userId = ctx.user.id;

      try {
        // Get or create session
        const sessionId = await getOrCreateConversationalSession(
          userId,
          input.sessionId
        );

        // Get conversation history for context
        const history = await getConversationHistory(sessionId, 10);
        const conversationHistory = history
          .reverse()
          .map((m) => ({
            role: m.role as "user" | "agent",
            content: m.content,
          }));

        // Store user message
        await addConversationMessage(sessionId, "user", input.message);

        // Parse message intent and sentiment
        const analysis = await parseMessage(input.message, conversationHistory);

        // Handle different intent types
        let response: AgentResponse;

        switch (analysis.intent.type) {
          case "greeting":
            response = generateGreetingResponse(sessionId);
            break;

          case "agent_control":
            const action = analysis.intent.entities.query || "pause";
            if (action === "pause") {
              await updateSessionStatus(sessionId, "paused");
            } else if (action === "resume") {
              await updateSessionStatus(sessionId, "running");
            }
            response = generateControlResponse(action, sessionId);
            break;

          case "introduction_path":
            // For now, generate a placeholder response
            // Full implementation would call path-finding logic
            response = await generateResponse(
              { analysis, sessionId, conversationHistory },
              {
                scenario: "introduction_path_not_found",
                values: {
                  targetName: analysis.intent.entities.targetName || "that person",
                  targetCompany: analysis.intent.entities.targetCompany,
                },
                suggestedFollowups: [
                  "Search for similar roles instead",
                  "Look at their company's connections",
                ],
                confidence: 0.3,
              }
            );
            break;

          case "find_connection":
            // Placeholder for connection finding logic
            response = await generateResponse(
              { analysis, sessionId, conversationHistory },
              {
                scenario: "search_results",
                values: {
                  query: analysis.intent.entities.query || analysis.intent.entities.targetCompany,
                },
                suggestedFollowups: [
                  "Narrow down by role",
                  "Show all connections",
                ],
                confidence: 0.5,
              }
            );
            break;

          case "network_question":
            // Handle general network questions
            response = await generateResponse(
              { analysis, sessionId, conversationHistory },
              {
                scenario: "network_analysis",
                values: {
                  query: analysis.intent.entities.query || input.message,
                },
                suggestedFollowups: [
                  "Tell me more about my strongest connections",
                  "Who should I reconnect with?",
                ],
                confidence: 0.6,
              }
            );
            break;

          case "clarification":
            // Handle clarification responses
            response = await generateResponse(
              { analysis, sessionId, conversationHistory },
              {
                scenario: "clarification_response",
                values: {},
                confidence: 0.7,
              }
            );
            break;

          default:
            response = await generateResponse(
              { analysis, sessionId, conversationHistory },
              {
                scenario: "general_response",
                values: { query: input.message },
                confidence: 0.5,
              }
            );
        }

        // Store agent response
        await addConversationMessage(sessionId, "agent", response.content, {
          sentiment: analysis.sentiment.mood,
          tone: response.tone,
          intentType: analysis.intent.type,
          reasoningTrace: response.reasoningSummary,
        });

        return response;
      } catch (error) {
        console.error("[Agent] Chat error:", error);
        return generateErrorResponse(
          error instanceof Error ? error.message : "Unknown error",
          input.sessionId || 0
        );
      }
    }),

  /**
   * Get user's sessions
   */
  getSessions: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(10),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return getUserSessions(ctx.user.id, input?.limit || 10);
    }),

  /**
   * Get session details
   */
  getSession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input, ctx }) => {
      const session = await getSession(input.sessionId);

      // Verify ownership
      if (session && session.userId !== ctx.user.id) {
        return null;
      }

      return session;
    }),

  /**
   * Get conversation history for a session
   */
  getConversation: protectedProcedure
    .input(
      z.object({
        sessionId: z.number(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      // Verify session ownership
      const session = await getSession(input.sessionId);
      if (!session || session.userId !== ctx.user.id) {
        return [];
      }

      const messages = await getConversationHistory(input.sessionId, input.limit);
      return messages.reverse(); // Return in chronological order
    }),

  /**
   * Start a new agent session
   */
  startSession: protectedProcedure
    .input(
      z.object({
        sessionType: z.enum(["background_scan", "conversational"]),
        goal: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const sessionId = await createSession(
        ctx.user.id,
        input.sessionType,
        input.goal
      );
      return { sessionId };
    }),

  /**
   * Pause a session
   */
  pauseSession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(input.sessionId);
      if (!session || session.userId !== ctx.user.id) {
        throw new Error("Session not found");
      }

      await updateSessionStatus(input.sessionId, "paused");
      return { success: true };
    }),

  /**
   * Resume a session
   */
  resumeSession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession(input.sessionId);
      if (!session || session.userId !== ctx.user.id) {
        throw new Error("Session not found");
      }

      await updateSessionStatus(input.sessionId, "running");
      return { success: true };
    }),

  /**
   * Get pending findings
   */
  getFindings: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["pending", "confirmed", "dismissed"]).optional(),
          limit: z.number().min(1).max(100).default(20),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return getFindings(ctx.user.id, input?.status, input?.limit || 20);
    }),

  /**
   * Review a finding (confirm or dismiss)
   */
  reviewFinding: protectedProcedure
    .input(
      z.object({
        findingId: z.number(),
        action: z.enum(["confirm", "dismiss"]),
      })
    )
    .mutation(async ({ input }) => {
      await reviewFinding(input.findingId, input.action);
      return { success: true };
    }),
});
