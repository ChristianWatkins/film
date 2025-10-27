import JustWatchAPI from 'justwatch-api-client';

async function testAgainstTheTide() {
  console.log('🎬 Testing different search approaches for "Against the Tide" (2023)...\n');
  
  try {
    const justwatch = new JustWatchAPI(10000);
    console.log('✓ JustWatch client initialized\n');
    
    // Try different search terms and countries
    const searchTerms = [
      'Against the Tide',
      'Against the Tide 2023',
      'Against the Tide documentary'
    ];
    
    const countries = ['US', 'NO', 'GB', 'CA'];
    
    for (const country of countries) {
      console.log(`🌍 Testing country: ${country}`);
      
      for (const term of searchTerms) {
        console.log(`📡 Searching for "${term}" in ${country}...`);
        
        try {
          const searchResults = await justwatch.search(term, country);
          
          if (searchResults && searchResults.length > 0) {
            console.log(`✓ Found ${searchResults.length} results:`);
            
            searchResults.forEach((result, index) => {
              console.log(`  ${index + 1}. "${result.title}" (${result.originalReleaseYear || 'unknown'})`);
              if (result.fullPath) {
                console.log(`     Path: ${result.fullPath}`);
              }
            });
            
            // Look for 2023 match
            const match2023 = searchResults.find(r => r.originalReleaseYear === 2023);
            if (match2023) {
              console.log(`\n🎯 Found 2023 match! "${match2023.title}"`);
              console.log(`   Path: ${match2023.fullPath}`);
              
              if (match2023.fullPath) {
                console.log('\n📡 Getting detailed data...');
                const details = await justwatch.getData(match2023.fullPath, country);
                console.log(`✓ ID: ${details.ID || details.id || 'no ID'}`);
                console.log(`✓ Streams: ${details.Streams ? details.Streams.length : 0}`);
                
                // Save this successful result
                const fs = await import('fs/promises');
                await fs.writeFile(`against-tide-${country}-${term.replace(/\s+/g, '-')}.json`, 
                  JSON.stringify({ searchResults, match: match2023, details }, null, 2));
                console.log(`💾 Results saved!`);
              }
            }
          } else {
            console.log(`❌ No results found`);
          }
          
          console.log('');
          
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.log(`❌ Error searching "${term}" in ${country}: ${error.message}`);
        }
      }
      console.log('---\n');
    }
    
    // Also try to access the movie directly using the path we know exists
    console.log('🎯 Trying direct access to known path...');
    try {
      const details = await justwatch.getData('/us/movie/against-the-tide-2023', 'US');
      console.log(`✓ Direct access successful!`);
      console.log(`✓ Title: ${details.title || 'unknown'}`);
      console.log(`✓ ID: ${details.ID || details.id || 'no ID'}`);
      console.log(`✓ Year: ${details.originalReleaseYear || 'unknown'}`);
      console.log(`✓ Streams: ${details.Streams ? details.Streams.length : 0}`);
      
      const fs = await import('fs/promises');
      await fs.writeFile('against-tide-direct-access.json', JSON.stringify(details, null, 2));
      console.log(`💾 Direct access results saved!`);
      
    } catch (error) {
      console.log(`❌ Direct access failed: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }
}

testAgainstTheTide()
  .then(() => {
    console.log('\n🏁 Complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });