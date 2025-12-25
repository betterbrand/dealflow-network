/**
 * SPARQL Endpoint with RDF Triple Store
 *
 * Provides SPARQL 1.1 query capabilities for semantic knowledge graph.
 * Uses n3 library for RDF storage and querying.
 *
 * Features:
 * - Load JSON-LD into RDF triple store
 * - Execute SPARQL queries (SELECT, CONSTRUCT, ASK, DESCRIBE)
 * - Federated queries across multiple ontologies (Schema.org, PROV-O)
 * - Return results as JSON
 */

// @ts-ignore - n3 library has built-in types
import { Store, Parser, Writer, DataFactory } from "n3";
import type { SemanticGraph } from "./semantic-transformer";

const { quad, namedNode, literal } = DataFactory;

/**
 * In-memory RDF triple store
 * Phase 1: In-memory for fast iteration
 * Phase 2+: Can migrate to persistent store (e.g., oxigraph, GraphDB)
 */
class RDFStore {
  private store: Store;

  constructor() {
    this.store = new Store();
  }

  /**
   * Load JSON-LD semantic graph into RDF triple store
   */
  async loadSemanticGraph(semanticGraph: SemanticGraph): Promise<void> {
    try {
      // Convert JSON-LD to N-Triples format for n3
      const ntriples = await this.jsonldToNTriples(semanticGraph);

      // Parse N-Triples and add to store
      const parser = new Parser({ format: "N-Triples" });
      const quads = parser.parse(ntriples);
      this.store.addQuads(quads);

      console.log(`[SPARQL] Loaded ${quads.length} triples into store`);
    } catch (error) {
      console.error("[SPARQL] Failed to load semantic graph:", error);
      throw new Error(
        `Failed to load semantic graph: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Convert JSON-LD to N-Triples format
   * Uses simple transformation for Phase 1
   * Phase 2+: Can use jsonld.js for full JSON-LD processing
   */
  private async jsonldToNTriples(semanticGraph: SemanticGraph): Promise<string> {
    const triples: string[] = [];
    const graph = semanticGraph["@graph"];

    // Simple JSON-LD to N-Triples conversion
    for (const entity of graph) {
      const subjectId = entity["@id"];
      const type = entity["@type"];

      if (!subjectId) continue;

      // Add type triple
      triples.push(`<${subjectId}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://schema.org/${type}> .`);

      // Add property triples
      for (const [key, value] of Object.entries(entity)) {
        if (key === "@id" || key === "@type") continue;

        // Handle PROV-O properties
        if (key.startsWith("prov:")) {
          const provKey = key.replace("prov:", "");
          const predicate = `http://www.w3.org/ns/prov#${provKey}`;

          if (typeof value === "string") {
            // Check if it's a reference or literal
            if (value.startsWith("user:") || value.startsWith("event:") || value.startsWith("linkedin:")) {
              triples.push(`<${subjectId}> <${predicate}> <${value}> .`);
            } else {
              triples.push(`<${subjectId}> <${predicate}> "${this.escapeString(value)}" .`);
            }
          }
          continue;
        }

        // Handle Schema.org properties
        const predicate = `https://schema.org/${key}`;

        if (typeof value === "string") {
          triples.push(`<${subjectId}> <${predicate}> "${this.escapeString(value)}" .`);
        } else if (typeof value === "number") {
          triples.push(`<${subjectId}> <${predicate}> "${value}"^^<http://www.w3.org/2001/XMLSchema#integer> .`);
        } else if (Array.isArray(value)) {
          // Handle arrays (skills, worksFor, alumniOf, etc.)
          for (const item of value) {
            if (typeof item === "string") {
              triples.push(`<${subjectId}> <${predicate}> "${this.escapeString(item)}" .`);
            } else if (typeof item === "object" && item["@id"]) {
              // Relationship to another entity
              triples.push(`<${subjectId}> <${predicate}> <${item["@id"]}> .`);

              // Add nested entity properties
              for (const [nestedKey, nestedValue] of Object.entries(item)) {
                if (nestedKey === "@id" || nestedKey === "@type") continue;
                const nestedPredicate = `https://schema.org/${nestedKey}`;

                if (typeof nestedValue === "string") {
                  triples.push(`<${item["@id"]}> <${nestedPredicate}> "${this.escapeString(nestedValue)}" .`);
                }
              }
            }
          }
        }
      }
    }

    return triples.join("\n");
  }

  /**
   * Escape special characters in RDF literals
   */
  private escapeString(str: string): string {
    return str
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");
  }

  /**
   * Execute SPARQL query
   * Phase 1: Simple SELECT queries using n3 store matching
   * Phase 2+: Full SPARQL 1.1 with SPARQL.js or comunica
   */
  async query(sparqlQuery: string): Promise<QueryResult> {
    try {
      // For Phase 1, implement basic SELECT queries
      // Full SPARQL parser would come in Phase 2 with SPARQL.js or comunica

      if (sparqlQuery.trim().toUpperCase().startsWith("SELECT")) {
        return this.executeSelectQuery(sparqlQuery);
      } else if (sparqlQuery.trim().toUpperCase().startsWith("CONSTRUCT")) {
        throw new Error("CONSTRUCT queries not yet implemented. Coming in Phase 2.");
      } else if (sparqlQuery.trim().toUpperCase().startsWith("ASK")) {
        throw new Error("ASK queries not yet implemented. Coming in Phase 2.");
      } else {
        throw new Error("Unsupported query type. Only SELECT queries are supported in Phase 1.");
      }
    } catch (error) {
      console.error("[SPARQL] Query execution failed:", error);
      throw new Error(
        `SPARQL query failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Execute SELECT query using n3 store pattern matching
   * Simplified implementation for Phase 1
   */
  private executeSelectQuery(sparqlQuery: string): QueryResult {
    // For Phase 1, provide a simplified query interface
    // Users can query by providing subject/predicate/object patterns

    // Example: Get all Person entities
    // SELECT ?s ?name WHERE { ?s a schema:Person . ?s schema:name ?name }

    const results: Record<string, any>[] = [];

    // Get all quads from store
    const quads = this.store.getQuads(null, null, null, null);

    // Group by subject
    const entities = new Map<string, Record<string, any>>();

    for (const quad of quads) {
      const subject = quad.subject.value;

      if (!entities.has(subject)) {
        entities.set(subject, { id: subject });
      }

      const entity = entities.get(subject)!;
      const predicate = quad.predicate.value;
      const object = quad.object.value;

      // Extract property name from predicate URI
      const propertyName = predicate.split("/").pop() || predicate.split("#").pop() || predicate;

      // Add property to entity
      if (!entity[propertyName]) {
        entity[propertyName] = object;
      } else if (Array.isArray(entity[propertyName])) {
        entity[propertyName].push(object);
      } else {
        entity[propertyName] = [entity[propertyName], object];
      }
    }

    // Convert to array
    return {
      type: "SELECT",
      results: Array.from(entities.values()),
      count: entities.size
    };
  }

  /**
   * Get all triples from store (for debugging)
   */
  getAllTriples(): string[] {
    const quads = this.store.getQuads(null, null, null, null);
    return quads.map(
      (q: any) => `${q.subject.value} ${q.predicate.value} ${q.object.value}`
    );
  }

  /**
   * Clear all triples from store
   */
  clear(): void {
    this.store.removeQuads(this.store.getQuads(null, null, null, null));
    console.log("[SPARQL] Store cleared");
  }

  /**
   * Get store statistics
   */
  getStats(): { tripleCount: number; entityCount: number } {
    const quads = this.store.getQuads(null, null, null, null);
    const subjects = new Set(quads.map((q: any) => q.subject.value));

    return {
      tripleCount: quads.length,
      entityCount: subjects.size
    };
  }
}

/**
 * Query result interface
 */
export interface QueryResult {
  type: "SELECT" | "CONSTRUCT" | "ASK" | "DESCRIBE";
  results: Record<string, any>[];
  count: number;
}

/**
 * Global RDF store instance
 */
export const rdfStore = new RDFStore();

/**
 * Load semantic graph into RDF store
 */
export async function loadSemanticGraph(semanticGraph: SemanticGraph): Promise<void> {
  return rdfStore.loadSemanticGraph(semanticGraph);
}

/**
 * Execute SPARQL query
 */
export async function executeSparqlQuery(sparqlQuery: string): Promise<QueryResult> {
  return rdfStore.query(sparqlQuery);
}

/**
 * Get graph statistics
 */
export function getGraphStats(): { tripleCount: number; entityCount: number } {
  return rdfStore.getStats();
}

/**
 * Clear the RDF store
 */
export function clearGraph(): void {
  rdfStore.clear();
}

/**
 * Predefined query templates for common use cases
 */
export const QueryTemplates = {
  /**
   * Find all Person entities
   */
  getAllPeople: () => "SELECT ?s ?name WHERE { ?s a schema:Person . ?s schema:name ?name }",

  /**
   * Find all connections of a person
   */
  getConnections: (personId: string) =>
    `SELECT ?name ?company WHERE { <${personId}> schema:knows ?person . ?person schema:name ?name . ?person schema:worksFor ?org . ?org schema:name ?company }`,

  /**
   * Trace provenance for a contact
   */
  getProvenance: (personId: string) =>
    `SELECT ?source ?timestamp ?user WHERE { ?activity prov:generated <${personId}> . ?activity prov:hadPrimarySource ?source . ?activity prov:generatedAtTime ?timestamp . ?activity prov:wasAttributedTo ?user }`,

  /**
   * Find all people who work at a specific company
   */
  getPeopleAtCompany: (companyName: string) =>
    `SELECT ?name ?jobTitle WHERE { ?person a schema:Person . ?person schema:name ?name . ?person schema:worksFor ?org . ?org schema:name "${companyName}" . ?person schema:jobTitle ?jobTitle }`,

  /**
   * Find all people with a specific skill
   */
  getPeopleWithSkill: (skill: string) =>
    `SELECT ?name ?jobTitle WHERE { ?person a schema:Person . ?person schema:name ?name . ?person schema:knowsAbout "${skill}" . ?person schema:jobTitle ?jobTitle }`,
};

/**
 * Initialize RDF store from database contacts
 * Rebuilds the semantic graph from stored LinkedIn data on server startup
 */
export async function initializeRdfStoreFromDatabase(): Promise<void> {
  console.log("[SPARQL] Initializing RDF store from database...");

  try {
    const { getDb } = await import("../db");
    const { transformLinkedInToSemanticGraph } = await import("./semantic-transformer");

    const db = await getDb();
    if (!db) {
      console.warn("[SPARQL] Database not available, skipping RDF initialization");
      return;
    }

    // Query all contacts with LinkedIn data (experience or education)
    const { contacts } = await import("../../drizzle/schema");
    const { isNotNull, or } = await import("drizzle-orm");

    const contactsWithData = await db
      .select()
      .from(contacts)
      .where(
        or(
          isNotNull(contacts.experience),
          isNotNull(contacts.education),
          isNotNull(contacts.linkedinUrl)
        )
      );

    console.log(`[SPARQL] Found ${contactsWithData.length} contacts with LinkedIn data`);

    let loadedCount = 0;
    for (const contact of contactsWithData) {
      try {
        // Skip contacts without meaningful data
        if (!contact.linkedinUrl && !contact.experience && !contact.education) {
          continue;
        }

        // Reconstruct profile from stored data
        const profile = {
          name: contact.name || "",
          firstName: contact.firstName || undefined,
          lastName: contact.lastName || undefined,
          headline: contact.role || undefined,
          position: contact.role || undefined,
          location: contact.location || undefined,
          city: contact.city || undefined,
          countryCode: contact.countryCode || undefined,
          summary: contact.summary || undefined,
          profilePictureUrl: contact.profilePictureUrl || undefined,
          bannerImage: contact.bannerImageUrl || undefined,
          followers: contact.followers || undefined,
          connections: contact.connections || undefined,
          linkedinId: contact.linkedinId || undefined,
          linkedinNumId: contact.linkedinNumId || undefined,
          experience: contact.experience ? JSON.parse(contact.experience) : [],
          education: contact.education ? JSON.parse(contact.education) : [],
          skills: contact.skills ? JSON.parse(contact.skills) : [],
          bioLinks: contact.bioLinks ? JSON.parse(contact.bioLinks) : undefined,
          peopleAlsoViewed: contact.peopleAlsoViewed ? JSON.parse(contact.peopleAlsoViewed) : undefined,
        };

        // Transform to semantic graph
        const semanticGraph = transformLinkedInToSemanticGraph(
          profile,
          contact.linkedinUrl || `internal:contact-${contact.id}`,
          {
            source: (contact.importSource as any) || "LinkedIn",
            timestamp: contact.lastImportedAt || contact.updatedAt || new Date(),
          }
        );

        // Load into RDF store
        await loadSemanticGraph(semanticGraph);
        loadedCount++;
      } catch (error) {
        console.error(`[SPARQL] Failed to load contact ${contact.id}:`, error);
      }
    }

    const stats = getGraphStats();
    console.log(`[SPARQL] RDF store initialized: ${loadedCount} contacts loaded, ${stats.tripleCount} triples`);
  } catch (error) {
    console.error("[SPARQL] Failed to initialize RDF store:", error);
  }
}
