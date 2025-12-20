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
 *
 * Uses synchronous scrape endpoint by default for faster results (<1 minute).
 * Falls back to async polling if response is 202 (still processing).
 */
export async function fetchLinkedInProfile(
  profileUrl: string,
  options: { useAsync?: boolean } = {}
): Promise<BrightDataLinkedInProfile> {
  if (!ENV.brightDataApiKey) {
    throw new Error("BRIGHTDATA_API_KEY is not configured");
  }

  // Use async trigger endpoint if explicitly requested
  if (options.useAsync) {
    return fetchLinkedInProfileAsync(profileUrl);
  }

  // Default: Use synchronous scrape endpoint (faster, no polling)
  const datasetId = "gd_l1viktl72bvl7bjuj0"; // LinkedIn profiles dataset
  const apiUrl = `https://api.brightdata.com/datasets/v3/scrape?dataset_id=${datasetId}&format=json`;

  console.log(`[Bright Data] Fetching profile synchronously: ${profileUrl}`);
  const startTime = Date.now();

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ENV.brightDataApiKey}`,
    },
    body: JSON.stringify([
      { url: profileUrl }
    ]),
  });

  const responseTime = Date.now() - startTime;

  // 200 OK = Results ready immediately
  if (response.ok) {
    console.log(`[Bright Data] ✅ Synchronous response received in ${responseTime}ms`);
    const data = await response.json();
    const profileData = Array.isArray(data) ? data[0] : data;
    return transformBrightDataResponse(profileData);
  }

  // 202 Accepted = Still processing, need to poll
  if (response.status === 202) {
    console.log(`[Bright Data] ⏳ Response 202 (still processing after ${responseTime}ms), falling back to polling...`);
    const data = await response.json();

    if (data.snapshot_id) {
      const profileData = await pollForResults(data.snapshot_id, ENV.brightDataApiKey);
      return transformBrightDataResponse(profileData);
    }
  }

  // Error
  const errorText = await response.text().catch(() => "Unknown error");
  throw new Error(
    `Bright Data API request failed (${response.status} ${response.statusText}): ${errorText}`
  );
}

/**
 * Fetch LinkedIn profile using async trigger endpoint (legacy method)
 * Only used when explicitly requested via options.useAsync = true
 */
async function fetchLinkedInProfileAsync(profileUrl: string): Promise<BrightDataLinkedInProfile> {
  const datasetId = "gd_l1viktl72bvl7bjuj0";
  const apiUrl = `https://api.brightdata.com/datasets/v3/trigger?dataset_id=${datasetId}&format=json&uncompressed_webhook=true`;

  console.log(`[Bright Data] Using async trigger endpoint: ${profileUrl}`);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ENV.brightDataApiKey}`,
    },
    body: JSON.stringify([
      { url: profileUrl }
    ]),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Bright Data API request failed (${response.status} ${response.statusText}): ${errorText}`
    );
  }

  const data = await response.json();

  if (data.snapshot_id) {
    console.log(`[Bright Data] Received snapshot_id: ${data.snapshot_id}, polling for results...`);
    const profileData = await pollForResults(data.snapshot_id, ENV.brightDataApiKey);
    return transformBrightDataResponse(profileData);
  }

  const profileData = Array.isArray(data) ? data[0] : data;
  return transformBrightDataResponse(profileData);
}

/**
 * Poll for results using snapshot ID
 */
async function pollForResults(snapshotId: string, apiKey: string): Promise<any> {
  const maxAttempts = 20; // 20 attempts (10 minutes with 30 second intervals)
  const pollInterval = 30000; // 30 seconds (as recommended by API)

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[Bright Data] Polling attempt ${attempt}/${maxAttempts}...`);

    const snapshotUrl = `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`;

    const response = await fetch(snapshotUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    const responseText = await response.text();

    if (response.ok || response.status === 202) {
      // 200 OK = results ready, 202 Accepted = still processing
      try {
        const data = JSON.parse(responseText);

        // Check if snapshot is still processing (status: starting/running)
        if (data.status && (data.status === 'starting' || data.status === 'running')) {
          console.log(`[Bright Data] Status: ${data.status}, waiting ${pollInterval/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
        }

        // Check if we have actual results (array)
        if (Array.isArray(data) && data.length > 0) {
          console.log(`[Bright Data] ✅ Results ready! Got ${data.length} profiles`);
          console.log(`[Bright Data] Profile data keys:`, Object.keys(data[0]).join(', '));
          return data[0]; // Return first profile
        }

        // Unexpected response format
        console.log(`[Bright Data] Unexpected response: ${JSON.stringify(data).substring(0, 200)}`);
      } catch (e) {
        console.log(`[Bright Data] Response is not JSON: ${responseText.substring(0, 200)}`);
      }
    } else if (response.status === 404) {
      // Snapshot not ready yet
      console.log(`[Bright Data] Snapshot not found (404), waiting ${pollInterval/1000}s...`);
    } else {
      // Error
      console.error(`[Bright Data] Error ${response.status}: ${responseText}`);
      throw new Error(
        `Failed to poll snapshot (${response.status} ${response.statusText}): ${responseText}`
      );
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Polling timeout: snapshot ${snapshotId} did not complete after ${maxAttempts} attempts`);
}

/**
 * Transform Bright Data API response to our internal format
 */
function transformBrightDataResponse(data: any): BrightDataLinkedInProfile {
  return {
    name: data.name || "",
    headline: data.headline || data.position,
    location: data.location,
    summary: data.summary || data.about,
    experience: (data.experience || []).map((exp: any) => ({
      title: exp.title,
      company: exp.company_name || exp.company,
      startDate: exp.start_date,
      endDate: exp.end_date,
      description: exp.description,
    })),
    education: (data.education || []).map((edu: any) => ({
      school: edu.title || edu.school_name || edu.school,
      degree: edu.degree || edu.degree_name,
      field: edu.field_of_study || edu.field,
      startDate: edu.start_year || edu.start_date,
      endDate: edu.end_year || edu.end_date,
    })),
    skills: Array.isArray(data.skills) ? data.skills : (data.languages || []).map((lang: any) => lang.name || lang),
    connections: data.connections_count || data.connections,
    profilePictureUrl: data.profile_picture_url || data.profile_picture || data.avatar,
  };
}
