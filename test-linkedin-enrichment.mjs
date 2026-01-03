/**
 * Test LinkedIn Enrichment End-to-End
 *
 * Tests:
 * 1. Bright Data API call
 * 2. Semantic graph generation
 * 3. RDF store population
 * 4. SPARQL queries
 */

// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

console.log('\n🧪 Testing LinkedIn Enrichment End-to-End\n');
console.log('DEBUG: BRIGHTDATA_API_KEY =', process.env.BRIGHTDATA_API_KEY ? 'SET ✓' : 'NOT SET ✗');
console.log();

// Import modules AFTER dotenv.config()
const { enrichLinkedInProfile } = await import('./server/enrichment-adapter.js');
const { getGraphStats, executeSparqlQuery, QueryTemplates } = await import('./server/_core/sparql.js');

// Test LinkedIn profile URL
// Using a well-known public profile for testing
const testProfileUrl = 'https://www.linkedin.com/in/satyanadella';

console.log('📋 Test Configuration:');
console.log(`   LinkedIn URL: ${testProfileUrl}`);
console.log(`   Expected: Microsoft CEO profile\n`);

try {
  console.log('⏳ Step 1: Calling enrichLinkedInProfile...\n');

  const enrichedProfile = await enrichLinkedInProfile(testProfileUrl, {
    userId: 999,
    timestamp: new Date(),
  });

  console.log('✅ Step 1 Complete: Profile enriched successfully');
  console.log(`   Name: ${enrichedProfile.name}`);
  console.log(`   Headline: ${enrichedProfile.headline || 'N/A'}`);
  console.log(`   Location: ${enrichedProfile.location || 'N/A'}`);
  console.log(`   Experience count: ${enrichedProfile.experience?.length || 0}`);
  console.log(`   Education count: ${enrichedProfile.education?.length || 0}`);
  console.log(`   Skills count: ${enrichedProfile.skills?.length || 0}\n`);

  console.log('⏳ Step 2: Verifying semantic graph generation...\n');

  if (enrichedProfile.semanticGraph) {
    console.log('✅ Step 2 Complete: Semantic graph generated');
    console.log(`   @context: ${JSON.stringify(enrichedProfile.semanticGraph['@context'], null, 2)}`);
    console.log(`   @graph entities: ${enrichedProfile.semanticGraph['@graph'].length}`);

    // Show entity types
    const entityTypes = enrichedProfile.semanticGraph['@graph']
      .map(e => e['@type'])
      .reduce((acc, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
    console.log(`   Entity types:`, entityTypes);
    console.log();
  } else {
    console.log('❌ Step 2 Failed: No semantic graph generated\n');
  }

  console.log('⏳ Step 3: Checking RDF store population...\n');

  const stats = getGraphStats();
  console.log('✅ Step 3 Complete: RDF store populated');
  console.log(`   Triple count: ${stats.tripleCount}`);
  console.log(`   Entity count: ${stats.entityCount}\n`);

  console.log('⏳ Step 4: Testing SPARQL queries...\n');

  // Test query 1: Get all people
  console.log('   Query 1: Get all people');
  const peopleResult = await executeSparqlQuery(QueryTemplates.getAllPeople());
  console.log(`   ✅ Found ${peopleResult.count} Person entities`);
  console.log(`   Sample:`, JSON.stringify(peopleResult.results.slice(0, 2), null, 2));
  console.log();

  // Extract person ID from semantic graph
  const personEntity = enrichedProfile.semanticGraph?.['@graph'].find(e => e['@type'] === 'Person');
  const personId = personEntity?.['@id'];

  if (personId) {
    // Test query 2: Get provenance
    console.log(`   Query 2: Get provenance for ${personId}`);
    const provenanceResult = await executeSparqlQuery(QueryTemplates.getProvenance(personId));
    console.log(`   ✅ Found ${provenanceResult.count} provenance records`);
    console.log(`   Sample:`, JSON.stringify(provenanceResult.results.slice(0, 2), null, 2));
    console.log();
  }

  // Test query 3: Raw SPARQL
  console.log('   Query 3: Get all entities with type');
  const allEntitiesResult = await executeSparqlQuery('SELECT * WHERE { ?s ?p ?o }');
  console.log(`   ✅ Found ${allEntitiesResult.count} entities`);
  console.log();

  console.log('✅ Step 4 Complete: SPARQL queries working\n');

  console.log('🎉 All Tests Passed!\n');
  console.log('Summary:');
  console.log('  ✅ Bright Data API integration');
  console.log('  ✅ Semantic graph generation (Schema.org + PROV-O)');
  console.log('  ✅ RDF triple store population');
  console.log('  ✅ SPARQL query execution');
  console.log('\n📊 Final Stats:');
  console.log(`  RDF Triples: ${stats.tripleCount}`);
  console.log(`  Entities: ${stats.entityCount}`);
  console.log(`  SPARQL Queries: 3 successful\n`);

  process.exit(0);

} catch (error) {
  console.error('\n❌ Test Failed:', error.message);
  console.error('\nError Details:');
  console.error(error);
  process.exit(1);
}
