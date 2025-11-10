const JustWatchAPI = require('justwatch-api-client').default;
const fs = require('fs').promises;
const path = require('path');

const COUNTRY = 'NO'; // Norway
const DELAY_MS = 300; // 300ms between requests
const BERLIN_DIR = 'data/festivals/berlin';
const FILMS_FILE = 'data/films.json';
const STREAMING_FILE = 'data/streaming/availability.json';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Load all Berlin films
async function getBerlinFilms() {
  const films = [];
  
  try {
    const yearFiles = await fs.readdir(BERLIN_DIR);
    
    for (const yearFile of yearFiles) {
      if (!yearFile.endsWith('.json')) continue;
      
      const year = yearFile.replace('.json', '');
      const filePath = path.join(BERLIN_DIR, yearFile);
      const content = await fs.readFile(filePath, 'utf-8');
      const filmList = JSON.parse(content);
      
      filmList.forEach(film => {
        films.push({
          id: film.id,
          year: parseInt(year),
          festival: 'berlin'
        });
      });
    }
    
    return films;
  } catch (error) {
    console.error('Error reading Berlin festival files:', error.message);
    throw error;
  }
}

// Load master films to get titles
async function loadMasterFilms() {
  const content = await fs.readFile(FILMS_FILE, 'utf-8');
  const data = JSON.parse(content);
  return data.films;
}

// Fetch streaming data for a single film
async function fetchFilmStreaming(justwatch, film, masterFilm) {
  try {
    const title = masterFilm.title;
    const year = masterFilm.year;
    
    console.log(`  Searching: "${title}" (${year})...`);
    
    // Search for the movie
    const searchResults = await justwatch.search(title, COUNTRY);
    
    if (!searchResults || searchResults.length === 0) {
      console.log(`    ⚠️  Not found on JustWatch`);
      return {
        found: false,
        title: title,
        year: year,
        search_attempted: true
      };
    }
    
    // Try to find exact match by year
    let match = searchResults.find(result => {
      const resultYear = result.originalReleaseYear;
      return resultYear === year;
    });

    // If no exact year match, try to find a match within ±1 year
    if (!match && searchResults.length > 0) {
      match = searchResults.find(result => {
        const resultYear = result.originalReleaseYear;
        return Math.abs(resultYear - year) === 1;
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
        title: title,
        year: year,
        search_attempted: true
      };
    }
    
    // Get poster URL from search result
    const posterUrl = match.posterUrl || null;
    
    // Get detailed streaming information
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
      title: title,
      year: year,
      justwatch_id: details.ID || null,
      justwatch_url: match.fullPath ? `https://www.justwatch.com${match.fullPath}` : null,
      poster_url: posterUrl,
      streaming,
      rent,
      buy,
      last_updated: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`    ❌ Error fetching "${masterFilm.title}":`, error.message);
    return {
      found: false,
      title: masterFilm.title,
      year: masterFilm.year,
      error: error.message,
      search_attempted: true
    };
  }
}

async function main() {
  console.log('🎬 Updating Streaming Data for Berlin Films');
  console.log('='.repeat(60));
  
  // Initialize JustWatch client
  const justwatch = new JustWatchAPI(10000); // 10 second timeout
  
  // Load Berlin films and master films
  console.log('📂 Loading Berlin festival films...');
  const berlinFilms = await getBerlinFilms();
  console.log(`✓ Found ${berlinFilms.length} Berlin film entries\n`);
  
  console.log('📂 Loading master films data...');
  const masterFilms = await loadMasterFilms();
  console.log(`✓ Loaded ${Object.keys(masterFilms).length} master films\n`);
  
  // Load existing streaming data
  let streamingData;
  try {
    const content = await fs.readFile(STREAMING_FILE, 'utf-8');
    streamingData = JSON.parse(content);
  } catch (error) {
    console.log('⚠️  No existing streaming data found, creating new file...');
    streamingData = {
      last_updated: new Date().toISOString(),
      country: COUNTRY,
      total_films: 0,
      films: {}
    };
  }
  
  // Process Berlin films
  let processed = 0;
  let found = 0;
  let notFound = 0;
  let skipped = 0;
  
  console.log('🔍 Fetching streaming data from JustWatch...\n');
  
  for (const berlinFilm of berlinFilms) {
    const masterFilm = masterFilms[berlinFilm.id];
    
    if (!masterFilm) {
      console.log(`[${processed + 1}/${berlinFilms.length}] ⚠️  Film ID ${berlinFilm.id} not found in master films, skipping`);
      skipped++;
      continue;
    }
    
    processed++;
    console.log(`[${processed}/${berlinFilms.length}] ${masterFilm.title} (${masterFilm.year})`);
    
    const result = await fetchFilmStreaming(justwatch, berlinFilm, masterFilm);
    
    // Store by film ID (short code)
    streamingData.films[berlinFilm.id] = result;
    
    if (result.found) {
      found++;
    } else {
      notFound++;
    }
    
    // Save progress every 20 films
    if (processed % 20 === 0) {
      streamingData.last_updated = new Date().toISOString();
      streamingData.total_films = Object.keys(streamingData.films).length;
      await fs.writeFile(STREAMING_FILE, JSON.stringify(streamingData, null, 2), 'utf-8');
      console.log(`  💾 Progress saved (${processed}/${berlinFilms.length})\n`);
    }
    
    // Delay before next request (except for last one)
    if (processed < berlinFilms.length) {
      await delay(DELAY_MS);
    }
  }
  
  // Final save
  streamingData.last_updated = new Date().toISOString();
  streamingData.total_films = Object.keys(streamingData.films).length;
  await fs.writeFile(STREAMING_FILE, JSON.stringify(streamingData, null, 2), 'utf-8');
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log('='.repeat(60));
  console.log(`Total Berlin films: ${berlinFilms.length}`);
  console.log(`Processed: ${processed}`);
  console.log(`Skipped (not in master): ${skipped}`);
  console.log(`✅ Found on JustWatch: ${found}`);
  console.log(`❌ Not found: ${notFound}`);
  console.log(`💾 Updated streaming data file: ${STREAMING_FILE}`);
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

