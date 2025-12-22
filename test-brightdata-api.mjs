/**
 * Diagnostic Test for Bright Data API
 * Tests the raw API response to understand data structure for transformation debugging
 */

import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.BRIGHTDATA_API_KEY;
const DATASET_ID = 'gd_l1viktl72bvl7bjuj0'; // LinkedIn profiles dataset

console.log('\n🔍 Bright Data API Diagnostic Test\n');
console.log(`API Key: ${API_KEY ? API_KEY.substring(0, 8) + '...' : 'NOT SET'}`);

// Test profile URLs - use a variety to see different data structures
const testProfiles = [
  'https://www.linkedin.com/in/satyanadella',
  'https://www.linkedin.com/in/jeffweiner08',
];

console.log(`Testing with ${testProfiles.length} LinkedIn profiles...\n`);

for (let i = 0; i < testProfiles.length; i++) {
  const profileUrl = testProfiles[i];
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST ${i + 1}/${testProfiles.length}: ${profileUrl}`);
  console.log('='.repeat(80));

  const apiUrl = `https://api.brightdata.com/datasets/v3/scrape?dataset_id=${DATASET_ID}&format=json`;

  try {
    console.log(`\n📤 Sending request to: ${apiUrl}`);
    const startTime = Date.now();

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify([{ url: profileUrl }])
    });

    const responseTime = Date.now() - startTime;
    console.log(`\n📥 Response: ${response.status} ${response.statusText} (${responseTime}ms)`);

    const responseText = await response.text();

    if (response.ok) {
      console.log('✅ SUCCESS!');

      try {
        const data = JSON.parse(responseText);

        // === RESPONSE STRUCTURE ANALYSIS ===
        console.log('\n' + '='.repeat(80));
        console.log('RESPONSE STRUCTURE ANALYSIS');
        console.log('='.repeat(80));

        if (Array.isArray(data) && data.length > 0) {
          const firstItem = data[0];

          console.log('\n📊 Top-level structure:');
          console.log(`  - Array length: ${data.length}`);
          console.log(`  - First item keys: ${Object.keys(firstItem).join(', ')}`);

          console.log('\n📋 Field analysis:');
          for (const [key, value] of Object.entries(firstItem)) {
            const valueType = Array.isArray(value) ? `Array[${value.length}]` : typeof value;
            console.log(`  • ${key}: ${valueType}`);

            // Show sample of array items
            if (Array.isArray(value) && value.length > 0) {
              console.log(`    → Sample item keys: ${Object.keys(value[0]).join(', ')}`);
              console.log(`    → First item: ${JSON.stringify(value[0], null, 2).substring(0, 200)}...`);
            }
          }

          console.log('\n🔍 Critical fields for enrichment:');
          console.log(`  - Name: ${firstItem.name || 'MISSING'}`);
          console.log(`  - Headline: ${firstItem.headline || firstItem.position || 'MISSING'}`);
          console.log(`  - Experience: ${Array.isArray(firstItem.experience) ? `Array[${firstItem.experience.length}]` : 'MISSING/INVALID'}`);
          console.log(`  - Education: ${Array.isArray(firstItem.education) ? `Array[${firstItem.education.length}]` : 'MISSING/INVALID'}`);
          console.log(`  - Skills: ${Array.isArray(firstItem.skills) ? `Array[${firstItem.skills.length}]` : 'MISSING/INVALID'}`);

          // Show detailed experience structure
          if (firstItem.experience && Array.isArray(firstItem.experience) && firstItem.experience.length > 0) {
            console.log('\n💼 Experience structure (first entry):');
            console.log(JSON.stringify(firstItem.experience[0], null, 2));
          }

          // Show detailed education structure
          if (firstItem.education && Array.isArray(firstItem.education) && firstItem.education.length > 0) {
            console.log('\n🎓 Education structure (first entry):');
            console.log(JSON.stringify(firstItem.education[0], null, 2));
          }

          // Show skills structure
          if (firstItem.skills && Array.isArray(firstItem.skills)) {
            console.log('\n🛠  Skills structure (first 5):');
            console.log(JSON.stringify(firstItem.skills.slice(0, 5), null, 2));
          }

          console.log('\n📄 Full response (first 3000 chars):');
          console.log(JSON.stringify(data[0], null, 2).substring(0, 3000));

        } else {
          console.log('⚠️  Unexpected response structure (not an array or empty)');
          console.log('Full response:', JSON.stringify(data, null, 2).substring(0, 1000));
        }

      } catch (e) {
        console.log('❌ Response is not valid JSON');
        console.log('Response text:', responseText.substring(0, 500));
      }

    } else {
      console.log('❌ FAILED');
      console.log('Response:', responseText.substring(0, 500));
    }

  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    console.error(error);
  }

  // Wait between requests to avoid rate limiting
  if (i < testProfiles.length - 1) {
    console.log('\n⏳ Waiting 3 seconds before next request...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

console.log('\n' + '='.repeat(80));
console.log('📝 NEXT STEPS:');
console.log('='.repeat(80));
console.log('1. Review the field structures above');
console.log('2. Compare with transformBrightDataResponse() in server/_core/brightdata.ts');
console.log('3. Update field mappings based on actual API response');
console.log('4. Test with real LinkedIn imports via UI to verify server logs');
console.log('\n');
