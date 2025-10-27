import JustWatchAPI from 'justwatch-api-client';

async function testWithTmId() {
  console.log('🎬 Testing JustWatch API with tm-prefixed ID for "Against the Tide"...\n');
  
  try {
    const justwatch = new JustWatchAPI(10000);
    console.log('✓ JustWatch client initialized\n');
    
    const movieId = 'tm1289964'; // The ID we extracted from the webpage
    console.log(`🎯 Testing with ID: ${movieId}\n`);
    
    // Try different approaches to access the movie by ID
    const approaches = [
      // Try direct path access
      { method: 'Direct path', path: '/us/movie/against-the-tide-2023', country: 'US' },
      { method: 'Direct path with ID', path: `/us/movie/${movieId}`, country: 'US' },
      { method: 'Title lookup', path: `/titles/${movieId}`, country: 'US' },
      { method: 'Movie lookup', path: `/movie/${movieId}`, country: 'US' },
      
      // Try different countries
      { method: 'Norway path', path: '/no/movie/against-the-tide-2023', country: 'NO' },
      { method: 'UK path', path: '/uk/movie/against-the-tide-2023', country: 'GB' },
    ];
    
    for (const approach of approaches) {
      console.log(`📡 Testing: ${approach.method}`);
      console.log(`   Path: ${approach.path}`);
      console.log(`   Country: ${approach.country}`);
      
      try {
        const details = await justwatch.getData(approach.path, approach.country);
        
        if (details) {
          console.log(`✅ SUCCESS!`);
          console.log(`   Title: ${details.title || 'unknown'}`);
          console.log(`   ID: ${details.ID || details.id || 'no ID'}`);
          console.log(`   Year: ${details.originalReleaseYear || 'unknown'}`);
          console.log(`   Streams: ${details.Streams ? details.Streams.length : 0}`);
          
          if (details.Streams && details.Streams.length > 0) {
            console.log(`   Available on:`);
            details.Streams.slice(0, 5).forEach(stream => {
              console.log(`     ${stream.Provider} (${stream.Type}) - ${stream.Price || 'free'}`);
            });
            if (details.Streams.length > 5) {
              console.log(`     ... and ${details.Streams.length - 5} more`);
            }
          }
          
          // Save successful result
          const fs = await import('fs/promises');
          const filename = `against-tide-success-${approach.method.replace(/\s+/g, '-').toLowerCase()}.json`;
          await fs.writeFile(filename, JSON.stringify(details, null, 2));
          console.log(`   💾 Results saved to: ${filename}`);
          
          // If we found it, we can stop here
          console.log(`\n🎉 Found the movie! Stopping here.`);
          return;
        }
        
      } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
      }
      
      console.log('');
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log('❌ None of the approaches worked');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }
}

testWithTmId()
  .then(() => {
    console.log('\n🏁 Test complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });