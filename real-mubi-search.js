#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script to actually search for and verify Mubi links
 * Uses real HTTP requests to check if URLs exist
 */

// Function to make HTTP request and check if URL exists
async function checkUrlExists(url) {
  try {
    const response = await fetch(url, {
      method: 'HEAD', // Just check headers, don't download content
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    // Consider 200 and 301/302 (redirects) as valid
    return response.status === 200 || (response.status >= 300 && response.status < 400);
  } catch (error) {
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
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
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
  
  return [...new Set(urls)]; // Remove duplicates
}

async function realMubiSearch() {
  try {
    console.log('🔍 Real Mubi link search for arthaus films...\n');
    
    // Load arthaus films
    const arthausPath = path.join(__dirname, 'data/festivals/arthaus/all_films.json');
    const arthausData = JSON.parse(fs.readFileSync(arthausPath, 'utf8'));
    
    if (!arthausData.films || !Array.isArray(arthausData.films)) {
      console.error('❌ Invalid arthaus data structure');
      return;
    }
    
    const films = arthausData.films;
    console.log(`📊 Checking Mubi links for first 5 films as test...\n`);
    
    let foundLinks = 0;
    let processedFilms = 0;
    
    // Process just first 5 films as a test
    for (let i = 0; i < Math.min(films.length, 5); i++) {
      const film = films[i];
      processedFilms++;
      
      console.log(`${processedFilms}/5 Testing: "${film.title}" (${film.year})`);
      
      const potentialUrls = generatePotentialMubiUrls(film);
      console.log(`   Generated ${potentialUrls.length} potential URLs`);
      
      // Try each URL
      let foundUrl = null;
      for (const url of potentialUrls) {
        console.log(`   Checking: ${url}`);
        const exists = await checkUrlExists(url);
        if (exists) {
          foundUrl = url;
          console.log(`   ✅ Found working link!`);
          break;
        } else {
          console.log(`   ❌ Not found`);
        }
        
        // Delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (foundUrl) {
        film.link = foundUrl;
        foundLinks++;
        console.log(`   🎯 Updated film with Mubi link: ${foundUrl}`);
      } else {
        console.log(`   🚫 No working Mubi link found`);
      }
      
      console.log('');
      
      // Delay between films
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('📈 TEST RESULTS:');
    console.log(`   Films tested: ${processedFilms}`);
    console.log(`   Working Mubi links found: ${foundLinks}`);
    console.log(`   Success rate: ${((foundLinks/processedFilms)*100).toFixed(1)}%`);
    
    if (foundLinks > 0) {
      // Save test results
      const testPath = path.join(__dirname, 'arthaus-mubi-test-results.json');
      const testResults = {
        tested_films: films.slice(0, 5),
        found_links: foundLinks,
        success_rate: ((foundLinks/processedFilms)*100).toFixed(1) + '%',
        timestamp: new Date().toISOString()
      };
      fs.writeFileSync(testPath, JSON.stringify(testResults, null, 2));
      console.log(`\n💾 Test results saved to: ${testPath}`);
      
      console.log('\n📝 If test results look good:');
      console.log('1. Increase the batch size to process more films');
      console.log('2. Implement proper error handling and retries');
      console.log('3. Add progress tracking for large batches');
    }
    
  } catch (error) {
    console.error('❌ Error in real Mubi search:', error);
  }
}

// Run the real search
realMubiSearch();