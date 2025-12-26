/**
 * Database queries for user-centric network graph
 * Provides functions for building graph data with the user at the center
 */

import { eq, and, or, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb } from "./db";
import { contacts, userContacts, inferredEdges, users } from "../drizzle/schema";

export interface GraphNode {
  id: number | "user";
  name: string;
  company?: string;
  role?: string;
  degree: number;
  followers?: number;
  connections?: number;
  profilePictureUrl?: string;
  isUser: boolean;
}

export interface GraphEdge {
  source: number | "user";
  target: number;
  edgeType: "direct_contact" | "people_also_viewed" | "same_company" | "same_school" | "shared_skills";
  strength: number;
}

export interface UserCentricGraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    totalNodes: number;
    nodesByDegree: Record<number, number>;
    edgesByType: Record<string, number>;
    computeTimeMs: number;
  };
}

/**
 * Get user's direct contacts that have LinkedIn data
 * These become Degree 1 nodes in the graph
 */
export async function getUserContactsWithLinkedInData(
  userId: number,
  limit: number = 50
): Promise<GraphNode[]> {
  const db = await getDb();
  if (!db) return [];

  // Join userContacts with contacts to get user's contacts with LinkedIn data
  const results = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      company: contacts.company,
      role: contacts.role,
      followers: contacts.followers,
      connections: contacts.connections,
      profilePictureUrl: contacts.profilePictureUrl,
      peopleAlsoViewed: contacts.peopleAlsoViewed,
    })
    .from(userContacts)
    .innerJoin(contacts, eq(userContacts.contactId, contacts.id))
    .where(
      and(
        eq(userContacts.userId, userId),
        // Has LinkedIn data (at least one of these fields)
        or(
          isNotNull(contacts.linkedinUrl),
          isNotNull(contacts.peopleAlsoViewed),
          isNotNull(contacts.followers)
        )
      )
    )
    .orderBy(sql`${contacts.followers} DESC NULLS LAST`)
    .limit(limit);

  return results.map(c => ({
    id: c.id,
    name: c.name,
    company: c.company || undefined,
    role: c.role || undefined,
    degree: 1,
    followers: c.followers || undefined,
    connections: c.connections || undefined,
    profilePictureUrl: c.profilePictureUrl || undefined,
    isUser: false,
  }));
}

/**
 * Get contacts connected via inferred edges (Degree 2+)
 * Expands from a set of contact IDs to find their connections
 */
export async function getConnectedContacts(
  sourceContactIds: number[],
  excludeIds: Set<number>,
  limit: number = 30
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const db = await getDb();
  if (!db || sourceContactIds.length === 0) return { nodes: [], edges: [] };

  // Get inferred edges from source contacts
  const edges = await db
    .select({
      fromContactId: inferredEdges.fromContactId,
      toContactId: inferredEdges.toContactId,
      edgeType: inferredEdges.edgeType,
      strength: inferredEdges.strength,
    })
    .from(inferredEdges)
    .where(inArray(inferredEdges.fromContactId, sourceContactIds));

  // Collect unique target contact IDs that aren't already in the graph
  const targetIds = new Set<number>();
  const validEdges: GraphEdge[] = [];

  for (const edge of edges) {
    if (!excludeIds.has(edge.toContactId) && targetIds.size < limit) {
      targetIds.add(edge.toContactId);
      validEdges.push({
        source: edge.fromContactId,
        target: edge.toContactId,
        edgeType: edge.edgeType as GraphEdge["edgeType"],
        strength: edge.strength || 1,
      });
    }
  }

  if (targetIds.size === 0) {
    return { nodes: [], edges: [] };
  }

  // Fetch contact details for the new nodes
  const targetContacts = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      company: contacts.company,
      role: contacts.role,
      followers: contacts.followers,
      connections: contacts.connections,
      profilePictureUrl: contacts.profilePictureUrl,
    })
    .from(contacts)
    .where(inArray(contacts.id, Array.from(targetIds)));

  const nodes: GraphNode[] = targetContacts.map(c => ({
    id: c.id,
    name: c.name,
    company: c.company || undefined,
    role: c.role || undefined,
    degree: 2, // Will be updated by caller for higher degrees
    followers: c.followers || undefined,
    connections: c.connections || undefined,
    profilePictureUrl: c.profilePictureUrl || undefined,
    isUser: false,
  }));

  return { nodes, edges: validEdges };
}

/**
 * Build the complete user-centric graph with BFS traversal
 */
export async function buildUserCentricGraph(
  userId: number,
  maxDepth: number = 3,
  maxNodesPerDegree: number = 20
): Promise<UserCentricGraphResult> {
  const startTime = Date.now();
  const db = await getDb();

  if (!db) {
    return {
      nodes: [],
      edges: [],
      stats: {
        totalNodes: 0,
        nodesByDegree: {},
        edgesByType: {},
        computeTimeMs: 0,
      },
    };
  }

  // Get user info for the center node
  const userResult = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const user = userResult[0];
  if (!user) {
    return {
      nodes: [],
      edges: [],
      stats: {
        totalNodes: 0,
        nodesByDegree: {},
        edgesByType: {},
        computeTimeMs: Date.now() - startTime,
      },
    };
  }

  // Initialize with user node (Degree 0)
  const allNodes: GraphNode[] = [
    {
      id: "user",
      name: user.name || "You",
      degree: 0,
      isUser: true,
    },
  ];
  const allEdges: GraphEdge[] = [];
  const seenContactIds = new Set<number>();
  const nodesByDegree: Record<number, number> = { 0: 1 };
  const edgesByType: Record<string, number> = {};

  // Degree 1: User's direct contacts with LinkedIn data
  const degree1Nodes = await getUserContactsWithLinkedInData(userId, maxNodesPerDegree);

  for (const node of degree1Nodes) {
    allNodes.push(node);
    seenContactIds.add(node.id as number);

    // Edge from user to contact
    allEdges.push({
      source: "user",
      target: node.id as number,
      edgeType: "direct_contact",
      strength: 3,
    });

    edgesByType["direct_contact"] = (edgesByType["direct_contact"] || 0) + 1;
  }
  nodesByDegree[1] = degree1Nodes.length;

  // BFS for higher degrees
  let currentDegreeIds = degree1Nodes.map(n => n.id as number);

  for (let degree = 2; degree <= maxDepth; degree++) {
    if (currentDegreeIds.length === 0) break;

    const { nodes: newNodes, edges: newEdges } = await getConnectedContacts(
      currentDegreeIds,
      seenContactIds,
      maxNodesPerDegree
    );

    // Update degree for new nodes
    for (const node of newNodes) {
      node.degree = degree;
      allNodes.push(node);
      seenContactIds.add(node.id as number);
    }

    for (const edge of newEdges) {
      allEdges.push(edge);
      edgesByType[edge.edgeType] = (edgesByType[edge.edgeType] || 0) + 1;
    }

    nodesByDegree[degree] = newNodes.length;
    currentDegreeIds = newNodes.map(n => n.id as number);
  }

  return {
    nodes: allNodes,
    edges: allEdges,
    stats: {
      totalNodes: allNodes.length,
      nodesByDegree,
      edgesByType,
      computeTimeMs: Date.now() - startTime,
    },
  };
}

/**
 * Get inferred edges between a set of contacts (for visualization)
 */
export async function getInferredEdgesBetweenContacts(
  contactIds: number[]
): Promise<GraphEdge[]> {
  const db = await getDb();
  if (!db || contactIds.length === 0) return [];

  const edges = await db
    .select({
      fromContactId: inferredEdges.fromContactId,
      toContactId: inferredEdges.toContactId,
      edgeType: inferredEdges.edgeType,
      strength: inferredEdges.strength,
    })
    .from(inferredEdges)
    .where(
      and(
        inArray(inferredEdges.fromContactId, contactIds),
        inArray(inferredEdges.toContactId, contactIds)
      )
    );

  return edges.map(e => ({
    source: e.fromContactId,
    target: e.toContactId,
    edgeType: e.edgeType as GraphEdge["edgeType"],
    strength: e.strength || 1,
  }));
}
