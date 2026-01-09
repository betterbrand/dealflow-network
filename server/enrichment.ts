/**
 * Knowledge Graph Enrichment Service
 * Fetches additional data from LinkedIn and Twitter to enrich contact profiles
 * 
 * ⚠️ This service uses enrichment-adapter.ts to abstract the data source
 * @see enrichment-adapter.ts for implementation details and technical debt tracking
 */

import { enrichLinkedInProfile, enrichTwitterProfile, type EnrichedProfile } from "./enrichment-adapter";
import { updateContactEnrichment } from "./db";

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
        // Pass contactId as userId to enable triple persistence
        platformData = await enrichLinkedInProfile(profile.url, { userId: contactId });
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
    
    // Extract company and role from experience or headline
    let company: string | undefined;
    let role: string | undefined;

    // Try to get from first current/recent experience
    if (enrichedData.experience && enrichedData.experience.length > 0) {
      const currentJob = enrichedData.experience[0]; // Most recent is first
      company = currentJob.company;
      role = currentJob.title;
    }

    // Fallback to headline if no experience
    if (!company && !role && enrichedData.headline) {
      // Try to parse "Title at Company" format
      const match = enrichedData.headline.match(/^(.+?)\s+at\s+(.+)$/i);
      if (match) {
        role = match[1].trim();
        company = match[2].trim();
      }
    }

    // Update the contact in the database with enriched data
    await updateContactEnrichment(contactId, {
      // Core fields
      summary: enrichedData.summary,
      profilePictureUrl: enrichedData.profilePictureUrl,
      experience: enrichedData.experience,
      education: enrichedData.education,
      skills: enrichedData.skills,
      company,
      role,
      location: enrichedData.location,

      // === Step 1: Social Proof ===
      followers: enrichedData.followers,
      connections: enrichedData.connections,

      // === Step 2: Visual Assets ===
      bannerImageUrl: enrichedData.bannerImage,

      // === Step 3: Name Parsing ===
      firstName: enrichedData.firstName,
      lastName: enrichedData.lastName,

      // === Step 4: External Links ===
      bioLinks: enrichedData.bioLinks,

      // === Step 5: Content & Activity ===
      posts: enrichedData.posts,
      activity: enrichedData.activity,

      // === Step 6: Network ===
      peopleAlsoViewed: enrichedData.peopleAlsoViewed,

      // === Additional Metadata ===
      linkedinId: enrichedData.linkedinId,
      linkedinNumId: enrichedData.linkedinNumId,
      city: enrichedData.city,
      countryCode: enrichedData.countryCode,
      memorializedAccount: enrichedData.memorializedAccount,
      educationDetails: enrichedData.educationDetails,
      honorsAndAwards: enrichedData.honorsAndAwards,
    });

    console.log(`[Enrichment] Enrichment complete for contact ${contactId}`);
    console.log(`[Enrichment] Saved: ${enrichedData.experience?.length || 0} experience, ${enrichedData.education?.length || 0} education, ${enrichedData.skills?.length || 0} skills`);
    console.log(`[Enrichment] Social: ${enrichedData.followers || 0} followers, ${enrichedData.connections || 0} connections`);
    console.log(`[Enrichment] Content: ${enrichedData.posts?.length || 0} posts, ${enrichedData.activity?.length || 0} activity, ${enrichedData.peopleAlsoViewed?.length || 0} network suggestions`);

    // Compute inferred edges for the network graph
    try {
      const { computeInferredEdgesForContact } = await import("./services/inferred-edges.service");
      const edgesCreated = await computeInferredEdgesForContact(contactId);
      console.log(`[Enrichment] Created ${edgesCreated} inferred edges for contact ${contactId}`);
    } catch (edgeError) {
      console.warn(`[Enrichment] Failed to compute inferred edges for contact ${contactId}:`, edgeError);
    }

  } catch (error) {
    console.error(`[Enrichment] Failed to enrich contact ${contactId}:`, error);
  }
}
