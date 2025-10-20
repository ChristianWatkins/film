import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function debugDirectorExtraction() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  try {
    console.log('🔍 Debugging director extraction on Matt and Mara...');
    await page.goto("https://mubi.com/en/no/films/matt-and-mara", { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const debugInfo = await page.evaluate(() => {
      // Find all H3 elements and their content
      const h3Elements = Array.from(document.querySelectorAll('h3')).map((h3, index) => ({
        index,
        text: h3.textContent.trim(),
        className: h3.className,
        containsDirector: h3.textContent.includes('Director')
      }));
      
      // Find Cast & Crew section specifically
      const castCrewHeading = Array.from(document.querySelectorAll('h2')).find(h => 
        h.textContent.toLowerCase().includes('cast') && h.textContent.toLowerCase().includes('crew')
      );
      
      let castCrewContent = [];
      if (castCrewHeading) {
        let nextElement = castCrewHeading.nextElementSibling;
        let count = 0;
        while (nextElement && nextElement.tagName !== 'H2' && count < 20) {
          if (nextElement.tagName === 'H3') {
            castCrewContent.push({
              text: nextElement.textContent.trim(),
              className: nextElement.className
            });
          }
          nextElement = nextElement.nextElementSibling;
          count++;
        }
      }
      
      return {
        allH3s: h3Elements,
        castCrewSection: castCrewContent,
        castCrewHeadingFound: !!castCrewHeading
      };
    });
    
    console.log('\n📋 ALL H3 ELEMENTS:');
    debugInfo.allH3s.forEach(h3 => {
      console.log(`  ${h3.index}: "${h3.text}" (${h3.className}) [Director: ${h3.containsDirector}]`);
    });
    
    console.log(`\n🎭 CAST & CREW SECTION FOUND: ${debugInfo.castCrewHeadingFound}`);
    console.log('🎭 CAST & CREW CONTENT:');
    debugInfo.castCrewSection.forEach((item, i) => {
      console.log(`  ${i}: "${item.text}" (${item.className})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  await page.close();
  await browser.close();
}

debugDirectorExtraction().catch(console.error);