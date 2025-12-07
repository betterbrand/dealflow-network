import { desc, eq } from "drizzle-orm";
import { queryHistory, InsertQueryHistory } from "../drizzle/schema";
import { getDb } from "./db";

/**
 * Save a query to history
 */
export async function saveQueryHistory(data: InsertQueryHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(queryHistory).values(data).$returningId();
  return result;
}

/**
 * Get query history for a user
 */
export async function getQueryHistory(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(queryHistory)
    .where(eq(queryHistory.userId, userId))
    .orderBy(desc(queryHistory.createdAt))
    .limit(limit);
}

/**
 * Delete a query from history
 */
export async function deleteQueryHistory(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .delete(queryHistory)
    .where(eq(queryHistory.id, id));

  return { success: true };
}

/**
 * Clear all query history for a user
 */
export async function clearQueryHistory(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(queryHistory).where(eq(queryHistory.userId, userId));
  return { success: true };
}
