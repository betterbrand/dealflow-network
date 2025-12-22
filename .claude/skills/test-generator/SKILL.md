---
name: test-generator
description: Generate Vitest test files for the dealflow-network project with proper setup, teardown, database patterns, and assertion styles. Use when creating tests for new features, database operations, or API endpoints.
---

# Test Generator

Generate Vitest test files following project patterns.

## Quick Start

When creating tests, I will:
1. Create test file in `server/` with naming pattern `test-*.test.ts`
2. Set up database connection and cleanup
3. Use describe/it blocks with clear descriptions
4. Include proper assertions

## Template: Database Operation Tests

```typescript
// server/test-items.test.ts

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { items } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { createItem, getItemById, updateItem, deleteItem } from "./db";

describe("Items Database Operations", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let testItemId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");
  });

  afterAll(async () => {
    // Clean up test data
    if (db && testItemId) {
      await db.delete(items).where(eq(items.id, testItemId));
    }
  });

  describe("createItem", () => {
    it("should create a new item with required fields", async () => {
      const result = await createItem({
        name: "Test Item",
        createdBy: 1,
      });

      expect(result).toBeDefined();
      expect(result.id).toBeGreaterThan(0);
      expect(result.name).toBe("Test Item");

      testItemId = result.id; // Store for cleanup
    });

    it("should create item with optional fields", async () => {
      const result = await createItem({
        name: "Full Test Item",
        description: "A test description",
        createdBy: 1,
      });

      expect(result.description).toBe("A test description");

      // Clean up
      if (db) await db.delete(items).where(eq(items.id, result.id));
    });
  });

  describe("getItemById", () => {
    it("should return item when found", async () => {
      const item = await getItemById(testItemId);

      expect(item).toBeDefined();
      expect(item?.id).toBe(testItemId);
      expect(item?.name).toBe("Test Item");
    });

    it("should return null when not found", async () => {
      const item = await getItemById(999999);

      expect(item).toBeNull();
    });
  });

  describe("updateItem", () => {
    it("should update item fields", async () => {
      await updateItem(testItemId, { name: "Updated Item" });

      const updated = await getItemById(testItemId);
      expect(updated?.name).toBe("Updated Item");
    });
  });

  describe("deleteItem", () => {
    it("should delete item", async () => {
      // Create item to delete
      const item = await createItem({ name: "To Delete", createdBy: 1 });

      await deleteItem(item.id);

      const deleted = await getItemById(item.id);
      expect(deleted).toBeNull();
    });
  });
});
```

## Template: tRPC Endpoint Tests

```typescript
// server/test-items-api.test.ts

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createCallerFactory } from "@trpc/server";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { items } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Items API", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  const testIds: number[] = [];

  // Create caller with mock context
  const createCaller = createCallerFactory(appRouter);
  const caller = createCaller({
    user: { id: 1, email: "test@example.com", role: "user" },
    req: {} as any,
    res: {} as any,
  });

  beforeAll(async () => {
    db = await getDb();
  });

  afterAll(async () => {
    // Clean up all test items
    if (db) {
      for (const id of testIds) {
        await db.delete(items).where(eq(items.id, id));
      }
    }
  });

  describe("items.create", () => {
    it("should create item via API", async () => {
      const result = await caller.items.create({
        name: "API Test Item",
      });

      expect(result.id).toBeGreaterThan(0);
      expect(result.name).toBe("API Test Item");

      testIds.push(result.id);
    });

    it("should reject empty name", async () => {
      await expect(
        caller.items.create({ name: "" })
      ).rejects.toThrow();
    });
  });

  describe("items.list", () => {
    it("should return list of items", async () => {
      const result = await caller.items.list({});

      expect(Array.isArray(result)).toBe(true);
    });

    it("should support pagination", async () => {
      const result = await caller.items.list({
        page: 1,
        limit: 10,
      });

      expect(result.length).toBeLessThanOrEqual(10);
    });
  });

  describe("items.get", () => {
    it("should return item by id", async () => {
      const created = await caller.items.create({ name: "Get Test" });
      testIds.push(created.id);

      const result = await caller.items.get({ id: created.id });

      expect(result.id).toBe(created.id);
      expect(result.name).toBe("Get Test");
    });

    it("should throw NOT_FOUND for missing item", async () => {
      await expect(
        caller.items.get({ id: 999999 })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });
});
```

## Template: Utility Function Tests

```typescript
// server/test-utils.test.ts

import { describe, it, expect } from "vitest";
import { validateEmail, formatName, parseLinkedInUrl } from "./utils";

describe("Utility Functions", () => {
  describe("validateEmail", () => {
    it("should accept valid emails", () => {
      expect(validateEmail("test@example.com")).toBe(true);
      expect(validateEmail("user.name@domain.org")).toBe(true);
    });

    it("should reject invalid emails", () => {
      expect(validateEmail("invalid")).toBe(false);
      expect(validateEmail("@nodomain.com")).toBe(false);
      expect(validateEmail("")).toBe(false);
    });
  });

  describe("formatName", () => {
    it("should capitalize first letter of each word", () => {
      expect(formatName("john doe")).toBe("John Doe");
    });

    it("should handle single names", () => {
      expect(formatName("john")).toBe("John");
    });

    it("should trim whitespace", () => {
      expect(formatName("  john  ")).toBe("John");
    });
  });

  describe("parseLinkedInUrl", () => {
    it("should extract username from LinkedIn URL", () => {
      expect(parseLinkedInUrl("https://linkedin.com/in/johndoe")).toBe("johndoe");
      expect(parseLinkedInUrl("https://www.linkedin.com/in/jane-doe/")).toBe("jane-doe");
    });

    it("should return null for invalid URLs", () => {
      expect(parseLinkedInUrl("not-a-url")).toBeNull();
      expect(parseLinkedInUrl("https://twitter.com/user")).toBeNull();
    });
  });
});
```

## Common Assertions

```typescript
// Existence
expect(result).toBeDefined();
expect(result).toBeNull();
expect(result).toBeTruthy();
expect(result).toBeFalsy();

// Equality
expect(result).toBe(expected);          // Strict equality
expect(result).toEqual(expected);       // Deep equality
expect(result).toMatchObject(partial);  // Partial match

// Numbers
expect(result).toBeGreaterThan(0);
expect(result).toBeLessThanOrEqual(10);

// Strings
expect(result).toContain("substring");
expect(result).toMatch(/pattern/);

// Arrays
expect(result).toHaveLength(3);
expect(result).toContain(item);
expect(Array.isArray(result)).toBe(true);

// Errors
await expect(promise).rejects.toThrow();
await expect(promise).rejects.toThrow("specific message");
await expect(promise).rejects.toMatchObject({ code: "NOT_FOUND" });
```

## Running Tests

```bash
# Run all tests
npm run test

# Run specific test file
npm run test server/test-items.test.ts

# Run tests in watch mode
npm run test -- --watch

# Run with coverage
npm run test -- --coverage
```

## Checklist

- [ ] Test file named `test-*.test.ts`
- [ ] Database setup in beforeAll
- [ ] Cleanup in afterAll
- [ ] Clear describe/it block descriptions
- [ ] Test both success and error cases
- [ ] No test data left in database after run
- [ ] Independent tests (no order dependency)
