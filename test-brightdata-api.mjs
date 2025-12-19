/**
 * Diagnostic Test for Bright Data API
 * Tests the raw API response to debug the "Collector not found" error
 */

import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.BRIGHTDATA_API_KEY;

console.log('\n🔍 Bright Data API Diagnostic Test\n');
console.log(`API Key: ${API_KEY ? API_KEY.substring(0, 8) + '...' : 'NOT SET'}\n`);

// Test different endpoint formats
const tests = [
  {
    name: 'Test 1: /datasets/v3/scrape with format parameter',
    url: 'https://api.brightdata.com/datasets/v3/scrape?format=json',
    body: {
      input: [{ url: 'www.linkedin.com/in/satyanadella' }]
    }
  },
  {
    name: 'Test 2: /datasets/v3/scrape without format parameter',
    url: 'https://api.brightdata.com/datasets/v3/scrape',
    body: {
      input: [{ url: 'www.linkedin.com/in/satyanadella' }]
    }
  },
  {
    name: 'Test 3: With custom_output_fields',
    url: 'https://api.brightdata.com/datasets/v3/scrape',
    body: {
      input: [{ url: 'www.linkedin.com/in/satyanadella' }],
      custom_output_fields: 'url|name|headline'
    }
  }
];

for (const test of tests) {
  console.log(`\n${test.name}`);
  console.log(`URL: ${test.url}`);
  console.log(`Body: ${JSON.stringify(test.body, null, 2)}`);

  try {
    const response = await fetch(test.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(test.body)
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    const responseText = await response.text();
    console.log(`Response: ${responseText.substring(0, 500)}`);

    if (response.ok) {
      console.log('✅ SUCCESS!');
      try {
        const data = JSON.parse(responseText);
        console.log('Parsed JSON:', JSON.stringify(data, null, 2).substring(0, 1000));
      } catch (e) {
        console.log('Response is not JSON');
      }
    } else {
      console.log('❌ FAILED');
    }

  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }
}

console.log('\n\n📝 Recommendations:');
console.log('1. Check if LinkedIn scraper is enabled in your Bright Data dashboard');
console.log('2. Verify API key has permissions for /datasets/v3/scrape endpoint');
console.log('3. Check if you need to create a "collector" or "dataset" first in the dashboard');
console.log('4. Try the Bright Data Web Unlocker API as an alternative');
console.log('\n');
