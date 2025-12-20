/**
 * Auto-create companies from contact data
 *
 * When a contact is imported from LinkedIn or manually created with company information,
 * this module automatically creates the company entity if it doesn't exist and links it to the contact.
 */

import { getCompanyByName, createCompany } from "./db";
import type { InsertCompany } from "../drizzle/schema";

export interface ContactCompanyData {
  company?: string | null;
  experience?: Array<{
    company: string;
    title?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
}

/**
 * Get or create a company from contact data
 *
 * Looks up company by name. If it doesn't exist, creates it.
 * Returns the companyId to link to the contact.
 *
 * @param contactData - Contact data with company information
 * @returns Company ID or null if no company data available
 */
export async function getOrCreateCompanyForContact(
  contactData: ContactCompanyData
): Promise<number | null> {
  // Extract current company name
  let companyName: string | null = null;

  // First try the direct company field
  if (contactData.company && contactData.company.trim()) {
    companyName = contactData.company.trim();
  }
  // Fallback to most recent experience if no direct company field
  else if (contactData.experience && contactData.experience.length > 0) {
    // Find first experience entry without an end date (current job)
    const currentJob = contactData.experience.find(exp => !exp.endDate);
    if (currentJob?.company) {
      companyName = currentJob.company.trim();
    } else {
      // If no current job, use the first experience entry
      companyName = contactData.experience[0]?.company?.trim() || null;
    }
  }

  if (!companyName) {
    console.log('[AutoCreateCompany] No company name found in contact data');
    return null;
  }

  console.log('[AutoCreateCompany] Processing company:', companyName);

  // Check if company already exists
  const existingCompany = await getCompanyByName(companyName);
  if (existingCompany) {
    console.log('[AutoCreateCompany] Company already exists:', existingCompany.id);
    return existingCompany.id;
  }

  // Create new company
  console.log('[AutoCreateCompany] Creating new company:', companyName);
  const newCompanyData: InsertCompany = {
    name: companyName,
    // Additional fields could be populated from LinkedIn enrichment data
    // For now, just create with the name
  };

  const companyId = await createCompany(newCompanyData);
  console.log('[AutoCreateCompany] Created company with ID:', companyId);

  return companyId;
}

/**
 * Extract company details from LinkedIn experience data
 * This can be used to populate additional company fields in the future
 */
export function extractCompanyDetailsFromExperience(
  companyName: string,
  experience: Array<{
    company: string;
    title?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>
): Partial<InsertCompany> {
  // Find all experience entries for this company
  const companyExperiences = experience.filter(
    exp => exp.company.toLowerCase() === companyName.toLowerCase()
  );

  if (companyExperiences.length === 0) {
    return { name: companyName };
  }

  // Extract description from experience (could contain company info)
  const descriptions = companyExperiences
    .map(exp => exp.description)
    .filter(Boolean);

  return {
    name: companyName,
    description: descriptions.length > 0 ? descriptions[0] : undefined,
  };
}
