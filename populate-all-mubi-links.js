#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Production script to find and populate ALL Mubi links for arthaus films
 */

// Function to make HTTP request and check if URL exists
async function checkUrlExists(url) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    return response.status === 200 || (response.status >= 300 && response.status < 400);
  } catch (error) {
    console.log(`     Error checking ${url}: ${error.message}`);
    return false;
  }
}

// Function to normalize film titles for URL generation
function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[åäáàâã]/g, 'a')
    .replace(/[øöóòôõ]/g, 'o')
    .replace(/[üúùû]/g, 'u')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Function to generate potential Mubi URLs
function generatePotentialMubiUrls(film) {
  const baseUrl = 'https://mubi.com/en/no/films/';
  const urls = [];
  
  // Try with normalized title
  const normalizedTitle = normalizeTitle(film.title);
  if (normalizedTitle) {
    urls.push(baseUrl + normalizedTitle);
    urls.push(baseUrl + normalizedTitle + '-' + film.year);
  }
  
  // Try with normalized original title if different
  if (film.original_title && film.original_title !== film.title) {
    const normalizedOriginal = normalizeTitle(film.original_title);
    if (normalizedOriginal && normalizedOriginal !== normalizedTitle) {
      urls.push(baseUrl + normalizedOriginal);
      urls.push(baseUrl + normalizedOriginal + '-' + film.year);
    }
  }
  
  return [...new Set(urls)];
}

async function populateAllMubiLinks() {
  try {
    console.log('🚀 Production Mubi link population for ALL arthaus films...\n');
    
    // Load arthaus films
    const arthausPath = path.join(__dirname, 'data/festivals/arthaus/all_films.json');
    const arthausData = JSON.parse(fs.readFileSync(arthausPath, 'utf8'));
    
    if (!arthausData.films || !Array.isArray(arthausData.films)) {
      console.error('❌ Invalid arthaus data structure');
      return;
    }
    
    const films = arthausData.films;
    console.log(`📊 Processing ${films.length} arthaus films...\n`);
    
    // Create backup
    const backupPath = path.join(__dirname, 'data/festivals/arthaus/all_films_backup_' + Date.now() + '.json');
    fs.writeFileSync(backupPath, JSON.stringify(arthausData, null, 2));
    console.log(`💾 Backup created: ${backupPath}\n`);
    
    let foundLinks = 0;
    let processedFilms = 0;
    const results = [];
    
    // Process all films
    for (let i = 0; i < films.length; i++) {
      const film = films[i];
      processedFilms++;
      
      console.log(`${processedFilms}/${films.length} Processing: "${film.title}" (${film.year})`);
      
      const potentialUrls = generatePotentialMubiUrls(film);
      
      // Try each URL
      let foundUrl = null;
      for (const url of potentialUrls) {
        const exists = await checkUrlExists(url);
        if (exists) {
          foundUrl = url;
          break;
        }
        
        // Small delay between URL checks
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      if (foundUrl) {
        film.link = foundUrl;
        foundLinks++;
        console.log(`   ✅ Found: ${foundUrl}`);
        results.push({ film: film.title, url: foundUrl, status: 'found' });
      } else {
        console.log(`   ❌ No Mubi link found`);
        results.push({ film: film.title, url: null, status: 'not_found' });
      }
      
      // Progress update every 10 films
      if (processedFilms % 10 === 0) {
        const percentage = ((processedFilms / films.length) * 100).toFixed(1);
        const successRate = ((foundLinks / processedFilms) * 100).toFixed(1);
        console.log(`\n📊 Progress: ${processedFilms}/${films.length} (${percentage}%) - Success rate: ${successRate}%\n`);
      }
      
      // Delay between films to be respectful to Mubi's servers
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n🎉 FINAL RESULTS:');
    console.log('==========================================');
    console.log(`Total films processed: ${processedFilms}`);
    console.log(`Mubi links found: ${foundLinks}`);
    console.log(`Success rate: ${((foundLinks/processedFilms)*100).toFixed(1)}%`);
    console.log(`Films without Mubi links: ${processedFilms - foundLinks}`);
    
    // Update the timestamp
    arthausData.last_updated = new Date().toISOString();
    arthausData.mubi_links_populated = true;
    arthausData.mubi_links_found = foundLinks;
    arthausData.mubi_success_rate = ((foundLinks/processedFilms)*100).toFixed(1) + '%';
    
    // Save updated data
    const updatedPath = path.join(__dirname, 'data/festivals/arthaus/all_films.json');
    fs.writeFileSync(updatedPath, JSON.stringify(arthausData, null, 2));
    console.log(`\n💾 Updated data saved to: ${updatedPath}`);
    
    // Save detailed results
    const resultsPath = path.join(__dirname, 'mubi-population-results.json');
    const fullResults = {
      timestamp: new Date().toISOString(),
      total_films: processedFilms,
      found_links: foundLinks,
      success_rate: ((foundLinks/processedFilms)*100).toFixed(1) + '%',
      results: results
    };
    fs.writeFileSync(resultsPath, JSON.stringify(fullResults, null, 2));
    console.log(`📋 Detailed results saved to: ${resultsPath}`);
    
    console.log('\n🎬 Next steps:');
    console.log('1. Check the web app - Mubi buttons should now work for arthaus films!');
    console.log('2. Films without Mubi links will not show the Mubi button (this is expected)');
    console.log('3. Consider adding cast data from TMDB if needed');
    
  } catch (error) {
    console.error('❌ Error in production Mubi search:', error);
  }
}

// Run the production search
populateAllMubiLinks();