import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { contacts } from "../drizzle/schema";
import { parseQuery } from "./services/query.service";
import { and, or, like } from "drizzle-orm";

describe("AI Query Feature", () => {
  let testContactIds: number[] = [];

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test contacts with various attributes
    const testContacts = [
      {
        name: "Alice Johnson",
        company: "Microsoft",
        role: "CEO",
        location: "Seattle",
        email: "alice@microsoft.com",
        createdBy: 1,
      },
      {
        name: "Bob Smith",
        company: "Microsoft",
        role: "CTO",
        location: "Seattle",
        email: "bob@microsoft.com",
        createdBy: 1,
      },
      {
        name: "Charlie Brown",
        company: "Google",
        role: "Engineer",
        location: "San Francisco",
        email: "charlie@google.com",
        createdBy: 1,
      },
      {
        name: "Diana Prince",
        company: "Amazon",
        role: "VP Product",
        location: "Seattle",
        email: "diana@amazon.com",
        createdBy: 1,
      },
    ];

    for (const contact of testContacts) {
      const [result] = await db.insert(contacts).values(contact).$returningId();
      testContactIds.push(result.id);
    }
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Clean up test data
    if (testContactIds.length > 0) {
      const { inArray } = await import("drizzle-orm");
      await db.delete(contacts).where(inArray(contacts.id, testContactIds));
    }
  });

  it("should parse and execute query for company filter", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { parsed, explanation } = await parseQuery("Who do I know at Microsoft?");

    expect(parsed).toBeDefined();
    expect(parsed.intent).toBe("find");
    expect(parsed.filters.companies).toContain("Microsoft");
    expect(explanation).toBeDefined();

    // Execute query
    const conditions: any[] = [];
    if (parsed.filters.companies && parsed.filters.companies.length > 0) {
      conditions.push(
        or(
          ...parsed.filters.companies.map((company) =>
            like(contacts.company, `%${company}%`)
          )
        )
      );
    }

    const results = await db
      .select()
      .from(contacts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(50);

    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.map((c: any) => c.name)).toContain("Alice Johnson");
    expect(results.map((c: any) => c.name)).toContain("Bob Smith");
  });

  it("should parse and execute query for role filter", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { parsed } = await parseQuery("Find all CEOs in my network");

    expect(parsed).toBeDefined();
    expect(parsed.intent).toBe("find");
    expect(parsed.filters.roles).toContain("CEO");

    // Execute query
    const conditions: any[] = [];
    if (parsed.filters.roles && parsed.filters.roles.length > 0) {
      conditions.push(
        or(
          ...parsed.filters.roles.map((role) =>
            like(contacts.role, `%${role}%`)
          )
        )
      );
    }

    const results = await db
      .select()
      .from(contacts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(50);

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((c: any) => c.name === "Alice Johnson")).toBe(true);
  });

  it("should parse query for location filter", async () => {
    const { parsed } = await parseQuery("Show me contacts in Seattle");

    expect(parsed).toBeDefined();
    expect(parsed.filters.locations).toContain("Seattle");
  });

  it("should handle multiple filters", async () => {
    const { parsed } = await parseQuery("Who works at Microsoft in Seattle?");

    expect(parsed).toBeDefined();
    expect(parsed.filters.companies).toContain("Microsoft");
    expect(parsed.filters.locations).toContain("Seattle");
  });

  it("should parse query for non-matching company", async () => {
    const { parsed } = await parseQuery("Who do I know at Apple?");

    expect(parsed).toBeDefined();
    expect(parsed.filters.companies).toContain("Apple");
  });

  it("should provide explanation for parsed query", async () => {
    const { parsed, explanation } = await parseQuery("Find all founders");

    expect(parsed).toBeDefined();
    expect(explanation).toBeDefined();
    expect(typeof explanation).toBe("string");
    expect(explanation.length).toBeGreaterThan(0);
  });
});
