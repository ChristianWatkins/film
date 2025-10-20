import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

async function analyzeMubiStructure() {
  const browser = await puppeteer.launch({ 
    headless: false, // Show browser so we can see what's happening
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Test films from different sources
  const testFilms = [
    { title: "MATT AND MARA", url: "https://mubi.com/en/no/films/matt-and-mara" },
    { title: "FLOW", url: "https://mubi.com/en/no/films/flow-2024" },
    { title: "DÌDI", url: "https://mubi.com/en/no/films/didi" }
  ];

  for (const film of testFilms) {
    console.log(`\n=== ANALYZING: ${film.title} ===`);
    console.log(`URL: ${film.url}`);
    
    const page = await browser.newPage();
    
    try {
      await page.goto(film.url, { waitUntil: 'networkidle0', timeout: 30000 });
      
      // Wait a bit for dynamic content
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('\n--- PAGE STRUCTURE ANALYSIS ---');
      
      // Get all the text content and basic structure first
      const pageInfo = await page.evaluate(() => {
        return {
          title: document.title,
          headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
            tag: h.tagName,
            text: h.textContent.trim(),
            className: h.className
          })),
          allParagraphs: Array.from(document.querySelectorAll('p')).map((p, index) => ({
            index,
            text: p.textContent.trim().substring(0, 200),
            className: p.className,
            length: p.textContent.trim().length
          }))
        };
      });
      
      console.log(`Page title: ${pageInfo.title}`);
      console.log('\nHeadings found:');
      pageInfo.headings.forEach((h, i) => {
        console.log(`  ${i+1}. ${h.tag}: "${h.text}" (class: ${h.className})`);
      });
      
      console.log('\nParagraphs (potential synopsis):');
      pageInfo.allParagraphs
        .filter(p => p.length > 50) // Only show substantial paragraphs
        .forEach(p => {
          console.log(`  P${p.index} (${p.length} chars, class: ${p.className}): ${p.text}...`);
        });
      
      // 1. Look for all possible synopsis locations
      const synopsisAnalysis = await page.evaluate(() => {
        const results = [];
        
        // Look for text that follows "SYNOPSIS" heading
        const h2Elements = document.querySelectorAll('h2, h3');
        h2Elements.forEach((heading, index) => {
          const text = heading.textContent.trim().toUpperCase();
          if (text.includes('SYNOPSIS') || text.includes('PLOT') || text.includes('STORY')) {
            let nextElement = heading.nextElementSibling;
            while (nextElement && nextElement.tagName !== 'H2' && nextElement.tagName !== 'H3') {
              if (nextElement.tagName === 'P' && nextElement.textContent.trim().length > 50) {
                results.push({
                  type: 'Synopsis after heading',
                  heading: text,
                  content: nextElement.textContent.trim(),
                  className: nextElement.className,
                  selector: `h2:contains("${heading.textContent}") + p`
                });
                break;
              }
              nextElement = nextElement.nextElementSibling;
            }
          }
        });
        
        // Look for the longest paragraph that might be synopsis
        const paragraphs = Array.from(document.querySelectorAll('p'));
        const longParagraphs = paragraphs
          .filter(p => p.textContent.trim().length > 100)
          .map(p => ({
            text: p.textContent.trim(),
            length: p.textContent.trim().length,
            className: p.className,
            parentClassName: p.parentElement ? p.parentElement.className : '',
            position: Array.from(document.querySelectorAll('p')).indexOf(p)
          }))
          .sort((a, b) => b.length - a.length);
        
        if (longParagraphs.length > 0) {
          results.push({
            type: 'Longest paragraph',
            content: longParagraphs[0].text,
            className: longParagraphs[0].className,
            parentClassName: longParagraphs[0].parentClassName,
            position: longParagraphs[0].position
          });
        }
        
        return results;
      });
      
      console.log('\nSynopsis analysis:');
      synopsisAnalysis.forEach((item, i) => {
        console.log(`  ${i+1}. ${item.type}:`);
        console.log(`     Content: ${item.content ? item.content.substring(0, 150) + '...' : 'N/A'}`);
        console.log(`     Class: ${item.className || 'none'}`);
        if (item.heading) console.log(`     After heading: ${item.heading}`);
      });
      
      // 2. Look for year, director, and other metadata
      const metadataAnalysis = await page.evaluate(() => {
        const results = {};
        
        // Look for year patterns
        const yearPattern = /\b(19|20)\d{2}\b/g;
        const bodyText = document.body.textContent;
        const yearMatches = bodyText.match(yearPattern);
        results.years = [...new Set(yearMatches)]; // Remove duplicates
        
        // Look for "Directed by" or director patterns
        const directorPatterns = [
          /directed by\s+([^.]+)/i,
          /director[:\s]+([^.]+)/i,
          /by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/
        ];
        
        results.directors = [];
        directorPatterns.forEach(pattern => {
          const match = bodyText.match(pattern);
          if (match) results.directors.push(match[1].trim());
        });
        
        // Look for genre information - check for specific patterns
        const genreElements = [];
        document.querySelectorAll('*').forEach(el => {
          const text = el.textContent.trim().toLowerCase();
          if (el.children.length === 0 && text.length < 30) { // Leaf nodes with short text
            const commonGenres = ['drama', 'comedy', 'thriller', 'documentary', 'animation', 'romance', 'action', 'horror'];
            if (commonGenres.includes(text)) {
              genreElements.push({
                genre: text,
                element: el.tagName,
                className: el.className,
                parentClass: el.parentElement ? el.parentElement.className : ''
              });
            }
          }
        });
        results.genres = genreElements;
        
        // Look for runtime
        const runtimePattern = /(\d{1,3})\s*(min|minutes?|m)\b/i;
        const runtimeMatch = bodyText.match(runtimePattern);
        results.runtime = runtimeMatch ? runtimeMatch[0] : null;
        
        return results;
      });
      
      console.log('\nMetadata analysis:');
      console.log(`  Years found: ${metadataAnalysis.years.join(', ')}`);
      console.log(`  Directors found: ${metadataAnalysis.directors.join(', ')}`);
      console.log(`  Runtime: ${metadataAnalysis.runtime || 'not found'}`);
      console.log(`  Genres found: ${metadataAnalysis.genres.map(g => `${g.genre} (${g.element}.${g.className})`).join(', ')}`);
      
      // 3. Look for streaming availability indicators
      const streamingAnalysis = await page.evaluate(() => {
        const indicators = [];
        
        // Look for "Watch now", "Stream", "Available" etc.
        const streamingKeywords = ['watch now', 'stream', 'available', 'rent', 'buy', 'subscription'];
        
        document.querySelectorAll('button, a, span, div').forEach(el => {
          const text = el.textContent.trim().toLowerCase();
          streamingKeywords.forEach(keyword => {
            if (text.includes(keyword) && text.length < 50) {
              indicators.push({
                text: el.textContent.trim(),
                element: el.tagName,
                className: el.className,
                href: el.href || null
              });
            }
          });
        });
        
        return indicators;
      });
      
      console.log('\nStreaming indicators:');
      streamingAnalysis.forEach((item, i) => {
        console.log(`  ${i+1}. "${item.text}" (${item.element}.${item.className})`);
      });
      
      // 4. Take a screenshot for manual inspection
      await page.screenshot({ 
        path: `/Users/chwat467/git/film/analysis-${film.title.replace(/\s+/g, '-').toLowerCase()}.png`,
        fullPage: true 
      });
      console.log(`Screenshot saved: analysis-${film.title.replace(/\s+/g, '-').toLowerCase()}.png`);
      
    } catch (error) {
      console.error(`Error analyzing ${film.title}:`, error.message);
    }
    
    await page.close();
    console.log('\n' + '='.repeat(50));
  }
  
  await browser.close();
  console.log('\nAnalysis complete! Check the screenshots for visual reference.');
}

analyzeMubiStructure().catch(console.error);