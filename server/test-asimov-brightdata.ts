/**
 * Test script to check if ASIMOV Bright Data integration is working.
 * 
 * This test runs weekly via cron to detect when the 500 error is resolved.
 * When this test passes, it's time to switch back to pure ASIMOV implementation.
 * 
 * Usage:
 *   npm test -- test-asimov-brightdata
 * 
 * Or run directly:
 *   tsx server/test-asimov-brightdata.ts
 * 
 * Expected behavior:
 * - CURRENTLY: Should fail with 500 error
 * - WHEN FIXED: Should return valid JSON-LD semantic graph
 * 
 * When this test passes:
 * 1. Set USE_PURE_ASIMOV = true in server/enrichment-adapter.ts
 * 2. Delete enrichment-adapter.ts and use ASIMOV directly
 * 3. Remove this test file
 * 4. Update todo.md to mark technical debt as resolved
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const TEST_LINKEDIN_URL = "https://www.linkedin.com/in/bourgerie/";

async function testASIMOVBrightData(): Promise<boolean> {
  console.log("🧪 Testing ASIMOV Bright Data integration...");
  console.log(`📍 Test URL: ${TEST_LINKEDIN_URL}`);
  
  try {
    // Try to fetch using ASIMOV brightdata importer
    const { stdout, stderr } = await execAsync(
      `$HOME/.cargo/bin/asimov-brightdata-importer "${TEST_LINKEDIN_URL}"`,
      {
        env: {
          ...process.env,
          BRIGHTDATA_API_KEY: process.env.BRIGHTDATA_API_KEY,
        },
        timeout: 30000, // 30 second timeout
      }
    );

    if (stderr && stderr.includes("Error")) {
      console.error("❌ ASIMOV returned an error:");
      console.error(stderr);
      return false;
    }

    // Try to parse the output as JSON
    const semanticGraph = JSON.parse(stdout);
    
    // Validate that it's proper JSON-LD
    if (!semanticGraph["@context"] && !semanticGraph["@graph"]) {
      console.error("❌ Output is not valid JSON-LD (missing @context or @graph)");
      return false;
    }

    console.log("✅ SUCCESS! ASIMOV Bright Data integration is working!");
    console.log("📊 Semantic graph preview:");
    console.log(JSON.stringify(semanticGraph, null, 2).substring(0, 500) + "...");
    console.log("\n🎉 TIME TO SWITCH TO PURE ASIMOV!");
    console.log("👉 Set USE_PURE_ASIMOV = true in server/enrichment-adapter.ts");
    
    return true;
  } catch (error: any) {
    if (error.message?.includes("StatusCode(500)")) {
      console.log("⏳ Still getting 500 error from Bright Data API");
      console.log("   This is expected. Will try again next week.");
    } else {
      console.error("❌ Unexpected error:", error.message);
    }
    return false;
  }
}

// Run the test
testASIMOVBrightData()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("💥 Test crashed:", error);
    process.exit(1);
  });
