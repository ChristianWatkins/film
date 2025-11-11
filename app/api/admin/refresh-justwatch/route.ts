import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import JustWatchAPI from 'justwatch-api-client';
import { mergeAllFilms } from '@/lib/data';

// POST endpoint to refresh JustWatch data for a film
export async function POST(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const { id, title, year } = await request.json();
    
    if (!id || !title || !year) {
      return NextResponse.json({ error: 'Missing required fields (id, title, year)' }, { status: 400 });
    }
    
    console.log(`Searching JustWatch for: "${title}" (${year}) [${id}]`);
    
    // Initialize JustWatch API
    const justwatch = new JustWatchAPI(15000); // 15 second timeout
    
    // Search JustWatch Norway
    const searchResults = await justwatch.search(title, 'NO');
    
    if (!searchResults || searchResults.length === 0) {
      console.log('  No results found');
      return NextResponse.json({
        found: false,
        message: 'Film not found on JustWatch'
      });
    }
    
    // Filter to movies only (using any type to avoid JustWatch API typing issues)
    const movies = (searchResults as any[]).filter((result: any) => {
      if (result.objectType !== undefined) {
        return result.objectType === 'movie';
      }
      return result.originalReleaseYear !== undefined && result.originalReleaseYear !== null;
    });
    
    if (movies.length === 0) {
      console.log('  No movies found in results');
      return NextResponse.json({
        found: false,
        message: 'No movies found in search results'
      });
    }
    
    // Sort by relevance: exact title + year match is best
    const titleLower = title.toLowerCase().trim();
    const sortedMovies = [...movies].sort((a: any, b: any) => {
      const aTitleMatch = a.title.toLowerCase() === titleLower;
      const bTitleMatch = b.title.toLowerCase() === titleLower;
      const aYearMatch = a.originalReleaseYear === year;
      const bYearMatch = b.originalReleaseYear === year;
      
      // Exact title + year match is best
      if (aTitleMatch && aYearMatch && !(bTitleMatch && bYearMatch)) return -1;
      if (bTitleMatch && bYearMatch && !(aTitleMatch && aYearMatch)) return 1;
      
      // Exact title match is next
      if (aTitleMatch && !bTitleMatch) return -1;
      if (bTitleMatch && !aTitleMatch) return 1;
      
      // Then closest year match
      const aYearDiff = Math.abs((a.originalReleaseYear || 0) - year);
      const bYearDiff = Math.abs((b.originalReleaseYear || 0) - year);
      return aYearDiff - bYearDiff;
    });
    
    const bestMatch: any = sortedMovies[0];
    console.log(`  Found match: ${bestMatch.title} (${bestMatch.originalReleaseYear})`);
    
    // Check if fullPath exists
    if (!bestMatch.fullPath) {
      console.log('  No fullPath found for match');
      return NextResponse.json({
        found: false,
        message: 'Film found but missing fullPath'
      });
    }
    
    // Get detailed data
    const details = await justwatch.getData(bestMatch.fullPath, 'NO');
    
    // Extract streaming offers
    const streaming: any[] = [];
    const rent: any[] = [];
    const buy: any[] = [];
    
    if (details && details.Streams) {
      for (const [provider, offers] of Object.entries(details.Streams)) {
        if (Array.isArray(offers)) {
          offers.forEach((offer: any) => {
            const providerData = {
              provider,
              quality: offer.quality || 'SD',
              price: offer.price || null,
              url: offer.url || null
            };
            
            if (offer.type === 'stream' || offer.monetizationType === 'flatrate') {
              streaming.push(providerData);
            } else if (offer.type === 'rent' || offer.monetizationType === 'rent') {
              rent.push(providerData);
            } else if (offer.type === 'buy' || offer.monetizationType === 'buy') {
              buy.push(providerData);
            }
          });
        }
      }
    }
    
    // Prepare the updated data
    const updatedData = {
      found: true,
      title: bestMatch.title,
      year: bestMatch.originalReleaseYear,
      justwatch_id: bestMatch.id,
      justwatch_url: `https://www.justwatch.com/no/movie/${bestMatch.fullPath.split('/').pop()}`,
      poster_url: bestMatch.posterUrl || null,
      streaming,
      rent,
      buy
    };
    
    // Load current streaming data
    const streamingPath = path.join(process.cwd(), 'data', 'streaming', 'availability.json');
    const content = fs.readFileSync(streamingPath, 'utf-8');
    const streamingData = JSON.parse(content);
    
    // Update the specific film's data (keyed by ID)
    streamingData.films[id] = updatedData;
    streamingData.last_updated = new Date().toISOString();
    
    // Write back to file
    fs.writeFileSync(streamingPath, JSON.stringify(streamingData, null, 2), 'utf-8');
    
    console.log(`  ✓ Updated streaming data for ${id}`);
    console.log(`  ✓ Streaming: ${streaming.length}, Rent: ${rent.length}, Buy: ${buy.length}`);
    
    // Regenerate merged films file to reflect the change
    try {
      console.log('  Regenerating merged films file...');
      const films = await mergeAllFilms();
      const mergedPath = path.join(process.cwd(), 'data', 'merged-films.json');
      const output = {
        generated_at: new Date().toISOString(),
        total_films: films.length,
        films: films
      };
      fs.writeFileSync(mergedPath, JSON.stringify(output, null, 2), 'utf-8');
      console.log(`  ✓ Regenerated merged films file`);
    } catch (regenerateError) {
      console.warn('  ⚠️  Failed to regenerate merged films file:', regenerateError);
      // Don't fail the request if regeneration fails - the data is still updated
    }
    
    return NextResponse.json(updatedData);
  } catch (error) {
    console.error('Error refreshing JustWatch data:', error);
    return NextResponse.json({ 
      error: 'Failed to refresh JustWatch data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

