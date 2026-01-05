import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { systemSettings, userSettings } from "../drizzle/schema";
import type { SystemSetting, UserSetting } from "../drizzle/schema";

/**
 * Get system settings (optionally filtered by key)
 */
export async function getSystemSettings(key?: string): Promise<SystemSetting[]> {
  const db = await getDb();
  if (!db) return [];

  if (key) {
    return await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key));
  }

  return await db.select().from(systemSettings);
}

/**
 * Update system setting (admin only)
 */
export async function updateSystemSetting(
  key: string,
  value: string,
  updatedBy: number
): Promise<SystemSetting> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const existing = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);

  if (existing.length > 0) {
    // Update existing
    await db
      .update(systemSettings)
      .set({ value, updatedBy, updatedAt: new Date() })
      .where(eq(systemSettings.key, key));
  } else {
    // Insert new
    await db.insert(systemSettings).values({
      key,
      value,
      category: "llm", // default category
      updatedBy,
    });
  }

  const result = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);

  return result[0];
}

/**
 * Get user settings (optionally filtered by key)
 */
export async function getUserSettings(
  userId: number,
  key?: string
): Promise<UserSetting[]> {
  const db = await getDb();
  if (!db) return [];

  if (key) {
    return await db
      .select()
      .from(userSettings)
      .where(and(eq(userSettings.userId, userId), eq(userSettings.key, key)));
  }

  return await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
}

/**
 * Update user setting
 */
export async function updateUserSetting(
  userId: number,
  key: string,
  value: string
): Promise<UserSetting> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const existing = await db
    .select()
    .from(userSettings)
    .where(and(eq(userSettings.userId, userId), eq(userSettings.key, key)))
    .limit(1);

  if (existing.length > 0) {
    // Update existing
    await db
      .update(userSettings)
      .set({ value, updatedAt: new Date() })
      .where(and(eq(userSettings.userId, userId), eq(userSettings.key, key)));
  } else {
    // Insert new
    await db.insert(userSettings).values({ userId, key, value });
  }

  const result = await db
    .select()
    .from(userSettings)
    .where(and(eq(userSettings.userId, userId), eq(userSettings.key, key)))
    .limit(1);

  return result[0];
}

/**
 * Delete user setting (revert to system default)
 */
export async function deleteUserSetting(userId: number, key: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .delete(userSettings)
    .where(and(eq(userSettings.userId, userId), eq(userSettings.key, key)));
}

/**
 * Get effective settings (merged system defaults + user overrides)
 */
export async function getEffectiveSettings(userId: number): Promise<Record<string, any>> {
  const db = await getDb();
  if (!db) return {};

  // Get all system settings
  const systemSettingsList = await db.select().from(systemSettings);

  // Get all user settings
  const userSettingsList = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));

  // Build map of system defaults
  const effective: Record<string, any> = {};
  for (const setting of systemSettingsList) {
    try {
      effective[setting.key] = JSON.parse(setting.value);
    } catch {
      effective[setting.key] = setting.value;
    }
  }

  // Override with user settings
  for (const setting of userSettingsList) {
    try {
      effective[setting.key] = JSON.parse(setting.value);
    } catch {
      effective[setting.key] = setting.value;
    }
  }

  return effective;
}

/**
 * Initialize default system settings (called on server startup)
 */
export async function initializeDefaultSettings(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const defaults = [
    { key: "llm_default_model", value: JSON.stringify("gpt-4o-mini"), category: "llm", description: "Default LLM model" },
    { key: "llm_default_max_tokens", value: JSON.stringify(16384), category: "llm", description: "Maximum tokens per response" },
    { key: "llm_default_temperature", value: JSON.stringify(0.7), category: "llm", description: "Creativity level (0.0-1.0)" },
    { key: "llm_default_api_url", value: JSON.stringify(""), category: "llm", description: "Custom API endpoint URL" },
  ];

  for (const setting of defaults) {
    const existing = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, setting.key))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(systemSettings).values(setting);
      console.log(`[Settings] Initialized default: ${setting.key}`);
    }
  }
}
