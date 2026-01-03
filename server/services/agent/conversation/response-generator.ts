/**
 * Response generator using templates and LLM personalization
 */

import { invokeLLM } from "../../../_core/llm";
import type { AgentTone, UserSentiment, AgentResponse } from "@shared/_core/agent-types";
import type { MessageAnalysis } from "../types";
import { calculateSuggestedDelay } from "../types";
import { getTemplate, getTemplateVariant, interpolateTemplate } from "./templates";
import { selectTone, getToneOpener } from "./tone-selector";

interface ResponseData {
  scenario: string;
  values: Record<string, string | number | undefined>;
  suggestedFollowups?: string[];
  reasoning?: string;
  confidence?: number;
}

interface GeneratorContext {
  analysis: MessageAnalysis;
  sessionId: number;
  conversationHistory?: Array<{ role: "user" | "agent"; content: string }>;
}

/**
 * Generate a humanized response
 */
export async function generateResponse(
  context: GeneratorContext,
  data: ResponseData
): Promise<AgentResponse> {
  const { analysis, sessionId, conversationHistory } = context;

  // Determine result quality from scenario
  const resultQuality = getResultQuality(data.scenario);

  // Select tone based on sentiment and result
  const tone = selectTone({
    userSentiment: analysis.sentiment.mood,
    sentimentIntensity: analysis.sentiment.intensity,
    resultQuality,
    confidence: data.confidence || 0.7,
    isGreeting: analysis.intent.type === "greeting",
    isControl: analysis.intent.type === "agent_control",
  });

  // Get template and generate base content
  let content: string;

  const template = getTemplate(data.scenario);
  if (template) {
    const templateText = getTemplateVariant(template, tone);
    content = interpolateTemplate(templateText, data.values);
  } else {
    // Generate dynamic response for scenarios without templates
    content = await generateDynamicResponse(
      data.scenario,
      data.values,
      tone,
      conversationHistory
    );
  }

  // Add tone-appropriate opener if content doesn't start with one
  const openers = getToneOpener(tone);
  if (openers.length > 0 && !startsWithOpener(content, openers)) {
    const opener = openers[Math.floor(Math.random() * openers.length)];
    if (opener) {
      content = `${opener} ${content}`;
    }
  }

  // Calculate delay based on content characteristics
  const hasFollowups = !!(data.suggestedFollowups && data.suggestedFollowups.length > 0);
  const suggestedDelayMs = calculateSuggestedDelay(
    content.length,
    tone,
    hasFollowups
  );

  return {
    content,
    tone,
    suggestedDelayMs,
    showTypingIndicator: true,
    suggestedFollowups: data.suggestedFollowups,
    reasoningSummary: data.reasoning,
    confidence: Math.round((data.confidence || 0.7) * 100),
    canRetry: resultQuality === "none" || resultQuality === "error",
    alternativeApproaches: getAlternatives(data.scenario, data.values),
    sessionId,
  };
}

/**
 * Determine result quality from scenario name
 */
function getResultQuality(scenario: string): "good" | "partial" | "none" | "error" {
  if (scenario.includes("high_confidence") || scenario.includes("found")) {
    return "good";
  }
  if (scenario.includes("low_confidence") || scenario.includes("partial")) {
    return "partial";
  }
  if (scenario.includes("not_found") || scenario.includes("no_")) {
    return "none";
  }
  if (scenario.includes("error")) {
    return "error";
  }
  return "partial";
}

/**
 * Check if content starts with an opener
 */
function startsWithOpener(content: string, openers: string[]): boolean {
  const lower = content.toLowerCase();
  return openers.some((opener) => lower.startsWith(opener.toLowerCase()));
}

/**
 * Get alternative approaches for recovery
 */
function getAlternatives(
  scenario: string,
  values: Record<string, string | number | undefined>
): string[] {
  if (scenario.includes("not_found")) {
    const alternatives: string[] = [];
    if (values.targetCompany) {
      alternatives.push(`Search for other contacts at ${values.targetCompany}`);
    }
    if (values.targetName) {
      alternatives.push("Search for people with similar roles");
    }
    alternatives.push("Broaden the search criteria");
    return alternatives;
  }

  if (scenario.includes("error")) {
    return [
      "Try a simpler search",
      "Ask a different question",
      "Refresh and try again",
    ];
  }

  return [];
}

/**
 * Generate dynamic response using LLM when no template exists
 */
async function generateDynamicResponse(
  scenario: string,
  values: Record<string, string | number | undefined>,
  tone: AgentTone,
  conversationHistory?: Array<{ role: "user" | "agent"; content: string }>
): Promise<string> {
  const toneGuidance: Record<AgentTone, string> = {
    neutral: "Be informative and direct. Use contractions naturally.",
    empathetic: "Be warm and understanding. Acknowledge any difficulty. Use contractions.",
    excited: "Be enthusiastic but not over-the-top. Share good news naturally.",
    curious: "Be inquisitive and interested. Ask clarifying questions politely.",
    cautious: "Be careful and measured. Acknowledge uncertainty clearly.",
  };

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a helpful network assistant. Generate a conversational response.

Scenario: ${scenario}
Data: ${JSON.stringify(values)}
Tone guidance: ${toneGuidance[tone]}

Rules:
- Use natural, conversational language
- Use contractions (I've, you're, it's)
- Keep responses concise (1-3 sentences)
- Don't be overly formal or robotic
- Don't use emojis

${conversationHistory ? `\nRecent conversation for context:\n${conversationHistory.slice(-3).map((m) => `${m.role}: ${m.content}`).join("\n")}` : ""}`,
        },
        {
          role: "user",
          content: `Generate a response for this scenario. Just return the response text, nothing else.`,
        },
      ],
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("Empty response");
    }

    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    return content.trim();
  } catch (error) {
    console.error("[Agent] Failed to generate dynamic response:", error);

    // Fallback to a generic response based on scenario
    if (scenario.includes("found")) {
      return `Here's what I found: ${JSON.stringify(values)}`;
    }
    if (scenario.includes("not_found")) {
      return "I wasn't able to find what you're looking for.";
    }
    return "I've processed your request.";
  }
}

/**
 * Generate greeting response
 */
export function generateGreetingResponse(sessionId: number): AgentResponse {
  const greetings = [
    "Hi! I'm here to help you explore your network. What would you like to know?",
    "Hello! I can help you find connections, discover paths, and analyze relationships. What can I help with?",
    "Hey! Ready to explore your network? Ask me about connections, introductions, or anything else.",
  ];

  const content = greetings[Math.floor(Math.random() * greetings.length)];

  return {
    content,
    tone: "neutral",
    suggestedDelayMs: 600,
    showTypingIndicator: true,
    suggestedFollowups: [
      "Who can introduce me to someone at [company]?",
      "Who do I know at [company]?",
      "Show me my strongest connections",
    ],
    confidence: 100,
    canRetry: false,
    sessionId,
  };
}

/**
 * Generate control response (pause, resume, etc.)
 */
export function generateControlResponse(
  action: string,
  sessionId: number
): AgentResponse {
  let content: string;
  let suggestedFollowups: string[] = [];

  switch (action) {
    case "pause":
      content = "Okay, I've paused. Let me know when you'd like me to continue.";
      suggestedFollowups = ["Resume", "What have you found so far?"];
      break;
    case "resume":
      content = "Resuming where we left off...";
      break;
    case "stop":
      content = "Stopped. I'll save what I've found so far.";
      suggestedFollowups = ["Start a new search", "Show findings"];
      break;
    default:
      content = "Got it.";
  }

  return {
    content,
    tone: "neutral",
    suggestedDelayMs: 400,
    showTypingIndicator: false,
    suggestedFollowups,
    confidence: 100,
    canRetry: false,
    sessionId,
  };
}

/**
 * Generate error recovery response
 */
export function generateErrorResponse(
  error: string,
  sessionId: number
): AgentResponse {
  return {
    content: "I ran into an issue. Let me try a different approach.",
    tone: "empathetic",
    suggestedDelayMs: 600,
    showTypingIndicator: true,
    alternativeApproaches: [
      "Try a simpler search",
      "Ask a different question",
    ],
    confidence: 0,
    canRetry: true,
    sessionId,
  };
}
