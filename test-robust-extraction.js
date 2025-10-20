import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { extractFilmDataRobust } from './robust-mubi-extractor.js';

puppeteer.use(StealthPlugin());

async function testRobustExtraction() {
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
        title: "MATT AND MARA",
        director: "Kazik Radwanski",
        year: 2024,
        runtime: 80
      }
    }
  ];

  for (const film of testFilms) {
    console.log(`\n🎬 TESTING ROBUST EXTRACTION: ${film.title}`);
    console.log(`📍 URL: ${film.url}`);
    
    const page = await browser.newPage();
    
    try {
      await page.goto(film.url, { waitUntil: 'networkidle0', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log('⚡ Extracting data with robust method...');
      const extractedData = await extractFilmDataRobust(page);
      
      // Display results
      console.log('\n📊 ROBUST EXTRACTION RESULTS:');
      console.log(`   Title: "${extractedData.title}"`);
      console.log(`   Original Title: "${extractedData.originalTitle}"`);
      console.log(`   Director: "${extractedData.director}"`);
      console.log(`   Year: ${extractedData.year}`);
      console.log(`   Runtime: ${extractedData.runtime} minutes`);
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
      
    } catch (error) {
      console.error(`❌ Error testing ${film.title}:`, error.message);
    }
    
    await page.close();
    console.log('\n' + '='.repeat(80));
  }
  
  await browser.close();
  console.log('\n✨ Robust extraction test complete!');
}

testRobustExtraction().catch(console.error);