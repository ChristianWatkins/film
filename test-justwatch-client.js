import JustWatchAPI from 'justwatch-api-client';

const COUNTRY = 'US'; // Try US for Against the Tide since it wasn't found in Norway

async function testJustWatchAPI() {
  console.log('🎬 Testing JustWatch API client for "Against the Tide"...\n');
  
  try {
    // Initialize JustWatch client
    const justwatch = new JustWatchAPI(10000); // 10 second timeout
    console.log('✓ JustWatch client initialized\n');
    
    // Test 1: Search for "Against the Tide"
    console.log('📡 Searching for "Against the Tide"...');
    const searchResults = await justwatch.search('Against the Tide', COUNTRY);
    
    if (!searchResults || searchResults.length === 0) {
      console.log('❌ No search results found');
      return;
    }
    
    console.log(`✓ Found ${searchResults.length} search results:`);
    searchResults.forEach((result, index) => {
      console.log(`  ${index + 1}. "${result.title}" (${result.originalReleaseYear || 'unknown year'})`);
      console.log(`     ID: ${result.id || 'no id'}`);
      console.log(`     Full Path: ${result.fullPath || 'no path'}`);
      console.log(`     Poster: ${result.posterUrl ? 'yes' : 'no'}`);
      console.log('');
    });
    
    // Test 2: Try to find 2023 match
    let match = searchResults.find(result => {
      const resultYear = result.originalReleaseYear;
      return resultYear === 2023;
    });
    
    if (!match && searchResults.length > 0) {
      console.log('⚠️  No exact 2023 match, using first result');
      match = searchResults[0];
    }
    
    if (!match) {
      console.log('❌ No suitable match found');
      return;
    }
    
    console.log(`🎯 Using match: "${match.title}" (${match.originalReleaseYear || 'unknown year'})`);
    console.log(`   Full Path: ${match.fullPath}`);
    
    // Test 3: Get detailed data
    if (match.fullPath) {
      console.log('\n📡 Fetching detailed data...');
      const details = await justwatch.getData(match.fullPath, COUNTRY);
      
      console.log('✓ Detailed data:');
      console.log(`  Title: ${details.title || 'unknown'}`);
      console.log(`  ID: ${details.ID || details.id || 'no ID'}`);
      console.log(`  Year: ${details.originalReleaseYear || 'unknown'}`);
      console.log(`  Streams: ${details.Streams ? details.Streams.length : 0}`);
      console.log(`  URL: https://www.justwatch.com${match.fullPath}`);
      
      if (details.Streams && details.Streams.length > 0) {
        console.log('\n  Available on:');
        details.Streams.forEach(stream => {
          console.log(`    ${stream.Provider} (${stream.Type}) - ${stream.Price || 'free'}`);
        });
      }
      
      // Save the result
      const fs = await import('fs/promises');
      await fs.writeFile('justwatch-test-result.json', JSON.stringify({
        searchResults,
        selectedMatch: match,
        detailedData: details
      }, null, 2));
      console.log('\n💾 Results saved to justwatch-test-result.json');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testJustWatchAPI()
  .then(() => {
    console.log('\n🏁 Test complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });