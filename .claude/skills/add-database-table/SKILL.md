---
name: add-database-table
description: Create new Drizzle ORM database tables with proper conventions, type exports, and migrations for the dealflow-network project. Use when adding new entities, creating junction tables, or modifying the database schema.
---

# Add Database Table

Create Drizzle ORM tables following project conventions.

## Quick Start

When adding a new table, I will:
1. Define table in `drizzle/schema.ts`
2. Export inferred types
3. Run migration with `npm run db:push`
4. Add helper functions in `server/db.ts`

## Template: Basic Table

```typescript
// In drizzle/schema.ts

import { mysqlTable, int, varchar, text, timestamp, boolean } from "drizzle-orm/mysql-core";

export const items = mysqlTable("items", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

// Type exports - ALWAYS include these
export type Item = typeof items.$inferSelect;
export type InsertItem = typeof items.$inferInsert;
```

## Template: Table with Foreign Key

```typescript
export const itemComments = mysqlTable("itemComments", {
  id: int("id").autoincrement().primaryKey(),
  itemId: int("itemId").notNull().references(() => items.id),
  userId: int("userId").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type ItemComment = typeof itemComments.$inferSelect;
export type InsertItemComment = typeof itemComments.$inferInsert;
```

## Template: Junction Table (Many-to-Many)

```typescript
// Pattern from userContacts in this project
export const itemTags = mysqlTable("itemTags", {
  id: int("id").autoincrement().primaryKey(),
  itemId: int("itemId").notNull().references(() => items.id),
  tagId: int("tagId").notNull().references(() => tags.id),
  addedAt: timestamp("addedAt").defaultNow(),
  addedBy: int("addedBy").references(() => users.id),
});

export type ItemTag = typeof itemTags.$inferSelect;
export type InsertItemTag = typeof itemTags.$inferInsert;
```

## Template: Table with JSON Column

```typescript
export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  // JSON columns for flexible data
  experience: json("experience").$type<WorkExperience[]>(),
  education: json("education").$type<Education[]>(),
  skills: text("skills"), // Comma-separated, simpler than JSON
  metadata: json("metadata").$type<Record<string, unknown>>(),
});

// Define JSON types
interface WorkExperience {
  company: string;
  title: string;
  startDate: string;
  endDate?: string;
}

interface Education {
  school: string;
  degree: string;
  year: number;
}
```

## Common Field Patterns

```typescript
// Primary key
id: int("id").autoincrement().primaryKey(),

// Required string
name: varchar("name", { length: 255 }).notNull(),

// Optional string
description: text("description"),

// Email (use varchar with appropriate length)
email: varchar("email", { length: 320 }),

// URL
linkedinUrl: varchar("linkedinUrl", { length: 500 }),

// Boolean with default
isActive: boolean("isActive").default(true),

// Timestamps
createdAt: timestamp("createdAt").defaultNow(),
updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),

// Foreign key
userId: int("userId").notNull().references(() => users.id),

// Optional foreign key
companyId: int("companyId").references(() => companies.id),

// Enum-like (use varchar, validate in app)
status: varchar("status", { length: 50 }).default("pending"),
role: varchar("role", { length: 50 }).default("user"),

// Integer with default
priority: int("priority").default(0),

// Decimal for money
amount: decimal("amount", { precision: 10, scale: 2 }),
```

## Migration Workflow

```bash
# After modifying drizzle/schema.ts:
npm run db:push

# This will:
# 1. Generate migration SQL in drizzle/migrations/
# 2. Apply migration to database
```

## Database Helper Functions

Add to `server/db.ts`:

```typescript
// Get all items
export async function getAllItems() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(items);
}

// Get item by ID
export async function getItemById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [item] = await db.select().from(items).where(eq(items.id, id));
  return item ?? null;
}

// Create item
export async function createItem(data: InsertItem) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [result] = await db.insert(items).values(data);
  return { id: result.insertId, ...data };
}

// Update item
export async function updateItem(id: number, data: Partial<InsertItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(items).set(data).where(eq(items.id, id));
}

// Delete item
export async function deleteItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(items).where(eq(items.id, id));
}
```

## Type Re-export

Add to `shared/_core/types.ts`:

```typescript
export type { Item, InsertItem } from "../../drizzle/schema";
```

## Checklist

- [ ] Table defined in `drizzle/schema.ts`
- [ ] Type exports added ($inferSelect, $inferInsert)
- [ ] Foreign keys reference correct tables
- [ ] Timestamps included (createdAt, updatedAt)
- [ ] Run `npm run db:push` for migration
- [ ] Helper functions added to `server/db.ts`
- [ ] Types re-exported in `shared/_core/types.ts`
