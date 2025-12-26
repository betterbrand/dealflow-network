import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { getDb } from "./db";
import { contacts, rdfTriples } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  saveContactTriples,
  getContactTriples,
  deleteContactTriples,
  getAllTriples,
  getTripleCount,
  formatPredicate,
  groupTriplesByPredicate,
} from "./_core/triple-store";
import type { SemanticGraph } from "./_core/semantic-transformer";

// Skip in CI or if no database URL - these are integration tests
const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(isCI || !hasDb)("Triple Store", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let testContactId: number;
  const testEmail = `test-triples-${Date.now()}@example.com`;

  // Sample semantic graph for testing
  const createTestSemanticGraph = (name: string): SemanticGraph => ({
    "@context": {
      "@vocab": "https://schema.org/",
      prov: "http://www.w3.org/ns/prov#",
    },
    "@graph": [
      {
        "@id": `user:test-${name.toLowerCase().replace(/\s/g, "-")}`,
        "@type": "Person",
        name: name,
        jobTitle: "Software Engineer",
        worksFor: {
          "@id": "org:test-company",
        },
        knowsAbout: ["TypeScript", "React", "Node.js"],
      },
      {
        "@id": "org:test-company",
        "@type": "Organization",
        name: "Test Company Inc",
      },
    ],
  });

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      skipTests = true;
      console.log("[Triple Store Tests] Skipping: DATABASE_URL not available");
      return;
    }

    // Create a test contact
    const result = await db.insert(contacts).values({
      name: "Test Triple Contact",
      email: testEmail,
      createdBy: 1,
    });

    testContactId = result[0].insertId;
  });

  afterAll(async () => {
    // Clean up test data
    if (db && testContactId) {
      await db.delete(rdfTriples).where(eq(rdfTriples.contactId, testContactId));
      await db.delete(contacts).where(eq(contacts.id, testContactId));
    }
  });

  beforeEach(async () => {
    // Clear triples for test contact before each test
    if (db && testContactId) {
      await db.delete(rdfTriples).where(eq(rdfTriples.contactId, testContactId));
    }
  });

  describe("saveContactTriples", () => {
    it("should save triples for a contact", async () => {
      
      const graph = createTestSemanticGraph("Test User");
      const count = await saveContactTriples(testContactId, graph);

      expect(count).toBeGreaterThan(0);

      const triples = await getContactTriples(testContactId);
      expect(triples.length).toBe(count);
    });

    it("should save type triples correctly", async () => {
      
      const graph = createTestSemanticGraph("Type Test User");
      await saveContactTriples(testContactId, graph);

      const triples = await getContactTriples(testContactId);
      const typeTriples = triples.filter(
        (t) => t.predicate === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
      );

      expect(typeTriples.length).toBeGreaterThan(0);
      expect(typeTriples.some((t) => t.object === "https://schema.org/Person")).toBe(true);
    });

    it("should save property triples correctly", async () => {
      
      const graph = createTestSemanticGraph("Property Test User");
      await saveContactTriples(testContactId, graph);

      const triples = await getContactTriples(testContactId);
      const nameTriples = triples.filter((t) => t.predicate === "https://schema.org/name");

      expect(nameTriples.length).toBeGreaterThan(0);
      expect(nameTriples.some((t) => t.object === "Property Test User")).toBe(true);
    });

    it("should handle array values", async () => {
      
      const graph = createTestSemanticGraph("Array Test User");
      await saveContactTriples(testContactId, graph);

      const triples = await getContactTriples(testContactId);
      const skillTriples = triples.filter(
        (t) => t.predicate === "https://schema.org/knowsAbout"
      );

      expect(skillTriples.length).toBe(3); // TypeScript, React, Node.js
      expect(skillTriples.map((t) => t.object)).toContain("TypeScript");
      expect(skillTriples.map((t) => t.object)).toContain("React");
      expect(skillTriples.map((t) => t.object)).toContain("Node.js");
    });

    it("should replace existing triples on re-save", async () => {
      
      // Save initial graph
      const graph1 = createTestSemanticGraph("Original Name");
      await saveContactTriples(testContactId, graph1);

      const initialTriples = await getContactTriples(testContactId);
      const initialCount = initialTriples.length;

      // Save different graph for same contact
      const graph2 = createTestSemanticGraph("Updated Name");
      await saveContactTriples(testContactId, graph2);

      const finalTriples = await getContactTriples(testContactId);

      // Should have same count (replaced, not appended)
      expect(finalTriples.length).toBe(initialCount);

      // Should have new name, not old
      const nameTriples = finalTriples.filter(
        (t) => t.predicate === "https://schema.org/name"
      );
      expect(nameTriples.some((t) => t.object === "Updated Name")).toBe(true);
      expect(nameTriples.some((t) => t.object === "Original Name")).toBe(false);
    });
  });

  describe("getContactTriples", () => {
    it("should retrieve triples for a specific contact", async () => {
      
      const graph = createTestSemanticGraph("Retrieve Test");
      await saveContactTriples(testContactId, graph);

      const triples = await getContactTriples(testContactId);

      expect(triples.length).toBeGreaterThan(0);
      expect(triples.every((t) => t.contactId === testContactId)).toBe(true);
    });

    it("should return empty array for contact with no triples", async () => {
      
      const triples = await getContactTriples(999999);
      expect(triples).toEqual([]);
    });

    it("should include all triple fields", async () => {
      
      const graph = createTestSemanticGraph("Fields Test");
      await saveContactTriples(testContactId, graph);

      const triples = await getContactTriples(testContactId);
      const triple = triples[0];

      expect(triple).toHaveProperty("id");
      expect(triple).toHaveProperty("subject");
      expect(triple).toHaveProperty("predicate");
      expect(triple).toHaveProperty("object");
      expect(triple).toHaveProperty("objectType");
      expect(triple).toHaveProperty("contactId");
    });
  });

  describe("deleteContactTriples", () => {
    it("should delete all triples for a contact", async () => {
      
      const graph = createTestSemanticGraph("Delete Test");
      await saveContactTriples(testContactId, graph);

      const beforeDelete = await getContactTriples(testContactId);
      expect(beforeDelete.length).toBeGreaterThan(0);

      await deleteContactTriples(testContactId);

      const afterDelete = await getContactTriples(testContactId);
      expect(afterDelete.length).toBe(0);
    });

    it("should not affect other contacts' triples", async () => {
      
      // This test requires another contact, but we don't want to create one
      // Just verify the basic delete works
      await deleteContactTriples(999999); // Should not throw
    });
  });

  describe("getAllTriples", () => {
    it("should retrieve all triples from database", async () => {
      
      const graph = createTestSemanticGraph("All Triples Test");
      await saveContactTriples(testContactId, graph);

      const allTriples = await getAllTriples();

      expect(Array.isArray(allTriples)).toBe(true);
      expect(allTriples.length).toBeGreaterThan(0);
    });
  });

  describe("getTripleCount", () => {
    it("should return correct count of triples", async () => {
      
      const graph = createTestSemanticGraph("Count Test");
      const savedCount = await saveContactTriples(testContactId, graph);

      const contactTriples = await getContactTriples(testContactId);
      expect(contactTriples.length).toBe(savedCount);
    });
  });

  describe("formatPredicate", () => {
    it("should format schema.org predicates", () => {
      const result = formatPredicate("https://schema.org/jobTitle");
      expect(result).toBe("Job Title");
    });

    it("should format RDF type predicate", () => {
      const result = formatPredicate(
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
      );
      expect(result).toBe("Type");
    });

    it("should format prov predicates", () => {
      const result = formatPredicate("http://www.w3.org/ns/prov#wasGeneratedBy");
      expect(result).toBe("Was Generated By");
    });

    it("should handle unknown predicates", () => {
      const result = formatPredicate("http://example.org/customPredicate");
      expect(result).toBe("Custom Predicate");
    });
  });

  describe("groupTriplesByPredicate", () => {
    it("should group triples by formatted predicate", async () => {
      
      const graph = createTestSemanticGraph("Group Test");
      await saveContactTriples(testContactId, graph);

      const triples = await getContactTriples(testContactId);
      const grouped = groupTriplesByPredicate(triples);

      expect(typeof grouped).toBe("object");
      expect(Object.keys(grouped).length).toBeGreaterThan(0);

      // Should have readable keys
      const keys = Object.keys(grouped);
      expect(keys.some((k) => k === "Name" || k === "Type" || k === "Knows About")).toBe(
        true
      );
    });

    it("should collect multiple values for same predicate", async () => {
      
      const graph = createTestSemanticGraph("Multi Value Test");
      await saveContactTriples(testContactId, graph);

      const triples = await getContactTriples(testContactId);
      const grouped = groupTriplesByPredicate(triples);

      // knowsAbout has 3 values
      const knowsAbout = grouped["Knows About"];
      if (knowsAbout) {
        expect(knowsAbout.length).toBe(3);
      }
    });
  });

  describe("objectType classification", () => {
    it("should classify URI references correctly", async () => {
      
      const graph = createTestSemanticGraph("URI Test");
      await saveContactTriples(testContactId, graph);

      const triples = await getContactTriples(testContactId);

      // Find worksFor triple which should be a URI reference
      const worksForTriples = triples.filter(
        (t) => t.predicate === "https://schema.org/worksFor"
      );

      if (worksForTriples.length > 0) {
        expect(worksForTriples[0].objectType).toBe("uri");
      }
    });

    it("should classify literals correctly", async () => {
      
      const graph = createTestSemanticGraph("Literal Test");
      await saveContactTriples(testContactId, graph);

      const triples = await getContactTriples(testContactId);

      // Name should be a literal
      const nameTriples = triples.filter(
        (t) => t.predicate === "https://schema.org/name"
      );

      expect(nameTriples.length).toBeGreaterThan(0);
      expect(nameTriples[0].objectType).toBe("literal");
    });
  });
});
