/**
 * Intent and sentiment parser for agent conversations
 * Uses LLM to understand user messages and detect emotional state
 */

import { invokeLLM } from "../../../_core/llm";
import type { MessageAnalysis, ParsedIntent, SentimentAnalysis } from "../types";
import type { AgentIntentType, UserSentiment } from "@shared/_core/agent-types";

const INTENT_PROMPT = `You are parsing a conversational message about professional networks and contacts.

Analyze BOTH the user's intent AND their emotional state.

Intent types:
- find_connection: Looking for a specific person or connection
- introduction_path: Wanting to find a path/introduction to someone
- network_question: General question about their network
- agent_control: Commands like pause, resume, stop, focus on X
- clarification: Responding to a previous question
- greeting: Hello, hi, hey, etc.

Return JSON:
{
  "intent": {
    "type": "find_connection" | "introduction_path" | "network_question" | "agent_control" | "clarification" | "greeting",
    "entities": {
      "targetName": "person name if mentioned",
      "targetCompany": "company name if mentioned",
      "query": "any search query terms"
    },
    "confidence": 0.0 to 1.0
  },
  "sentiment": {
    "mood": "neutral" | "positive" | "frustrated" | "confused" | "urgent",
    "intensity": 0.0 to 1.0,
    "indicators": ["specific phrases that indicated this mood"]
  },
  "conversationContext": {
    "isFollowUp": true if this references earlier conversation,
    "referencesEarlierMessage": true if they say "that" or "it" referring to something,
    "expectedResponseType": "answer" | "clarification" | "confirmation"
  }
}`;

/**
 * Client-side sentiment heuristics for immediate feedback
 * These are checked before calling LLM
 */
export function detectSentimentHeuristic(message: string): UserSentiment {
  const lower = message.toLowerCase();

  // Frustration patterns
  const frustrationPatterns = [
    /why (can't|won't|doesn't|isn't)/,
    /this (doesn't|isn't|won't) work/,
    /still (can't|haven't|not)/,
    /!{2,}/, // Multiple exclamation marks
    /ugh|argh|grr|damn|dammit/,
    /not helpful|useless|waste/,
    /wrong|incorrect|error/,
  ];

  for (const pattern of frustrationPatterns) {
    if (pattern.test(lower)) {
      return "frustrated";
    }
  }

  // Urgency patterns
  const urgencyPatterns = [
    /asap|urgent|urgently|quickly|right now|immediately/,
    /need (to|this) (immediately|now|today|asap)/,
    /time sensitive|deadline/,
  ];

  for (const pattern of urgencyPatterns) {
    if (pattern.test(lower)) {
      return "urgent";
    }
  }

  // Confusion patterns
  const confusionPatterns = [
    /i don't understand/,
    /what do you mean/,
    /confused|unclear|huh\?/,
    /\?{2,}/, // Multiple question marks
    /not sure what/,
  ];

  for (const pattern of confusionPatterns) {
    if (pattern.test(lower)) {
      return "confused";
    }
  }

  // Positive patterns
  const positivePatterns = [
    /thank|thanks|great|awesome|perfect|excellent/,
    /love it|that's great|helpful/,
    /yes!|exactly!|got it!/,
  ];

  for (const pattern of positivePatterns) {
    if (pattern.test(lower)) {
      return "positive";
    }
  }

  return "neutral";
}

/**
 * Quick intent detection for common patterns (no LLM needed)
 */
export function detectQuickIntent(message: string): ParsedIntent | null {
  const lower = message.toLowerCase().trim();

  // Greetings
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)[\s!.,]*$/i.test(lower)) {
    return {
      type: "greeting",
      entities: {},
      confidence: 0.95,
    };
  }

  // Agent control
  if (/^(pause|stop|wait|hold on)[\s!.,]*$/i.test(lower)) {
    return {
      type: "agent_control",
      entities: { query: "pause" },
      confidence: 0.95,
    };
  }

  if (/^(resume|continue|go|start)[\s!.,]*$/i.test(lower)) {
    return {
      type: "agent_control",
      entities: { query: "resume" },
      confidence: 0.95,
    };
  }

  // Introduction path patterns
  const introMatch = lower.match(
    /who can (introduce|connect) me to (someone at |)(.+)/i
  );
  if (introMatch) {
    return {
      type: "introduction_path",
      entities: {
        targetName: introMatch[3].trim(),
      },
      confidence: 0.9,
    };
  }

  const pathMatch = lower.match(
    /how (am i|can i get) connected to (.+)/i
  );
  if (pathMatch) {
    return {
      type: "introduction_path",
      entities: {
        targetName: pathMatch[2].trim(),
      },
      confidence: 0.9,
    };
  }

  // Find connection patterns
  const findMatch = lower.match(
    /do i know (anyone|someone) (at |from |who works at |)(.+)/i
  );
  if (findMatch) {
    return {
      type: "find_connection",
      entities: {
        targetCompany: findMatch[3].trim(),
      },
      confidence: 0.9,
    };
  }

  return null;
}

/**
 * Full message analysis using LLM
 */
export async function parseMessage(
  message: string,
  conversationHistory?: Array<{ role: "user" | "agent"; content: string }>
): Promise<MessageAnalysis> {
  // Try quick intent detection first
  const quickIntent = detectQuickIntent(message);
  const heuristicSentiment = detectSentimentHeuristic(message);

  // If we have a high-confidence quick match and neutral sentiment, skip LLM
  if (quickIntent && quickIntent.confidence >= 0.9 && heuristicSentiment === "neutral") {
    return {
      intent: quickIntent,
      sentiment: {
        mood: heuristicSentiment,
        intensity: 0.5,
        indicators: [],
      },
      conversationContext: {
        isFollowUp: false,
        referencesEarlierMessage: false,
        expectedResponseType: "answer",
      },
    };
  }

  // Use LLM for complex parsing
  try {
    const historyContext = conversationHistory
      ? `\n\nRecent conversation:\n${conversationHistory
          .slice(-5)
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n")}`
      : "";

    const response = await invokeLLM({
      messages: [
        { role: "system", content: INTENT_PROMPT },
        {
          role: "user",
          content: `Parse this message: "${message}"${historyContext}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "message_analysis",
          strict: false,
          schema: {
            type: "object",
            properties: {
              intent: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: [
                      "find_connection",
                      "introduction_path",
                      "network_question",
                      "agent_control",
                      "clarification",
                      "greeting",
                    ],
                  },
                  entities: {
                    type: "object",
                    properties: {
                      targetName: { type: "string" },
                      targetCompany: { type: "string" },
                      query: { type: "string" },
                    },
                    required: [],
                    additionalProperties: false,
                  },
                  confidence: { type: "number" },
                },
                required: ["type", "entities", "confidence"],
                additionalProperties: false,
              },
              sentiment: {
                type: "object",
                properties: {
                  mood: {
                    type: "string",
                    enum: ["neutral", "positive", "frustrated", "confused", "urgent"],
                  },
                  intensity: { type: "number" },
                  indicators: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["mood", "intensity", "indicators"],
                additionalProperties: false,
              },
              conversationContext: {
                type: "object",
                properties: {
                  isFollowUp: { type: "boolean" },
                  referencesEarlierMessage: { type: "boolean" },
                  expectedResponseType: {
                    type: "string",
                    enum: ["answer", "clarification", "confirmation"],
                  },
                },
                required: ["isFollowUp", "referencesEarlierMessage", "expectedResponseType"],
                additionalProperties: false,
              },
            },
            required: ["intent", "sentiment", "conversationContext"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("Empty LLM response");
    }

    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    return JSON.parse(content);
  } catch (error) {
    console.error("[Agent] Failed to parse message with LLM:", error);

    // Fall back to heuristics
    return {
      intent: quickIntent || {
        type: "network_question" as AgentIntentType,
        entities: { query: message },
        confidence: 0.5,
      },
      sentiment: {
        mood: heuristicSentiment,
        intensity: heuristicSentiment === "neutral" ? 0.3 : 0.6,
        indicators: [],
      },
      conversationContext: {
        isFollowUp: false,
        referencesEarlierMessage: false,
        expectedResponseType: "answer",
      },
    };
  }
}
