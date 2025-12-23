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
  const apiUrl = `https://api.scrapingdog.com/linkedin?api_key=${ENV.scrapingdogApiKey}&type=profile&linkId=${encodeURIComponent(linkedinId)}`;

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

  const data = await response.json();

  // Log raw response for debugging
  console.log(`[Scrapingdog] Raw response keys: ${Object.keys(data).join(', ')}`);

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
  const apiUrl = `https://api.scrapingdog.com/linkedin?api_key=${ENV.scrapingdogApiKey}&type=company&linkId=${encodeURIComponent(companyId)}`;

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

  // Log sample values
  console.log('[Scrapingdog] Sample values:');
  console.log('  - name:', data.name || data.full_name);
  console.log('  - headline:', data.headline || data.title);
  console.log('  - location:', data.location);
  console.log('  - about:', data.about ? String(data.about).substring(0, 100) + '...' : 'NULL');

  // Experience transform - adapt to Scrapingdog's format
  const experience = (data.experience || data.experiences || []).map((exp: any) => ({
    title: exp.title || exp.position,
    company: exp.company || exp.company_name || exp.organization,
    companyId: exp.company_id || exp.companyId,
    startDate: exp.start_date || exp.startDate || exp.from,
    endDate: exp.end_date || exp.endDate || exp.to,
    description: exp.description,
    descriptionHtml: exp.description_html,
    url: exp.company_url || exp.url,
    companyLogoUrl: exp.company_logo || exp.logo_url || exp.companyLogoUrl,
  }));

  // Education transform
  const education = (data.education || data.educations || []).map((edu: any) => ({
    school: edu.school || edu.school_name || edu.institution || edu.title,
    degree: edu.degree || edu.degree_name,
    field: edu.field || edu.field_of_study,
    startDate: edu.start_date || edu.startDate || edu.from || edu.start_year,
    endDate: edu.end_date || edu.endDate || edu.to || edu.end_year,
    description: edu.description,
    url: edu.school_url || edu.url,
    instituteLogoUrl: edu.school_logo || edu.logo_url || edu.instituteLogoUrl,
  }));

  // Skills - handle both array of strings and array of objects
  let skills: string[] = [];
  if (Array.isArray(data.skills)) {
    skills = data.skills.map((s: any) => typeof s === 'string' ? s : (s.name || s.title || ''));
  }

  // Extract current company from experience if not provided directly
  let currentCompanyName = data.current_company_name || data.company;
  let currentCompany = data.current_company;
  if (!currentCompanyName && experience.length > 0) {
    // Find most recent (no end date) experience
    const current = experience.find((e: any) => !e.endDate);
    if (current) {
      currentCompanyName = current.company;
      currentCompany = {
        name: current.company,
        companyId: current.companyId,
        title: current.title,
      };
    }
  }

  // Parse location components
  const location = data.location || data.city;
  const city = data.city || (typeof location === 'string' ? location.split(',')[0]?.trim() : null);
  const countryCode = data.country_code || data.countryCode;

  console.log('[Scrapingdog] ========== TRANSFORMATION RESULTS ==========');
  console.log('[Scrapingdog] Experience count:', experience.length);
  console.log('[Scrapingdog] Education count:', education.length);
  console.log('[Scrapingdog] Skills count:', skills.length);
  console.log('[Scrapingdog] Current company:', currentCompanyName);
  console.log('[Scrapingdog] ======================================================');

  return {
    // Identity
    name: data.name || data.full_name || '',
    firstName: data.first_name || data.firstName,
    lastName: data.last_name || data.lastName,
    linkedinId: data.linkedin_id || data.linkedinId || data.public_id,
    linkedinNumId: data.linkedin_num_id || data.linkedinNumId,

    // Professional
    headline: data.headline || data.title || data.position,
    position: data.position || data.headline,

    // Location
    location,
    city,
    countryCode,

    // Bio
    summary: data.about || data.summary || data.description,
    about: data.about,

    // Experience & Education
    experience,
    education,
    educationDetails: data.education_details || data.educationDetails,

    // Skills & Recognition
    skills,
    honorsAndAwards: data.honors_and_awards || data.honorsAndAwards,

    // Social Proof
    connections: data.connections || data.connections_count,
    followers: data.followers || data.followers_count,

    // Visual Assets
    profilePictureUrl: data.profile_picture || data.avatar || data.profilePictureUrl || data.image,
    avatar: data.avatar || data.profile_picture,
    bannerImage: data.banner_image || data.bannerImage || data.background_image,
    defaultAvatar: data.default_avatar,

    // External Links
    bioLinks: data.bio_links || data.bioLinks || data.websites,

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
