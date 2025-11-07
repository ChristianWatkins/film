import fs from 'fs';
import path from 'path';

/**
 * DEDUPLICATE ENHANCED TMDB FILMS
 * 
 * Remove duplicates while merging and preserving as much information as possible
 */

function deduplicateEnhancedTmdb() {
  console.log('🔍 Deduplicating enhanced TMDB films...');
  
  try {
    const filePath = 'data/enhanced/enhanced-films-tmdb.json';
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    const films = data.films || [];
    
    console.log(`Original film count: ${films.length}`);
    
    // Group films by unique identifier (prefer TMDB ID, fallback to title+year)
    const filmGroups = new Map();
    
    films.forEach((film, index) => {
      // Create unique key - prefer TMDB ID, fallback to title+year
      let key;
      if (film.tmdb_id) {
        key = `tmdb_${film.tmdb_id}`;
      } else {
        const title = (film.title || film.tmdb_title || 'unknown').toLowerCase().trim();
        const year = film.year || film.release_date?.substring(0, 4) || 'unknown';
        key = `title_${title}_${year}`;
      }
      
      if (!filmGroups.has(key)) {
        filmGroups.set(key, []);
      }
      
      filmGroups.get(key).push({ ...film, originalIndex: index });
    });
    
    // Find duplicates
    const duplicateGroups = Array.from(filmGroups.entries()).filter(([key, films]) => films.length > 1);
    console.log(`Found ${duplicateGroups.length} duplicate groups:`);
    
    duplicateGroups.forEach(([key, duplicates]) => {
      console.log(`  ${key}: ${duplicates.length} copies`);
      duplicates.forEach((film, i) => {
        console.log(`    ${i + 1}. "${film.title}" - MUBI: ${film.mubiLink ? 'YES' : 'NO'}`);
      });
    });
    
    // Merge duplicates, keeping the most complete information
    const deduplicatedFilms = [];
    
    filmGroups.forEach((filmGroup, key) => {
      if (filmGroup.length === 1) {
        // No duplicates, keep as is
        const { originalIndex, ...film } = filmGroup[0];
        deduplicatedFilms.push(film);
      } else {
        // Merge duplicates
        console.log(`\n🔄 Merging ${filmGroup.length} copies of: ${filmGroup[0].title}`);
        
        const mergedFilm = {};
        
        // Start with the first film as base
        Object.assign(mergedFilm, filmGroup[0]);
        delete mergedFilm.originalIndex;
        
        // Merge information from other copies
        filmGroup.slice(1).forEach((duplicate, i) => {
          console.log(`  Merging copy ${i + 2}...`);
          
          Object.keys(duplicate).forEach(key => {
            if (key === 'originalIndex') return;
            
            const currentValue = mergedFilm[key];
            const newValue = duplicate[key];
            
            // Merge logic: prefer non-empty, non-null values
            if (newValue !== null && newValue !== undefined && newValue !== '') {
              if (currentValue === null || currentValue === undefined || currentValue === '') {
                // Current is empty, use new value
                mergedFilm[key] = newValue;
                console.log(`    Added ${key}: ${newValue}`);
              } else if (currentValue !== newValue) {
                // Values differ, decide what to keep
                if (key === 'mubiLink' && newValue && !currentValue) {
                  // Prefer non-empty MUBI links
                  mergedFilm[key] = newValue;
                  console.log(`    Updated ${key}: ${newValue}`);
                } else if (Array.isArray(currentValue) && Array.isArray(newValue)) {
                  // Merge arrays, remove duplicates
                  const merged = [...new Set([...currentValue, ...newValue])];
                  mergedFilm[key] = merged;
                  console.log(`    Merged ${key}: ${merged.length} items`);
                } else if (typeof currentValue === 'object' && typeof newValue === 'object') {
                  // Merge objects
                  mergedFilm[key] = { ...currentValue, ...newValue };
                  console.log(`    Merged ${key} object`);
                }
                // For other conflicts, keep the first value (could be enhanced later)
              }
            }
          });
        });
        
        deduplicatedFilms.push(mergedFilm);
        console.log(`  ✅ Merged into single entry`);
      }
    });
    
    // Sort by title for consistency
    deduplicatedFilms.sort((a, b) => {
      const titleA = (a.title || a.tmdb_title || '').toLowerCase();
      const titleB = (b.title || b.tmdb_title || '').toLowerCase();
      return titleA.localeCompare(titleB);
    });
    
    console.log(`\n📊 DEDUPLICATION COMPLETE:`);
    console.log(`  Original films: ${films.length}`);
    console.log(`  Deduplicated films: ${deduplicatedFilms.length}`);
    console.log(`  Removed duplicates: ${films.length - deduplicatedFilms.length}`);
    
    // Create backup of original file
    const backupPath = `${filePath}.backup.${Date.now()}`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`  Backup created: ${backupPath}`);
    
    // Create updated data structure
    const updatedData = {
      ...data,
      films: deduplicatedFilms,
      total_films: deduplicatedFilms.length,
      last_updated: new Date().toISOString(),
      deduplication_applied: true,
      original_count: films.length,
      duplicates_removed: films.length - deduplicatedFilms.length
    };
    
    // Write deduplicated file
    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
    console.log(`  ✅ Deduplicated file written: ${filePath}`);
    
    // Verify the "Red Like the Sky" case specifically
    const redLikeTheSkyFilms = deduplicatedFilms.filter(film => 
      film.tmdb_title?.toLowerCase().includes('red like the sky') ||
      film.original_title?.toLowerCase().includes('rosso come il cielo')
    );
    
    console.log(`\n🎬 "Red Like the Sky" verification:`);
    console.log(`  Found ${redLikeTheSkyFilms.length} entry(ies)`);
    
    redLikeTheSkyFilms.forEach((film, i) => {
      console.log(`  ${i + 1}. Title: "${film.title}"`);
      console.log(`     TMDB Title: "${film.tmdb_title}"`);
      console.log(`     TMDB ID: ${film.tmdb_id}`);
      console.log(`     MUBI Link: ${film.mubiLink || 'none'}`);
      console.log(`     Year: ${film.year}`);
    });
    
    return {
      originalCount: films.length,
      deduplicatedCount: deduplicatedFilms.length,
      removedDuplicates: films.length - deduplicatedFilms.length,
      backupPath
    };
    
  } catch (error) {
    console.error('Error deduplicating films:', error);
    return null;
  }
}

// Run the deduplication
if (import.meta.url === `file://${process.argv[1]}`) {
  deduplicateEnhancedTmdb();
}

export { deduplicateEnhancedTmdb };