const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const DELAY_MS = 300; // 300ms between requests to respect API limits

if (!TMDB_API_KEY) {
  console.error('❌ TMDB_API_KEY not found in environment variables');
  console.log('   Set it in .env.local or run: export TMDB_API_KEY=your_key');
  process.exit(1);
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function enrichFilmFromTmdb(tmdbId) {
  try {
    // Fetch full movie details with credits and keywords
    const detailsUrl = `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits,keywords`;
    const response = await fetch(detailsUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status_code) {
      return null; // Movie not found
    }
    
    // Extract and format the data
    const enriched = {
      tmdb_id: data.id,
      title: data.title || null,
      original_title: data.original_title || null,
      synopsis: data.overview || null,
      runtime: data.runtime || null,
      genres: data.genres ? data.genres.map(g => g.name) : null,
      release_date: data.release_date || null,
      poster_path: data.poster_path || null,
      poster_url_tmdb: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
      backdrop_path: data.backdrop_path || null,
      backdrop_url: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : null,
      tmdb_rating: data.vote_average || null,
      tmdb_vote_count: data.vote_count || null,
      tmdb_popularity: data.popularity || null,
      imdb_id: data.imdb_id || null,
      production_companies: data.production_companies ? data.production_companies.map(c => c.name) : null,
      production_countries: data.production_countries ? data.production_countries.map(c => c.name) : null,
      spoken_languages: data.spoken_languages ? data.spoken_languages.map(l => l.name) : null,
      keywords: data.keywords?.keywords ? data.keywords.keywords.map(k => k.name) : null,
      cast: data.credits?.cast ? data.credits.cast.slice(0, 15).map(actor => ({
        name: actor.name,
        character: actor.character || '',
        order: actor.order,
        profile_path: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : null
      })) : null,
      crew: {
        directors: data.credits?.crew?.filter(c => c.job === 'Director').map(d => ({
          name: d.name,
          profile_path: d.profile_path ? `https://image.tmdb.org/t/p/w185${d.profile_path}` : null
        })) || [],
        writers: data.credits?.crew?.filter(c => ['Writer', 'Screenplay', 'Story'].includes(c.job)).map(w => ({
          name: w.name,
          job: w.job,
          profile_path: w.profile_path ? `https://image.tmdb.org/t/p/w185${w.profile_path}` : null
        })) || [],
        producers: data.credits?.crew?.filter(c => c.job === 'Producer').map(p => p.name) || [],
        cinematographers: data.credits?.crew?.filter(c => c.job === 'Director of Photography').map(c => ({
          name: c.name,
          profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null
        })) || [],
        composers: data.credits?.crew?.filter(c => c.job === 'Original Music Composer').map(c => ({
          name: c.name,
          profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null
        })) || [],
        editors: data.credits?.crew?.filter(c => c.job === 'Editor').map(e => ({
          name: e.name,
          profile_path: e.profile_path ? `https://image.tmdb.org/t/p/w185${e.profile_path}` : null
        })) || []
      }
    };
    
    return enriched;
  } catch (error) {
    console.error(`   ❌ Error enriching TMDB ID ${tmdbId}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('✨ Enriching Films with TMDB Data');
  console.log('='.repeat(60));
  
  // Load films data
  const filmsPath = path.join(__dirname, 'data', 'films.json');
  const filmsData = JSON.parse(await fs.readFile(filmsPath, 'utf8'));
  const films = Object.values(filmsData.films);
  
  // Find films with TMDB ID but missing key data
  const needsEnrichment = films.filter(f => 
    f.tmdb_id && (
      !f.synopsis || 
      !f.poster_url_tmdb || 
      !f.genres || 
      f.genres.length === 0 ||
      !f.runtime ||
      !f.cast ||
      f.cast.length === 0
    )
  );
  
  console.log(`\n📊 Found ${needsEnrichment.length} films with TMDB ID but missing data`);
  console.log(`\n🔍 Fetching enrichment data from TMDB...\n`);
  
  let enriched = 0;
  let failed = 0;
  const failedFilms = [];
  
  for (let i = 0; i < needsEnrichment.length; i++) {
    const film = needsEnrichment[i];
    console.log(`[${i + 1}/${needsEnrichment.length}] ${film.title} (${film.year})`);
    console.log(`   TMDB ID: ${film.tmdb_id}`);
    
    const enrichedData = await enrichFilmFromTmdb(film.tmdb_id);
    
    if (enrichedData) {
      // Merge enriched data into existing film (preserve existing fields, only update missing ones)
      const existing = filmsData.films[film.id];
      
      // Update fields that are missing or empty
      if (!existing.synopsis && enrichedData.synopsis) {
        existing.synopsis = enrichedData.synopsis;
      }
      if (!existing.poster_url_tmdb && enrichedData.poster_url_tmdb) {
        existing.poster_path = enrichedData.poster_path;
        existing.poster_url_tmdb = enrichedData.poster_url_tmdb;
      }
      if (!existing.backdrop_url && enrichedData.backdrop_url) {
        existing.backdrop_path = enrichedData.backdrop_path;
        existing.backdrop_url = enrichedData.backdrop_url;
      }
      if ((!existing.genres || existing.genres.length === 0) && enrichedData.genres) {
        existing.genres = enrichedData.genres;
      }
      if (!existing.runtime && enrichedData.runtime) {
        existing.runtime = enrichedData.runtime;
      }
      if ((!existing.cast || existing.cast.length === 0) && enrichedData.cast) {
        existing.cast = enrichedData.cast;
      }
      if (!existing.keywords && enrichedData.keywords) {
        existing.keywords = enrichedData.keywords;
      }
      if (!existing.production_companies && enrichedData.production_companies) {
        existing.production_companies = enrichedData.production_companies;
      }
      if (!existing.production_countries && enrichedData.production_countries) {
        existing.production_countries = enrichedData.production_countries;
      }
      if (!existing.spoken_languages && enrichedData.spoken_languages) {
        existing.spoken_languages = enrichedData.spoken_languages;
      }
      if (!existing.crew && enrichedData.crew) {
        existing.crew = enrichedData.crew;
      }
      // Update ratings if missing
      if (!existing.tmdb_rating && enrichedData.tmdb_rating) {
        existing.tmdb_rating = enrichedData.tmdb_rating;
        existing.tmdb_vote_count = enrichedData.tmdb_vote_count;
        existing.tmdb_popularity = enrichedData.tmdb_popularity;
      }
      // Update IMDB ID if missing
      if (!existing.imdb_id && enrichedData.imdb_id) {
        existing.imdb_id = enrichedData.imdb_id;
      }
      
      console.log(`   ✅ Enriched with: ${[
        enrichedData.synopsis && 'synopsis',
        enrichedData.poster_url_tmdb && 'poster',
        enrichedData.genres && 'genres',
        enrichedData.runtime && 'runtime',
        enrichedData.cast && 'cast',
        enrichedData.keywords && 'keywords'
      ].filter(Boolean).join(', ')}`);
      
      enriched++;
    } else {
      console.log(`   ❌ Failed to enrich`);
      failedFilms.push({ title: film.title, year: film.year, tmdb_id: film.tmdb_id });
      failed++;
    }
    
    // Rate limiting
    if (i < needsEnrichment.length - 1) {
      await delay(DELAY_MS);
    }
  }
  
  // Save updated data
  console.log(`\n💾 Saving updated films.json...`);
  await fs.writeFile(filmsPath, JSON.stringify(filmsData, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Enriched: ${enriched} films`);
  console.log(`❌ Failed: ${failed} films`);
  
  if (failedFilms.length > 0) {
    console.log('\n⚠️  Films that failed to enrich:');
    failedFilms.forEach(f => {
      console.log(`   - ${f.title} (${f.year}) - TMDB ID: ${f.tmdb_id}`);
    });
  }
  
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

