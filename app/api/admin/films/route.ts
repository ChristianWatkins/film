import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// GET endpoint to fetch all films for admin
export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const filmsPath = path.join(process.cwd(), 'data', 'films.json');
    const content = fs.readFileSync(filmsPath, 'utf-8');
    const data = JSON.parse(content);
    
    // Load festival appearances for each film
    const festivalsDir = path.join(process.cwd(), 'data', 'festivals');
    const festivalMap = new Map<string, Array<{ name: string; year: string }>>();
    
    const festivalNames = fs.readdirSync(festivalsDir);
    for (const festivalName of festivalNames) {
      const festivalPath = path.join(festivalsDir, festivalName);
      const stat = fs.statSync(festivalPath);
      if (!stat.isDirectory()) continue;
      
      const yearFiles = fs.readdirSync(festivalPath);
      for (const yearFile of yearFiles) {
        if (!yearFile.endsWith('.json')) continue;
        
        const year = yearFile.replace('.json', '').replace(/[-+].*$/, '');
        const filePath = path.join(festivalPath, yearFile);
        const festivalContent = fs.readFileSync(filePath, 'utf-8');
        const filmIds = JSON.parse(festivalContent);
        
        if (Array.isArray(filmIds)) {
          filmIds.forEach(({ id }) => {
            if (!id) return;
            if (!festivalMap.has(id)) {
              festivalMap.set(id, []);
            }
            festivalMap.get(id)!.push({ name: festivalName, year });
          });
        }
      }
    }
    
    // Load streaming data
    const streamingPath = path.join(process.cwd(), 'data', 'streaming', 'availability.json');
    let streamingMap = new Map<string, any>();
    
    try {
      const streamingContent = fs.readFileSync(streamingPath, 'utf-8');
      const streamingData = JSON.parse(streamingContent);
      
      if (streamingData.films) {
        for (const [id, data] of Object.entries(streamingData.films)) {
          streamingMap.set(id, data);
        }
      }
    } catch (error) {
      console.warn('Could not load streaming data:', error);
    }
    
    // Convert films object to array and add festival + streaming data
    const filmsArray = Object.values(data.films).map((film: any) => {
      const streamingInfo = streamingMap.get(film.id);
      
      return {
        ...film,
        festivals: festivalMap.get(film.id) || [],
        // Add JustWatch streaming data
        justwatch_url: streamingInfo?.justwatch_url || null,
        justwatch_found: streamingInfo?.found || false,
        streaming: streamingInfo?.streaming || [],
        rent: streamingInfo?.rent || [],
        buy: streamingInfo?.buy || []
      };
    });
    
    return NextResponse.json({ 
      films: filmsArray,
      total: data.total_films,
      last_updated: data.last_updated
    });
  } catch (error) {
    console.error('Error loading films:', error);
    return NextResponse.json({ error: 'Failed to load films' }, { status: 500 });
  }
}

