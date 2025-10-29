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

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const filmsToUpdate = [
  { title: "Kensukes hemmelige øy", tmdbId: 587563 },
  { title: "Høstgule blader", tmdbId: 986280 },
  { title: "Gordon og Paddy – nøttemysteriet i skogen", tmdbId: 493913 },
  { title: "Naboene Yamada", tmdbId: 16198 }
];

async function fetchMovieDetails(tmdbId) {
  try {
    const detailsUrl = `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits`;
    const response = await fetch(detailsUrl);
    const details = await response.json();
    
    // Extract director from crew
    const director = details.credits?.crew?.find(person => person.job === 'Director')?.name || null;
    
    // Get production countries
    const countries = details.production_countries?.map(country => country.name) || [];
    const primaryCountry = countries.length > 0 ? countries[0] : null;
    
    return {
      tmdb_id: details.id,
      title: details.title,
      original_title: details.original_title,
      year: details.release_date ? new Date(details.release_date).getFullYear() : null,
      country: primaryCountry,
      director: director,
      overview: details.overview,
      poster_path: details.poster_path,
      vote_average: details.vote_average,
      genres: details.genres?.map(g => g.name) || [],
      runtime: details.runtime,
      countries: countries
    };
    
  } catch (error) {
    console.error(`Error fetching details for TMDB ID ${tmdbId}:`, error);
    return null;
  }
}

async function updateAllFilms() {
  console.log('Fetching details for remaining films...\n');
  
  for (const film of filmsToUpdate) {
    console.log(`Fetching: ${film.title} (TMDB ID: ${film.tmdbId})`);
    const details = await fetchMovieDetails(film.tmdbId);
    
    if (details) {
      console.log(`✓ ${details.title} (${details.original_title})`);
      console.log(`  Year: ${details.year}`);
      console.log(`  Director: ${details.director}`);
      console.log(`  Country: ${details.country}`);
      console.log(`  Genres: ${details.genres.join(', ')}`);
      console.log(`  Runtime: ${details.runtime} minutes`);
      console.log('');
    } else {
      console.log(`✗ Failed to fetch details for ${film.title}`);
      console.log('');
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 250));
  }
}

updateAllFilms();