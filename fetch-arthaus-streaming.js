const fs = require('fs');
const path = require('path');
const JustWatchAPI = require('justwatch-api-client');

// Load arthaus films data
const arthausData = JSON.parse(fs.readFileSync('./data/festivals/arthaus/all_films.json', 'utf8'));

// Rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Initialize JustWatch API
const justwatch = new JustWatchAPI(10000); // 10 second timeout

// Create the availability data structure
const availabilityData = {
  last_updated: new Date().toISOString(),
  country: "Norway",
  total_films: arthausData.films.length,
  films: {}
};

// Search for a film on JustWatch Norway
async function searchJustWatchNorway(film) {
  try {
    console.log(`Searching for: "${film.title}" (${film.year})`);
    
    // Try different search variations
    const searchQueries = [
      film.title,
      film.original_title,
      `${film.title} ${film.year}`,
      film.original_title ? `${film.original_title} ${film.year}` : null
    ].filter(Boolean);

    let bestResult = null;
    
    for (const query of searchQueries) {
      try {
        console.log(`  Trying query: "${query}"`);
        const searchResults = await justwatch.search(query, 'NO');
        
        if (searchResults && searchResults.length > 0) {
          // Find the best match (prefer exact year match and movies)
          let match = searchResults.find(result => 
            result.objectType === 'movie' && 
            result.originalReleaseYear === film.year &&
            (result.title.toLowerCase() === film.title.toLowerCase() || 
             result.title.toLowerCase() === (film.original_title || '').toLowerCase())
          );
          
          if (!match) {
            // Fallback to year match only
            match = searchResults.find(result => 
              result.objectType === 'movie' && 
              result.originalReleaseYear === film.year
            );
          }
          
          if (!match) {
            // Fallback to first movie result
            match = searchResults.find(result => result.objectType === 'movie');
          }
          
          if (match) {
            bestResult = match;
            console.log(`  ✓ Found match: ${match.title} (${match.originalReleaseYear})`);
            break;
          }
        }
      } catch (searchError) {
        console.log(`  ✗ Search failed for "${query}": ${searchError.message}`);
      }
      
      // Small delay between search attempts
      await delay(200);
    }

    if (!bestResult) {
      console.log(`  ✗ No results found for "${film.title}"`);
      return {
        found: false,
        title: film.title,
        year: film.year,
        director: film.director,
        justwatch_id: null,
        justwatch_url: null,
        poster_url: film.poster_path ? `https://image.tmdb.org/t/p/w500${film.poster_path}` : null,
        streaming: [],
        rent: [],
        buy: [],
        last_updated: new Date().toISOString(),
        festivals: [{
          name: "arthaus",
          year: "2025",
          awarded: film.awarded
        }],
        search_attempted: true,
        error: "Not found on JustWatch Norway"
      };
    }

    // Get detailed information
    let details = null;
    let streamingProviders = [];
    let rentProviders = [];
    let buyProviders = [];

    if (bestResult.fullPath) {
      try {
        console.log(`  Getting details for: ${bestResult.fullPath}`);
        details = await justwatch.getData(bestResult.fullPath, 'NO');
        
        // Extract streaming offers
        if (details.offers) {
          details.offers.forEach(offer => {
            const provider = {
              provider: offer.packageShortName || offer.packageName || 'Unknown',
              quality: offer.presentationType || null,
              price: offer.retailPrice ? `NOK ${offer.retailPrice}` : null,
              url: offer.standardWebURL || null
            };

            switch (offer.monetizationType) {
              case 'flatrate':
                streamingProviders.push(provider);
                break;
              case 'rent':
                rentProviders.push(provider);
                break;
              case 'buy':
                buyProviders.push(provider);
                break;
            }
          });
        }
      } catch (detailsError) {
        console.log(`  ⚠ Failed to get details: ${detailsError.message}`);
      }
    }

    const result = {
      found: true,
      title: film.title,
      year: film.year,
      director: film.director,
      justwatch_id: bestResult.id,
      justwatch_url: `https://www.justwatch.com/no${bestResult.fullPath}`,
      imdb_id: film.imdb_id || null,
      tmdb_id: film.tmdb_id || null,
      poster_url: bestResult.posterUrl || (film.poster_path ? `https://image.tmdb.org/t/p/w500${film.poster_path}` : null),
      streaming: streamingProviders,
      rent: rentProviders,
      buy: buyProviders,
      last_updated: new Date().toISOString(),
      festivals: [{
        name: "arthaus",
        year: "2025",
        awarded: film.awarded
      }],
      search_attempted: true
    };

    console.log(`  ✓ Complete: ${streamingProviders.length} streaming, ${rentProviders.length} rent, ${buyProviders.length} buy options`);
    return result;

  } catch (error) {
    console.error(`  ✗ Error searching for "${film.title}": ${error.message}`);
    return {
      found: false,
      title: film.title,
      year: film.year,
      director: film.director,
      justwatch_id: null,
      justwatch_url: null,
      poster_url: film.poster_path ? `https://image.tmdb.org/t/p/w500${film.poster_path}` : null,
      streaming: [],
      rent: [],
      buy: [],
      last_updated: new Date().toISOString(),
      festivals: [{
        name: "arthaus",
        year: "2025",
        awarded: film.awarded
      }],
      search_attempted: true,
      error: error.message
    };
  }
}

// Process all films
async function fetchStreamingAvailability() {
  console.log(`Starting to fetch streaming availability for ${arthausData.films.length} arthaus films...\n`);
  
  let processed = 0;
  let found = 0;
  let withAvailability = 0;

  for (const film of arthausData.films) {
    processed++;
    console.log(`\n[${processed}/${arthausData.films.length}] Processing: ${film.title}`);
    
    const result = await searchJustWatchNorway(film);
    
    // Create film key (similar to other festivals)
    const filmKey = `${film.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}-${film.year}`;
    availabilityData.films[filmKey] = result;
    
    if (result.found) {
      found++;
      if (result.streaming.length > 0 || result.rent.length > 0 || result.buy.length > 0) {
        withAvailability++;
      }
    }
    
    // Rate limiting - wait between requests
    await delay(1000); // 1 second between requests to be respectful
    
    // Save progress every 10 films
    if (processed % 10 === 0) {
      console.log(`\n--- Progress Update ---`);
      console.log(`Processed: ${processed}/${arthausData.films.length}`);
      console.log(`Found on JustWatch: ${found}`);
      console.log(`With availability in Norway: ${withAvailability}`);
      console.log(`Saving progress...`);
      
      fs.writeFileSync('./data/streaming/arthaus-availability.json', JSON.stringify(availabilityData, null, 2));
      console.log(`Progress saved to data/streaming/arthaus-availability.json\n`);
    }
  }

  // Final save
  fs.writeFileSync('./data/streaming/arthaus-availability.json', JSON.stringify(availabilityData, null, 2));
  
  console.log(`\n=== FINAL RESULTS ===`);
  console.log(`Total films processed: ${processed}`);
  console.log(`Found on JustWatch Norway: ${found} (${((found/processed)*100).toFixed(1)}%)`);
  console.log(`With streaming availability in Norway: ${withAvailability} (${((withAvailability/processed)*100).toFixed(1)}%)`);
  console.log(`Data saved to: data/streaming/arthaus-availability.json`);
}

// Run the availability fetcher
fetchStreamingAvailability().catch(console.error);