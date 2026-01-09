/**
 * ENRICHMENT ADAPTER - LinkedIn Enrichment Module
 *
 * Phase 1: Uses Bright Data API + TypeScript semantic transformer
 * - Fetches LinkedIn profile data via Bright Data Scrapers API
 * - Transforms to Schema.org + PROV-O JSON-LD semantic graph
 * - Extensible for future data sources (Twitter, Telegram, etc.)
 *
 * Phase 3: Will add ASIMOV validation layer
 * - ASIMOV binary for neurosymbolic validation
 * - Cryptographic provenance
 * - Enhanced semantic reasoning
 */

import { fetchLinkedInProfile } from "./_core/brightdata";
import {
  transformLinkedInToSemanticGraph,
  parseSemanticGraph,
  type SemanticGraph,
  type TransformOptions,
} from "./_core/semantic-transformer";
import { loadSemanticGraph } from "./_core/sparql";

export interface EnrichedProfile {
  name: string;
  firstName?: string;
  lastName?: string;
  linkedinId?: string;
  linkedinNumId?: string;
  headline?: string;
  location?: string;
  city?: string;
  countryCode?: string;
  summary?: string;
  experience?: Array<{
    title: string;
    company: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  education?: Array<{
    school: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
  }>;
  educationDetails?: string;
  skills?: string[];
  honorsAndAwards?: {
    title?: string;
    items?: Array<{ name: string; issuer?: string; date?: string }>;
  };
  connections?: number;
  followers?: number;
  profilePictureUrl?: string;
  bannerImage?: string;
  bioLinks?: Array<{
    title: string;
    link: string;
  }>;
  posts?: Array<{
    id: string;
    title: string;
    attribution?: string;
    link: string;
    createdAt: string;
    interaction?: string;
  }>;
  activity?: Array<{
    id: string;
    interaction: string;
    link: string;
    title: string;
    img?: string;
  }>;
  peopleAlsoViewed?: Array<{
    name: string;
    profileLink: string;
    about?: string;
    location?: string;
  }>;
  memorializedAccount?: boolean;
  // RDF/JSON-LD semantic graph
  semanticGraph?: SemanticGraph;
}

export interface EnrichmentOptions {
  userId?: number;
  eventId?: string;
  timestamp?: Date;
}

/**
 * Enrich a LinkedIn profile using Bright Data API + Semantic Transformer
 *
 * Phase 1: Direct Bright Data integration
 * - Fetches profile data from LinkedIn via Bright Data
 * - Transforms to Schema.org + PROV-O JSON-LD
 * - Tracks provenance (WHO, WHEN, FROM which source)
 *
 * @param profileUrl - LinkedIn profile URL (e.g., https://www.linkedin.com/in/username)
 * @param options - Enrichment options (userId, eventId, timestamp)
 * @returns Enriched profile with semantic graph
 */
export async function enrichLinkedInProfile(
  profileUrl: string,
  options: EnrichmentOptions = {}
): Promise<EnrichedProfile> {
  console.log("[Enrichment] Fetching LinkedIn profile from Bright Data:", profileUrl);

  try {
    // Fetch profile data from Bright Data API
    const profile = await fetchLinkedInProfile(profileUrl);

    // Transform to semantic graph
    const transformOptions: TransformOptions = {
      source: "LinkedIn",
      userId: options.userId,
      eventId: options.eventId?.toString(),
      timestamp: options.timestamp,
    };

    const semanticGraph = transformLinkedInToSemanticGraph(
      profile,
      profileUrl,
      transformOptions
    );

    // Parse semantic graph for structured data
    const parsed = parseSemanticGraph(semanticGraph);

    // Load semantic graph into RDF triple store for SPARQL queries
    // Pass userId (which is the contactId) to persist triples to database
    try {
      await loadSemanticGraph(semanticGraph, options.userId);
      console.log("[Enrichment] Loaded semantic graph into RDF store", options.userId ? `for contact ${options.userId}` : "");
    } catch (error) {
      console.error("[Enrichment] Failed to load semantic graph into RDF store:", error);
      // Continue without RDF store - basic enrichment still works
    }

    console.log("[Enrichment] Successfully enriched LinkedIn profile:", profile.name);

    return {
      name: profile.name || "",
      firstName: profile.firstName,
      lastName: profile.lastName,
      linkedinId: profile.linkedinId,
      linkedinNumId: profile.linkedinNumId,
      headline: profile.headline,
      location: profile.location,
      city: profile.city,
      countryCode: profile.countryCode,
      summary: profile.summary,
      experience: profile.experience,
      education: profile.education,
      educationDetails: profile.educationDetails,
      skills: profile.skills,
      honorsAndAwards: profile.honorsAndAwards,
      connections: profile.connections,
      followers: profile.followers,
      profilePictureUrl: profile.profilePictureUrl,
      bannerImage: profile.bannerImage,
      bioLinks: profile.bioLinks,
      posts: profile.posts,
      activity: profile.activity,
      peopleAlsoViewed: profile.peopleAlsoViewed,
      memorializedAccount: profile.memorializedAccount,
      semanticGraph,
    };
  } catch (error) {
    console.error("[Enrichment] Failed to enrich LinkedIn profile:", error);
    throw new Error(
      `LinkedIn enrichment failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Enrich a Twitter/X profile
 *
 * Phase 2: Will implement Twitter API integration
 * Currently not implemented - placeholder for future
 */
export async function enrichTwitterProfile(
  profileUrl: string,
  options: EnrichmentOptions = {}
): Promise<EnrichedProfile> {
  throw new Error(
    "Twitter enrichment not yet implemented. Coming in Phase 2."
  );
}
