import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface MasterFilmsData {
  last_updated: string;
  total_films: number;
  films: Record<string, any>;
}

// DELETE endpoint to remove a film
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
    
    // Load current films data
    const filmsPath = path.join(process.cwd(), 'data', 'films.json');
    const content = fs.readFileSync(filmsPath, 'utf-8');
    const data: MasterFilmsData = JSON.parse(content);
    
    // Check if film exists
    if (!data.films[id]) {
      return NextResponse.json({ error: 'Film not found' }, { status: 404 });
    }
    
    const filmTitle = data.films[id].title;
    
    // Remove film from films.json
    delete data.films[id];
    data.total_films = Object.keys(data.films).length;
    data.last_updated = new Date().toISOString();
    
    // Write back to file
    fs.writeFileSync(filmsPath, JSON.stringify(data, null, 2), 'utf-8');
    
    // Remove from all festival files
    const festivalsDir = path.join(process.cwd(), 'data', 'festivals');
    const festivalNames = fs.readdirSync(festivalsDir);
    let removedFromFestivals = 0;
    
    for (const festivalName of festivalNames) {
      const festivalPath = path.join(festivalsDir, festivalName);
      const stat = fs.statSync(festivalPath);
      if (!stat.isDirectory()) continue;
      
      const yearFiles = fs.readdirSync(festivalPath);
      for (const yearFile of yearFiles) {
        if (!yearFile.endsWith('.json')) continue;
        
        const filePath = path.join(festivalPath, yearFile);
        const festivalContent = fs.readFileSync(filePath, 'utf-8');
        let filmIds: Array<{ id: string }> = JSON.parse(festivalContent);
        
        if (!Array.isArray(filmIds)) continue;
        
        const originalLength = filmIds.length;
        filmIds = filmIds.filter(f => f.id !== id);
        
        if (filmIds.length < originalLength) {
          fs.writeFileSync(filePath, JSON.stringify(filmIds, null, 2), 'utf-8');
          removedFromFestivals++;
        }
      }
    }
    
    console.log(`✓ Deleted film: ${filmTitle} [${id}]`);
    console.log(`✓ Removed from ${removedFromFestivals} festival files`);
    
    return NextResponse.json({ 
      success: true,
      message: `Film deleted successfully`,
      removedFromFestivals
    });
  } catch (error) {
    console.error('Error deleting film:', error);
    return NextResponse.json({ error: 'Failed to delete film' }, { status: 500 });
  }
}

