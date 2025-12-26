/**
 * Agent database operations
 */

import { getDb } from "../../db";
import {
  agentSessions,
  agentFindings,
  agentConversations,
  contacts,
} from "../../../drizzle/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import type { AgentState, FindingData } from "./types";
import type {
  AgentSessionType,
  AgentSessionStatus,
  AgentFindingStatus,
  AgentTone,
  UserSentiment,
} from "@shared/_core/agent-types";

// ============ Sessions ============

export async function createSession(
  userId: number,
  sessionType: AgentSessionType,
  goal?: string
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(agentSessions).values({
    userId,
    sessionType,
    goal,
    status: "running",
  });

  return result[0].insertId;
}

export async function getSession(sessionId: number) {
  const db = await getDb();
  if (!db) return null;

  const [session] = await db
    .select()
    .from(agentSessions)
    .where(eq(agentSessions.id, sessionId));

  return session || null;
}

export async function getUserSessions(userId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(agentSessions)
    .where(eq(agentSessions.userId, userId))
    .orderBy(desc(agentSessions.createdAt))
    .limit(limit);
}

export async function updateSessionStatus(
  sessionId: number,
  status: AgentSessionStatus
) {
  const db = await getDb();
  if (!db) return;

  const updates: Record<string, unknown> = { status };

  if (status === "paused") {
    updates.pausedAt = new Date();
  } else if (status === "completed" || status === "failed") {
    updates.completedAt = new Date();
  }

  updates.lastActivityAt = new Date();

  await db
    .update(agentSessions)
    .set(updates)
    .where(eq(agentSessions.id, sessionId));
}

export async function updateSessionState(
  sessionId: number,
  state: AgentState,
  findingsCount?: number
) {
  const db = await getDb();
  if (!db) return;

  const updates: Record<string, unknown> = {
    stateJson: JSON.stringify(state),
    lastActivityAt: new Date(),
  };

  if (findingsCount !== undefined) {
    updates.findingsCount = findingsCount;
  }

  await db
    .update(agentSessions)
    .set(updates)
    .where(eq(agentSessions.id, sessionId));
}

export function parseSessionState(stateJson: string | null): AgentState {
  if (!stateJson) {
    return {
      exploredContacts: [],
      pendingContacts: [],
      exploredPairs: [],
      iterationCount: 0,
    };
  }

  try {
    return JSON.parse(stateJson);
  } catch {
    return {
      exploredContacts: [],
      pendingContacts: [],
      exploredPairs: [],
      iterationCount: 0,
    };
  }
}

// ============ Findings ============

export async function createFinding(
  sessionId: number,
  userId: number,
  finding: FindingData
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(agentFindings).values({
    sessionId,
    userId,
    findingType: finding.findingType,
    fromContactId: finding.fromContactId,
    toContactId: finding.toContactId,
    inferenceMethod: finding.inferenceMethod,
    confidence: finding.confidence,
    reasoning: finding.reasoning,
    evidenceJson: finding.evidenceJson,
    pathJson: finding.pathJson,
    pathLength: finding.pathLength,
    status: "pending",
  });

  return result[0].insertId;
}

export async function getFindings(
  userId: number,
  status?: AgentFindingStatus,
  limit = 20
) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(agentFindings.userId, userId)];
  if (status) {
    conditions.push(eq(agentFindings.status, status));
  }

  const findings = await db
    .select({
      id: agentFindings.id,
      findingType: agentFindings.findingType,
      fromContactId: agentFindings.fromContactId,
      toContactId: agentFindings.toContactId,
      confidence: agentFindings.confidence,
      reasoning: agentFindings.reasoning,
      pathLength: agentFindings.pathLength,
      status: agentFindings.status,
      createdAt: agentFindings.createdAt,
    })
    .from(agentFindings)
    .where(and(...conditions))
    .orderBy(desc(agentFindings.createdAt))
    .limit(limit);

  // Fetch contact details for findings
  const contactIds = new Set<number>();
  for (const f of findings) {
    if (f.fromContactId) contactIds.add(f.fromContactId);
    if (f.toContactId) contactIds.add(f.toContactId);
  }

  if (contactIds.size === 0) return findings;

  const contactsList = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      company: contacts.company,
      profilePictureUrl: contacts.profilePictureUrl,
    })
    .from(contacts)
    .where(inArray(contacts.id, Array.from(contactIds)));

  const contactMap = new Map(contactsList.map((c) => [c.id, c]));

  return findings.map((f) => ({
    ...f,
    fromContact: f.fromContactId ? contactMap.get(f.fromContactId) : null,
    toContact: f.toContactId ? contactMap.get(f.toContactId) : null,
  }));
}

export async function reviewFinding(
  findingId: number,
  action: "confirm" | "dismiss"
) {
  const db = await getDb();
  if (!db) return;

  const status: AgentFindingStatus = action === "confirm" ? "confirmed" : "dismissed";

  await db
    .update(agentFindings)
    .set({
      status,
      reviewedAt: new Date(),
    })
    .where(eq(agentFindings.id, findingId));
}

// ============ Conversations ============

export async function addConversationMessage(
  sessionId: number,
  role: "user" | "agent",
  content: string,
  metadata?: {
    sentiment?: UserSentiment;
    tone?: AgentTone;
    intentType?: string;
    reasoningTrace?: string;
  }
) {
  const db = await getDb();
  if (!db) return;

  await db.insert(agentConversations).values({
    sessionId,
    role,
    content,
    sentiment: metadata?.sentiment,
    tone: metadata?.tone,
    intentType: metadata?.intentType,
    reasoningTrace: metadata?.reasoningTrace,
  });
}

export async function getConversationHistory(sessionId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: agentConversations.id,
      role: agentConversations.role,
      content: agentConversations.content,
      tone: agentConversations.tone,
      sentiment: agentConversations.sentiment,
      createdAt: agentConversations.createdAt,
    })
    .from(agentConversations)
    .where(eq(agentConversations.sessionId, sessionId))
    .orderBy(desc(agentConversations.createdAt))
    .limit(limit);
}

// ============ Active Session ============

export async function getOrCreateConversationalSession(
  userId: number,
  sessionId?: number
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // If sessionId provided, verify it exists and belongs to user
  if (sessionId) {
    const [existing] = await db
      .select()
      .from(agentSessions)
      .where(
        and(
          eq(agentSessions.id, sessionId),
          eq(agentSessions.userId, userId),
          eq(agentSessions.sessionType, "conversational")
        )
      );

    if (existing && existing.status !== "completed" && existing.status !== "failed") {
      return existing.id;
    }
  }

  // Look for existing active conversational session
  const [active] = await db
    .select()
    .from(agentSessions)
    .where(
      and(
        eq(agentSessions.userId, userId),
        eq(agentSessions.sessionType, "conversational"),
        eq(agentSessions.status, "running")
      )
    )
    .orderBy(desc(agentSessions.createdAt))
    .limit(1);

  if (active) {
    return active.id;
  }

  // Create new session
  return createSession(userId, "conversational");
}
