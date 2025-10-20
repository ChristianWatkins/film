import JustWatchAPI from 'justwatch-api-client';
import fs from 'fs/promises';
import path from 'path';

const COUNTRY = 'NO'; // Norway
const DELAY_MS = 300; // 0.3 seconds between requests (open API, no need for long delays)
const FESTIVALS_DIR = 'data/festivals';
const OUTPUT_FILE = 'data/streaming/availability.json';

// Helper function to delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Create a URL-safe key from title and year
function createFilmKey(title, year) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${year}`;
}

// Read all festival JSON files recursively
async function getAllFestivalFilms() {
  const films = new Map(); // Use Map to deduplicate by title+year
  
  try {
    // Read all festival directories
    const festivalDirs = await fs.readdir(FESTIVALS_DIR);
    
    for (const festivalName of festivalDirs) {
      const festivalPath = path.join(FESTIVALS_DIR, festivalName);
      const stat = await fs.stat(festivalPath);
      
      if (!stat.isDirectory()) continue;
      
      // Read all year files in this festival
      const yearFiles = await fs.readdir(festivalPath);
      
      for (const yearFile of yearFiles) {
        if (!yearFile.endsWith('.json')) continue;
        
        const filePath = path.join(festivalPath, yearFile);
        const content = await fs.readFile(filePath, 'utf-8');
        const filmList = JSON.parse(content);
        
        // Add each film to our map (deduplicates automatically)
        filmList.forEach(film => {
          const key = createFilmKey(film.title, film.year);
          if (!films.has(key)) {
            films.set(key, {
              title: film.title,
              year: film.year,
              director: film.director || null,
              festivals: []
            });
          }
          // Track which festivals this film appeared in
          films.get(key).festivals.push({
            name: festivalName,
            year: yearFile.replace('.json', ''),
            awarded: film.awarded || false
          });
        });
      }
    }
    
    return films;
  } catch (error) {
    console.error('Error reading festival files:', error.message);
    throw error;
  }
}

// Fetch streaming data for a single film
async function fetchFilmStreaming(justwatch, film, filmKey) {
  try {
    console.log(`  Searching: "${film.title}" (${film.year})...`);
    
    // Search for the movie using the correct method
    const searchResults = await justwatch.search(film.title, COUNTRY);
    
    if (!searchResults || searchResults.length === 0) {
      console.log(`    ⚠️  Not found on JustWatch`);
      return {
        found: false,
        title: film.title,
        year: film.year,
        search_attempted: true
      };
    }
    
    // Try to find exact match by year
    let match = searchResults.find(result => {
      const resultYear = result.originalReleaseYear;
      return resultYear === film.year;
    });

    // If no exact year match, try to find a match within ±1 year
    if (!match && searchResults.length > 0) {
      match = searchResults.find(result => {
        const resultYear = result.originalReleaseYear;
        return Math.abs(resultYear - film.year) === 1;
      });
      if (match) {
        console.log(`    ⚠️  Using close match (year: ${match.originalReleaseYear || 'unknown'})`);
      }
    }

    // If still no match, skip
    if (!match) {
      console.log(`    ⚠️  No suitable match found`);
      return {
        found: false,
        title: film.title,
        year: film.year,
        search_attempted: true
      };
    }
    
    // Get poster URL from search result (it's already there!)
    const posterUrl = match.posterUrl || null;
    
    // Get detailed streaming information using the correct method
    const details = await justwatch.getData(match.fullPath, COUNTRY);
    
    // Extract streaming offers
    const streaming = [];
    const rent = [];
    const buy = [];
    
    if (details && details.Streams) {
      details.Streams.forEach(stream => {
        const offerData = {
          provider: stream.Provider,
          quality: stream.Resolution || null,
          price: stream.Price || null,
          url: stream.Link || null
        };
        
        // Type can be: "subscription", "rent", "buy", "free", etc.
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
    
    console.log(`    ✓ Found - ${streaming.length} streaming, ${rent.length} rent, ${buy.length} buy options${posterUrl ? ' + poster' : ''}`);
    
    return {
      found: true,
      title: film.title,
      year: film.year,
      justwatch_id: details.ID || null,
      justwatch_url: match.fullPath ? `https://www.justwatch.com${match.fullPath}` : null,
      poster_url: posterUrl,
      streaming,
      rent,
      buy,
      last_updated: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`    ❌ Error fetching "${film.title}":`, error.message);
    return {
      found: false,
      title: film.title,
      year: film.year,
      error: error.message,
      search_attempted: true
    };
  }
}

// Main function
async function fetchAllStreaming() {
  console.log('🎬 Fetching streaming availability for festival films...\n');
  console.log(`Country: ${COUNTRY} (Norway)`);
  console.log(`Delay between requests: ${DELAY_MS}ms\n`);
  
  // Initialize JustWatch client
  const justwatch = new JustWatchAPI(10000); // 10 second timeout
  
  // Get all unique films from festivals
  console.log('📂 Reading festival data...');
  const films = await getAllFestivalFilms();
  console.log(`✓ Found ${films.size} unique films across all festivals\n`);
  
  // Ensure output directory exists
  try {
    await fs.mkdir('data/streaming', { recursive: true });
  } catch (e) {
    // Directory might already exist
  }
  
  // Fetch streaming data for each film
  const streamingData = {
    last_updated: new Date().toISOString(),
    country: COUNTRY,
    total_films: films.size,
    films: {}
  };
  
  let processed = 0;
  let found = 0;
  let notFound = 0;
  
  for (const [filmKey, film] of films) {
    processed++;
    console.log(`[${processed}/${films.size}]`);
    
    const result = await fetchFilmStreaming(justwatch, film, filmKey);
    
    // Add festival information to the result
    result.festivals = film.festivals;
    result.director = film.director;
    
    streamingData.films[filmKey] = result;
    
    if (result.found) {
      found++;
    } else {
      notFound++;
    }
    
    // Save progress every 10 films
    if (processed % 10 === 0) {
      await fs.writeFile(OUTPUT_FILE, JSON.stringify(streamingData, null, 2), 'utf-8');
      console.log(`  💾 Progress saved (${processed}/${films.size})\n`);
    }
    
    // Delay before next request (except for last one)
    if (processed < films.size) {
      await delay(DELAY_MS);
    }
  }
  
  // Final save
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(streamingData, null, 2), 'utf-8');
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log('='.repeat(50));
  console.log(`Total films processed: ${processed}`);
  console.log(`Found on JustWatch: ${found}`);
  console.log(`Not found: ${notFound}`);
  console.log(`\n✓ Data saved to ${OUTPUT_FILE}`);
  
  // Show some streaming stats
  const withStreaming = Object.values(streamingData.films).filter(f => f.streaming && f.streaming.length > 0).length;
  const withRent = Object.values(streamingData.films).filter(f => f.rent && f.rent.length > 0).length;
  const withBuy = Object.values(streamingData.films).filter(f => f.buy && f.buy.length > 0).length;
  
  console.log(`\n📺 Availability in Norway:`);
  console.log(`  Streaming (subscription): ${withStreaming} films`);
  console.log(`  Available to rent: ${withRent} films`);
  console.log(`  Available to buy: ${withBuy} films`);
}

// Run the fetcher
fetchAllStreaming().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

