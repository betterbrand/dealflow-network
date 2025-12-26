/**
 * Tone selection logic based on user sentiment and result quality
 */

import type { AgentTone, UserSentiment } from "@shared/_core/agent-types";

interface ToneSelectionContext {
  userSentiment: UserSentiment;
  sentimentIntensity: number;
  resultQuality: "good" | "partial" | "none" | "error";
  confidence: number;
  isGreeting?: boolean;
  isControl?: boolean;
}

/**
 * Select appropriate tone based on context
 */
export function selectTone(context: ToneSelectionContext): AgentTone {
  const { userSentiment, sentimentIntensity, resultQuality, confidence, isGreeting, isControl } = context;

  // Control commands are neutral
  if (isControl) {
    return "neutral";
  }

  // Greetings are neutral or slightly warm
  if (isGreeting) {
    return "neutral";
  }

  // Match empathetic tone to frustrated/confused users
  if (userSentiment === "frustrated" || userSentiment === "confused") {
    // Always be empathetic when user is struggling
    if (resultQuality === "none" || resultQuality === "error") {
      return "empathetic";
    }
    // If we have good results, be cautiously optimistic
    if (resultQuality === "good") {
      return sentimentIntensity > 0.6 ? "empathetic" : "neutral";
    }
    return "empathetic";
  }

  // Match urgency with focused efficiency
  if (userSentiment === "urgent") {
    // Quick, confident responses for urgent users
    if (resultQuality === "good" && confidence > 0.7) {
      return "excited";
    }
    return "neutral";
  }

  // Match positive energy
  if (userSentiment === "positive") {
    if (resultQuality === "good") {
      return "excited";
    }
    return "neutral";
  }

  // Default logic based on result quality
  if (resultQuality === "good" && confidence > 0.7) {
    return "excited";
  }

  if (resultQuality === "none") {
    return "empathetic";
  }

  if (resultQuality === "partial" || confidence < 0.5) {
    return "cautious";
  }

  if (resultQuality === "error") {
    return "empathetic";
  }

  return "neutral";
}

/**
 * Tone descriptions for internal reasoning
 */
export const TONE_DESCRIPTIONS: Record<AgentTone, string> = {
  neutral: "Standard informational response",
  empathetic: "Warm, understanding, acknowledging difficulty",
  excited: "Enthusiastic about good results",
  curious: "Asking clarifying questions with interest",
  cautious: "Careful about low-confidence results",
};

/**
 * Get tone-appropriate message openers
 */
export function getToneOpener(tone: AgentTone): string[] {
  const openers: Record<AgentTone, string[]> = {
    neutral: ["", "Here's what I found:", "I found:"],
    empathetic: [
      "I understand that's not what you hoped for.",
      "I see what you're looking for.",
      "Let me help with that.",
    ],
    excited: [
      "Great news!",
      "I found something good!",
      "Good news!",
    ],
    curious: [
      "Interesting question!",
      "Let me understand better -",
      "I'd like to clarify:",
    ],
    cautious: [
      "I found something, but I'm not fully certain.",
      "Here's what I found, though it may need verification:",
      "I have a potential result, with some caveats:",
    ],
  };

  return openers[tone];
}

/**
 * Get tone-appropriate closers with suggested actions
 */
export function getToneCloser(tone: AgentTone, hasFollowups: boolean): string[] {
  if (!hasFollowups) {
    const closers: Record<AgentTone, string[]> = {
      neutral: ["Is there anything else I can help with?"],
      empathetic: ["Let me know if you'd like to try something else."],
      excited: ["Want me to dig deeper?"],
      curious: ["Once you clarify, I can search more specifically."],
      cautious: ["Would you like me to search with different criteria?"],
    };
    return closers[tone];
  }

  // When there are suggested followups, don't add redundant closers
  return [];
}
