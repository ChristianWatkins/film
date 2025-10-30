#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script to find and populate missing Mubi links for arthaus films
 * Also checks for missing data like synopsis, cast, runtime, etc.
 */

// Function to normalize film titles for URL generation
function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Function to generate potential Mubi URLs
function generatePotentialMubiUrls(film) {
  const baseUrl = 'https://mubi.com/en/no/films/';
  const urls = [];
  
  // Try with normalized original title
  if (film.original_title && film.original_title !== film.title) {
    urls.push(baseUrl + normalizeTitle(film.original_title));
  }
  
  // Try with normalized title
  urls.push(baseUrl + normalizeTitle(film.title));
  
  // Try with year suffix
  urls.push(baseUrl + normalizeTitle(film.title) + '-' + film.year);
  
  // Try with director's last name
  if (film.director) {
    const directorLastName = film.director.split(' ').pop().toLowerCase();
    urls.push(baseUrl + normalizeTitle(film.title) + '-' + directorLastName);
  }
  
  return urls;
}

// Function to check missing data fields
function checkMissingData(film) {
  const missing = [];
  
  if (!film.link || film.link === '') missing.push('mubi_link');
  if (!film.synopsis && !film.overview) missing.push('synopsis');
  if (!film.cast || film.cast.length === 0) missing.push('cast');
  if (!film.runtime && !film.runtime) missing.push('runtime');
  if (!film.genres || film.genres.length === 0) missing.push('genres');
  if (!film.poster_path && !film.posterUrl) missing.push('poster');
  if (!film.vote_average) missing.push('rating');
  
  return missing;
}

async function analyzeArthausFilms() {
  try {
    console.log('🎬 Analyzing arthaus films for missing Mubi links and data...\n');
    
    // Load arthaus films
    const arthausPath = path.join(__dirname, 'data/festivals/arthaus/all_films.json');
    const arthausData = JSON.parse(fs.readFileSync(arthausPath, 'utf8'));
    
    if (!arthausData.films || !Array.isArray(arthausData.films)) {
      console.error('❌ Invalid arthaus data structure');
      return;
    }
    
    const films = arthausData.films;
    console.log(`📊 Found ${films.length} arthaus films to analyze\n`);
    
    // Analyze each film
    const analysis = films.map((film, index) => {
      const potentialUrls = generatePotentialMubiUrls(film);
      const missingData = checkMissingData(film);
      
      return {
        index: index + 1,
        title: film.title,
        year: film.year,
        director: film.director,
        country: film.country,
        originalTitle: film.original_title,
        currentLink: film.link,
        potentialMubiUrls: potentialUrls,
        missingData,
        hasCompleteData: missingData.length === 0
      };
    });
    
    // Summary statistics
    const filmsWithoutMubiLinks = analysis.filter(f => !f.currentLink || f.currentLink === '').length;
    const filmsWithMissingData = analysis.filter(f => !f.hasCompleteData).length;
    
    console.log('📈 SUMMARY STATISTICS:');
    console.log(`   Total films: ${films.length}`);
    console.log(`   Films without Mubi links: ${filmsWithoutMubiLinks} (${((filmsWithoutMubiLinks/films.length)*100).toFixed(1)}%)`);
    console.log(`   Films with missing data: ${filmsWithMissingData} (${((filmsWithMissingData/films.length)*100).toFixed(1)}%)`);
    console.log('\n');
    
    // Show films without Mubi links
    console.log('🔗 FILMS WITHOUT MUBI LINKS:');
    console.log('========================================');
    const noMubiLinks = analysis.filter(f => !f.currentLink || f.currentLink === '');
    
    noMubiLinks.slice(0, 10).forEach(film => {
      console.log(`${film.index}. "${film.title}" (${film.year})`);
      console.log(`   Director: ${film.director || 'Unknown'}`);
      console.log(`   Country: ${film.country || 'Unknown'}`);
      if (film.originalTitle && film.originalTitle !== film.title) {
        console.log(`   Original Title: ${film.originalTitle}`);
      }
      console.log('   Potential Mubi URLs:');
      film.potentialMubiUrls.forEach((url, i) => {
        console.log(`     ${i + 1}. ${url}`);
      });
      console.log('');
    });
    
    if (noMubiLinks.length > 10) {
      console.log(`... and ${noMubiLinks.length - 10} more films\n`);
    }
    
    // Show data completeness analysis
    console.log('📊 DATA COMPLETENESS ANALYSIS:');
    console.log('========================================');
    
    const dataFields = ['mubi_link', 'synopsis', 'cast', 'runtime', 'genres', 'poster', 'rating'];
    dataFields.forEach(field => {
      const missingCount = analysis.filter(f => f.missingData.includes(field)).length;
      const percentage = ((missingCount / films.length) * 100).toFixed(1);
      console.log(`${field.padEnd(12)}: ${missingCount.toString().padStart(3)} missing (${percentage}%)`);
    });
    
    console.log('\n📝 RECOMMENDATIONS:');
    console.log('========================================');
    console.log('1. Create a Mubi search script to automatically find correct links');
    console.log('2. Use the TMDB data we already have to fill missing synopsis/cast/runtime');
    console.log('3. Consider manual verification for films with ambiguous titles');
    console.log('4. Some films might not be available on Mubi (independent/art house films)');
    
    // Save detailed analysis to file
    const outputPath = path.join(__dirname, 'arthaus-analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`\n💾 Detailed analysis saved to: ${outputPath}`);
    
    // Generate a sample search script
    console.log('\n🔍 NEXT STEPS:');
    console.log('Run the following to search for Mubi links:');
    console.log('node search-mubi-links.js');
    
  } catch (error) {
    console.error('❌ Error analyzing arthaus films:', error);
  }
}

// Run the analysis
analyzeArthausFilms();