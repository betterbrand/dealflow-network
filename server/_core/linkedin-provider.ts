/**
 * LinkedIn data provider abstraction layer
 *
 * Provides a unified interface for fetching LinkedIn data from different providers.
 * Currently supports: Bright Data and Scrapingdog
 */

import { ENV } from "./env";
import { fetchLinkedInProfile as fetchFromBrightdata, type BrightDataLinkedInProfile } from "./brightdata";
import { fetchLinkedInProfileScrapingdog, fetchLinkedInCompanyScrapingdog, type ScrapingdogLinkedInProfile, type ScrapingdogLinkedInCompany } from "./scrapingdog";

export type LinkedInProvider = 'brightdata' | 'scrapingdog';

export interface ProviderInfo {
  id: LinkedInProvider;
  name: string;
  speed: 'fast' | 'slow';
  available: boolean;
}

/**
 * Unified LinkedIn profile interface
 * This is the common interface that both providers return
 */
export interface LinkedInProfile {
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

  // Provider info
  _provider?: LinkedInProvider;
}

export interface LinkedInCompany {
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
  _provider?: LinkedInProvider;
}

/**
 * Get list of available providers based on configured API keys
 */
export function getAvailableProviders(): ProviderInfo[] {
  const providers: ProviderInfo[] = [];

  if (ENV.scrapingdogApiKey) {
    providers.push({
      id: 'scrapingdog',
      name: 'Scrapingdog',
      speed: 'fast',
      available: true,
    });
  }

  if (ENV.brightDataApiKey) {
    providers.push({
      id: 'brightdata',
      name: 'Bright Data',
      speed: 'slow',
      available: true,
    });
  }

  return providers;
}

/**
 * Get the default provider (prefer faster provider)
 */
export function getDefaultProvider(): LinkedInProvider | null {
  const available = getAvailableProviders();
  if (available.length === 0) return null;

  // Prefer Scrapingdog (faster) if available
  const scrapingdog = available.find(p => p.id === 'scrapingdog');
  if (scrapingdog) return 'scrapingdog';

  return available[0].id;
}

/**
 * Check if a specific provider is available
 */
export function isProviderAvailable(provider: LinkedInProvider): boolean {
  if (provider === 'brightdata') {
    return !!ENV.brightDataApiKey;
  }
  if (provider === 'scrapingdog') {
    return !!ENV.scrapingdogApiKey;
  }
  return false;
}

/**
 * Fetch LinkedIn profile using specified provider
 *
 * @param linkedinUrl - LinkedIn profile URL
 * @param provider - Provider to use ('brightdata' or 'scrapingdog')
 * @returns Unified LinkedInProfile
 */
export async function fetchLinkedInProfile(
  linkedinUrl: string,
  provider: LinkedInProvider
): Promise<LinkedInProfile> {
  console.log(`[LinkedIn Provider] Fetching profile using ${provider}: ${linkedinUrl}`);

  if (!isProviderAvailable(provider)) {
    throw new Error(`Provider "${provider}" is not configured. Check API key.`);
  }

  let profile: LinkedInProfile;

  if (provider === 'scrapingdog') {
    const scrapingdogProfile = await fetchLinkedInProfileScrapingdog(linkedinUrl);
    profile = scrapingdogProfile as LinkedInProfile;
  } else {
    const brightdataProfile = await fetchFromBrightdata(linkedinUrl);
    profile = brightdataProfile as LinkedInProfile;
  }

  // Tag with provider info
  profile._provider = provider;

  console.log(`[LinkedIn Provider] Successfully fetched profile via ${provider}`);
  console.log(`[LinkedIn Provider] Name: ${profile.name}, Company: ${profile.currentCompanyName || profile.experience?.[0]?.company}`);

  return profile;
}

/**
 * Fetch LinkedIn company using specified provider
 * Note: Currently only Scrapingdog supports company fetching
 */
export async function fetchLinkedInCompany(
  companyUrl: string,
  provider: LinkedInProvider = 'scrapingdog'
): Promise<LinkedInCompany> {
  console.log(`[LinkedIn Provider] Fetching company using ${provider}: ${companyUrl}`);

  // Currently only Scrapingdog supports company endpoint
  if (provider !== 'scrapingdog') {
    console.warn(`[LinkedIn Provider] Company fetch not supported by ${provider}, falling back to scrapingdog`);
    if (!isProviderAvailable('scrapingdog')) {
      throw new Error('Company fetching requires Scrapingdog API key');
    }
    provider = 'scrapingdog';
  }

  const company = await fetchLinkedInCompanyScrapingdog(companyUrl);

  return {
    ...company,
    _provider: provider,
  };
}
