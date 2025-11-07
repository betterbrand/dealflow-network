/**
 * Knowledge Graph Enrichment Service
 * Fetches additional data from LinkedIn and Twitter to enrich contact profiles
 */

import { invokeLLM } from "./_core/llm";

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
 * Enrich contact data from LinkedIn URL
 * Note: Direct scraping of LinkedIn is against their ToS and technically difficult
 * This is a placeholder for integration with LinkedIn API or third-party services
 */
export async function enrichFromLinkedIn(linkedinUrl: string): Promise<EnrichedData> {
  // In production, you would use:
  // 1. LinkedIn Official API (requires partnership)
  // 2. Third-party services like Proxycurl, RocketReach, or Clearbit
  // 3. Web scraping service (legal considerations apply)
  
  console.log(`[Enrichment] LinkedIn enrichment requested for: ${linkedinUrl}`);
  
  // For MVP, we'll use LLM to extract what we can from the URL structure
  // and return placeholder data
  const username = linkedinUrl.split("/in/")[1]?.split("/")[0] || "";
  
  return {
    fullName: username.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    headline: "Professional (LinkedIn data pending)",
    summary: "Full LinkedIn profile data requires API integration or third-party service",
    socialLinks: [linkedinUrl],
  };
}

/**
 * Enrich contact data from Twitter/X URL
 * Uses Twitter API or web scraping
 */
export async function enrichFromTwitter(twitterUrl: string): Promise<EnrichedData> {
  // In production, you would use:
  // 1. Twitter/X Official API (requires API key)
  // 2. Third-party services
  // 3. Web scraping service
  
  console.log(`[Enrichment] Twitter enrichment requested for: ${twitterUrl}`);
  
  const username = twitterUrl.split("/").pop()?.replace("@", "") || "";
  
  return {
    fullName: `@${username}`,
    headline: "Twitter user (full data pending)",
    summary: "Full Twitter profile data requires API integration",
    socialLinks: [twitterUrl],
  };
}

/**
 * Use LLM to analyze and extract information from public profile data
 * This can be used when we have scraped HTML or API responses
 */
export async function extractProfileData(profileHtml: string, source: "linkedin" | "twitter"): Promise<EnrichedData> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert at extracting structured professional information from ${source} profiles.
Extract: name, headline, summary, current company, role, location, skills, experience, education.
Return only valid JSON.`,
      },
      {
        role: "user",
        content: `Extract professional information from this ${source} profile data:\n\n${profileHtml.substring(0, 4000)}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "profile_extraction",
        strict: true,
        schema: {
          type: "object",
          properties: {
            fullName: { type: "string" },
            headline: { type: "string" },
            summary: { type: "string" },
            currentCompany: { type: "string" },
            currentRole: { type: "string" },
            location: { type: "string" },
            skills: {
              type: "array",
              items: { type: "string" },
            },
            experience: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  company: { type: "string" },
                  role: { type: "string" },
                  duration: { type: "string" },
                },
                required: ["company", "role"],
                additionalProperties: false,
              },
            },
            education: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  school: { type: "string" },
                  degree: { type: "string" },
                },
                required: ["school"],
                additionalProperties: false,
              },
            },
          },
          required: [],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== "string") {
    throw new Error("No content returned from LLM");
  }

  return JSON.parse(content);
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
