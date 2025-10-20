import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function finalDebug() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  try {
    console.log('🔍 Final debug on Matt and Mara...');
    await page.goto("https://mubi.com/en/no/films/matt-and-mara", { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 8000)); // Even more time
    
    const debugInfo = await page.evaluate(() => {
      // Check ALL H1 elements and their content
      const h1Elements = Array.from(document.querySelectorAll('h1')).map((h1, index) => ({
        index,
        text: h1.textContent.trim(),
        innerHTML: h1.innerHTML.substring(0, 100),
        className: h1.className,
        hasText: h1.textContent.trim().length > 0
      }));
      
      // Check page title
      const pageTitle = document.title;
      
      // Look for any element that might contain the film title "Matt and Mara"
      const titleCandidates = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text.toLowerCase().includes('matt') && text.toLowerCase().includes('mara')) {
          titleCandidates.push({
            text: text,
            parentTag: node.parentElement.tagName,
            parentClass: node.parentElement.className
          });
        }
      }
      
      // Look for years more specifically
      const yearElements = [];
      document.querySelectorAll('*').forEach(el => {
        if (el.children.length === 0) { // Text nodes only
          const text = el.textContent.trim();
          if (text.match(/\b(202[0-9])\b/)) {
            yearElements.push({
              text: text,
              tag: el.tagName,
              className: el.className,
              year: text.match(/\b(202[0-9])\b/)[1]
            });
          }
        }
      });
      
      return {
        h1Elements,
        pageTitle,
        titleCandidates: titleCandidates.slice(0, 10), // Limit results
        yearElements: yearElements.slice(0, 10)
      };
    });
    
    console.log('\n📋 ALL H1 ELEMENTS:');
    debugInfo.h1Elements.forEach((h1, i) => {
      console.log(`  ${i}: "${h1.text}" (hasText: ${h1.hasText})`);
      console.log(`      Class: ${h1.className}`);
      console.log(`      HTML: ${h1.innerHTML}`);
    });
    
    console.log(`\n📄 PAGE TITLE: "${debugInfo.pageTitle}"`);
    
    console.log(`\n🎯 TITLE CANDIDATES (containing "matt" and "mara"):`);
    debugInfo.titleCandidates.forEach((candidate, i) => {
      console.log(`  ${i}: "${candidate.text}" in ${candidate.parentTag}.${candidate.parentClass}`);
    });
    
    console.log(`\n📅 YEAR ELEMENTS (202X years):`);
    debugInfo.yearElements.forEach((year, i) => {
      console.log(`  ${i}: "${year.text}" (${year.year}) in ${year.tag}.${year.className}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  await page.close();
  await browser.close();
}

finalDebug().catch(console.error);