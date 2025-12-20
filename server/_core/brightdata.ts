/**
 * Bright Data API client for LinkedIn profile scraping
 *
 * Replaces the Manus API dependency with direct Bright Data integration.
 * Uses the Bright Data SERP API for LinkedIn profiles.
 */

import { ENV } from "./env";

export interface BrightDataLinkedInProfile {
  // Identity
  name?: string;
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
    companyLogoUrl?: string; // NEW: Company logo from LinkedIn
  }>;
  education?: Array<{
    school: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    url?: string;
    instituteLogoUrl?: string; // NEW: School logo from LinkedIn
  }>;
  educationDetails?: string; // Free-text education summary

  // Skills & Recognition
  skills?: string[];
  honorsAndAwards?: {
    title?: string;
    items?: Array<{ name: string; issuer?: string; date?: string }>;
  };

  // Social Proof
  connections?: number;
  followers?: number;

  // Visual Assets
  profilePictureUrl?: string;
  avatar?: string;
  bannerImage?: string;
  defaultAvatar?: boolean;

  // External Links
  bioLinks?: Array<{
    title: string;
    link: string;
  }>;

  // Content & Activity
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

  // Network
  peopleAlsoViewed?: Array<{
    name: string;
    profileLink: string;
    about?: string;
    location?: string;
  }>;

  // Current Company Details
  currentCompany?: {
    name: string;
    companyId: string;
    title: string;
    location?: string;
  };
  currentCompanyName?: string;
  currentCompanyCompanyId?: string;

  // Metadata
  memorializedAccount?: boolean;
  url?: string;
  inputUrl?: string;
  timestamp?: string;
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
          console.log('[Bright Data] FULL SAMPLE RESPONSE (first 2000 chars):');
          console.log(JSON.stringify(data[0], null, 2).substring(0, 2000));
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
  // === DIAGNOSTIC LOGGING START ===
  console.log('[Bright Data] ========== RAW API RESPONSE DIAGNOSTIC ==========');
  console.log('[Bright Data] Timestamp:', new Date().toISOString());
  console.log('[Bright Data] Top-level keys:', Object.keys(data).join(', '));

  // Log data types for all fields
  const dataTypes = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      Array.isArray(value) ? `Array[${value.length}]` : typeof value
    ])
  );
  console.log('[Bright Data] Field types:', JSON.stringify(dataTypes, null, 2));

  // Log sample values for key fields
  console.log('[Bright Data] Sample values:');
  console.log('  - name:', data.name);
  console.log('  - position:', data.position);
  console.log('  - headline:', data.headline);
  console.log('  - current_company_name:', data.current_company_name);
  console.log('  - current_company:', JSON.stringify(data.current_company));
  console.log('  - about:', data.about ? data.about.substring(0, 100) + '...' : 'NULL');
  console.log('  - summary:', data.summary);

  // Analyze experience structure
  if (Array.isArray(data.experience)) {
    console.log('[Bright Data] Experience array length:', data.experience.length);
    if (data.experience.length > 0) {
      console.log('[Bright Data] First experience item keys:', Object.keys(data.experience[0]).join(', '));
      console.log('[Bright Data] First experience sample:', JSON.stringify(data.experience[0], null, 2));
    }
  } else if (data.experience !== null && data.experience !== undefined && typeof data.experience === 'object') {
    console.log('[Bright Data] Experience is an OBJECT (not array)!');
    console.log('[Bright Data] Experience object keys:', Object.keys(data.experience).join(', '));
    console.log('[Bright Data] Experience object sample:', JSON.stringify(data.experience, null, 2).substring(0, 1000));
  } else {
    console.log('[Bright Data] Experience field:', data.experience === null ? 'NULL' : (data.experience === undefined ? 'UNDEFINED' : typeof data.experience));
  }

  // Analyze education structure
  if (Array.isArray(data.education)) {
    console.log('[Bright Data] Education array length:', data.education.length);
    if (data.education.length > 0) {
      console.log('[Bright Data] First education item keys:', Object.keys(data.education[0]).join(', '));
      console.log('[Bright Data] First education sample:', JSON.stringify(data.education[0], null, 2));
    }
  } else if (data.education !== null && data.education !== undefined && typeof data.education === 'object') {
    console.log('[Bright Data] Education is an OBJECT (not array)!');
    console.log('[Bright Data] Education object keys:', Object.keys(data.education).join(', '));
    console.log('[Bright Data] Education object sample:', JSON.stringify(data.education, null, 2).substring(0, 1000));
  } else {
    console.log('[Bright Data] Education field:', data.education === null ? 'NULL' : (data.education === undefined ? 'UNDEFINED' : typeof data.education));
  }

  // Analyze skills structure
  console.log('[Bright Data] Skills type:', Array.isArray(data.skills) ? `Array[${data.skills?.length || 0}]` : typeof data.skills);
  if (Array.isArray(data.skills) && data.skills.length > 0) {
    console.log('[Bright Data] First 5 skills:', JSON.stringify(data.skills.slice(0, 5), null, 2));
  }

  // Track which fallbacks are being used
  const fallbacksUsed: string[] = [];

  // Transform with fallback tracking
  const name = data.name || "";
  if (!data.name) fallbacksUsed.push('name (empty)');

  // Use position as primary source (that's what API returns)
  const headline = data.position || data.headline;
  if (!data.position && data.headline) fallbacksUsed.push('position->headline');
  if (!data.position && !data.headline) fallbacksUsed.push('headline (empty)');

  // Use about as primary source (that's what API returns)
  const summary = data.about || data.summary;
  if (!data.summary && data.about) fallbacksUsed.push('summary->about');

  // FIXED: API uses "company" directly (NOT company_name), and "start_date"/"end_date" (NOT startDate/endDate)
  const experience = (data.experience || []).map((exp: any) => ({
    title: exp.title,
    company: exp.company,  // Direct field
    companyId: exp.company_id,  // LinkedIn company ID
    startDate: exp.start_date,  // Underscore format
    endDate: exp.end_date,      // Underscore format
    description: exp.description_html || exp.description,
    descriptionHtml: exp.description_html,
    url: exp.url,  // Company LinkedIn URL
    companyLogoUrl: exp.company_logo_url,  // NEW: Company logo
  }));

  // Track company issues
  if (data.experience && Array.isArray(data.experience)) {
    data.experience.forEach((exp: any, idx: number) => {
      if (!exp.company) {
        fallbacksUsed.push(`experience[${idx}].company (MISSING)`);
      }
    });
  }

  // FIXED: API uses "title" for school name, and "start_year"/"end_year" (NOT start_date/end_date)
  // Education can be an array or sometimes missing/malformed
  const educationData = Array.isArray(data.education) ? data.education : [];
  const education = educationData.map((edu: any) => ({
    school: edu.title || edu.school_name || edu.school,  // "title" is the primary field
    degree: edu.degree || edu.degree_name,
    field: edu.field_of_study || edu.field,
    startDate: edu.start_year || edu.start_date,  // Year format, not date
    endDate: edu.end_year || edu.end_date,        // Year format, not date
    description: edu.description_html || edu.description,
    url: edu.url,  // School LinkedIn URL
    instituteLogoUrl: edu.institute_logo_url,  // NEW: School logo
  }));

  // Track school fallbacks
  if (educationData.length > 0) {
    educationData.forEach((edu: any, idx: number) => {
      if (!edu.title) {
        fallbacksUsed.push(`education[${idx}].title (MISSING - using fallback)`);
      }
    });
  }

  const skills = Array.isArray(data.skills) ? data.skills : (data.languages || []).map((lang: any) => lang.name || lang);
  if (!Array.isArray(data.skills) && data.languages) {
    fallbacksUsed.push('skills->languages');
  }

  // Log transformation results
  console.log('[Bright Data] ========== TRANSFORMATION RESULTS ==========');
  console.log('[Bright Data] Fallbacks used:', fallbacksUsed.length > 0 ? fallbacksUsed : 'NONE');
  console.log('[Bright Data] Experience count (raw):', data.experience?.length || 0);
  console.log('[Bright Data] Experience count (transformed):', experience.length);
  console.log('[Bright Data] Experience entries with missing company:', experience.filter((e: any) => !e.company).length);
  console.log('[Bright Data] Education count (raw):', data.education?.length || 0);
  console.log('[Bright Data] Education count (transformed):', education.length);
  console.log('[Bright Data] Education entries with missing school:', education.filter((e: any) => !e.school).length);
  console.log('[Bright Data] Skills count:', skills.length);

  // Warnings for empty critical fields
  if (experience.length === 0 && data.experience?.length > 0) {
    console.error('[Bright Data] ⚠️  WARNING: Experience array exists in raw data but transformed to empty!');
  }
  if (experience.filter((e: any) => !e.company).length > 0) {
    console.error(`[Bright Data] ⚠️  WARNING: ${experience.filter((e: any) => !e.company).length} experience entries have no company!`);
  }
  if (education.length === 0 && data.education?.length > 0) {
    console.error('[Bright Data] ⚠️  WARNING: Education array exists in raw data but transformed to empty!');
  }
  if (education.filter((e: any) => !e.school).length > 0) {
    console.error(`[Bright Data] ⚠️  WARNING: ${education.filter((e: any) => !e.school).length} education entries have no school!`);
  }
  console.log('[Bright Data] ======================================================');
  // === DIAGNOSTIC LOGGING END ===

  // FIXED: API uses "avatar" (NOT profile_picture_url), "connections" (NOT connections_count)
  // Location can be an object with "city" field or a string
  const location = typeof data.location === 'object'
    ? (data.location?.city || data.city)
    : (data.location || data.city);

  // Parse city and country from location
  const city = data.city || (typeof data.location === 'object' ? data.location?.city : null);
  const countryCode = data.country_code || (typeof data.location === 'object' ? data.location?.country_code : null);

  return {
    // === Identity ===
    name,
    firstName: data.first_name,
    lastName: data.last_name,
    linkedinId: data.linkedin_id,
    linkedinNumId: data.linkedin_num_id,

    // === Professional ===
    headline,
    position: data.position,

    // === Location ===
    location,
    city,
    countryCode,

    // === Bio ===
    summary,
    about: data.about,

    // === Experience & Education ===
    experience,
    education,
    educationDetails: data.educations_details,  // Free-text summary

    // === Skills & Recognition ===
    skills,
    honorsAndAwards: data.honors_and_awards,  // Object with awards

    // === Social Proof ===
    connections: data.connections || data.connections_count,
    followers: data.followers,

    // === Visual Assets ===
    profilePictureUrl: data.avatar || data.profile_picture_url || data.profile_picture,
    avatar: data.avatar,
    bannerImage: data.banner_image,
    defaultAvatar: data.default_avatar,

    // === External Links ===
    bioLinks: data.bio_links,  // Array of {title, link}

    // === Content & Activity ===
    posts: data.posts,  // Array of recent posts
    activity: data.activity,  // Array of recent activity

    // === Network ===
    peopleAlsoViewed: data.people_also_viewed,  // Array of similar profiles

    // === Current Company ===
    currentCompany: data.current_company,
    currentCompanyName: data.current_company_name,
    currentCompanyCompanyId: data.current_company_company_id,

    // === Metadata ===
    memorializedAccount: data.memorialized_account,
    url: data.url,
    inputUrl: data.input_url,
    timestamp: data.timestamp,
  };
}
