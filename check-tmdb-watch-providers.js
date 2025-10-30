#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TMDB_API_KEY = '9102b417bbb071f193fdba0120be2153';

/**
 * Check TMDB watch providers to see if Mubi is listed for arthaus films
 */

async function checkTMDBWatchProviders() {
  try {
    console.log('🔍 Checking TMDB watch providers for arthaus films...\n');
    
    // Load arthaus films
    const arthausPath = path.join(__dirname, 'data/festivals/arthaus/all_films.json');
    const arthausData = JSON.parse(fs.readFileSync(arthausPath, 'utf8'));
    
    const films = arthausData.films;
    console.log(`📊 Checking first 5 films for TMDB watch providers...\n`);
    
    // First, let's check what watch providers are available
    const providersResponse = await fetch(`https://api.themoviedb.org/3/watch/providers/movie?api_key=${TMDB_API_KEY}&watch_region=NO`);
    const providersData = await providersResponse.json();
    
    console.log('🎬 Available watch providers in Norway:');
    const mubiProvider = providersData.results?.find(p => p.provider_name.toLowerCase().includes('mubi'));
    if (mubiProvider) {
      console.log(`✅ Found Mubi provider: ID ${mubiProvider.provider_id} - ${mubiProvider.provider_name}`);
    } else {
      console.log('❌ Mubi not found in Norwegian watch providers');
      // Check a few providers to see what's available
      console.log('Available providers:', providersData.results?.slice(0, 10).map(p => p.provider_name).join(', '));
    }
    console.log('');
    
    // Now check watch providers for specific films
    for (let i = 0; i < Math.min(films.length, 5); i++) {
      const film = films[i];
      
      if (!film.tmdb_id) {
        console.log(`❌ Skipping "${film.title}" - no TMDB ID`);
        continue;
      }
      
      console.log(`${i + 1}. Checking "${film.title}" (TMDB ID: ${film.tmdb_id})`);
      
      try {
        const response = await fetch(`https://api.themoviedb.org/3/movie/${film.tmdb_id}/watch/providers?api_key=${TMDB_API_KEY}`);
        const data = await response.json();
        
        console.log(`   Status: ${response.status}`);
        
        if (data.results) {
          // Check Norway specifically
          const norwayData = data.results['NO'];
          if (norwayData) {
            const allProviders = [
              ...(norwayData.flatrate || []),
              ...(norwayData.rent || []),
              ...(norwayData.buy || [])
            ];
            
            console.log(`   Norway providers: ${allProviders.length} found`);
            allProviders.forEach(provider => {
              console.log(`     - ${provider.provider_name} (ID: ${provider.provider_id})`);
              if (provider.provider_name.toLowerCase().includes('mubi')) {
                console.log(`       🎯 MUBI FOUND! Provider ID: ${provider.provider_id}`);
              }
            });
            
            if (allProviders.length === 0) {
              console.log('   ❌ No streaming providers found for Norway');
            }
          } else {
            console.log('   ❌ No Norway data found');
          }
          
          // Check if there's data for other regions
          const regions = Object.keys(data.results);
          if (regions.length > 0) {
            console.log(`   Other regions with data: ${regions.join(', ')}`);
          }
        } else {
          console.log('   ❌ No watch provider data available');
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      
      console.log('');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    }
    
    console.log('📝 CONCLUSION:');
    console.log('If Mubi is not showing up in TMDB watch providers, it suggests:');
    console.log('1. Mubi might not be integrated with TMDB watch provider data');
    console.log('2. These specific films might not be available on Mubi in Norway');
    console.log('3. The watch provider data might be incomplete');
    console.log('4. We may need to use direct Mubi URL construction as planned');
    
  } catch (error) {
    console.error('❌ Error checking TMDB watch providers:', error);
  }
}

// Run the check
checkTMDBWatchProviders();