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
  // Core identity
  name: string;
  firstName?: string;
  lastName?: string;
  linkedinId?: string;
  linkedinNumId?: string;

  // Professional
  headline?: string;
  position?: string;

  // Location
  location?: string;
  city?: string;
  countryCode?: string;

  // Bio
  summary?: string;
  about?: string;

  // Experience & Education
  experience?: Array<{
    title: string;
    company: string;
    companyId?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    descriptionHtml?: string;
    url?: string;
    companyLogoUrl?: string; // NEW: Company logo
  }>;
  education?: Array<{
    school: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    url?: string;
    instituteLogoUrl?: string; // NEW: School logo
  }>;
  educationDetails?: string;

  // Skills & Recognition
  skills?: string[];
  honorsAndAwards?: any;

  // Social Proof
  connections?: number;
  followers?: number;

  // Visual Assets
  profilePictureUrl?: string;
  avatar?: string;
  bannerImage?: string;

  // External Links
  bioLinks?: Array<{ title: string; link: string }>;

  // Content & Activity
  posts?: Array<any>;
  activity?: Array<any>;

  // Network
  peopleAlsoViewed?: Array<any>;

  // Current Company
  currentCompany?: any;
  currentCompanyName?: string;

  // Metadata
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
    try {
      await loadSemanticGraph(semanticGraph);
      console.log("[Enrichment] Loaded semantic graph into RDF store");
    } catch (error) {
      console.error("[Enrichment] Failed to load semantic graph into RDF store:", error);
      // Continue without RDF store - basic enrichment still works
    }

    console.log("[Enrichment] Successfully enriched LinkedIn profile:", profile.name);
    console.log("[Enrichment] Profile data:", {
      name: profile.name,
      experienceCount: profile.experience?.length || 0,
      educationCount: profile.education?.length || 0,
      skillsCount: profile.skills?.length || 0,
      followers: profile.followers,
      postsCount: profile.posts?.length || 0,
      activityCount: profile.activity?.length || 0,
      networkSuggestions: profile.peopleAlsoViewed?.length || 0,
      experience: profile.experience,
    });

    return {
      // Core identity
      name: profile.name || "",
      firstName: profile.firstName,
      lastName: profile.lastName,
      linkedinId: profile.linkedinId,
      linkedinNumId: profile.linkedinNumId,

      // Professional
      headline: profile.headline,
      position: profile.position,

      // Location
      location: profile.location,
      city: profile.city,
      countryCode: profile.countryCode,

      // Bio
      summary: profile.summary,
      about: profile.about,

      // Experience & Education (with logos!)
      experience: profile.experience,
      education: profile.education,
      educationDetails: profile.educationDetails,

      // Skills & Recognition
      skills: profile.skills,
      honorsAndAwards: profile.honorsAndAwards,

      // Social Proof
      connections: profile.connections,
      followers: profile.followers,

      // Visual Assets
      profilePictureUrl: profile.profilePictureUrl,
      avatar: profile.avatar,
      bannerImage: profile.bannerImage,

      // External Links
      bioLinks: profile.bioLinks,

      // Content & Activity
      posts: profile.posts,
      activity: profile.activity,

      // Network
      peopleAlsoViewed: profile.peopleAlsoViewed,

      // Current Company
      currentCompany: profile.currentCompany,
      currentCompanyName: profile.currentCompanyName,

      // Metadata
      memorializedAccount: profile.memorializedAccount,

      // Semantic graph
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
