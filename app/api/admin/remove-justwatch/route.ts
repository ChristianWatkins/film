import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { mergeAllFilms } from '@/lib/data';

// DELETE endpoint to remove JustWatch data for a film
export async function DELETE(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Film ID is required' }, { status: 400 });
    }
    
    console.log(`Removing JustWatch data for film: [${id}]`);
    
    // Load current streaming data
    const streamingPath = path.join(process.cwd(), 'data', 'streaming', 'availability.json');
    
    // Check if file exists
    if (!fs.existsSync(streamingPath)) {
      return NextResponse.json({ 
        success: true,
        message: 'No streaming data file found, nothing to remove'
      });
    }
    
    const content = fs.readFileSync(streamingPath, 'utf-8');
    const streamingData = JSON.parse(content);
    
    // Log available film IDs for debugging (first 10)
    const availableIds = Object.keys(streamingData.films || {}).slice(0, 10);
    console.log(`  Available film IDs in streaming data (sample): ${availableIds.join(', ')}`);
    
    // Check if film has JustWatch data
    if (!streamingData.films || !streamingData.films[id]) {
      console.log(`  ⚠️  Film ID "${id}" not found in streaming data`);
      // Check if there's a similar ID (case-insensitive)
      const matchingId = Object.keys(streamingData.films || {}).find(key => key.toLowerCase() === id.toLowerCase());
      if (matchingId) {
        console.log(`  💡 Found similar ID: "${matchingId}" (case mismatch?)`);
      }
      return NextResponse.json({ 
        success: true,
        message: `Film has no JustWatch data to remove. ID "${id}" not found in streaming data.`
      });
    }
    
    // Log what we're removing
    const removedData = streamingData.films[id];
    console.log(`  Removing JustWatch data:`, {
      id,
      url: removedData?.justwatch_url,
      found: removedData?.found
    });
    
    // Remove the film's JustWatch data
    delete streamingData.films[id];
    streamingData.last_updated = new Date().toISOString();
    
    // Write back to file
    fs.writeFileSync(streamingPath, JSON.stringify(streamingData, null, 2), 'utf-8');
    
    // Verify removal
    const verifyContent = fs.readFileSync(streamingPath, 'utf-8');
    const verifyData = JSON.parse(verifyContent);
    if (verifyData.films[id]) {
      console.error(`  ❌ ERROR: Film ID "${id}" still exists after removal!`);
    } else {
      console.log(`  ✓ Verified: JustWatch data removed for ${id}`);
    }
    
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
      
      // Verify the film no longer has JustWatch link in merged file
      const verifyFilm = films.find(f => f.id === id);
      if (verifyFilm) {
        if (verifyFilm.justwatchLink) {
          console.error(`  ❌ ERROR: Film "${verifyFilm.title}" still has JustWatch link in merged file: ${verifyFilm.justwatchLink}`);
        } else {
          console.log(`  ✓ Verified: Film "${verifyFilm.title}" has no JustWatch link in merged file`);
        }
      }
      
      console.log(`  ✓ Regenerated merged films file with ${films.length} films`);
    } catch (regenerateError) {
      console.error('  ❌ Failed to regenerate merged films file:', regenerateError);
      console.error('  Stack:', regenerateError instanceof Error ? regenerateError.stack : 'No stack trace');
      // Don't fail the request if regeneration fails - the data is still removed
    }
    
    return NextResponse.json({
      success: true,
      message: 'JustWatch data removed successfully'
    });
  } catch (error) {
    console.error('Error removing JustWatch data:', error);
    return NextResponse.json({ 
      error: 'Failed to remove JustWatch data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

