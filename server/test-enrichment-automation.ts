/**
 * Test script to verify enrichment automation
 * Creates a contact with a LinkedIn URL and verifies enrichment data is populated
 */

import { createContact, getContactById, updateContactEnrichment } from "./db";
import { enrichContactBackground } from "./enrichment";

async function testEnrichmentAutomation() {
  console.log("=== Testing Enrichment Automation ===\n");
  
  try {
    // Test 1: Create a contact with LinkedIn URL
    console.log("1. Creating test contact with LinkedIn URL...");
    const contactId = await createContact({
      name: "Satya Nadella",
      company: "Microsoft",
      role: "CEO",
      linkedinUrl: "https://www.linkedin.com/in/satyanadella",
      createdBy: 1, // Assuming user ID 1 exists
    });
    console.log(`✓ Contact created with ID: ${contactId}\n`);
    
    // Test 2: Trigger enrichment
    console.log("2. Triggering background enrichment...");
    await enrichContactBackground(contactId, [
      { platform: "linkedin", url: "https://www.linkedin.com/in/satyanadella" }
    ]);
    console.log("✓ Enrichment completed\n");
    
    // Test 3: Verify enriched data was saved
    console.log("3. Verifying enriched data...");
    const enrichedContact = await getContactById(contactId);
    
    if (!enrichedContact) {
      throw new Error("Contact not found after enrichment");
    }
    
    console.log("Contact data:");
    console.log(`- Name: ${enrichedContact.name}`);
    console.log(`- Company: ${enrichedContact.company}`);
    console.log(`- Summary: ${enrichedContact.summary?.substring(0, 100)}...`);
    console.log(`- Profile Picture: ${enrichedContact.profilePictureUrl ? '✓ Present' : '✗ Missing'}`);
    
    if (enrichedContact.experience) {
      const exp = JSON.parse(enrichedContact.experience);
      console.log(`- Experience: ${exp.length} entries`);
      if (exp.length > 0) {
        console.log(`  First: ${exp[0].title} at ${exp[0].company}`);
      }
    }
    
    if (enrichedContact.education) {
      const edu = JSON.parse(enrichedContact.education);
      console.log(`- Education: ${edu.length} entries`);
      if (edu.length > 0) {
        console.log(`  First: ${edu[0].school}`);
      }
    }
    
    if (enrichedContact.skills) {
      const skills = JSON.parse(enrichedContact.skills);
      console.log(`- Skills: ${skills.length} skills`);
      console.log(`  Sample: ${skills.slice(0, 5).join(", ")}`);
    }
    
    console.log("\n✅ Enrichment automation test PASSED!");
    
  } catch (error) {
    console.error("\n❌ Enrichment automation test FAILED:");
    console.error(error);
    process.exit(1);
  }
}

testEnrichmentAutomation();
