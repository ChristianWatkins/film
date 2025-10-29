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

async function updateEnLitenBitAvKaken() {
  try {
    // Fetch details for TMDB ID 1234591
    const detailsUrl = `${TMDB_BASE_URL}/movie/1234591?api_key=${TMDB_API_KEY}&append_to_response=credits`;
    const response = await fetch(detailsUrl);
    const details = await response.json();
    
    // Extract director from crew
    const director = details.credits?.crew?.find(person => person.job === 'Director')?.name || null;
    
    // Get production countries
    const countries = details.production_countries?.map(country => country.name) || [];
    const primaryCountry = countries.length > 0 ? countries[0] : null;
    
    const movieData = {
      title: "En liten bit av kaken", // Keep original Norwegian title
      year: details.release_date ? new Date(details.release_date).getFullYear() : null,
      country: primaryCountry,
      director: director,
      link: "",
      awarded: false,
      awards: [],
      tmdb_id: details.id,
      original_title: details.original_title,
      overview: details.overview,
      poster_path: details.poster_path,
      vote_average: details.vote_average,
      genres: details.genres?.map(g => g.name) || [],
      runtime: details.runtime,
      countries: countries
    };
    
    console.log('Fetched details for En liten bit av kaken:');
    console.log(`Title: ${details.title} (${details.original_title})`);
    console.log(`Year: ${movieData.year}`);
    console.log(`Director: ${director}`);
    console.log(`Country: ${primaryCountry}`);
    console.log(`Genres: ${movieData.genres.join(', ')}`);
    console.log(`Runtime: ${details.runtime} minutes`);
    console.log('\nUse this data to update the JSON file manually.');
    
    return movieData;
    
  } catch (error) {
    console.error('Error fetching movie details:', error);
  }
}

updateEnLitenBitAvKaken();