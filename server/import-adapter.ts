/**
 * IMPORT ADAPTER - LinkedIn Import Module
 *
 * Phase 1: Uses LinkedIn providers (Bright Data or Scrapingdog) + TypeScript semantic transformer
 * - Fetches LinkedIn profile data via configurable provider
 * - Transforms to Schema.org + PROV-O JSON-LD semantic graph
 * - Extensible for future data sources (Twitter, Telegram, etc.)
 *
 * Phase 3: Will add ASIMOV validation layer
 * - ASIMOV binary for neurosymbolic validation
 * - Cryptographic provenance
 * - Enhanced semantic reasoning
 */

import {
  fetchLinkedInProfile,
  fetchLinkedInCompany,
  getDefaultProvider,
  type LinkedInProvider,
  type LinkedInProfile,
  type LinkedInCompany,
} from "./_core/linkedin-provider";
import {
  transformLinkedInToSemanticGraph,
  parseSemanticGraph,
  type SemanticGraph,
  type TransformOptions,
} from "./_core/semantic-transformer";
import { loadSemanticGraph } from "./_core/sparql";

export interface ImportedProfile {
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
    companyLogoUrl?: string;
  }>;
  education?: Array<{
    school: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    url?: string;
    instituteLogoUrl?: string;
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

  // Provider info
  _provider?: LinkedInProvider;
}

// Re-export for backward compatibility
export type EnrichedProfile = ImportedProfile;

export interface ImportOptions {
  userId?: number;
  eventId?: string;
  timestamp?: Date;
  provider?: LinkedInProvider;
}

// Re-export for backward compatibility
export type EnrichmentOptions = ImportOptions;

/**
 * Import a LinkedIn profile using specified provider + Semantic Transformer
 *
 * - Fetches profile data from LinkedIn via Bright Data or Scrapingdog
 * - Transforms to Schema.org + PROV-O JSON-LD
 * - Tracks provenance (WHO, WHEN, FROM which source)
 *
 * @param profileUrl - LinkedIn profile URL (e.g., https://www.linkedin.com/in/username)
 * @param options - Import options (userId, eventId, timestamp, provider)
 * @returns Imported profile with semantic graph
 */
export async function importLinkedInProfile(
  profileUrl: string,
  options: ImportOptions = {}
): Promise<ImportedProfile> {
  const provider = options.provider || getDefaultProvider();

  if (!provider) {
    throw new Error("No LinkedIn data provider configured. Set BRIGHTDATA_API_KEY or SCRAPINGDOG_API_KEY.");
  }

  console.log(`[Import] Fetching LinkedIn profile using ${provider}:`, profileUrl);

  try {
    // Fetch profile data from selected provider
    const profile = await fetchLinkedInProfile(profileUrl, provider);

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
      console.log("[Import] Loaded semantic graph into RDF store", options.userId ? `for contact ${options.userId}` : "");
    } catch (error) {
      console.error("[Import] Failed to load semantic graph into RDF store:", error);
      // Continue without RDF store - basic import still works
    }

    console.log("[Import] Successfully imported LinkedIn profile:", profile.name);
    console.log("[Import] Profile data:", {
      name: profile.name,
      provider,
      experienceCount: profile.experience?.length || 0,
      educationCount: profile.education?.length || 0,
      skillsCount: profile.skills?.length || 0,
      followers: profile.followers,
      postsCount: profile.posts?.length || 0,
      activityCount: profile.activity?.length || 0,
      networkSuggestions: profile.peopleAlsoViewed?.length || 0,
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

      // Provider info
      _provider: provider,
    };
  } catch (error) {
    console.error("[Import] Failed to import LinkedIn profile:", error);
    throw new Error(
      `LinkedIn import failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * @deprecated Use importLinkedInProfile instead
 * Kept for backward compatibility
 */
export async function enrichLinkedInProfile(
  profileUrl: string,
  options: EnrichmentOptions = {}
): Promise<EnrichedProfile> {
  return importLinkedInProfile(profileUrl, options);
}

/**
 * Import a LinkedIn company using specified provider
 */
export async function importLinkedInCompany(
  companyUrl: string,
  options: { provider?: LinkedInProvider } = {}
): Promise<LinkedInCompany> {
  const provider = options.provider || getDefaultProvider();

  if (!provider) {
    throw new Error("No LinkedIn data provider configured.");
  }

  console.log(`[Import] Fetching LinkedIn company using ${provider}:`, companyUrl);

  try {
    const company = await fetchLinkedInCompany(companyUrl, provider);
    console.log("[Import] Successfully imported LinkedIn company:", company.name);
    return company;
  } catch (error) {
    console.error("[Import] Failed to import LinkedIn company:", error);
    throw new Error(
      `LinkedIn company import failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Import a Twitter/X profile
 *
 * Phase 2: Will implement Twitter API integration
 * Currently not implemented - placeholder for future
 */
export async function importTwitterProfile(
  profileUrl: string,
  options: ImportOptions = {}
): Promise<ImportedProfile> {
  throw new Error(
    "Twitter import not yet implemented. Coming in Phase 2."
  );
}

/**
 * @deprecated Use importTwitterProfile instead
 */
export async function enrichTwitterProfile(
  profileUrl: string,
  options: EnrichmentOptions = {}
): Promise<EnrichedProfile> {
  return importTwitterProfile(profileUrl, options);
}
