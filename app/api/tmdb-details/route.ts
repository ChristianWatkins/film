import { NextRequest, NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

interface TMDBMovieDetails {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  runtime: number;
  vote_average: number;
  vote_count: number;
  genres: Array<{ id: number; name: string; }>;
  poster_path: string | null;
  backdrop_path: string | null;
  imdb_id: string;
  production_countries: Array<{ iso_3166_1: string; name: string; }>;
  production_companies: Array<{ id: number; name: string; }>;
}

interface TMDBCredits {
  cast: Array<{
    id: number;
    name: string;
    character: string;
    order: number;
  }>;
  crew: Array<{
    id: number;
    name: string;
    job: string;
    department: string;
  }>;
}

async function fetchMovieByTmdbId(tmdbId: string) {
  try {
    // Fetch movie details and credits in parallel
    const [movieResponse, creditsResponse] = await Promise.all([
      fetch(`${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`),
      fetch(`${TMDB_BASE_URL}/movie/${tmdbId}/credits?api_key=${TMDB_API_KEY}`)
    ]);

    if (!movieResponse.ok) {
      if (movieResponse.status === 404) {
        return NextResponse.json(
          { error: 'Movie not found on TMDB' },
          { status: 404 }
        );
      }
      throw new Error(`TMDB API error: ${movieResponse.statusText}`);
    }

    const movieData: TMDBMovieDetails = await movieResponse.json();
    const creditsData: TMDBCredits = creditsResponse.ok ? await creditsResponse.json() : { cast: [], crew: [] };

    return NextResponse.json(formatMovieData(movieData, creditsData));
  } catch (error) {
    console.error('Error fetching TMDB details by ID:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movie details from TMDB' },
      { status: 500 }
    );
  }
}

async function searchAndFetchMovie(title: string, year?: string | null) {
  try {
    // First, search for the movie
    const searchQuery = encodeURIComponent(title);
    const yearParam = year ? `&year=${year}` : '';
    const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${searchQuery}${yearParam}&language=en-US`;
    
    const searchResponse = await fetch(searchUrl);
    console.log('TMDB search response status:', searchResponse.status);
    console.log('TMDB search URL:', searchUrl.replace(TMDB_API_KEY!, '***'));
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.log('TMDB search error response:', errorText);
      throw new Error(`TMDB search error: ${searchResponse.statusText} - ${errorText}`);
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.results || searchData.results.length === 0) {
      return NextResponse.json(
        { error: 'Movie not found on TMDB' },
        { status: 404 }
      );
    }

    // Get the first result (best match)
    const movieResult = searchData.results[0];
    
    // Now fetch full details for this movie
    const [movieResponse, creditsResponse] = await Promise.all([
      fetch(`${TMDB_BASE_URL}/movie/${movieResult.id}?api_key=${TMDB_API_KEY}&language=en-US`),
      fetch(`${TMDB_BASE_URL}/movie/${movieResult.id}/credits?api_key=${TMDB_API_KEY}`)
    ]);

    if (!movieResponse.ok) {
      throw new Error(`TMDB movie details error: ${movieResponse.statusText}`);
    }

    const movieData: TMDBMovieDetails = await movieResponse.json();
    const creditsData: TMDBCredits = creditsResponse.ok ? await creditsResponse.json() : { cast: [], crew: [] };

    return NextResponse.json(formatMovieData(movieData, creditsData));
  } catch (error) {
    console.error('Error searching and fetching TMDB movie:', error);
    return NextResponse.json(
      { error: 'Failed to search and fetch movie details from TMDB' },
      { status: 500 }
    );
  }
}

function formatMovieData(movieData: TMDBMovieDetails, creditsData: TMDBCredits) {
  // Extract directors from crew
  const directors = creditsData.crew
    .filter(person => person.job === 'Director')
    .map(person => person.name);

  // Extract main cast (top 10)
  const cast = creditsData.cast
    .sort((a, b) => a.order - b.order)
    .slice(0, 10)
    .map(person => person.name);

  // Format the response
  return {
    tmdbId: movieData.id,
    title: movieData.title,
    originalTitle: movieData.original_title,
    synopsis: movieData.overview,
    releaseDate: movieData.release_date,
    runtime: movieData.runtime,
    rating: movieData.vote_average,
    voteCount: movieData.vote_count,
    genres: movieData.genres,
    posterPath: movieData.poster_path ? `https://image.tmdb.org/t/p/w500${movieData.poster_path}` : null,
    backdropPath: movieData.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movieData.backdrop_path}` : null,
    imdbId: movieData.imdb_id,
    directors,
    cast,
    productionCountries: movieData.production_countries,
    productionCompanies: movieData.production_companies
  };
}

export async function GET(request: NextRequest) {
  console.log('TMDB_API_KEY available:', !!TMDB_API_KEY);
  console.log('TMDB_API_KEY value:', TMDB_API_KEY ? TMDB_API_KEY.substring(0, 8) + '...' : 'undefined');
  
  if (!TMDB_API_KEY) {
    return NextResponse.json(
      { error: 'TMDB API key not configured' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const tmdbId = searchParams.get('tmdbId');
  const title = searchParams.get('title');
  const year = searchParams.get('year');

  // If we have a TMDB ID, use it directly
  if (tmdbId) {
    return fetchMovieByTmdbId(tmdbId);
  }

  // Otherwise, try to search by title and year
  if (title) {
    return searchAndFetchMovie(title, year);
  }

  return NextResponse.json(
    { error: 'Either TMDB ID or movie title is required' },
    { status: 400 }
  );
}