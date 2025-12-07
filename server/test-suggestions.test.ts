import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { contacts as contactsTable, contactRelationships } from "../drizzle/schema";
import { eq, and, or, inArray } from "drizzle-orm";

describe("Smart Relationship Suggestions", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let testContactIds: number[] = [];

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");

    // Clean up any existing test data
    await db.delete(contactsTable).where(
      or(
        eq(contactsTable.name, "Suggestion Test Contact 1"),
        eq(contactsTable.name, "Suggestion Test Contact 2"),
        eq(contactsTable.name, "Suggestion Test Contact 3"),
        eq(contactsTable.name, "Suggestion Test Contact 4")
      )
    );

    // Create test contacts with shared attributes
    const [contact1] = await db.insert(contactsTable).values({
      name: "Suggestion Test Contact 1",
      company: "Acme Corp",
      role: "CEO",
      location: "San Francisco, CA",
      addedBy: 1,
    }).$returningId();

    const [contact2] = await db.insert(contactsTable).values({
      name: "Suggestion Test Contact 2",
      company: "Acme Corp", // Same company as contact1
      role: "CTO",
      location: "San Francisco, CA", // Same location as contact1
      addedBy: 1,
    }).$returningId();

    const [contact3] = await db.insert(contactsTable).values({
      name: "Suggestion Test Contact 3",
      company: "Different Corp",
      role: "CEO", // Same role as contact1
      location: "New York, NY",
      addedBy: 1,
    }).$returningId();

    const [contact4] = await db.insert(contactsTable).values({
      name: "Suggestion Test Contact 4",
      company: "Another Corp",
      role: "Engineer",
      location: "San Francisco, CA", // Same location as contact1 and contact2
      addedBy: 1,
    }).$returningId();

    testContactIds = [contact1.id, contact2.id, contact3.id, contact4.id];
  });

  it("should find contacts with shared company (high confidence)", async () => {
    if (!db) throw new Error("Database not available");

    const contacts = await db
      .select()
      .from(contactsTable)
      .where(inArray(contactsTable.id, testContactIds));

    // Get existing relationships
    const existingRelationships = await db
      .select()
      .from(contactRelationships)
      .where(
        or(
          inArray(contactRelationships.fromContactId, testContactIds),
          inArray(contactRelationships.toContactId, testContactIds)
        )
      );

    const existingPairs = new Set(
      existingRelationships.map((r: any) =>
        [r.fromContactId, r.toContactId].sort().join("-")
      )
    );

    // Find suggestions
    const suggestions: Array<{
      contact1: typeof contacts[0];
      contact2: typeof contacts[0];
      reason: string;
      confidence: "high" | "medium" | "low";
    }> = [];

    for (let i = 0; i < contacts.length; i++) {
      for (let j = i + 1; j < contacts.length; j++) {
        const c1 = contacts[i];
        const c2 = contacts[j];
        const pairKey = [c1.id, c2.id].sort().join("-");

        if (existingPairs.has(pairKey)) continue;

        const reasons: string[] = [];
        let confidence: "high" | "medium" | "low" = "low";

        // Check shared company
        if (
          c1.company &&
          c2.company &&
          c1.company.toLowerCase() === c2.company.toLowerCase()
        ) {
          reasons.push(`both work at ${c1.company}`);
          confidence = "high";
        }

        // Check shared location
        if (
          c1.location &&
          c2.location &&
          c1.location.toLowerCase().includes(c2.location.toLowerCase())
        ) {
          reasons.push(`both in ${c1.location}`);
          if (confidence === "low") confidence = "medium";
        }

        // Check similar roles
        if (c1.role && c2.role) {
          const role1 = c1.role.toLowerCase();
          const role2 = c2.role.toLowerCase();
          const commonTerms = ["ceo", "cto", "cfo", "founder", "vp", "director"];
          const sharedRole = commonTerms.find(
            (term) => role1.includes(term) && role2.includes(term)
          );
          if (sharedRole) {
            reasons.push(`both are ${sharedRole}s`);
            if (confidence === "low") confidence = "medium";
          }
        }

        if (reasons.length > 0) {
          suggestions.push({
            contact1: c1,
            contact2: c2,
            reason: reasons.join(" and "),
            confidence,
          });
        }
      }
    }

    // Should find Contact 1 and Contact 2 (shared company)
    const highConfidenceSuggestions = suggestions.filter(s => s.confidence === "high");
    expect(highConfidenceSuggestions.length).toBeGreaterThan(0);
    
    const acmeCorpSuggestion = highConfidenceSuggestions.find(
      s => s.reason.includes("Acme Corp")
    );
    expect(acmeCorpSuggestion).toBeDefined();
    expect(acmeCorpSuggestion?.reason).toContain("both work at Acme Corp");
  });

  it("should find contacts with shared location (medium confidence)", async () => {
    if (!db) throw new Error("Database not available");

    const contacts = await db
      .select()
      .from(contactsTable)
      .where(inArray(contactsTable.id, testContactIds));

    const suggestions: Array<{
      contact1: typeof contacts[0];
      contact2: typeof contacts[0];
      reason: string;
      confidence: "high" | "medium" | "low";
    }> = [];

    for (let i = 0; i < contacts.length; i++) {
      for (let j = i + 1; j < contacts.length; j++) {
        const c1 = contacts[i];
        const c2 = contacts[j];

        const reasons: string[] = [];
        let confidence: "high" | "medium" | "low" = "low";

        if (
          c1.location &&
          c2.location &&
          c1.location.toLowerCase().includes(c2.location.toLowerCase())
        ) {
          reasons.push(`both in ${c1.location}`);
          confidence = "medium";
        }

        if (reasons.length > 0) {
          suggestions.push({
            contact1: c1,
            contact2: c2,
            reason: reasons.join(" and "),
            confidence,
          });
        }
      }
    }

    // Should find multiple contacts in San Francisco
    const sfSuggestions = suggestions.filter(s => s.reason.includes("San Francisco"));
    expect(sfSuggestions.length).toBeGreaterThan(0);
  });

  it("should find contacts with shared role (medium confidence)", async () => {
    if (!db) throw new Error("Database not available");

    const contacts = await db
      .select()
      .from(contactsTable)
      .where(inArray(contactsTable.id, testContactIds));

    const suggestions: Array<{
      contact1: typeof contacts[0];
      contact2: typeof contacts[0];
      reason: string;
      confidence: "high" | "medium" | "low";
    }> = [];

    for (let i = 0; i < contacts.length; i++) {
      for (let j = i + 1; j < contacts.length; j++) {
        const c1 = contacts[i];
        const c2 = contacts[j];

        const reasons: string[] = [];
        let confidence: "high" | "medium" | "low" = "low";

        if (c1.role && c2.role) {
          const role1 = c1.role.toLowerCase();
          const role2 = c2.role.toLowerCase();
          const commonTerms = ["ceo", "cto", "cfo", "founder", "vp", "director"];
          const sharedRole = commonTerms.find(
            (term) => role1.includes(term) && role2.includes(term)
          );
          if (sharedRole) {
            reasons.push(`both are ${sharedRole}s`);
            confidence = "medium";
          }
        }

        if (reasons.length > 0) {
          suggestions.push({
            contact1: c1,
            contact2: c2,
            reason: reasons.join(" and "),
            confidence,
          });
        }
      }
    }

    // Should find Contact 1 and Contact 3 (both CEOs)
    const ceoSuggestions = suggestions.filter(s => s.reason.includes("ceos"));
    expect(ceoSuggestions.length).toBeGreaterThan(0);
  });

  it("should not suggest existing relationships", async () => {
    if (!db) throw new Error("Database not available");

    // Create a relationship between Contact 1 and Contact 2
    await db.insert(contactRelationships).values({
      fromContactId: testContactIds[0],
      toContactId: testContactIds[1],
      relationshipType: "colleague",
    });

    const contacts = await db
      .select()
      .from(contactsTable)
      .where(inArray(contactsTable.id, testContactIds));

    const existingRelationships = await db
      .select()
      .from(contactRelationships)
      .where(
        or(
          inArray(contactRelationships.fromContactId, testContactIds),
          inArray(contactRelationships.toContactId, testContactIds)
        )
      );

    const existingPairs = new Set(
      existingRelationships.map((r: any) =>
        [r.fromContactId, r.toContactId].sort().join("-")
      )
    );

    // Try to find suggestions
    const suggestions: Array<{
      contact1: typeof contacts[0];
      contact2: typeof contacts[0];
    }> = [];

    for (let i = 0; i < contacts.length; i++) {
      for (let j = i + 1; j < contacts.length; j++) {
        const c1 = contacts[i];
        const c2 = contacts[j];
        const pairKey = [c1.id, c2.id].sort().join("-");

        // Skip if relationship already exists
        if (existingPairs.has(pairKey)) continue;

        if (c1.company && c2.company && c1.company === c2.company) {
          suggestions.push({ contact1: c1, contact2: c2 });
        }
      }
    }

    // Should NOT suggest Contact 1 and Contact 2 since they already have a relationship
    const contact1And2Suggestion = suggestions.find(
      s =>
        (s.contact1.id === testContactIds[0] && s.contact2.id === testContactIds[1]) ||
        (s.contact1.id === testContactIds[1] && s.contact2.id === testContactIds[0])
    );
    expect(contact1And2Suggestion).toBeUndefined();

    // Clean up the test relationship
    await db.delete(contactRelationships).where(
      and(
        eq(contactRelationships.fromContactId, testContactIds[0]),
        eq(contactRelationships.toContactId, testContactIds[1])
      )
    );
  });
});
