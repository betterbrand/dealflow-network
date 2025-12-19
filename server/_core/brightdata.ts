/**
 * Bright Data API client for LinkedIn profile scraping
 *
 * Replaces the Manus API dependency with direct Bright Data integration.
 * Uses the Bright Data SERP API for LinkedIn profiles.
 */

import { ENV } from "./env";

export interface BrightDataLinkedInProfile {
  name?: string;
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
}

/**
 * Fetch LinkedIn profile data using Bright Data API
 */
export async function fetchLinkedInProfile(
  profileUrl: string
): Promise<BrightDataLinkedInProfile> {
  if (!ENV.brightDataApiKey) {
    throw new Error("BRIGHTDATA_API_KEY is not configured");
  }

  // Extract username from LinkedIn URL
  const usernameMatch = profileUrl.match(/\/in\/([^\/]+)/);
  if (!usernameMatch) {
    throw new Error(`Invalid LinkedIn URL format: ${profileUrl}`);
  }
  const username = usernameMatch[1];

  // Bright Data Scrapers API endpoint for LinkedIn profiles (Synchronous)
  // Documentation: https://docs.brightdata.com/api-reference/web-scraper-api/synchronous-requests
  const apiUrl = `https://api.brightdata.com/datasets/v3/scrape?format=json`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ENV.brightDataApiKey}`,
    },
    body: JSON.stringify({
      input: [{ url: profileUrl }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Bright Data API request failed (${response.status} ${response.statusText}): ${errorText}`
    );
  }

  const data = await response.json();

  // Transform Bright Data response to our format
  return transformBrightDataResponse(data);
}

/**
 * Transform Bright Data API response to our internal format
 */
function transformBrightDataResponse(data: any): BrightDataLinkedInProfile {
  return {
    name: data.name || "",
    headline: data.headline,
    location: data.location,
    summary: data.summary,
    experience: (data.experience || []).map((exp: any) => ({
      title: exp.title,
      company: exp.company_name || exp.company,
      startDate: exp.start_date,
      endDate: exp.end_date,
      description: exp.description,
    })),
    education: (data.education || []).map((edu: any) => ({
      school: edu.school_name || edu.school,
      degree: edu.degree,
      field: edu.field_of_study || edu.field,
      startDate: edu.start_date,
      endDate: edu.end_date,
    })),
    skills: data.skills || [],
    connections: data.connections_count || data.connections,
    profilePictureUrl: data.profile_picture_url || data.profile_picture,
  };
}
