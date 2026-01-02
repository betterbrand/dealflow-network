#!/usr/bin/env node

/**
 * Connection Pool Load Test
 *
 * Tests database connection pool by simulating concurrent requests
 *
 * Usage:
 *   node test-connection-pool.js
 *   PORT=3001 node test-connection-pool.js  # Use custom port
 */

const CONCURRENT_REQUESTS = 20;
const PORT = process.env.PORT || 3000;
const SERVER_URL = `http://localhost:${PORT}`;

async function testHealthEndpoint() {
  const response = await fetch(`${SERVER_URL}/api/trpc/system.health?batch=1&input=%7B%220%22%3A%7B%22timestamp%22%3A${Date.now()}%7D%7D`);
  const data = await response.json();
  return data;
}

async function runLoadTest() {
  console.log(`\n🧪 Testing connection pool with ${CONCURRENT_REQUESTS} concurrent requests...\n`);

  const startTime = Date.now();

  // Create array of promises for concurrent requests
  const requests = Array.from({ length: CONCURRENT_REQUESTS }, (_, i) => {
    return testHealthEndpoint()
      .then(() => {
        console.log(`✓ Request ${i + 1} completed`);
        return { success: true, index: i + 1 };
      })
      .catch((error) => {
        console.error(`✗ Request ${i + 1} failed:`, error.message);
        return { success: false, index: i + 1, error: error.message };
      });
  });

  // Wait for all requests to complete
  const results = await Promise.all(requests);

  const endTime = Date.now();
  const duration = endTime - startTime;

  // Calculate statistics
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const avgTime = duration / CONCURRENT_REQUESTS;

  console.log('\n' + '='.repeat(60));
  console.log('📊 Load Test Results');
  console.log('='.repeat(60));
  console.log(`Total Requests:     ${CONCURRENT_REQUESTS}`);
  console.log(`Successful:         ${successful} (${(successful/CONCURRENT_REQUESTS*100).toFixed(1)}%)`);
  console.log(`Failed:             ${failed} (${(failed/CONCURRENT_REQUESTS*100).toFixed(1)}%)`);
  console.log(`Total Duration:     ${duration}ms`);
  console.log(`Avg Request Time:   ${avgTime.toFixed(2)}ms`);
  console.log(`Requests/Second:    ${(CONCURRENT_REQUESTS / (duration / 1000)).toFixed(2)}`);
  console.log('='.repeat(60));

  // Test health endpoint to get pool metrics
  console.log('\n🔍 Checking pool status...\n');
  const healthData = await testHealthEndpoint();
  const healthResult = healthData[0]?.result?.data;

  if (healthResult?.database) {
    console.log('Database Pool Status:');
    console.log(`  Status:           ${healthResult.database.status}`);
    console.log(`  Connection Limit: ${healthResult.database.connectionLimit || 'N/A'}`);
  }

  console.log('\n✅ Connection pool test completed!\n');

  if (failed > 0) {
    console.error(`⚠️  Warning: ${failed} requests failed. Check server logs for details.`);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await fetch(SERVER_URL);
    return true;
  } catch (error) {
    console.error(`❌ Server not running at ${SERVER_URL}`);
    console.error('   Please start the server with: npm run dev');
    process.exit(1);
  }
}

// Main execution
checkServer().then(runLoadTest).catch(console.error);
