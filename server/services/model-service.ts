import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { availableModels } from "../../drizzle/schema";
import type { AvailableModel } from "../../drizzle/schema";
import { ENV } from "../_core/env";

/**
 * Fetch available models from mor.org API
 */
export async function fetchMorOrgModels(): Promise<AvailableModel[]> {
  const response = await fetch("https://api.mor.org/api/v1/models", {
    headers: {
      "authorization": `Bearer ${ENV.morOrgApiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch mor.org models: ${response.statusText}`);
  }

  const data = await response.json();
  const models: AvailableModel[] = [];

  for (const model of data.data || []) {
    models.push({
      id: 0, // Auto-generated
      provider: "mor-org",
      modelId: model.id,
      displayName: model.id,
      description: model.description || `${model.id} via mor.org`,
      contextWindow: model.context_length || 16384,
      pricing: model.pricing || null,
      capabilities: {
        vision: model.id.includes("vision") || model.id.includes("gpt-4o"),
        tools: true,
        streaming: true,
      },
      lastFetched: new Date(),
      createdAt: new Date(),
    });
  }

  return models;
}

/**
 * Update model cache in database
 */
export async function refreshModelCache(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  try {
    const morOrgModels = await fetchMorOrgModels();

    // Clear old mor.org models
    await db.delete(availableModels).where(eq(availableModels.provider, "mor-org"));

    // Insert new models
    for (const model of morOrgModels) {
      await db.insert(availableModels).values(model);
    }

    console.log(`[Model Service] Refreshed ${morOrgModels.length} mor.org models`);
  } catch (error) {
    console.error("[Model Service] Failed to refresh model cache:", error);
    throw error;
  }
}

/**
 * Get cached models (with auto-refresh if stale)
 */
export async function getCachedModels(provider?: string): Promise<AvailableModel[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(availableModels);

  if (provider) {
    query = query.where(eq(availableModels.provider, provider as any)) as any;
  }

  const models = await query;

  // Auto-refresh if cache is older than 24 hours
  if (models.length > 0) {
    const oldestModel = models.reduce((oldest, m) =>
      m.lastFetched < oldest.lastFetched ? m : oldest
    , models[0]);

    const cacheAge = Date.now() - oldestModel?.lastFetched?.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (cacheAge > oneDayMs) {
      console.log("[Model Service] Cache stale, refreshing...");
      await refreshModelCache();
      return await query; // Re-fetch after refresh
    }
  }

  return models;
}

/**
 * Add static Anthropic models to cache (for UI display)
 */
export async function seedAnthropicModels(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const anthropicModels: Partial<AvailableModel>[] = [
    {
      provider: "anthropic",
      modelId: "claude-sonnet-3-5-20240229",
      displayName: "Claude Sonnet 3.5",
      description: "Anthropic's most balanced model",
      contextWindow: 200000,
      capabilities: { vision: true, tools: true, streaming: true },
    },
    {
      provider: "anthropic",
      modelId: "claude-opus-3-5-20241022",
      displayName: "Claude Opus 3.5",
      description: "Anthropic's most powerful model",
      contextWindow: 200000,
      capabilities: { vision: true, tools: true, streaming: true },
    },
  ];

  for (const model of anthropicModels) {
    const existing = await db
      .select()
      .from(availableModels)
      .where(eq(availableModels.modelId, model.modelId!))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(availableModels).values(model as any);
    }
  }
}
