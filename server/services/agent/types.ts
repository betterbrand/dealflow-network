/**
 * Server-side agent types
 */

import type {
  AgentTone,
  UserSentiment,
  AgentIntentType,
  AgentSessionType,
  AgentFindingType,
} from "@shared/_core/agent-types";

/**
 * Parsed intent from user message
 */
export interface ParsedIntent {
  type: AgentIntentType;
  entities: {
    targetName?: string;
    targetCompany?: string;
    targetContactId?: number;
    query?: string;
  };
  confidence: number;
}

/**
 * Sentiment analysis result
 */
export interface SentimentAnalysis {
  mood: UserSentiment;
  intensity: number; // 0-1
  indicators: string[]; // Phrases that indicated this mood
}

/**
 * Combined intent and sentiment from message parsing
 */
export interface MessageAnalysis {
  intent: ParsedIntent;
  sentiment: SentimentAnalysis;
  conversationContext: {
    isFollowUp: boolean;
    referencesEarlierMessage: boolean;
    expectedResponseType: 'answer' | 'clarification' | 'confirmation';
  };
}

/**
 * Response generation context
 */
export interface ResponseContext {
  scenario: string;
  data: Record<string, unknown>;
  userSentiment: UserSentiment;
  conversationHistory: Array<{
    role: 'user' | 'agent';
    content: string;
  }>;
}

/**
 * Agent action types for the reasoning loop
 */
export type AgentAction =
  | { type: 'analyze_contact'; contactId: number }
  | { type: 'find_path'; fromId: number; toId: number }
  | { type: 'llm_reasoning'; contact1Id: number; contact2Id: number }
  | { type: 'expand_frontier' }
  | { type: 'answer_query'; query: string };

/**
 * Agent state for session persistence
 */
export interface AgentState {
  exploredContacts: number[];
  pendingContacts: number[];
  exploredPairs: string[]; // "id1-id2" format
  currentFocus?: {
    type: 'contact' | 'company' | 'query';
    targetId?: number;
    query?: string;
  };
  iterationCount: number;
}

/**
 * Connection path result
 */
export interface ConnectionPath {
  fromContactId: number;
  toContactId: number;
  path: number[]; // Array of contact IDs
  hops: number;
  pathStrength: number; // 0-1
  intermediateNames?: string[];
}

/**
 * LLM inference result for connection discovery
 */
export interface LLMInferenceResult {
  hasConnection: boolean;
  connectionType: string | null;
  reasoning: string;
  confidence: number;
  suggestedAction: string | null;
}

/**
 * Finding to be stored
 */
export interface FindingData {
  findingType: AgentFindingType;
  fromContactId?: number;
  toContactId?: number;
  inferenceMethod?: string;
  confidence: number;
  reasoning: string;
  evidenceJson?: string;
  pathJson?: string;
  pathLength?: number;
}

/**
 * Delay calculation hints
 */
export interface DelayHints {
  baseDelayMs: number;
  complexityFactor: number;
  toneMultiplier: number;
}

/**
 * Calculate suggested delay based on response characteristics
 */
export function calculateSuggestedDelay(
  contentLength: number,
  tone: AgentTone,
  hasFindings: boolean
): number {
  // Base delay
  let delay = 800;

  // Adjust for content length
  if (contentLength > 500) delay += 400;
  else if (contentLength > 200) delay += 200;

  // Adjust for tone
  const toneMultipliers: Record<AgentTone, number> = {
    excited: 0.8,      // Quick excited response
    empathetic: 1.3,   // Thoughtful pause
    cautious: 1.4,     // Deliberate response
    neutral: 1.0,
    curious: 0.9,
  };
  delay *= toneMultipliers[tone];

  // Findings add processing time perception
  if (hasFindings) delay += 300;

  // Cap between 400 and 2500ms
  return Math.max(400, Math.min(delay, 2500));
}
