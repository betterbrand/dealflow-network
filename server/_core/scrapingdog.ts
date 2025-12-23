/**
 * Scrapingdog API client for LinkedIn profile scraping
 *
 * Provides an alternative to Bright Data with synchronous responses.
 * Uses the Scrapingdog LinkedIn API.
 */

import { ENV } from "./env";

// Re-export the same interface used by Brightdata for compatibility
export interface ScrapingdogLinkedInProfile {
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

export interface ScrapingdogLinkedInCompany {
  name?: string;
  description?: string;
  website?: string;
  industry?: string;
  companySize?: string;
  headquarters?: string;
  founded?: number;
  specialties?: string[];
  logoUrl?: string;
  linkedinUrl?: string;
  employeeCount?: number;
}

/**
 * Extract LinkedIn profile ID from URL
 */
function extractLinkedInId(url: string): string {
  // Handle various LinkedIn URL formats
  // https://www.linkedin.com/in/username
  // https://linkedin.com/in/username/
  // linkedin.com/in/username
  const match = url.match(/linkedin\.com\/in\/([^\/\?]+)/i);
  if (match) {
    return match[1];
  }
  // If it's already just the ID, return as-is
  return url;
}

/**
 * Extract LinkedIn company ID from URL
 */
function extractCompanyId(url: string): string {
  // https://www.linkedin.com/company/companyname
  const match = url.match(/linkedin\.com\/company\/([^\/\?]+)/i);
  if (match) {
    return match[1];
  }
  return url;
}

/**
 * Fetch LinkedIn profile data using Scrapingdog API
 *
 * Scrapingdog provides synchronous responses - no polling needed.
 */
export async function fetchLinkedInProfileScrapingdog(
  profileUrl: string
): Promise<ScrapingdogLinkedInProfile> {
  if (!ENV.scrapingdogApiKey) {
    throw new Error("SCRAPINGDOG_API_KEY is not configured");
  }

  const linkedinId = extractLinkedInId(profileUrl);
  const apiUrl = `https://api.scrapingdog.com/linkedin?api_key=${ENV.scrapingdogApiKey}&type=profile&linkId=${encodeURIComponent(linkedinId)}&premium=true`;

  console.log(`[Scrapingdog] Fetching profile: ${profileUrl}`);
  console.log(`[Scrapingdog] LinkedIn ID: ${linkedinId}`);
  const startTime = Date.now();

  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  });

  const responseTime = Date.now() - startTime;
  console.log(`[Scrapingdog] Response received in ${responseTime}ms (status: ${response.status})`);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    console.error(`[Scrapingdog] API error: ${response.status} ${response.statusText}`);
    console.error(`[Scrapingdog] Error body: ${errorText}`);
    throw new Error(
      `Scrapingdog API request failed (${response.status} ${response.statusText}): ${errorText}`
    );
  }

  const rawData = await response.json();

  // Scrapingdog returns an array with the profile as first element
  const data = Array.isArray(rawData) ? rawData[0] : rawData;

  // Log raw response for debugging
  console.log(`[Scrapingdog] Raw response keys: ${Object.keys(data || {}).join(', ')}`);

  if (!data) {
    throw new Error("Scrapingdog returned empty response");
  }

  return transformScrapingdogResponse(data, profileUrl);
}

/**
 * Fetch LinkedIn company data using Scrapingdog API
 */
export async function fetchLinkedInCompanyScrapingdog(
  companyUrl: string
): Promise<ScrapingdogLinkedInCompany> {
  if (!ENV.scrapingdogApiKey) {
    throw new Error("SCRAPINGDOG_API_KEY is not configured");
  }

  const companyId = extractCompanyId(companyUrl);
  const apiUrl = `https://api.scrapingdog.com/linkedin?api_key=${ENV.scrapingdogApiKey}&type=company&linkId=${encodeURIComponent(companyId)}&premium=true`;

  console.log(`[Scrapingdog] Fetching company: ${companyUrl}`);
  console.log(`[Scrapingdog] Company ID: ${companyId}`);
  const startTime = Date.now();

  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  });

  const responseTime = Date.now() - startTime;
  console.log(`[Scrapingdog] Company response received in ${responseTime}ms (status: ${response.status})`);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Scrapingdog API request failed (${response.status} ${response.statusText}): ${errorText}`
    );
  }

  const data = await response.json();
  return transformScrapingdogCompanyResponse(data);
}

/**
 * Transform Scrapingdog API response to our internal format
 *
 * Note: Scrapingdog response format may differ from Bright Data.
 * This transform normalizes the response to match our interface.
 */
function transformScrapingdogResponse(data: any, inputUrl: string): ScrapingdogLinkedInProfile {
  console.log('[Scrapingdog] ========== RAW API RESPONSE DIAGNOSTIC ==========');
  console.log('[Scrapingdog] Timestamp:', new Date().toISOString());
  console.log('[Scrapingdog] Top-level keys:', Object.keys(data).join(', '));

  // Log sample values - using actual Scrapingdog field names
  console.log('[Scrapingdog] Sample values:');
  console.log('  - fullName:', data.fullName);
  console.log('  - headline:', data.headline);
  console.log('  - location:', data.location);
  console.log('  - about:', data.about ? String(data.about).substring(0, 100) + '...' : 'NULL');
  console.log('  - experience count:', Array.isArray(data.experience) ? data.experience.length : 0);

  // Experience transform - Scrapingdog uses: position, company_name, company_image, starts_at, ends_at
  const experience = (data.experience || []).map((exp: any) => ({
    title: exp.position || exp.title,
    company: exp.company_name || exp.company || exp.organization,
    companyId: exp.company_id,
    startDate: exp.starts_at || exp.start_date,
    endDate: exp.ends_at || exp.end_date || (exp.ends_at === 'Present' ? null : exp.ends_at),
    description: exp.summary || exp.description,
    descriptionHtml: exp.description_html,
    url: exp.company_url,
    companyLogoUrl: exp.company_image || exp.company_logo,
  }));

  // Education transform - Scrapingdog uses: college_name, college_degree, college_degree_field, college_image, college_duration
  const education = (data.education || []).map((edu: any) => {
    // Parse duration like "1994 - 1996" or " - "
    let startDate: string | undefined;
    let endDate: string | undefined;
    if (edu.college_duration && edu.college_duration !== ' - ') {
      const parts = edu.college_duration.split(' - ');
      startDate = parts[0]?.trim() || undefined;
      endDate = parts[1]?.trim() || undefined;
    }

    return {
      school: edu.college_name || edu.title || edu.school || edu.school_name || edu.institution,
      degree: edu.college_degree || edu.degree_name || edu.degree,
      field: edu.college_degree_field || edu.field_of_study || edu.field,
      startDate: startDate || edu.starts_at || edu.start_date,
      endDate: endDate || edu.ends_at || edu.end_date,
      description: edu.college_activity || edu.description,
      url: edu.college_url || edu.school_url || edu.url,
      instituteLogoUrl: edu.college_image || edu.school_image || edu.logo_url,
    };
  });

  // Skills - handle both array of strings and array of objects
  let skills: string[] = [];
  if (Array.isArray(data.skills)) {
    skills = data.skills.map((s: any) => typeof s === 'string' ? s : (s.name || s.title || ''));
  }

  // Parse followers/connections - Scrapingdog returns as strings like "11M followers"
  let followers: number | undefined;
  let connections: number | undefined;

  if (typeof data.followers === 'string') {
    const match = data.followers.match(/^([\d.]+)([KMB]?)/i);
    if (match) {
      let num = parseFloat(match[1]);
      const suffix = match[2]?.toUpperCase();
      if (suffix === 'K') num *= 1000;
      else if (suffix === 'M') num *= 1000000;
      else if (suffix === 'B') num *= 1000000000;
      followers = Math.round(num);
    }
  } else if (typeof data.followers === 'number') {
    followers = data.followers;
  }

  if (typeof data.connections === 'string') {
    const match = data.connections.match(/^([\d.]+)([KMB+]?)/i);
    if (match) {
      let num = parseFloat(match[1]);
      const suffix = match[2]?.toUpperCase();
      if (suffix === 'K') num *= 1000;
      else if (suffix === 'M') num *= 1000000;
      connections = Math.round(num);
    }
  } else if (typeof data.connections === 'number') {
    connections = data.connections;
  }

  // Extract current company from experience if not provided directly
  let currentCompanyName = data.current_company_name;
  let currentCompany = data.current_company;
  if (!currentCompanyName && experience.length > 0) {
    // First experience is usually current
    const current = experience[0];
    if (current && (!current.endDate || current.endDate === 'Present')) {
      currentCompanyName = current.company;
      currentCompany = {
        name: current.company,
        companyId: current.companyId,
        title: current.title,
      };
    }
  }

  // Parse location components
  const location = data.location;
  const city = typeof location === 'string' ? location.split(',')[0]?.trim() : undefined;
  const countryCode = data.country_code;

  console.log('[Scrapingdog] ========== TRANSFORMATION RESULTS ==========');
  console.log('[Scrapingdog] Experience count:', experience.length);
  console.log('[Scrapingdog] Education count:', education.length);
  console.log('[Scrapingdog] Skills count:', skills.length);
  console.log('[Scrapingdog] Followers:', followers);
  console.log('[Scrapingdog] Current company:', currentCompanyName);
  console.log('[Scrapingdog] ======================================================');

  return {
    // Identity - Scrapingdog uses fullName, first_name, last_name
    name: data.fullName || data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || '',
    firstName: data.first_name,
    lastName: data.last_name,
    linkedinId: data.public_identifier || data.linkedin_id,
    linkedinNumId: data.linkedin_internal_id || data.linkedin_num_id,

    // Professional
    headline: data.headline,
    position: data.headline,

    // Location
    location,
    city,
    countryCode,

    // Bio
    summary: data.about,
    about: data.about,

    // Experience & Education
    experience,
    education,
    educationDetails: data.educations_details,

    // Skills & Recognition
    skills,
    honorsAndAwards: data.honors_and_awards,

    // Social Proof
    connections,
    followers,

    // Visual Assets - Scrapingdog uses profile_photo, background_cover_image_url
    profilePictureUrl: data.profile_photo || data.avatar,
    avatar: data.profile_photo || data.avatar,
    bannerImage: data.background_cover_image_url || data.banner_image,
    defaultAvatar: data.default_avatar,

    // External Links
    bioLinks: data.bio_links || data.websites,

    // Content & Activity
    posts: data.posts,
    activity: data.activity || data.activities,

    // Network
    peopleAlsoViewed: data.people_also_viewed || data.peopleAlsoViewed || data.similar_profiles,

    // Current Company
    currentCompany,
    currentCompanyName,
    currentCompanyCompanyId: data.current_company_company_id || currentCompany?.companyId,

    // Metadata
    memorializedAccount: data.memorialized_account || data.memorializedAccount,
    url: data.url || data.profile_url,
    inputUrl,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Transform Scrapingdog company response
 */
function transformScrapingdogCompanyResponse(data: any): ScrapingdogLinkedInCompany {
  return {
    name: data.name || data.company_name,
    description: data.description || data.about,
    website: data.website || data.company_website,
    industry: data.industry,
    companySize: data.company_size || data.size,
    headquarters: data.headquarters || data.location,
    founded: data.founded || data.founded_year,
    specialties: data.specialties || data.specialities,
    logoUrl: data.logo || data.logo_url || data.image,
    linkedinUrl: data.linkedin_url || data.url,
    employeeCount: data.employee_count || data.employees,
  };
}
