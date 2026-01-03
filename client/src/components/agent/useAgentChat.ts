/**
 * Agent chat hook with humanized timing and state management
 */

import { useState, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import type { AgentResponse, AgentMessage, AgentTone } from "@shared/_core/agent-types";

interface UseAgentChatOptions {
  sessionId?: number;
  onNewMessage?: (message: AgentMessage) => void;
}

interface UseAgentChatReturn {
  messages: AgentMessage[];
  isTyping: boolean;
  isLoading: boolean;
  sessionId: number | null;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
}

/**
 * Calculate display delay with variance for natural feel
 */
function calculateDisplayDelay(response: AgentResponse): number {
  const base = response.suggestedDelayMs || 800;
  // Add +/-15% variance
  const variance = base * 0.15 * (Math.random() * 2 - 1);
  return Math.max(400, Math.min(base + variance, 2500));
}

/**
 * Generate unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Hook for managing agent chat with humanized timing
 */
export function useAgentChat(options: UseAgentChatOptions = {}): UseAgentChatReturn {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(
    options.sessionId || null
  );
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const chatMutation = trpc.agent.chat.useMutation();

  const sendMessage = useCallback(
    async (text: string) => {
      // Clear any pending typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Add user message immediately
      const userMessage: AgentMessage = {
        id: generateMessageId(),
        role: "user",
        content: text,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      options.onNewMessage?.(userMessage);

      try {
        // Get response from server
        const response = await chatMutation.mutateAsync({
          sessionId: currentSessionId || undefined,
          message: text,
        });

        // Update session ID if this is a new session
        if (!currentSessionId && response.sessionId) {
          setCurrentSessionId(response.sessionId);
        }

        // Show typing indicator
        setIsTyping(true);

        // Wait for calculated delay (humanized timing)
        const delay = calculateDisplayDelay(response);
        await new Promise((resolve) => {
          typingTimeoutRef.current = setTimeout(resolve, delay);
        });

        // Hide typing indicator
        setIsTyping(false);

        // Add agent message
        const agentMessage: AgentMessage = {
          id: generateMessageId(),
          role: "agent",
          content: response.content,
          tone: response.tone,
          reasoningSummary: response.reasoningSummary,
          confidence: response.confidence,
          suggestedFollowups: response.suggestedFollowups,
          createdAt: new Date(),
        };

        setMessages((prev) => [...prev, agentMessage]);
        options.onNewMessage?.(agentMessage);
      } catch (error) {
        console.error("[AgentChat] Error:", error);

        // Hide typing indicator on error
        setIsTyping(false);

        // Add error message
        const errorMessage: AgentMessage = {
          id: generateMessageId(),
          role: "agent",
          content: "Sorry, I encountered an error. Please try again.",
          tone: "empathetic",
          createdAt: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);
      }
    },
    [chatMutation, currentSessionId, options]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentSessionId(null);
  }, []);

  return {
    messages,
    isTyping,
    isLoading: chatMutation.isPending,
    sessionId: currentSessionId,
    sendMessage,
    clearMessages,
  };
}

/**
 * Hook for client-side sentiment heuristics (immediate feedback)
 */
export function useSentimentHeuristics() {
  const detectSentiment = useCallback((message: string): string => {
    const lower = message.toLowerCase();

    // Frustration patterns
    if (/why (can't|won't|doesn't)|ugh|argh|!{2,}/.test(lower)) {
      return "frustrated";
    }

    // Urgency patterns
    if (/asap|urgent|quickly|right now|immediately/.test(lower)) {
      return "urgent";
    }

    // Confusion patterns
    if (/i don't understand|what do you mean|confused|\?{2,}/.test(lower)) {
      return "confused";
    }

    // Positive patterns
    if (/thank|thanks|great|awesome|perfect/.test(lower)) {
      return "positive";
    }

    return "neutral";
  }, []);

  return { detectSentiment };
}

/**
 * Get tone-based styling classes
 */
export function getToneClasses(tone?: AgentTone): string {
  switch (tone) {
    case "empathetic":
      return "bg-amber-50 border-l-2 border-amber-400";
    case "excited":
      return "bg-green-50 border-l-2 border-green-400";
    case "curious":
      return "bg-blue-50 border-l-2 border-blue-400";
    case "cautious":
      return "bg-slate-100 border-l-2 border-slate-400";
    case "neutral":
    default:
      return "bg-muted";
  }
}
