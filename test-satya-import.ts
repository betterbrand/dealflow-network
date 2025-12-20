import "dotenv/config";

async function testSatyaNadellaImport() {
  const startTime = Date.now();
  console.log('⏱️  Starting import of Satya Nadella profile...');
  console.log('🕐 Start time:', new Date().toLocaleTimeString());

  try {
    // Dynamic import after dotenv is loaded
    const { enrichLinkedInProfile } = await import("./server/enrichment-adapter");

    const linkedinUrl = "https://www.linkedin.com/in/satyanadella/";

    const result = await enrichLinkedInProfile(linkedinUrl);

    const endTime = Date.now();
    const durationSeconds = ((endTime - startTime) / 1000).toFixed(1);

    console.log('\n✅ Import complete!');
    console.log('🕐 End time:', new Date().toLocaleTimeString());
    console.log(`⏱️  Total duration: ${durationSeconds} seconds`);
    console.log('\n📊 Results:');
    console.log('- Name:', result.name);
    console.log('- Headline:', result.headline);
    console.log('- Experience entries:', result.experience?.length || 0);
    console.log('- Education entries:', result.education?.length || 0);
    console.log('- Skills:', result.skills?.length || 0);

    console.log('\n📄 Raw Semantic Graph:');
    console.log(JSON.stringify(result.semanticGraph, null, 2));

    console.log('\n📝 Experience Details:');
    result.experience?.forEach((exp, i) => {
      console.log(`\n${i + 1}. ${exp.company || 'Unknown Company'}`);
      console.log(`   Title: ${exp.title || 'N/A'}`);
      console.log(`   Duration: ${exp.startDate || 'N/A'} - ${exp.endDate || 'Present'}`);
      if (exp.description) console.log(`   Description: ${exp.description.substring(0, 100)}...`);
    });

    console.log('\n🎓 Education Details:');
    result.education?.forEach((edu, i) => {
      console.log(`\n${i + 1}. ${edu.school || 'Unknown School'}`);
      console.log(`   Degree: ${edu.degree || 'N/A'}`);
      console.log(`   Field: ${edu.field || 'N/A'}`);
    });

  } catch (error) {
    const endTime = Date.now();
    const durationSeconds = ((endTime - startTime) / 1000).toFixed(1);
    console.error('\n❌ Import failed after', durationSeconds, 'seconds');
    console.error('Error:', error);
  }
}

testSatyaNadellaImport();
