/**
 * Inferred Edges Service
 * Computes and stores inferred connections between contacts based on:
 * 1. peopleAlsoViewed overlap (LinkedIn recommendations)
 * 2. Same company
 * 3. Same school (education)
 * 4. Shared skills (3+ matches)
 */

import { eq, and, or, inArray, ne, sql } from "drizzle-orm";
import { getDb } from "../db";
import { contacts, inferredEdges, InsertInferredEdge } from "../../drizzle/schema";

interface PeopleAlsoViewedEntry {
  name?: string;
  profileLink?: string;
  about?: string;
  location?: string;
}

/**
 * Compute and store inferred edges for a specific contact
 * Called after LinkedIn enrichment completes
 */
export async function computeInferredEdgesForContact(contactId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const contact = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);

  if (!contact[0]) return 0;

  const sourceContact = contact[0];
  let edgesCreated = 0;

  // Delete existing inferred edges for this contact to avoid duplicates
  await db.delete(inferredEdges).where(eq(inferredEdges.fromContactId, contactId));

  // Get all other contacts to compare against
  const otherContacts = await db
    .select()
    .from(contacts)
    .where(ne(contacts.id, contactId));

  const edgesToInsert: InsertInferredEdge[] = [];

  // 1. Check peopleAlsoViewed matches
  if (sourceContact.peopleAlsoViewed) {
    try {
      const peopleAlsoViewed: PeopleAlsoViewedEntry[] = JSON.parse(sourceContact.peopleAlsoViewed);

      for (const viewed of peopleAlsoViewed) {
        if (!viewed.profileLink && !viewed.name) continue;

        // Try to match by LinkedIn URL
        if (viewed.profileLink) {
          const normalizedUrl = normalizeLinkedInUrl(viewed.profileLink);
          const matchedContact = otherContacts.find(c =>
            c.linkedinUrl && normalizeLinkedInUrl(c.linkedinUrl) === normalizedUrl
          );

          if (matchedContact) {
            edgesToInsert.push({
              fromContactId: contactId,
              toContactId: matchedContact.id,
              edgeType: "people_also_viewed",
              strength: 3, // High confidence - URL match
              metadata: JSON.stringify({ matchType: "linkedin_url", viewedProfile: viewed }),
            });
            continue;
          }
        }

        // Fallback: Try to match by name + company (lower confidence)
        if (viewed.name && viewed.about) {
          const companyMatch = extractCompanyFromAbout(viewed.about);
          if (companyMatch) {
            const matchedContact = otherContacts.find(c =>
              c.name?.toLowerCase() === viewed.name?.toLowerCase() &&
              c.company?.toLowerCase().includes(companyMatch.toLowerCase())
            );

            if (matchedContact) {
              edgesToInsert.push({
                fromContactId: contactId,
                toContactId: matchedContact.id,
                edgeType: "people_also_viewed",
                strength: 2, // Medium confidence - name + company match
                metadata: JSON.stringify({ matchType: "name_company", viewedProfile: viewed }),
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn(`[InferredEdges] Failed to parse peopleAlsoViewed for contact ${contactId}:`, e);
    }
  }

  // 2. Find contacts at same company
  if (sourceContact.company) {
    const sameCompanyContacts = otherContacts.filter(c =>
      c.company && normalizeCompany(c.company) === normalizeCompany(sourceContact.company!)
    );

    for (const match of sameCompanyContacts) {
      // Check if we already have an edge to this contact
      const existingEdge = edgesToInsert.find(e => e.toContactId === match.id);
      if (!existingEdge) {
        edgesToInsert.push({
          fromContactId: contactId,
          toContactId: match.id,
          edgeType: "same_company",
          strength: 2,
          metadata: JSON.stringify({ company: sourceContact.company }),
        });
      }
    }
  }

  // 3. Find contacts with same school
  if (sourceContact.education) {
    try {
      const sourceEducation = JSON.parse(sourceContact.education);
      const sourceSchools = extractSchools(sourceEducation);

      if (sourceSchools.length > 0) {
        for (const otherContact of otherContacts) {
          if (!otherContact.education) continue;

          try {
            const otherEducation = JSON.parse(otherContact.education);
            const otherSchools = extractSchools(otherEducation);

            const sharedSchools = sourceSchools.filter(s =>
              otherSchools.some(os => normalizeSchool(os) === normalizeSchool(s))
            );

            if (sharedSchools.length > 0) {
              const existingEdge = edgesToInsert.find(e => e.toContactId === otherContact.id);
              if (!existingEdge) {
                edgesToInsert.push({
                  fromContactId: contactId,
                  toContactId: otherContact.id,
                  edgeType: "same_school",
                  strength: sharedSchools.length,
                  metadata: JSON.stringify({ schools: sharedSchools }),
                });
              }
            }
          } catch (e) {
            // Skip contacts with invalid education JSON
          }
        }
      }
    } catch (e) {
      console.warn(`[InferredEdges] Failed to parse education for contact ${contactId}:`, e);
    }
  }

  // 4. Find contacts with shared skills (3+ matches)
  if (sourceContact.skills) {
    try {
      const sourceSkills: string[] = JSON.parse(sourceContact.skills);
      const normalizedSourceSkills = sourceSkills.map(s => s.toLowerCase().trim());

      if (normalizedSourceSkills.length >= 3) {
        for (const otherContact of otherContacts) {
          if (!otherContact.skills) continue;

          try {
            const otherSkills: string[] = JSON.parse(otherContact.skills);
            const normalizedOtherSkills = otherSkills.map(s => s.toLowerCase().trim());

            const sharedSkills = normalizedSourceSkills.filter(s =>
              normalizedOtherSkills.includes(s)
            );

            if (sharedSkills.length >= 3) {
              const existingEdge = edgesToInsert.find(e => e.toContactId === otherContact.id);
              if (!existingEdge) {
                edgesToInsert.push({
                  fromContactId: contactId,
                  toContactId: otherContact.id,
                  edgeType: "shared_skills",
                  strength: sharedSkills.length,
                  metadata: JSON.stringify({ skills: sharedSkills }),
                });
              }
            }
          } catch (e) {
            // Skip contacts with invalid skills JSON
          }
        }
      }
    } catch (e) {
      console.warn(`[InferredEdges] Failed to parse skills for contact ${contactId}:`, e);
    }
  }

  // Insert all edges in batch
  if (edgesToInsert.length > 0) {
    try {
      await db.insert(inferredEdges).values(edgesToInsert);
      edgesCreated = edgesToInsert.length;
      console.log(`[InferredEdges] Created ${edgesCreated} inferred edges for contact ${contactId}`);
    } catch (e) {
      console.error(`[InferredEdges] Failed to insert edges for contact ${contactId}:`, e);
    }
  }

  return edgesCreated;
}

/**
 * Compute inferred edges for all contacts in the database
 * Useful for initial population or refresh
 */
export async function computeAllInferredEdges(): Promise<{ processed: number; edgesCreated: number }> {
  const db = await getDb();
  if (!db) return { processed: 0, edgesCreated: 0 };

  const allContacts = await db.select({ id: contacts.id }).from(contacts);

  let totalEdges = 0;
  for (const contact of allContacts) {
    const edges = await computeInferredEdgesForContact(contact.id);
    totalEdges += edges;
  }

  return { processed: allContacts.length, edgesCreated: totalEdges };
}

/**
 * Get all inferred edges for a set of contact IDs
 */
export async function getInferredEdgesForContacts(contactIds: number[]): Promise<{
  fromContactId: number;
  toContactId: number;
  edgeType: string;
  strength: number | null;
}[]> {
  const db = await getDb();
  if (!db || contactIds.length === 0) return [];

  const edges = await db
    .select({
      fromContactId: inferredEdges.fromContactId,
      toContactId: inferredEdges.toContactId,
      edgeType: inferredEdges.edgeType,
      strength: inferredEdges.strength,
    })
    .from(inferredEdges)
    .where(
      or(
        inArray(inferredEdges.fromContactId, contactIds),
        inArray(inferredEdges.toContactId, contactIds)
      )
    );

  return edges;
}

// Helper functions

function normalizeLinkedInUrl(url: string): string {
  // Extract the profile ID from various LinkedIn URL formats
  const match = url.match(/linkedin\.com\/in\/([^/?]+)/i);
  return match ? match[1].toLowerCase() : url.toLowerCase();
}

function normalizeCompany(company: string): string {
  // Normalize company names for comparison
  return company
    .toLowerCase()
    .replace(/\s+(inc|llc|ltd|corp|corporation|co|company|group|holdings)\.?$/i, "")
    .replace(/[^\w\s]/g, "")
    .trim();
}

function normalizeSchool(school: string): string {
  return school
    .toLowerCase()
    .replace(/university|college|school|institute|of|the/gi, "")
    .replace(/[^\w\s]/g, "")
    .trim();
}

function extractCompanyFromAbout(about: string): string | null {
  // Try to extract company from "Role at Company" format
  const match = about.match(/(?:at|@)\s+(.+?)(?:\s*[|•·-]|\s*$)/i);
  return match ? match[1].trim() : null;
}

function extractSchools(education: any[]): string[] {
  if (!Array.isArray(education)) return [];

  return education
    .map(e => e.school || e.schoolName || e.institution || "")
    .filter(s => s.length > 0);
}
