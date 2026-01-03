/**
 * Agent Types - Shared types for the Connection Inference Agent
 * Used by both client and server for type-safe agent interactions
 */

// Agent tone options for humanized responses
export type AgentTone =
  | 'neutral'    // Default informational
  | 'empathetic' // User frustrated or disappointed
  | 'excited'    // Good news, successful path found
  | 'curious'    // Asking clarifying questions
  | 'cautious';  // Low confidence results

// Detected user sentiment
export type UserSentiment =
  | 'neutral'
  | 'positive'
  | 'frustrated'
  | 'confused'
  | 'urgent';

// Agent session types
export type AgentSessionType = 'background_scan' | 'conversational';

// Agent session status
export type AgentSessionStatus = 'running' | 'paused' | 'completed' | 'failed';

// Finding types
export type AgentFindingType = 'connection' | 'introduction_path' | 'insight';

// Finding review status
export type AgentFindingStatus = 'pending' | 'confirmed' | 'dismissed';

// Intent types for conversational mode
export type AgentIntentType =
  | 'find_connection'
  | 'introduction_path'
  | 'network_question'
  | 'agent_control'
  | 'clarification'
  | 'greeting';

/**
 * Rich response structure for humanized agent interactions
 * Server returns this, client uses it for timing and presentation
 */
export interface AgentResponse {
  // Core content
  content: string;

  // Humanization metadata
  tone: AgentTone;
  suggestedDelayMs: number;  // Server suggests, client decides
  showTypingIndicator: boolean;

  // Conversational flow
  suggestedFollowups?: string[];
  clarifyingQuestion?: string;  // If agent needs more info

  // Transparency
  reasoningVisible?: boolean;
  reasoningSummary?: string;  // "I found this by..."
  confidence: number;  // 0-100

  // Recovery hints
  canRetry: boolean;
  alternativeApproaches?: string[];  // "Try asking about..."

  // Session state
  sessionId: number;
  messageIndex?: number;
}

/**
 * Chat message for display
 */
export interface AgentMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  tone?: AgentTone;
  sentiment?: UserSentiment;
  reasoningSummary?: string;
  confidence?: number;
  suggestedFollowups?: string[];
  createdAt: Date;
}

/**
 * Agent finding for display
 */
export interface AgentFindingDisplay {
  id: number;
  findingType: AgentFindingType;
  fromContact: {
    id: number;
    name: string;
    company?: string;
    profilePictureUrl?: string;
  };
  toContact: {
    id: number;
    name: string;
    company?: string;
    profilePictureUrl?: string;
  };
  confidence: number;
  reasoning: string;
  pathLength?: number;
  status: AgentFindingStatus;
  createdAt: Date;
}

/**
 * Agent session status for display
 */
export interface AgentSessionDisplay {
  id: number;
  sessionType: AgentSessionType;
  status: AgentSessionStatus;
  goal?: string;
  findingsCount: number;
  startedAt: Date;
  lastActivityAt: Date;
}
