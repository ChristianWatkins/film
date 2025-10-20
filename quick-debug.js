import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function quickDebug() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  try {
    console.log('🔍 Quick debug on Matt and Mara...');
    await page.goto("https://mubi.com/en/no/films/matt-and-mara", { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 5000)); // Give more time to load
    
    const debugInfo = await page.evaluate(() => {
      // Check title selectors
      const h1Elements = Array.from(document.querySelectorAll('h1')).map(h1 => ({
        text: h1.textContent.trim(),
        className: h1.className,
        selector: 'h1.' + h1.className.split(' ').join('.')
      }));
      
      // Check for the specific title selector
      const titleElement = document.querySelector('h1.css-1kpd5de');
      const titleByCssSelector = document.querySelector('h1.css-1kpd5de.e1d9yd024');
      
      // Check synopsis paragraphs after Synopsis heading
      const synopsisH2 = Array.from(document.querySelectorAll('h2')).find(h => 
        h.textContent.toLowerCase().includes('synopsis')
      );
      
      let synopsisParagraphs = [];
      if (synopsisH2) {
        let nextElement = synopsisH2.nextElementSibling;
        let count = 0;
        while (nextElement && nextElement.tagName !== 'H2' && count < 10) {
          if (nextElement.tagName === 'P') {
            synopsisParagraphs.push({
              text: nextElement.textContent.trim().substring(0, 150) + '...',
              length: nextElement.textContent.trim().length,
              className: nextElement.className
            });
          }
          nextElement = nextElement.nextElementSibling;
          count++;
        }
      }
      
      // Check director elements
      const directorElements = Array.from(document.querySelectorAll('h3')).filter(h3 => 
        h3.textContent.includes('Director')
      ).map(h3 => ({
        text: h3.textContent.trim(),
        className: h3.className
      }));
      
      return {
        h1Elements,
        titleElement: titleElement ? titleElement.textContent.trim() : null,
        titleByCssSelector: titleByCssSelector ? titleByCssSelector.textContent.trim() : null,
        synopsisH2Found: !!synopsisH2,
        synopsisParagraphs,
        directorElements
      };
    });
    
    console.log('\n📋 H1 ELEMENTS:');
    debugInfo.h1Elements.forEach((h1, i) => {
      console.log(`  ${i}: "${h1.text}" (${h1.className})`);
      console.log(`      Selector: ${h1.selector}`);
    });
    
    console.log(`\n🎯 TITLE EXTRACTION:`);
    console.log(`  h1.css-1kpd5de: "${debugInfo.titleElement}"`);
    console.log(`  h1.css-1kpd5de.e1d9yd024: "${debugInfo.titleByCssSelector}"`);
    
    console.log(`\n📝 SYNOPSIS AFTER H2:`);
    console.log(`  Synopsis H2 found: ${debugInfo.synopsisH2Found}`);
    debugInfo.synopsisParagraphs.forEach((p, i) => {
      console.log(`  P${i} (${p.length} chars): "${p.text}"`);
    });
    
    console.log(`\n🎬 DIRECTOR ELEMENTS:`);
    debugInfo.directorElements.forEach((d, i) => {
      console.log(`  ${i}: "${d.text}" (${d.className})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  await page.close();
  await browser.close();
}

quickDebug().catch(console.error);