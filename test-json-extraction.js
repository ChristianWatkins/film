import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { extractFilmDataFromJSON, validateExtractedData } from './json-mubi-extractor.js';

puppeteer.use(StealthPlugin());

async function testJSONExtraction() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const testFilms = [
    { 
      title: "MATT AND MARA", 
      url: "https://mubi.com/en/no/films/matt-and-mara",
      expected: {
        title: "Matt and Mara",
        director: "Kazik Radwanski",
        year: 2024,
        runtime: 80,
        country: "Canada"
      }
    },
    { 
      title: "FLOW", 
      url: "https://mubi.com/en/no/films/flow-2024",
      expected: {
        title: "Flow",
        director: "Gints Zilbalodis", 
        year: 2024
      }
    },
    { 
      title: "DÌDI", 
      url: "https://mubi.com/en/no/films/didi",
      expected: {
        title: "Dìdi",
        director: "Sean Wang",
        year: 2024
      }
    }
  ];

  const results = [];

  for (const film of testFilms) {
    console.log(`\n🎬 TESTING JSON EXTRACTION: ${film.title}`);
    console.log(`📍 URL: ${film.url}`);
    
    const page = await browser.newPage();
    
    try {
      await page.goto(film.url, { waitUntil: 'networkidle0', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('⚡ Extracting data with JSON method...');
      const extractedData = await extractFilmDataFromJSON(page);
      
      console.log('✅ Validating data...');
      const validation = validateExtractedData(extractedData);
      
      // Display results
      console.log('\n📊 JSON EXTRACTION RESULTS:');
      console.log(`   Data Source: ${extractedData.extractionMetadata.dataSource}`);
      console.log(`   Title: "${extractedData.title}"`);
      console.log(`   Original Title: "${extractedData.originalTitle}"`);
      console.log(`   Director: "${extractedData.director}"`);
      console.log(`   Year: ${extractedData.year}`);
      console.log(`   Runtime: ${extractedData.runtime} minutes`);
      console.log(`   Country: "${extractedData.country}"`);
      console.log(`   Genres: [${extractedData.genres.join(', ')}]`);
      console.log(`   Synopsis: "${extractedData.synopsis?.substring(0, 100)}..."`);
      console.log(`   Streaming Available: ${extractedData.streamingAvailable}`);
      
      console.log(`\n📈 EXTRACTION METADATA:`);
      console.log(`   Success Rate: ${(extractedData.extractionMetadata.successRate * 100).toFixed(1)}%`);
      console.log(`   Successful Fields: ${Object.entries(extractedData.extractionMetadata.extractionSuccess).filter(([k,v]) => v).map(([k,v]) => k).join(', ')}`);
      console.log(`   Failed Fields: ${Object.entries(extractedData.extractionMetadata.extractionSuccess).filter(([k,v]) => !v).map(([k,v]) => k).join(', ')}`);
      
      if (extractedData.extractionMetadata.extractionErrors.length > 0) {
        console.log(`   Errors: ${extractedData.extractionMetadata.extractionErrors.join('; ')}`);
      }
      
      console.log(`\n🔍 VALIDATION RESULTS:`);
      console.log(`   Valid: ${validation.isValid ? '✅' : '❌'}`);
      console.log(`   Confidence: ${validation.confidence.toUpperCase()}`);
      if (validation.warnings.length > 0) {
        console.log(`   Warnings: ${validation.warnings.join('; ')}`);
      }
      if (validation.errors.length > 0) {
        console.log(`   Errors: ${validation.errors.join('; ')}`);
      }
      
      // Compare with expected values
      console.log(`\n🎯 ACCURACY CHECK:`);
      if (film.expected.title && extractedData.title) {
        const titleMatch = extractedData.title.toLowerCase().includes(film.expected.title.toLowerCase()) ||
                          film.expected.title.toLowerCase().includes(extractedData.title.toLowerCase());
        console.log(`   Title: ${titleMatch ? '✅' : '❌'} (expected: "${film.expected.title}", got: "${extractedData.title}")`);
      }
      
      if (film.expected.director && extractedData.director) {
        const directorMatch = extractedData.director.toLowerCase().includes(film.expected.director.toLowerCase()) ||
                             film.expected.director.toLowerCase().includes(extractedData.director.toLowerCase());
        console.log(`   Director: ${directorMatch ? '✅' : '❌'} (expected: "${film.expected.director}", got: "${extractedData.director}")`);
      }
      
      if (film.expected.year && extractedData.year) {
        const yearMatch = extractedData.year === film.expected.year;
        console.log(`   Year: ${yearMatch ? '✅' : '❌'} (expected: ${film.expected.year}, got: ${extractedData.year})`);
      }
      
      if (film.expected.runtime && extractedData.runtime) {
        const runtimeMatch = Math.abs(extractedData.runtime - film.expected.runtime) <= 5;
        console.log(`   Runtime: ${runtimeMatch ? '✅' : '❌'} (expected: ${film.expected.runtime}, got: ${extractedData.runtime})`);
      }
      
      if (film.expected.country && extractedData.country) {
        const countryMatch = extractedData.country.toLowerCase().includes(film.expected.country.toLowerCase());
        console.log(`   Country: ${countryMatch ? '✅' : '❌'} (expected: "${film.expected.country}", got: "${extractedData.country}")`);
      }
      
      results.push({
        film: film.title,
        extracted: extractedData,
        validation: validation,
        successRate: extractedData.extractionMetadata.successRate,
        dataSource: extractedData.extractionMetadata.dataSource
      });
      
    } catch (error) {
      console.error(`❌ Error testing ${film.title}:`, error.message);
      results.push({
        film: film.title,
        error: error.message,
        successRate: 0,
        dataSource: 'error'
      });
    }
    
    await page.close();
    console.log('\n' + '='.repeat(80));
  }
  
  await browser.close();
  
  // Summary
  console.log('\n🏆 OVERALL SUMMARY:');
  const avgSuccessRate = results.reduce((sum, r) => sum + (r.successRate || 0), 0) / results.length;
  console.log(`Average Success Rate: ${(avgSuccessRate * 100).toFixed(1)}%`);
  
  const successfulExtractions = results.filter(r => r.successRate >= 0.8).length;
  console.log(`Films with >80% extraction success: ${successfulExtractions}/${results.length}`);
  
  const jsonExtractions = results.filter(r => r.dataSource === 'embedded_json').length;
  console.log(`Films using JSON data source: ${jsonExtractions}/${results.length}`);
  
  const highConfidence = results.filter(r => r.validation?.confidence === 'high').length;
  console.log(`Films with high confidence: ${highConfidence}/${results.length}`);
  
  console.log('\n✨ JSON extraction test complete! This method should provide much more reliable data extraction.');
}

testJSONExtraction().catch(console.error);