import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import JustWatchAPI from 'justwatch-api-client';
import { mergeAllFilms } from '@/lib/data';

// Helper function to process JustWatch data and save it
async function processJustWatchData(
  justwatch: any,
  bestMatch: any,
  details: any,
  filmId: string
) {
  // Extract streaming offers
  const streaming: any[] = [];
  const rent: any[] = [];
  const buy: any[] = [];
  
  if (details && details.Streams) {
    // Handle different Streams formats
    if (Array.isArray(details.Streams)) {
      // Format: [{ Provider, Type, Resolution, Price, Link }, ...]
      details.Streams.forEach((stream: any) => {
        const providerData = {
          provider: stream.Provider || stream.provider,
          quality: stream.Resolution || stream.quality || 'SD',
          price: stream.Price || stream.price || null,
          url: stream.Link || stream.url || null
        };
        
        const type = (stream.Type || stream.type || '').toLowerCase();
        if (type.includes('subscription') || type.includes('flatrate') || type.includes('free')) {
          streaming.push(providerData);
        } else if (type.includes('rent')) {
          rent.push(providerData);
        } else if (type.includes('buy') || type.includes('purchase')) {
          buy.push(providerData);
        }
      });
    } else {
      // Format: { ProviderName: [{ type, quality, price, url }, ...] }
      for (const [provider, offers] of Object.entries(details.Streams)) {
        if (Array.isArray(offers)) {
          offers.forEach((offer: any) => {
            const providerData = {
              provider,
              quality: offer.quality || offer.Resolution || 'SD',
              price: offer.price || offer.Price || null,
              url: offer.url || offer.Link || null
            };
            
            const type = (offer.type || offer.Type || '').toLowerCase();
            if (type === 'stream' || type.includes('flatrate') || type.includes('subscription')) {
              streaming.push(providerData);
            } else if (type === 'rent' || type.includes('rent')) {
              rent.push(providerData);
            } else if (type === 'buy' || type.includes('buy')) {
              buy.push(providerData);
            }
          });
        }
      }
    }
  }
  
  // Prepare the updated data
  const slug = bestMatch.fullPath.split('/').pop();
  const updatedData = {
    found: true,
    title: bestMatch.title,
    year: bestMatch.originalReleaseYear,
    justwatch_id: bestMatch.id,
    justwatch_url: `https://www.justwatch.com/no/movie/${slug}`,
    poster_url: bestMatch.posterUrl || details?.posterUrl || details?.poster || null,
    streaming,
    rent,
    buy
  };
  
  // Load current streaming data
  const streamingPath = path.join(process.cwd(), 'data', 'streaming', 'availability.json');
  const content = fs.readFileSync(streamingPath, 'utf-8');
  const streamingData = JSON.parse(content);
  
  // Update the specific film's data (keyed by ID)
  streamingData.films[filmId] = updatedData;
  streamingData.last_updated = new Date().toISOString();
  
  // Write back to file
  fs.writeFileSync(streamingPath, JSON.stringify(streamingData, null, 2), 'utf-8');
  
  console.log(`  ✓ Updated streaming data for ${filmId}`);
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
}

// POST endpoint to refresh JustWatch data for a film
export async function POST(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const { id, title, year, justwatch_url } = await request.json();
    
    if (!id || !title || !year) {
      return NextResponse.json({ error: 'Missing required fields (id, title, year)' }, { status: 400 });
    }
    
    // Initialize JustWatch API
    const justwatch = new JustWatchAPI(15000); // 15 second timeout
    
    // If a JustWatch URL is provided, extract the slug and use it directly
    if (justwatch_url && typeof justwatch_url === 'string') {
      console.log(`Using provided JustWatch URL: ${justwatch_url} [${id}]`);
      
      // Extract slug from URL: https://www.justwatch.com/no/movie/sulis-1907 -> /no/movie/sulis-1907
      const urlMatch = justwatch_url.match(/justwatch\.com\/(.+)$/);
      if (urlMatch) {
        const fullPath = '/' + urlMatch[1];
        console.log(`  Extracted fullPath: ${fullPath}`);
        
        try {
          // Get data directly using the fullPath
          const details = await justwatch.getData(fullPath, 'NO');
          
          if (details) {
            // Create a match-like object from the details
            const bestMatch = {
              id: details.id || details.ID,
              title: details.title || title,
              originalReleaseYear: details.originalReleaseYear || year,
              posterUrl: details.posterUrl || details.poster,
              fullPath: fullPath
            };
            console.log(`  ✓ Found film: ${bestMatch.title} (${bestMatch.originalReleaseYear})`);
            
            // Process streaming data directly
            return await processJustWatchData(justwatch, bestMatch, details, id);
          }
        } catch (error) {
          console.log(`  ⚠️  Failed to fetch data from URL, falling back to search:`, error);
          // Fall through to search
        }
      }
    }
    
    // Fall back to searching by title/year if no URL or URL fetch failed
    console.log(`Searching JustWatch for: "${title}" (${year}) [${id}]`);
    
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
    
    return await processJustWatchData(justwatch, bestMatch, details, id);
  } catch (error) {
    console.error('Error refreshing JustWatch data:', error);
    return NextResponse.json({ 
      error: 'Failed to refresh JustWatch data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

