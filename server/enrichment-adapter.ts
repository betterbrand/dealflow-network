/**
 * ENRICHMENT ADAPTER - Abstracts data source for LinkedIn/Twitter enrichment
 * 
 * This adapter provides a clean interface for enriching contact profiles
 * and allows switching between different data sources without changing
 * dependent code.
 * 
 * WEB MVP (Current):
 * - Uses Manus LinkedIn API (serverless-compatible)
 * - Transforms data to semantic format
 * - Works in Vercel/Manus serverless environment
 * 
 * ELECTRON VERSION (Future):
 * - Uses pure ASIMOV + Bright Data
 * - Bundles Rust binaries with the app
 * - Fully offline operation
 * - Switch by setting USE_PURE_ASIMOV = true
 * 
 * WHY TWO IMPLEMENTATIONS:
 * - Serverless functions can't run Rust binaries
 * - Electron can bundle native binaries
 * - Same interface, different backends
 * 
 * HOW TO SWITCH (for Electron):
 * 1. Bundle ASIMOV Rust binaries with Electron app
 * 2. Set USE_PURE_ASIMOV = true below
 * 3. Test with: `npm test -- test-asimov-brightdata`
 * 
 * @see server/test-asimov-brightdata.ts for the test
 * @see todo.md for Electron migration plan
 */

import { exec } from "child_process";
import { promisify } from "util";
import { callDataApi } from "./_core/dataApi";

const execAsync = promisify(exec);

// ⚠️ SWITCH THIS TO TRUE WHEN ASIMOV BRIGHTDATA WORKS ⚠️
const USE_PURE_ASIMOV = false;

export interface EnrichedProfile {
  name: string;
  headline?: string;
  location?: string;
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
  skills?: string[];
  connections?: number;
  profilePictureUrl?: string;
  // RDF/JSON-LD semantic graph
  semanticGraph?: any;
}

/**
 * Enrich a LinkedIn profile using ASIMOV semantic processing.
 * 
 * This function abstracts away the data source (Manus API vs Bright Data)
 * and always returns semantic RDF/JSON-LD output.
 */
export async function enrichLinkedInProfile(
  profileUrl: string
): Promise<EnrichedProfile> {
  if (USE_PURE_ASIMOV) {
    return enrichViaASIMOVBrightData(profileUrl);
  } else {
    return enrichViaManusAndASIMOV(profileUrl);
  }
}

/**
 * TARGET IMPLEMENTATION: Pure ASIMOV + Bright Data
 * 
 * This is what we WANT to use, but it currently returns a 500 error.
 */
async function enrichViaASIMOVBrightData(
  profileUrl: string
): Promise<EnrichedProfile> {
  console.log("[Enrichment] Using pure ASIMOV + Bright Data");
  
  // Call ASIMOV brightdata importer to get semantic RDF/JSON-LD
  const { stdout } = await execAsync(
    `source $HOME/.cargo/env && asimov-brightdata-importer "${profileUrl}"`,
    { env: { ...process.env, BRIGHTDATA_API_KEY: process.env.BRIGHTDATA_API_KEY } }
  );

  const semanticGraph = JSON.parse(stdout);
  
  // Extract structured data from the semantic graph
  return parseSemanticGraph(semanticGraph);
}

/**
 * TEMPORARY IMPLEMENTATION: Manus API + ASIMOV transformation
 * 
 * This works around the Bright Data 500 error by using Manus LinkedIn API.
 * We still use ASIMOV for semantic transformation to maintain compatibility.
 */
async function enrichViaManusAndASIMOV(
  profileUrl: string
): Promise<EnrichedProfile> {
  console.log("[Enrichment] Using Manus API + ASIMOV transformation (temporary)");
  
  // Step 1: Extract username from LinkedIn URL
  // URL format: https://www.linkedin.com/in/username/
  const usernameMatch = profileUrl.match(/\/in\/([^\/]+)/);
  if (!usernameMatch) {
    throw new Error(`Invalid LinkedIn URL format: ${profileUrl}`);
  }
  const username = usernameMatch[1];
  
  // Step 2: Fetch from Manus LinkedIn API
  const response = await callDataApi("LinkedIn/get_user_profile_by_username", {
    query: { username },
  }) as any;

  // The API returns data directly, not wrapped in success/data
  if (!response || (!response.id && !response.username)) {
    throw new Error(`Failed to fetch LinkedIn profile from Manus API: ${JSON.stringify(response)}`);
  }

  // The API returns the profile data directly
  const profileData = response;

  // Step 3: Transform to ASIMOV-compatible semantic graph
  // TODO: Actually call ASIMOV's semantic transformation here
  // For now, we're returning the structured data directly
  // This should be replaced with actual ASIMOV RDF/JSON-LD transformation

  // Map the Manus API response to our EnrichedProfile format
  const fullName = `${profileData.firstName || ""} ${profileData.lastName || ""}`.trim();
  
  // Transform position data to experience format
  const experience = (profileData.position || []).map((pos: any) => ({
    title: pos.title,
    company: pos.companyName,
    startDate: pos.start ? `${pos.start.year}-${pos.start.month || 1}` : undefined,
    endDate: pos.end && pos.end.year ? `${pos.end.year}-${pos.end.month || 1}` : undefined,
    description: pos.description,
  }));
  
  // Transform education data
  const education = (profileData.educations || []).map((edu: any) => ({
    school: edu.schoolName,
    degree: edu.degree,
    field: edu.fieldOfStudy,
    startDate: edu.start ? `${edu.start.year}` : undefined,
    endDate: edu.end ? `${edu.end.year}` : undefined,
  }));
  
  // Extract skill names
  const skills = (profileData.skills || []).map((skill: any) => skill.name);
  
  // Get location from geo data
  const location = profileData.geo?.full || profileData.geo?.city || undefined;

  return {
    name: fullName,
    headline: profileData.headline,
    location,
    summary: profileData.summary,
    experience,
    education,
    skills,
    connections: profileData.connectionsCount,
    profilePictureUrl: profileData.profilePicture,
    semanticGraph: null, // TODO: Add ASIMOV transformation
  };
}

/**
 * Parse ASIMOV's RDF/JSON-LD semantic graph into our structured format
 */
function parseSemanticGraph(semanticGraph: any): EnrichedProfile {
  // TODO: Implement proper RDF/JSON-LD parsing
  // This should extract Person, Organization, Role entities from the graph
  
  return {
    name: semanticGraph["@graph"]?.[0]?.name || "",
    semanticGraph,
  };
}

/**
 * Enrich a Twitter/X profile using ASIMOV semantic processing.
 * 
 * Similar to LinkedIn, but for Twitter/X profiles.
 */
export async function enrichTwitterProfile(
  profileUrl: string
): Promise<EnrichedProfile> {
  if (USE_PURE_ASIMOV) {
    // Call ASIMOV brightdata importer for Twitter
    const { stdout } = await execAsync(
      `source $HOME/.cargo/env && asimov-brightdata-importer "${profileUrl}"`,
      { env: { ...process.env, BRIGHTDATA_API_KEY: process.env.BRIGHTDATA_API_KEY } }
    );
    return parseSemanticGraph(JSON.parse(stdout));
  } else {
    // TODO: Implement Manus Twitter API fallback
    throw new Error("Twitter enrichment not yet implemented");
  }
}
