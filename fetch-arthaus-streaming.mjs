import JustWatchAPI from 'justwatch-api-client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Load arthaus films data
const arthausData = JSON.parse(fs.readFileSync('./data/festivals/arthaus/all_films.json', 'utf8'));

// Rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Initialize JustWatch API
const justwatch = new JustWatchAPI(10000); // 10 second timeout

// Create the availability data structure (matching existing format)
const availabilityData = {
  country: 'NO',
  last_updated: new Date().toISOString(),
  total_films: arthausData.films.length,
  films: {}
};

// Progress tracking
let processed = 0;
let found = 0;
const total = arthausData.films.length;

console.log(`Starting to process ${total} arthaus films...`);

// Function to search for a film with multiple query variations
async function searchFilmOnJustWatch(film) {
  const queries = [
    // Main title (original)
    film.title,
    // Title without parenthetical content
    film.title.replace(/\s*\([^)]*\)\s*/g, '').trim(),
    // Title without special characters
    film.title.replace(/[^\w\s]/g, '').trim(),
    // Just the main title before first comma, colon, or dash
    film.title.split(/[,:–—-]/)[0].trim()
  ].filter(q => q && q.length > 2); // Filter out empty or very short queries

  for (const query of queries) {
    try {
      console.log(`  Searching with query: "${query}"`);
      await delay(300); // 0.3 second delay like working script
      
      const searchResults = await justwatch.search(query, 'NO');
      
      if (searchResults && searchResults.length > 0) {
        // Look for exact or close match using the correct property names
        for (const result of searchResults.slice(0, 5)) { // Check top 5 results
          const resultYear = result.originalReleaseYear;
          const yearMatch = !film.year || !resultYear || Math.abs(parseInt(resultYear) - parseInt(film.year)) <= 2;
          
          if (yearMatch) {
            console.log(`  Found match: ${result.title} (${resultYear}), JustWatch ID: ${result.id}`);
            
            // Get detailed availability data using the correct method
            try {
              await delay(300);
              const detailData = await justwatch.getData(result.fullPath, 'NO');
              
              if (detailData) {
                // Extract streaming offers like the working script
                const streaming = [];
                const rent = [];
                const buy = [];
                
                if (detailData.Streams) {
                  detailData.Streams.forEach(stream => {
                    const offerData = {
                      provider: stream.Provider,
                      quality: stream.Resolution || null,
                      price: stream.Price || null,
                      url: stream.Link || null
                    };
                    
                    const type = stream.Type.toLowerCase();
                    
                    if (type.includes('subscription') || type.includes('flatrate') || type.includes('free')) {
                      streaming.push(offerData);
                    } else if (type.includes('rent')) {
                      rent.push(offerData);
                    } else if (type.includes('buy')) {
                      buy.push(offerData);
                    }
                  });
                }
                
                return {
                  found: true,
                  title: film.title,
                  year: film.year,
                  justwatch_id: detailData.ID || null,
                  justwatch_url: result.fullPath ? `https://www.justwatch.com${result.fullPath}` : null,
                  poster_url: result.posterUrl || null,
                  streaming,
                  rent,
                  buy,
                  last_updated: new Date().toISOString()
                };
              }
            } catch (detailError) {
              console.log(`  Error getting detail data: ${detailError.message}`);
              // Return basic data even if detail fetch fails
              return {
                found: true,
                title: film.title,
                year: film.year,
                justwatch_id: result.id || null,
                justwatch_url: result.fullPath ? `https://www.justwatch.com${result.fullPath}` : null,
                poster_url: result.posterUrl || null,
                streaming: [],
                rent: [],
                buy: [],
                last_updated: new Date().toISOString()
              };
            }
          }
        }
      }
    } catch (error) {
      if (error.message && error.message.includes('Request failed with status code 422')) {
        console.log(`  Invalid search request for query: "${query}"`);
        continue; // Try next query variation
      } else {
        console.log(`  Error searching "${query}": ${error.message}`);
        await delay(1000); // Longer delay on error
        continue;
      }
    }
  }
  
  return {
    found: false,
    title: film.title,
    year: film.year,
    search_attempted: true
  }; // No match found
}

// Main processing function
async function processArthausFilms() {
  console.log('='.repeat(60));
  console.log('FETCHING JUSTWATCH STREAMING DATA FOR ARTHAUS FILMS');
  console.log('='.repeat(60));
  
  for (const film of arthausData.films) {
    processed++;
    console.log(`\n[${processed}/${total}] Processing: ${film.title} (${film.year || 'N/A'})`);
    
    try {
      const streamingData = await searchFilmOnJustWatch(film);
      
      // Create a unique key for this film
      const filmKey = `${film.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${film.year || 'unknown'}`;
      
      // Store the result
      availabilityData.films[filmKey] = {
        ...streamingData,
        festivals: [{
          name: 'arthaus',
          year: '2025',
          awarded: false
        }],
        director: film.director || null
      };
      
      if (streamingData.found) {
        found++;
        console.log(`  ✅ Found streaming data! (${found}/${processed} found so far)`);
      } else {
        console.log(`  ❌ No streaming data found`);
      }
      
      // Save progress every 10 films
      if (processed % 10 === 0) {
        console.log(`\n📊 PROGRESS CHECKPOINT: ${processed}/${total} processed, ${found} found`);
        fs.writeFileSync('./data/streaming/arthaus-availability.json', JSON.stringify(availabilityData, null, 2));
        console.log(`✅ Progress saved to arthaus-availability.json`);
      }
      
    } catch (error) {
      console.log(`  ❌ Error processing film: ${error.message}`);
      await delay(3000); // Extra delay on error
    }
  }
  
  // Final save
  console.log('\n' + '='.repeat(60));
  console.log('FINAL RESULTS');
  console.log('='.repeat(60));
  console.log(`Total films processed: ${processed}`);
  console.log(`Films with streaming data found: ${found}`);
  console.log(`Success rate: ${((found/processed) * 100).toFixed(1)}%`);
  
  fs.writeFileSync('./data/streaming/arthaus-availability.json', JSON.stringify(availabilityData, null, 2));
  console.log('\n✅ Final data saved to arthaus-availability.json');
}

// Start processing
processArthausFilms().catch(error => {
  console.error('Fatal error:', error);
  // Save whatever we have processed so far
  if (processed > 0) {
    fs.writeFileSync('./data/streaming/arthaus-availability.json', JSON.stringify(availabilityData, null, 2));
    console.log(`Emergency save completed. Processed ${processed} films, found ${found}.`);
  }
});