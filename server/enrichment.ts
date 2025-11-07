/**
 * Knowledge Graph Enrichment Service
 * Fetches additional data from LinkedIn and Twitter using ASIMOV Bright Data module
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export interface EnrichedData {
  fullName?: string;
  headline?: string;
  summary?: string;
  currentCompany?: string;
  currentRole?: string;
  location?: string;
  skills?: string[];
  experience?: Array<{
    company: string;
    role: string;
    duration?: string;
  }>;
  education?: Array<{
    school: string;
    degree?: string;
  }>;
  connections?: number;
  socialLinks?: string[];
}

/**
 * Get the path to ASIMOV binaries
 * In development: use ~/.cargo/bin
 * In production: use bundled binaries or same path
 */
function getAsimovBinaryPath(): string {
  const homeDir = process.env.HOME || '/home/ubuntu';
  const cargoBinPath = path.join(homeDir, '.cargo', 'bin');
  return cargoBinPath;
}

/**
 * Enrich contact data from LinkedIn URL using ASIMOV Bright Data module
 * 
 * Calls: asimov-brightdata-fetcher https://www.linkedin.com/in/username
 * Returns: Structured profile data
 */
export async function enrichFromLinkedIn(linkedinUrl: string): Promise<EnrichedData> {
  if (!process.env.BRIGHTDATA_API_KEY) {
    console.warn('[Enrichment] BRIGHTDATA_API_KEY not configured, returning placeholder data');
    const username = linkedinUrl.split("/in/")[1]?.split("/")[0] || "";
    return {
      fullName: username.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
      headline: "Professional (Bright Data API key required)",
      summary: "Configure BRIGHTDATA_API_KEY in Settings → Secrets to enable enrichment",
      socialLinks: [linkedinUrl],
    };
  }

  try {
    console.log(`[Enrichment] Fetching LinkedIn profile: ${linkedinUrl}`);
    
    const binPath = getAsimovBinaryPath();
    const fetcherPath = path.join(binPath, 'asimov-brightdata-fetcher');
    
    const { stdout, stderr } = await execAsync(
      `"${fetcherPath}" "${linkedinUrl}"`,
      {
        env: {
          ...process.env,
          BRIGHTDATA_API_KEY: process.env.BRIGHTDATA_API_KEY,
          PATH: `${binPath}:${process.env.PATH}`
        },
        timeout: 60000 // 60 second timeout
      }
    );

    if (stderr) {
      console.error('[Enrichment] ASIMOV stderr:', stderr);
    }

    const rawData = JSON.parse(stdout);
    console.log('[Enrichment] LinkedIn data fetched successfully');

    // Parse the Bright Data response and map to our EnrichedData format
    return parseLinkedInData(rawData);
  } catch (error) {
    console.error('[Enrichment] Error fetching LinkedIn profile:', error);
    // Return partial data on error
    return {
      fullName: "Error fetching profile",
      summary: error instanceof Error ? error.message : 'Unknown error',
      socialLinks: [linkedinUrl],
    };
  }
}

/**
 * Enrich contact data from Twitter/X URL using ASIMOV Bright Data module
 */
export async function enrichFromTwitter(twitterUrl: string): Promise<EnrichedData> {
  if (!process.env.BRIGHTDATA_API_KEY) {
    console.warn('[Enrichment] BRIGHTDATA_API_KEY not configured, returning placeholder data');
    const username = twitterUrl.split("/").pop()?.replace("@", "") || "";
    return {
      fullName: `@${username}`,
      headline: "Twitter user (Bright Data API key required)",
      summary: "Configure BRIGHTDATA_API_KEY in Settings → Secrets to enable enrichment",
      socialLinks: [twitterUrl],
    };
  }

  try {
    console.log(`[Enrichment] Fetching Twitter profile: ${twitterUrl}`);
    
    const binPath = getAsimovBinaryPath();
    const fetcherPath = path.join(binPath, 'asimov-brightdata-fetcher');
    
    const { stdout, stderr } = await execAsync(
      `"${fetcherPath}" "${twitterUrl}"`,
      {
        env: {
          ...process.env,
          BRIGHTDATA_API_KEY: process.env.BRIGHTDATA_API_KEY,
          PATH: `${binPath}:${process.env.PATH}`
        },
        timeout: 60000 // 60 second timeout
      }
    );

    if (stderr) {
      console.error('[Enrichment] ASIMOV stderr:', stderr);
    }

    const rawData = JSON.parse(stdout);
    console.log('[Enrichment] Twitter data fetched successfully');

    // Parse the Bright Data response and map to our EnrichedData format
    return parseTwitterData(rawData);
  } catch (error) {
    console.error('[Enrichment] Error fetching Twitter profile:', error);
    // Return partial data on error
    return {
      fullName: "Error fetching profile",
      summary: error instanceof Error ? error.message : 'Unknown error',
      socialLinks: [twitterUrl],
    };
  }
}

/**
 * Parse LinkedIn data from Bright Data response
 * The exact structure depends on what Bright Data returns
 */
function parseLinkedInData(data: any): EnrichedData {
  const enriched: EnrichedData = {
    socialLinks: [],
    skills: [],
    experience: [],
    education: [],
  };

  // Map common LinkedIn fields
  // Note: Adjust these based on actual Bright Data response structure
  if (data.name || data.full_name || data.fullName) {
    enriched.fullName = data.name || data.full_name || data.fullName;
  }
  
  if (data.headline) {
    enriched.headline = data.headline;
  }
  
  if (data.summary || data.about) {
    enriched.summary = data.summary || data.about;
  }
  
  if (data.location) {
    enriched.location = data.location;
  }
  
  if (data.current_company || data.currentCompany) {
    enriched.currentCompany = data.current_company || data.currentCompany;
  }
  
  if (data.current_role || data.currentRole) {
    enriched.currentRole = data.current_role || data.currentRole;
  }
  
  if (data.skills && Array.isArray(data.skills)) {
    enriched.skills = data.skills;
  }
  
  if (data.experience && Array.isArray(data.experience)) {
    enriched.experience = data.experience.map((exp: any) => ({
      company: exp.company || exp.company_name || '',
      role: exp.title || exp.role || '',
      duration: exp.duration || exp.dates || ''
    }));
  }
  
  if (data.education && Array.isArray(data.education)) {
    enriched.education = data.education.map((edu: any) => ({
      school: edu.school || edu.school_name || '',
      degree: edu.degree || edu.field_of_study || ''
    }));
  }
  
  if (data.connections || data.connection_count) {
    enriched.connections = data.connections || data.connection_count;
  }

  return enriched;
}

/**
 * Parse Twitter data from Bright Data response
 */
function parseTwitterData(data: any): EnrichedData {
  const enriched: EnrichedData = {
    socialLinks: [],
  };

  // Map common Twitter fields
  if (data.name) {
    enriched.fullName = data.name;
  }
  
  if (data.description || data.bio) {
    enriched.summary = data.description || data.bio;
  }
  
  if (data.location) {
    enriched.location = data.location;
  }
  
  if (data.headline || data.tagline) {
    enriched.headline = data.headline || data.tagline;
  }

  return enriched;
}

/**
 * Enrich a contact by fetching data from all available social profiles
 */
export async function enrichContact(socialProfiles: Array<{ platform: string; url: string }>): Promise<EnrichedData> {
  const enrichedData: EnrichedData = {
    skills: [],
    experience: [],
    education: [],
    socialLinks: [],
  };

  for (const profile of socialProfiles) {
    try {
      let data: EnrichedData;
      
      if (profile.platform === "linkedin") {
        data = await enrichFromLinkedIn(profile.url);
      } else if (profile.platform === "twitter") {
        data = await enrichFromTwitter(profile.url);
      } else {
        continue;
      }

      // Merge data (prefer first non-empty value)
      enrichedData.fullName = enrichedData.fullName || data.fullName;
      enrichedData.headline = enrichedData.headline || data.headline;
      enrichedData.summary = enrichedData.summary || data.summary;
      enrichedData.currentCompany = enrichedData.currentCompany || data.currentCompany;
      enrichedData.currentRole = enrichedData.currentRole || data.currentRole;
      enrichedData.location = enrichedData.location || data.location;
      
      if (data.skills) {
        enrichedData.skills = [...(enrichedData.skills || []), ...data.skills];
      }
      if (data.experience) {
        enrichedData.experience = [...(enrichedData.experience || []), ...data.experience];
      }
      if (data.education) {
        enrichedData.education = [...(enrichedData.education || []), ...data.education];
      }
      if (data.socialLinks) {
        enrichedData.socialLinks = [...(enrichedData.socialLinks || []), ...data.socialLinks];
      }
    } catch (error) {
      console.error(`[Enrichment] Failed to enrich from ${profile.platform}:`, error);
    }
  }

  return enrichedData;
}

/**
 * Background job to enrich contacts asynchronously
 * This would be called after a contact is created
 */
export async function enrichContactBackground(contactId: number, socialProfiles: Array<{ platform: string; url: string }>) {
  console.log(`[Enrichment] Starting background enrichment for contact ${contactId}`);
  
  try {
    const enrichedData = await enrichContact(socialProfiles);
    
    // TODO: Update the contact in the database with enriched data
    console.log(`[Enrichment] Enriched data for contact ${contactId}:`, enrichedData);
    
    return enrichedData;
  } catch (error) {
    console.error(`[Enrichment] Failed to enrich contact ${contactId}:`, error);
    throw error;
  }
}
