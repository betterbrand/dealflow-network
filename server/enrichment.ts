/**
 * Knowledge Graph Enrichment Service
 * Fetches additional data from LinkedIn and Twitter to enrich contact profiles
 * 
 * ⚠️ This service uses enrichment-adapter.ts to abstract the data source
 * @see enrichment-adapter.ts for implementation details and technical debt tracking
 */

import { enrichLinkedInProfile, enrichTwitterProfile, type EnrichedProfile } from "./enrichment-adapter";

/**
 * Enrich a contact by fetching data from all available social profiles
 * 
 * This function coordinates the enrichment process across multiple platforms
 * and returns a consolidated enriched profile.
 */
export async function enrichContact(
  contactId: number,
  socialProfiles: Array<{ platform: string; url: string }>
): Promise<EnrichedProfile | null> {
  console.log(`[Enrichment] Starting enrichment for contact ${contactId}`);
  
  let enrichedData: EnrichedProfile | null = null;

  for (const profile of socialProfiles) {
    try {
      let platformData: EnrichedProfile;
      
      if (profile.platform === "linkedin") {
        platformData = await enrichLinkedInProfile(profile.url);
      } else if (profile.platform === "twitter" || profile.platform === "x") {
        platformData = await enrichTwitterProfile(profile.url);
      } else {
        console.log(`[Enrichment] Unsupported platform: ${profile.platform}`);
        continue;
      }

      // Merge data (prefer first non-empty value)
      if (!enrichedData) {
        enrichedData = platformData;
      } else {
        enrichedData = mergeEnrichedData(enrichedData, platformData);
      }
      
      console.log(`[Enrichment] Successfully enriched ${profile.platform} profile for contact ${contactId}`);
      
    } catch (error) {
      console.error(`[Enrichment] Failed to enrich ${profile.platform} profile:`, error);
    }
  }

  return enrichedData;
}

/**
 * Merge two enriched profiles, preferring non-empty values from the first profile
 */
function mergeEnrichedData(base: EnrichedProfile, additional: EnrichedProfile): EnrichedProfile {
  return {
    name: base.name || additional.name,
    headline: base.headline || additional.headline,
    location: base.location || additional.location,
    summary: base.summary || additional.summary,
    experience: [...(base.experience || []), ...(additional.experience || [])],
    education: [...(base.education || []), ...(additional.education || [])],
    skills: Array.from(new Set([...(base.skills || []), ...(additional.skills || [])])),
    connections: base.connections || additional.connections,
    profilePictureUrl: base.profilePictureUrl || additional.profilePictureUrl,
    semanticGraph: base.semanticGraph || additional.semanticGraph,
  };
}

/**
 * Background job to enrich contacts asynchronously
 * This is called after a contact is created with social profile URLs
 */
export async function enrichContactBackground(
  contactId: number,
  socialProfiles: Array<{ platform: string; url: string }>
): Promise<void> {
  console.log(`[Enrichment] Starting background enrichment for contact ${contactId}`);
  
  try {
    const enrichedData = await enrichContact(contactId, socialProfiles);
    
    if (!enrichedData) {
      console.log(`[Enrichment] No data enriched for contact ${contactId}`);
      return;
    }
    
    // TODO: Update the contact in the database with enriched data
    // This should update fields like:
    // - headline, summary, location
    // - experience, education, skills
    // - semantic graph data
    
    console.log(`[Enrichment] Enrichment complete for contact ${contactId}`);
    console.log(`[Enrichment] Preview:`, JSON.stringify(enrichedData, null, 2).substring(0, 300));
    
  } catch (error) {
    console.error(`[Enrichment] Failed to enrich contact ${contactId}:`, error);
  }
}
