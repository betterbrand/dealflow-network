/**
 * Test script for enrichment adapter
 * 
 * This tests the Manus LinkedIn API integration to ensure
 * the enrichment adapter is working correctly.
 */

import { enrichLinkedInProfile } from "./enrichment-adapter";

async function testEnrichment() {
  console.log("=== Testing Enrichment Adapter ===\n");
  
  // Test with a well-known LinkedIn profile
  const testUrl = "https://www.linkedin.com/in/williamhgates/";
  
  console.log(`Testing with profile: ${testUrl}\n`);
  
  try {
    const result = await enrichLinkedInProfile(testUrl);
    
    console.log("✅ Enrichment successful!\n");
    console.log("Profile data:");
    console.log(`  Name: ${result.name}`);
    console.log(`  Headline: ${result.headline}`);
    console.log(`  Location: ${result.location}`);
    console.log(`  Summary: ${result.summary?.substring(0, 100)}...`);
    console.log(`  Experience entries: ${result.experience?.length || 0}`);
    console.log(`  Education entries: ${result.education?.length || 0}`);
    console.log(`  Skills: ${result.skills?.length || 0}`);
    console.log(`  Connections: ${result.connections}`);
    console.log(`  Profile picture: ${result.profilePictureUrl ? "Yes" : "No"}`);
    console.log(`  Semantic graph: ${result.semanticGraph ? "Yes" : "No (TODO)"}`);
    
    console.log("\n✅ Test passed!");
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Enrichment failed!");
    console.error(error);
    process.exit(1);
  }
}

testEnrichment();
