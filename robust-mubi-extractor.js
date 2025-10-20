// More robust MUBI film data extraction that doesn't rely on specific CSS classes
export const extractFilmDataRobust = async (page) => {
  return await page.evaluate(() => {
    const results = {
      title: null,
      originalTitle: null,
      director: null,
      year: null,
      country: null,
      runtime: null,
      synopsis: null,
      genres: [],
      cast: [],
      crew: {},
      festivals: [],
      streamingAvailable: false,
      extractionMetadata: {
        extractedAt: new Date().toISOString(),
        extractionSuccess: {},
        extractionErrors: []
      }
    };

    // Helper function to safely extract text
    const safeExtract = (element) => element?.textContent?.trim() || null;

    try {
      // 1. TITLE - Try multiple strategies
      let titleFound = false;
      
      // Strategy 1: Look for H1 elements and find non-empty ones
      const h1Elements = Array.from(document.querySelectorAll('h1'));
      for (const h1 of h1Elements) {
        const text = h1.textContent.trim();
        if (text && text.length > 0 && text.length < 100) {
          results.title = text;
          titleFound = true;
          break;
        }
      }
      
      // Strategy 2: Extract from page title
      if (!titleFound) {
        const pageTitle = document.title;
        const titleMatch = pageTitle.match(/^(.+?)\s*\(?\d{4}\)?\s*\|?\s*MUBI/i);
        if (titleMatch) {
          results.title = titleMatch[1].trim();
          titleFound = true;
        }
      }
      
      // Strategy 3: Look for title in JSON-LD or meta tags
      if (!titleFound) {
        const jsonLd = document.querySelector('script[type="application/ld+json"]');
        if (jsonLd) {
          try {
            const data = JSON.parse(jsonLd.textContent);
            if (data.name) {
              results.title = data.name;
              titleFound = true;
            }
          } catch (e) {
            // Ignore JSON parsing errors
          }
        }
      }
      
      results.extractionMetadata.extractionSuccess.title = titleFound;
    } catch (e) {
      results.extractionMetadata.extractionErrors.push(`Title extraction: ${e.message}`);
    }

    try {
      // 2. ORIGINAL TITLE - Look for H2 that looks like an alternative title
      const h2Elements = Array.from(document.querySelectorAll('h2'));
      for (const h2 of h2Elements) {
        const text = h2.textContent.trim();
        // Look for patterns that suggest alternative titles
        if (text && text.length < 100 && 
            (text.includes('|') || // "弟弟 | Dìdi"
             text.match(/^[^\w\s]+/) || // Non-latin characters
             (results.title && text !== results.title && text.length > 3))) {
          results.originalTitle = text;
          break;
        }
      }
      
      results.extractionMetadata.extractionSuccess.originalTitle = !!results.originalTitle;
    } catch (e) {
      results.extractionMetadata.extractionErrors.push(`Original title extraction: ${e.message}`);
    }

    try {
      // 3. SYNOPSIS - Multiple strategies
      let synopsisFound = false;
      
      // Strategy 1: Look for text after "Synopsis" heading
      const allHeadings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      const synopsisHeading = allHeadings.find(h => 
        h.textContent.toLowerCase().includes('synopsis')
      );
      
      if (synopsisHeading) {
        let nextElement = synopsisHeading.nextElementSibling;
        while (nextElement && !nextElement.tagName.match(/^H[1-6]$/)) {
          if (nextElement.tagName === 'P') {
            const text = nextElement.textContent.trim();
            if (text.length > 50 && 
                !text.toLowerCase().includes('not available') &&
                !text.toLowerCase().includes('cookie') &&
                !text.toLowerCase().includes('instead, check out')) {
              results.synopsis = text;
              synopsisFound = true;
              break;
            }
          }
          nextElement = nextElement.nextElementSibling;
        }
      }
      
      // Strategy 2: Find paragraph that looks like a synopsis
      if (!synopsisFound) {
        const paragraphs = Array.from(document.querySelectorAll('p'));
        const synopsisCandidates = paragraphs
          .filter(p => {
            const text = p.textContent.trim();
            return text.length > 80 && text.length < 800 &&
                   !text.toLowerCase().includes('cookie') &&
                   !text.toLowerCase().includes('not available') &&
                   !text.toLowerCase().includes('instead, check out') &&
                   !text.toLowerCase().includes('we use cookies') &&
                   !text.toLowerCase().includes('third party') &&
                   text.includes('.') && // Has sentences
                   text.split(' ').length > 15; // Reasonable length
          })
          .sort((a, b) => {
            // Prefer paragraphs around 200-300 characters (typical synopsis length)
            const aScore = Math.abs(a.textContent.length - 250);
            const bScore = Math.abs(b.textContent.length - 250);
            return aScore - bScore;
          });
        
        if (synopsisCandidates.length > 0) {
          results.synopsis = synopsisCandidates[0].textContent.trim();
          synopsisFound = true;
        }
      }
      
      results.extractionMetadata.extractionSuccess.synopsis = synopsisFound;
    } catch (e) {
      results.extractionMetadata.extractionErrors.push(`Synopsis extraction: ${e.message}`);
    }

    try {
      // 4. DIRECTOR - Look for elements containing "Director"
      const allElements = Array.from(document.querySelectorAll('*'));
      for (const element of allElements) {
        if (element.children.length === 0) { // Leaf nodes only
          const text = element.textContent.trim();
          if (text.includes('Director') && text.length < 200) {
            // Extract name before "Director"
            const directorMatch = text.match(/^(.+?)Director/);
            if (directorMatch) {
              const name = directorMatch[1].trim();
              if (name.length > 2 && name.length < 50) {
                results.director = name;
                break;
              }
            }
          }
        }
      }
      
      results.extractionMetadata.extractionSuccess.director = !!results.director;
    } catch (e) {
      results.extractionMetadata.extractionErrors.push(`Director extraction: ${e.message}`);
    }

    try {
      // 5. YEAR - Look for 4-digit years in various places
      const bodyText = document.body.textContent;
      const currentYear = new Date().getFullYear();
      const yearPattern = new RegExp(`\\b(19[5-9]\\d|20[0-${Math.floor((currentYear + 5) / 10)}]\\d)\\b`, 'g');
      const yearMatches = bodyText.match(yearPattern);
      
      if (yearMatches) {
        // Prefer years that are more likely to be film years (recent, not too future)
        const validYears = yearMatches
          .map(y => parseInt(y))
          .filter(y => y >= 1950 && y <= currentYear + 5)
          .sort((a, b) => b - a); // Most recent first
        
        if (validYears.length > 0) {
          results.year = validYears[0];
        }
      }
      
      results.extractionMetadata.extractionSuccess.year = !!results.year;
    } catch (e) {
      results.extractionMetadata.extractionErrors.push(`Year extraction: ${e.message}`);
    }

    try {
      // 6. RUNTIME - Look for minutes pattern
      const bodyText = document.body.textContent;
      const runtimePattern = /(\d{1,3})\s*(?:min|minutes?|m)\b/i;
      const runtimeMatch = bodyText.match(runtimePattern);
      
      if (runtimeMatch) {
        const runtime = parseInt(runtimeMatch[1]);
        if (runtime >= 1 && runtime <= 600) { // Reasonable range
          results.runtime = runtime;
        }
      }
      
      results.extractionMetadata.extractionSuccess.runtime = !!results.runtime;
    } catch (e) {
      results.extractionMetadata.extractionErrors.push(`Runtime extraction: ${e.message}`);
    }

    try {
      // 7. GENRES - Look for common genre words
      const commonGenres = ['drama', 'comedy', 'thriller', 'documentary', 'animation', 'romance', 'action', 'horror', 'fantasy', 'adventure', 'mystery', 'crime'];
      const foundGenres = new Set();
      
      const bodyText = document.body.textContent.toLowerCase();
      commonGenres.forEach(genre => {
        if (bodyText.includes(genre)) {
          foundGenres.add(genre);
        }
      });
      
      results.genres = Array.from(foundGenres);
      results.extractionMetadata.extractionSuccess.genres = results.genres.length > 0;
    } catch (e) {
      results.extractionMetadata.extractionErrors.push(`Genres extraction: ${e.message}`);
    }

    try {
      // 8. STREAMING AVAILABILITY - Look for watch/stream buttons
      const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
      for (const button of buttons) {
        const text = button.textContent.toLowerCase();
        if (text.includes('watch') || text.includes('stream') || text.includes('play')) {
          results.streamingAvailable = true;
          break;
        }
      }
      
      results.extractionMetadata.extractionSuccess.streaming = true;
    } catch (e) {
      results.extractionMetadata.extractionErrors.push(`Streaming extraction: ${e.message}`);
    }

    // Calculate overall extraction success rate
    const successCount = Object.values(results.extractionMetadata.extractionSuccess).filter(Boolean).length;
    const totalFields = Object.keys(results.extractionMetadata.extractionSuccess).length;
    results.extractionMetadata.successRate = totalFields > 0 ? (successCount / totalFields) : 0;

    return results;
  });
};

export default { extractFilmDataRobust };