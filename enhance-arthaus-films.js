const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && key.trim() && !key.startsWith('#')) {
      process.env[key.trim()] = value.trim();
    }
  });
}

// Load the arthaus festival data
const arthausData = JSON.parse(fs.readFileSync('./data/festivals/arthaus/2025.json', 'utf8'));

// TMDB API configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  console.error('Please set TMDB_API_KEY environment variable');
  process.exit(1);
}

// Rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Search for a movie on TMDB
async function searchTMDB(title) {
  try {
    // Clean the title for better search results
    let searchTitle = title
      .replace(/\[.*?\]/g, '') // Remove bracketed content like [Petite Maman]
      .replace(/–.*$/g, '') // Remove everything after em dash
      .replace(/-.*$/g, '') // Remove everything after regular dash (for some titles)
      .trim();

    // Handle special cases
    if (title.includes('IMAX og 4k')) {
      searchTitle = title.replace(/ - IMAX og 4k/g, '').trim();
    }

    const url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchTitle)}&language=en-US`;
    
    console.log(`Searching for: "${searchTitle}" (original: "${title}")`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      // Get the first result (usually the best match)
      const movie = data.results[0];
      
      // Get additional details
      const detailsUrl = `${TMDB_BASE_URL}/movie/${movie.id}?api_key=${TMDB_API_KEY}&append_to_response=credits`;
      const detailsResponse = await fetch(detailsUrl);
      const details = await detailsResponse.json();
      
      // Extract director from crew
      const director = details.credits?.crew?.find(person => person.job === 'Director')?.name || null;
      
      // Get production countries
      const countries = details.production_countries?.map(country => country.name) || [];
      const primaryCountry = countries.length > 0 ? countries[0] : null;
      
      return {
        found: true,
        tmdb_id: movie.id,
        title: movie.title,
        original_title: movie.original_title,
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
        director: director,
        country: primaryCountry,
        countries: countries,
        overview: movie.overview,
        poster_path: movie.poster_path,
        vote_average: movie.vote_average,
        genres: details.genres?.map(g => g.name) || [],
        runtime: details.runtime
      };
    } else {
      console.log(`No results found for: "${searchTitle}"`);
      return { found: false };
    }
  } catch (error) {
    console.error(`Error searching for "${title}":`, error.message);
    return { found: false, error: error.message };
  }
}

// Process all films
async function enhanceFilms() {
  const enhancedFilms = [];
  const notFound = [];
  
  console.log(`Processing ${arthausData.films.length} films...`);
  
  for (let i = 0; i < arthausData.films.length; i++) {
    const film = arthausData.films[i];
    console.log(`\n[${i + 1}/${arthausData.films.length}] Processing: ${film.title}`);
    
    const tmdbResult = await searchTMDB(film.title);
    
    if (tmdbResult.found) {
      const enhancedFilm = {
        title: film.title, // Keep original title from arthaus
        year: tmdbResult.year,
        country: tmdbResult.country,
        director: tmdbResult.director,
        link: film.link,
        awarded: film.awarded,
        awards: film.awards,
        // Additional TMDB data
        tmdb_id: tmdbResult.tmdb_id,
        original_title: tmdbResult.original_title,
        overview: tmdbResult.overview,
        poster_path: tmdbResult.poster_path,
        vote_average: tmdbResult.vote_average,
        genres: tmdbResult.genres,
        runtime: tmdbResult.runtime,
        countries: tmdbResult.countries
      };
      
      enhancedFilms.push(enhancedFilm);
      console.log(`✓ Found: ${tmdbResult.title} (${tmdbResult.year}) - Dir: ${tmdbResult.director}`);
    } else {
      enhancedFilms.push({
        ...film,
        tmdb_search_attempted: true,
        tmdb_error: tmdbResult.error || 'Not found'
      });
      notFound.push(film.title);
      console.log(`✗ Not found: ${film.title}`);
    }
    
    // Rate limiting - wait between requests
    await delay(250); // 4 requests per second
  }
  
  // Update the data structure
  const enhancedData = {
    ...arthausData,
    films: enhancedFilms,
    last_updated: new Date().toISOString(),
    tmdb_enhancement: {
      total_films: arthausData.films.length,
      found_on_tmdb: enhancedFilms.filter(f => f.tmdb_id).length,
      not_found: notFound.length,
      enhancement_date: new Date().toISOString()
    }
  };
  
  // Save enhanced data
  fs.writeFileSync('./data/festivals/arthaus/2025.json', JSON.stringify(enhancedData, null, 2));
  
  // Save list of not found films for manual review
  if (notFound.length > 0) {
    fs.writeFileSync('./arthaus-not-found.txt', notFound.join('\n'));
    console.log(`\n${notFound.length} films not found on TMDB. List saved to arthaus-not-found.txt`);
  }
  
  console.log(`\nEnhancement complete!`);
  console.log(`✓ Found: ${enhancedFilms.filter(f => f.tmdb_id).length}`);
  console.log(`✗ Not found: ${notFound.length}`);
  console.log(`Enhanced data saved to data/festivals/arthaus/2025.json`);
}

// Run the enhancement
enhanceFilms().catch(console.error);