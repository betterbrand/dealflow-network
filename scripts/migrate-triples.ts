/**
 * Migration Script: Populate rdfTriples table from existing contact data
 *
 * This script is idempotent - it skips contacts that already have triples.
 * Run with: npx tsx scripts/migrate-triples.ts
 */

import "dotenv/config";

async function migrate() {
  console.log("=== RDF Triples Migration ===\n");

  const { getDb } = await import("../server/db");
  const { contacts, rdfTriples } = await import("../drizzle/schema");
  const { isNotNull, or, eq } = await import("drizzle-orm");
  const { transformLinkedInToSemanticGraph } = await import(
    "../server/_core/semantic-transformer"
  );
  const { saveContactTriples, getContactTriples } = await import(
    "../server/_core/triple-store"
  );

  const db = await getDb();
  if (!db) {
    console.error("ERROR: Database not available");
    process.exit(1);
  }

  // Get all contacts with LinkedIn data
  const contactsWithData = await db
    .select()
    .from(contacts)
    .where(
      or(
        isNotNull(contacts.experience),
        isNotNull(contacts.education),
        isNotNull(contacts.linkedinUrl)
      )
    );

  console.log(`Found ${contactsWithData.length} contacts with LinkedIn data\n`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const contact of contactsWithData) {
    try {
      // Check if already migrated (idempotent)
      const existing = await getContactTriples(contact.id);
      if (existing.length > 0) {
        skipped++;
        continue;
      }

      // Skip contacts without meaningful data
      if (!contact.linkedinUrl && !contact.experience && !contact.education) {
        skipped++;
        continue;
      }

      // Reconstruct profile from stored data
      const profile = {
        name: contact.name || "",
        firstName: contact.firstName || undefined,
        lastName: contact.lastName || undefined,
        headline: contact.role || undefined,
        position: contact.role || undefined,
        location: contact.location || undefined,
        city: contact.city || undefined,
        countryCode: contact.countryCode || undefined,
        summary: contact.summary || undefined,
        profilePictureUrl: contact.profilePictureUrl || undefined,
        bannerImage: contact.bannerImageUrl || undefined,
        followers: contact.followers || undefined,
        connections: contact.connections || undefined,
        linkedinId: contact.linkedinId || undefined,
        linkedinNumId: contact.linkedinNumId || undefined,
        experience: contact.experience ? JSON.parse(contact.experience) : [],
        education: contact.education ? JSON.parse(contact.education) : [],
        skills: contact.skills ? JSON.parse(contact.skills) : [],
        bioLinks: contact.bioLinks ? JSON.parse(contact.bioLinks) : undefined,
        peopleAlsoViewed: contact.peopleAlsoViewed
          ? JSON.parse(contact.peopleAlsoViewed)
          : undefined,
      };

      // Transform to semantic graph
      const semanticGraph = transformLinkedInToSemanticGraph(
        profile,
        contact.linkedinUrl || `internal:contact-${contact.id}`,
        {
          source: "LinkedIn",
          timestamp: contact.updatedAt || new Date(),
        }
      );

      // Save to database
      const tripleCount = await saveContactTriples(contact.id, semanticGraph);
      migrated++;

      console.log(
        `[${migrated}] Contact ${contact.id} (${contact.name}): ${tripleCount} triples`
      );
    } catch (error) {
      console.error(`FAILED: Contact ${contact.id} (${contact.name}):`, error);
      failed++;
    }
  }

  console.log("\n=== Migration Complete ===");
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Skipped:  ${skipped} (already migrated or no data)`);
  console.log(`  Failed:   ${failed}`);

  // Get final count
  const allTriples = await db.select().from(rdfTriples);
  console.log(`\n  Total triples in database: ${allTriples.length}`);

  process.exit(failed > 0 ? 1 : 0);
}

migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
