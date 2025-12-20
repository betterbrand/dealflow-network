/**
 * Test synchronous vs asynchronous Bright Data API performance
 * Run with: npx tsx test-sync-speed.ts
 */

import "dotenv/config";
import { fetchLinkedInProfile } from "./server/_core/brightdata";

const SATYA_LINKEDIN = "https://www.linkedin.com/in/satya-nadella-3145136/";

async function testSyncSpeed() {
  console.log("\n=== Testing Bright Data API Performance ===\n");

  // Test 1: Synchronous mode (new default)
  console.log("🚀 Test 1: SYNCHRONOUS mode (new default)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const syncStart = Date.now();

  try {
    const syncProfile = await fetchLinkedInProfile(SATYA_LINKEDIN);
    const syncTime = Date.now() - syncStart;

    console.log(`\n✅ Synchronous import completed!`);
    console.log(`⏱️  Time: ${(syncTime / 1000).toFixed(2)} seconds`);
    console.log(`👤 Name: ${syncProfile.name}`);
    console.log(`💼 Headline: ${syncProfile.headline}`);
    console.log(`🏢 Experience entries: ${syncProfile.experience?.length || 0}`);
    console.log(`🎓 Education entries: ${syncProfile.education?.length || 0}`);

    // Test 2: Asynchronous mode (old method) - Optional
    console.log("\n\n🔄 Test 2: ASYNCHRONOUS mode (legacy, for comparison)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("⚠️  This will take 30+ seconds due to polling...");

    const asyncStart = Date.now();
    const asyncProfile = await fetchLinkedInProfile(SATYA_LINKEDIN, { useAsync: true });
    const asyncTime = Date.now() - asyncStart;

    console.log(`\n✅ Asynchronous import completed!`);
    console.log(`⏱️  Time: ${(asyncTime / 1000).toFixed(2)} seconds`);
    console.log(`👤 Name: ${asyncProfile.name}`);

    // Performance comparison
    console.log("\n\n📊 Performance Comparison");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Synchronous:  ${(syncTime / 1000).toFixed(2)}s`);
    console.log(`Asynchronous: ${(asyncTime / 1000).toFixed(2)}s`);
    console.log(`Speedup:      ${(asyncTime / syncTime).toFixed(1)}x faster! 🚀`);

  } catch (error) {
    console.error("\n❌ Error:", error instanceof Error ? error.message : error);
  }
}

testSyncSpeed().catch(console.error);
