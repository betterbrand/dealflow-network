/**
 * Persistent Triple Store
 *
 * Provides database-backed storage for RDF triples.
 * DB is the source of truth; memory cache is optional for performance.
 *
 * Features:
 * - Save/delete triples per contact (transactional)
 * - Query triples by subject, predicate, object, or contactId
 * - Convert semantic graphs to flat triples
 */

import { eq, and, like } from "drizzle-orm";
import { getDb } from "../db";
import { rdfTriples } from "../../drizzle/schema";
import type { SemanticGraph } from "./semantic-transformer";

export interface Triple {
  id: number;
  subject: string;
  predicate: string;
  object: string;
  objectType: "literal" | "uri";
  contactId: number | null;
  createdAt: Date;
}

export type InsertTriple = Omit<Triple, "id" | "createdAt">;

/**
 * Save triples for a contact (replaces existing)
 * Uses transaction for atomicity - DB is source of truth
 */
export async function saveContactTriples(
  contactId: number,
  semanticGraph: SemanticGraph
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const triples = semanticGraphToTriples(semanticGraph, contactId);

  await db.transaction(async (tx) => {
    // Delete existing triples for this contact
    await tx.delete(rdfTriples).where(eq(rdfTriples.contactId, contactId));

    // Insert new triples in batches (MySQL has limits on INSERT size)
    if (triples.length > 0) {
      const BATCH_SIZE = 100;
      for (let i = 0; i < triples.length; i += BATCH_SIZE) {
        const batch = triples.slice(i, i + BATCH_SIZE);
        await tx.insert(rdfTriples).values(batch);
      }
    }
  });

  console.log(`[TripleStore] Saved ${triples.length} triples for contact ${contactId}`);
  return triples.length;
}

/**
 * Delete all triples for a contact
 */
export async function deleteContactTriples(contactId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(rdfTriples).where(eq(rdfTriples.contactId, contactId));
  console.log(`[TripleStore] Deleted triples for contact ${contactId}`);
}

/**
 * Get triples for a specific contact
 */
export async function getContactTriples(contactId: number): Promise<Triple[]> {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .select()
    .from(rdfTriples)
    .where(eq(rdfTriples.contactId, contactId));

  return results as Triple[];
}

/**
 * Get all triples from database
 */
export async function getAllTriples(): Promise<Triple[]> {
  const db = await getDb();
  if (!db) return [];

  const results = await db.select().from(rdfTriples);
  return results as Triple[];
}

/**
 * Get triple count
 */
export async function getTripleCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const results = await db.select().from(rdfTriples);
  return results.length;
}

/**
 * Query triples with flexible filters
 */
export async function queryTriples(options: {
  subject?: string;
  predicate?: string;
  object?: string;
  contactId?: number;
  limit?: number;
}): Promise<Triple[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (options.subject) {
    conditions.push(eq(rdfTriples.subject, options.subject));
  }
  if (options.predicate) {
    conditions.push(eq(rdfTriples.predicate, options.predicate));
  }
  if (options.object) {
    conditions.push(like(rdfTriples.object, `%${options.object}%`));
  }
  if (options.contactId) {
    conditions.push(eq(rdfTriples.contactId, options.contactId));
  }

  let query = db.select().from(rdfTriples);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  if (options.limit) {
    query = query.limit(options.limit) as typeof query;
  }

  const results = await query;
  return results as Triple[];
}

/**
 * Convert semantic graph to flat triples array
 */
export function semanticGraphToTriples(
  graph: SemanticGraph,
  contactId: number
): InsertTriple[] {
  const triples: InsertTriple[] = [];

  for (const entity of graph["@graph"]) {
    const subjectId = entity["@id"];
    const type = entity["@type"];

    if (!subjectId) continue;

    // Add type triple
    triples.push({
      subject: subjectId,
      predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
      object: `https://schema.org/${type}`,
      objectType: "uri",
      contactId,
    });

    // Add property triples
    for (const [key, value] of Object.entries(entity)) {
      if (key === "@id" || key === "@type") continue;

      // Determine predicate URI
      const predicate = key.startsWith("prov:")
        ? `http://www.w3.org/ns/prov#${key.replace("prov:", "")}`
        : `https://schema.org/${key}`;

      if (typeof value === "string") {
        const isUri =
          value.startsWith("user:") ||
          value.startsWith("event:") ||
          value.startsWith("linkedin:") ||
          value.startsWith("org:");

        triples.push({
          subject: subjectId,
          predicate,
          object: value,
          objectType: isUri ? "uri" : "literal",
          contactId,
        });
      } else if (typeof value === "number") {
        triples.push({
          subject: subjectId,
          predicate,
          object: String(value),
          objectType: "literal",
          contactId,
        });
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "string") {
            triples.push({
              subject: subjectId,
              predicate,
              object: item,
              objectType: "literal",
              contactId,
            });
          } else if (typeof item === "object" && item["@id"]) {
            triples.push({
              subject: subjectId,
              predicate,
              object: item["@id"],
              objectType: "uri",
              contactId,
            });

            // Add nested entity properties
            for (const [nestedKey, nestedValue] of Object.entries(item)) {
              if (nestedKey === "@id" || nestedKey === "@type") continue;

              if (typeof nestedValue === "string") {
                triples.push({
                  subject: item["@id"],
                  predicate: `https://schema.org/${nestedKey}`,
                  object: nestedValue,
                  objectType: "literal",
                  contactId,
                });
              }
            }
          }
        }
      }
    }
  }

  return triples;
}

/**
 * Format predicate for display (extract short name from URI)
 */
export function formatPredicate(predicate: string): string {
  // Extract the last part of the URI
  const parts = predicate.split(/[/#]/);
  const localName = parts[parts.length - 1] || predicate;

  // Convert camelCase to Title Case
  // e.g., "jobTitle" -> "Job Title", "knowsAbout" -> "Knows About"
  return localName
    .replace(/([a-z])([A-Z])/g, "$1 $2") // Add space before capitals
    .replace(/^./, (str) => str.toUpperCase()); // Capitalize first letter
}

/**
 * Group triples by predicate for display
 */
export function groupTriplesByPredicate(
  triples: Triple[]
): Record<string, Triple[]> {
  const grouped: Record<string, Triple[]> = {};

  for (const triple of triples) {
    const key = formatPredicate(triple.predicate);
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(triple);
  }

  return grouped;
}
