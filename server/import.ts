/**
 * Knowledge Graph Import Service
 * Fetches additional data from LinkedIn and Twitter to import into contact profiles
 *
 * Uses import-adapter.ts to abstract the data source
 * @see import-adapter.ts for implementation details
 */

import {
  importLinkedInProfile,
  importTwitterProfile,
  type ImportedProfile,
  type ImportOptions,
} from "./import-adapter";
import { updateContactImport } from "./db";
import type { LinkedInProvider } from "./_core/linkedin-provider";

// Re-export types for convenience
export type { ImportedProfile, ImportOptions };

/**
 * Import data for a contact by fetching from all available social profiles
 *
 * This function coordinates the import process across multiple platforms
 * and returns a consolidated imported profile.
 */
export async function importContact(
  contactId: number,
  socialProfiles: Array<{ platform: string; url: string }>,
  options: { provider?: LinkedInProvider } = {}
): Promise<ImportedProfile | null> {
  console.log(`[Import] Starting import for contact ${contactId}`);

  let importedData: ImportedProfile | null = null;

  for (const profile of socialProfiles) {
    try {
      let platformData: ImportedProfile;

      if (profile.platform === "linkedin") {
        platformData = await importLinkedInProfile(profile.url, {
          provider: options.provider,
        });
      } else if (profile.platform === "twitter" || profile.platform === "x") {
        platformData = await importTwitterProfile(profile.url);
      } else {
        console.log(`[Import] Unsupported platform: ${profile.platform}`);
        continue;
      }

      // Merge data (prefer first non-empty value)
      if (!importedData) {
        importedData = platformData;
      } else {
        importedData = mergeImportedData(importedData, platformData);
      }

      console.log(`[Import] Successfully imported ${profile.platform} profile for contact ${contactId}`);
    } catch (error) {
      console.error(`[Import] Failed to import ${profile.platform} profile:`, error);
    }
  }

  return importedData;
}

/**
 * @deprecated Use importContact instead
 */
export async function enrichContact(
  contactId: number,
  socialProfiles: Array<{ platform: string; url: string }>
): Promise<ImportedProfile | null> {
  return importContact(contactId, socialProfiles);
}

/**
 * Merge two imported profiles, preferring non-empty values from the first profile
 */
function mergeImportedData(base: ImportedProfile, additional: ImportedProfile): ImportedProfile {
  return {
    name: base.name || additional.name,
    firstName: base.firstName || additional.firstName,
    lastName: base.lastName || additional.lastName,
    headline: base.headline || additional.headline,
    location: base.location || additional.location,
    city: base.city || additional.city,
    countryCode: base.countryCode || additional.countryCode,
    summary: base.summary || additional.summary,
    experience: [...(base.experience || []), ...(additional.experience || [])],
    education: [...(base.education || []), ...(additional.education || [])],
    skills: Array.from(new Set([...(base.skills || []), ...(additional.skills || [])])),
    connections: base.connections || additional.connections,
    followers: base.followers || additional.followers,
    profilePictureUrl: base.profilePictureUrl || additional.profilePictureUrl,
    bannerImage: base.bannerImage || additional.bannerImage,
    bioLinks: [...(base.bioLinks || []), ...(additional.bioLinks || [])],
    posts: [...(base.posts || []), ...(additional.posts || [])],
    activity: [...(base.activity || []), ...(additional.activity || [])],
    peopleAlsoViewed: [...(base.peopleAlsoViewed || []), ...(additional.peopleAlsoViewed || [])],
    semanticGraph: base.semanticGraph || additional.semanticGraph,
    linkedinId: base.linkedinId || additional.linkedinId,
    linkedinNumId: base.linkedinNumId || additional.linkedinNumId,
    educationDetails: base.educationDetails || additional.educationDetails,
    honorsAndAwards: base.honorsAndAwards || additional.honorsAndAwards,
    memorializedAccount: base.memorializedAccount || additional.memorializedAccount,
    _provider: base._provider || additional._provider,
  };
}

/**
 * Background job to import contact data asynchronously
 * This is called after a contact is created with social profile URLs
 */
export async function importContactBackground(
  contactId: number,
  socialProfiles: Array<{ platform: string; url: string }>,
  options: { provider?: LinkedInProvider } = {}
): Promise<void> {
  console.log(`[Import] Starting background import for contact ${contactId}`);

  try {
    const importedData = await importContact(contactId, socialProfiles, options);

    if (!importedData) {
      console.log(`[Import] No data imported for contact ${contactId}`);
      return;
    }

    // Extract company and role from experience or headline
    let company: string | undefined;
    let role: string | undefined;

    // Try to get from first current/recent experience
    if (importedData.experience && importedData.experience.length > 0) {
      const currentJob = importedData.experience[0]; // Most recent is first
      company = currentJob.company;
      role = currentJob.title;
    }

    // Fallback to headline if no experience
    if (!company && !role && importedData.headline) {
      // Try to parse "Title at Company" format
      const match = importedData.headline.match(/^(.+?)\s+at\s+(.+)$/i);
      if (match) {
        role = match[1].trim();
        company = match[2].trim();
      }
    }

    // Update the contact in the database with imported data
    await updateContactImport(contactId, {
      // Core fields
      summary: importedData.summary,
      profilePictureUrl: importedData.profilePictureUrl,
      experience: importedData.experience,
      education: importedData.education,
      skills: importedData.skills,
      company,
      role,
      location: importedData.location,

      // Social Proof
      followers: importedData.followers,
      connections: importedData.connections,

      // Visual Assets
      bannerImageUrl: importedData.bannerImage,

      // Name Parsing
      firstName: importedData.firstName,
      lastName: importedData.lastName,

      // External Links
      bioLinks: importedData.bioLinks,

      // Content & Activity
      posts: importedData.posts,
      activity: importedData.activity,

      // Network
      peopleAlsoViewed: importedData.peopleAlsoViewed,

      // Additional Metadata
      linkedinId: importedData.linkedinId,
      linkedinNumId: importedData.linkedinNumId,
      city: importedData.city,
      countryCode: importedData.countryCode,
      memorializedAccount: importedData.memorializedAccount,
      educationDetails: importedData.educationDetails,
      honorsAndAwards: importedData.honorsAndAwards,
    });

    console.log(`[Import] Import complete for contact ${contactId}`);
    console.log(`[Import] Provider: ${importedData._provider}`);
    console.log(`[Import] Saved: ${importedData.experience?.length || 0} experience, ${importedData.education?.length || 0} education, ${importedData.skills?.length || 0} skills`);
    console.log(`[Import] Social: ${importedData.followers || 0} followers, ${importedData.connections || 0} connections`);
    console.log(`[Import] Content: ${importedData.posts?.length || 0} posts, ${importedData.activity?.length || 0} activity, ${importedData.peopleAlsoViewed?.length || 0} network suggestions`);
  } catch (error) {
    console.error(`[Import] Failed to import contact ${contactId}:`, error);
  }
}

/**
 * @deprecated Use importContactBackground instead
 */
export async function enrichContactBackground(
  contactId: number,
  socialProfiles: Array<{ platform: string; url: string }>
): Promise<void> {
  return importContactBackground(contactId, socialProfiles);
}
