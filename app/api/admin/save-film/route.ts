import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface FestivalAppearance {
  name: string;
  year: string;
}

interface MasterFilm {
  id: string; // Short code - the permanent, unchanging identifier
  filmKey: string; // For backward compatibility
  title: string; // English title from TMDB
  year: number;
  director: string | null;
  country: string | null;
  mubiLink: string | null;
  tmdb_id: number | null;
  imdb_id?: string | null;
  poster_url_tmdb?: string | null;
  // TMDB fields
  original_title?: string; // Original language title from TMDB
  synopsis?: string;
  genres?: string[];
  runtime?: number;
  // Festival appearances (not stored in film data)
  festivals?: FestivalAppearance[];
}

interface MasterFilmsData {
  last_updated: string;
  total_films: number;
  films: Record<string, MasterFilm>;
}

// POST endpoint to save film changes
export async function POST(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const updatedFilm: MasterFilm = await request.json();
    
    // Validate required fields
    if (!updatedFilm.id || !updatedFilm.title || !updatedFilm.year) {
      return NextResponse.json({ error: 'Missing required fields (id, title, year)' }, { status: 400 });
    }
    
    // Load current films data
    const filmsPath = path.join(process.cwd(), 'data', 'films.json');
    const content = fs.readFileSync(filmsPath, 'utf-8');
    const data: MasterFilmsData = JSON.parse(content);
    
    // Check if film exists (using ID as key now!)
    if (!data.films[updatedFilm.id]) {
      return NextResponse.json({ error: 'Film not found' }, { status: 404 });
    }
    
    // Extract festivals before saving (they're stored separately)
    const festivals = updatedFilm.festivals || [];
    const filmToSave = { ...updatedFilm };
    delete filmToSave.festivals;
    
    // Update the film (keyed by ID)
    data.films[updatedFilm.id] = filmToSave;
    data.last_updated = new Date().toISOString();
    
    // Write back to file with pretty formatting
    fs.writeFileSync(filmsPath, JSON.stringify(data, null, 2), 'utf-8');
    
    // Update festival files
    const festivalsDir = path.join(process.cwd(), 'data', 'festivals');
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
        let filmIds: Array<{ id: string }> = JSON.parse(festivalContent);
        
        if (!Array.isArray(filmIds)) continue;
        
        // Check if this film should be in this festival
        const shouldInclude = festivals.some(f => f.name === festivalName && f.year === year);
        const isIncluded = filmIds.some(f => f.id === updatedFilm.id);
        
        if (shouldInclude && !isIncluded) {
          // Add film to festival
          filmIds.push({ id: updatedFilm.id });
          fs.writeFileSync(filePath, JSON.stringify(filmIds, null, 2), 'utf-8');
        } else if (!shouldInclude && isIncluded) {
          // Remove film from festival
          filmIds = filmIds.filter(f => f.id !== updatedFilm.id);
          fs.writeFileSync(filePath, JSON.stringify(filmIds, null, 2), 'utf-8');
        }
      }
    }
    
    console.log(`✓ Updated film: ${updatedFilm.title} (${updatedFilm.year}) [${updatedFilm.id}]`);
    console.log(`✓ Updated festival appearances: ${festivals.length} festivals`);
    
    return NextResponse.json({ 
      success: true,
      film: updatedFilm
    });
  } catch (error) {
    console.error('Error saving film:', error);
    return NextResponse.json({ error: 'Failed to save film' }, { status: 500 });
  }
}
