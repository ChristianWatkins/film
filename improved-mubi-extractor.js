// Improved MUBI film data extraction based on structure analysis
// This module provides robust extraction methods for MUBI film pages

export const extractFilmData = async (page) => {
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
      // 1. TITLE - Very reliable pattern
      const titleElement = document.querySelector('h1.css-1kpd5de');
      results.title = safeExtract(titleElement);
      results.extractionMetadata.extractionSuccess.title = !!results.title;
    } catch (e) {
      results.extractionMetadata.extractionErrors.push(`Title extraction: ${e.message}`);
    }

    try {
      // 2. ORIGINAL/ALTERNATIVE TITLE - Reliable pattern
      const altTitleElement = document.querySelector('h2.css-17fj2cc');
      results.originalTitle = safeExtract(altTitleElement);
      results.extractionMetadata.extractionSuccess.originalTitle = !!results.originalTitle;
    } catch (e) {
      results.extractionMetadata.extractionErrors.push(`Original title extraction: ${e.message}`);
    }

    try {
      // 3. SYNOPSIS - Very reliable pattern
      const synopsisH2 = Array.from(document.querySelectorAll('h2')).find(h => 
        h.textContent.toLowerCase().includes('synopsis')
      );
      
      if (synopsisH2) {
        let nextElement = synopsisH2.nextElementSibling;
        while (nextElement && nextElement.tagName !== 'H2' && nextElement.tagName !== 'H3') {
          if (nextElement.tagName === 'P' && nextElement.textContent.trim().length > 50) {
            const synopsisText = nextElement.textContent.trim();
            // Make sure it's not a generic message
            if (!synopsisText.toLowerCase().includes('not available at this time') &&
                !synopsisText.toLowerCase().includes('instead, check out')) {
              results.synopsis = synopsisText;
              break;
            }
          }
          nextElement = nextElement.nextElementSibling;
        }
      }
      
      // Fallback: Find the longest meaningful paragraph 
      if (!results.synopsis) {
        const paragraphs = Array.from(document.querySelectorAll('p'))
          .filter(p => {
            const text = p.textContent.trim();
            return text.length > 100 && 
                   text.length < 1000 && // Not too long
                   !text.toLowerCase().includes('cookie') &&
                   !text.toLowerCase().includes('available at this time') &&
                   !text.toLowerCase().includes('instead, check out') &&
                   !text.toLowerCase().includes('we use cookies') &&
                   // Should sound like a film description
                   (text.includes('.') || text.includes(',')) &&
                   text.split(' ').length > 15; // Reasonable length
          })
          .sort((a, b) => {
            // Prefer paragraphs that are closer to film description length
            const aScore = Math.abs(a.textContent.length - 250);
            const bScore = Math.abs(b.textContent.length - 250);
            return aScore - bScore;
          });
        
        if (paragraphs.length > 0) {
          results.synopsis = safeExtract(paragraphs[0]);
        }
      }
      
      results.extractionMetadata.extractionSuccess.synopsis = !!results.synopsis;
    } catch (e) {
      results.extractionMetadata.extractionErrors.push(`Synopsis extraction: ${e.message}`);
    }

    try {
      // 4. DIRECTOR - From Cast & Crew section (most reliable)
      const castCrewHeading = Array.from(document.querySelectorAll('h2')).find(h => 
        h.textContent.toLowerCase().includes('cast') && h.textContent.toLowerCase().includes('crew')
      );
      
      if (castCrewHeading) {
        let nextElement = castCrewHeading.nextElementSibling;
        while (nextElement && nextElement.tagName !== 'H2') {
          if (nextElement.tagName === 'H3' && nextElement.textContent.includes('Director')) {
            const directorText = nextElement.textContent.trim();
            // Extract name before "Director" - handle case with or without space
            const directorMatch = directorText.match(/^(.+?)Director/);
            if (directorMatch) {
              results.director = directorMatch[1].trim();
            }
            break;
          }
          nextElement = nextElement.nextElementSibling;
        }
      }
      
      // Fallback: Look for director in metadata H2
      if (!results.director) {
        const metadataElement = document.querySelector('h2.css-17fj2cc');
        if (metadataElement) {
          const metaText = metadataElement.textContent;
          // Pattern: "Name Country, Year" 
          const directorMatch = metaText.match(/^([A-Za-z\s]+)\s+[A-Z]/);
          if (directorMatch) {
            results.director = directorMatch[1].trim();
          }
        }
      }
      
      results.extractionMetadata.extractionSuccess.director = !!results.director;
    } catch (e) {
      results.extractionMetadata.extractionErrors.push(`Director extraction: ${e.message}`);
    }

    try {
      // 5. YEAR - Extract from metadata or body text
      const metadataElement = document.querySelector('h2.css-17fj2cc');
      if (metadataElement) {
        const yearMatch = metadataElement.textContent.match(/\b(20\d{2})\b/);
        if (yearMatch) {
          results.year = parseInt(yearMatch[1]);
        }
      }
      
      // Fallback: Look in page title or other locations
      if (!results.year) {
        const titleText = document.title;
        const yearMatch = titleText.match(/\((\d{4})\)/);
        if (yearMatch) {
          results.year = parseInt(yearMatch[1]);
        }
      }
      
      results.extractionMetadata.extractionSuccess.year = !!results.year;
    } catch (e) {
      results.extractionMetadata.extractionErrors.push(`Year extraction: ${e.message}`);
    }

    try {
      // 6. RUNTIME - Look for minutes pattern in body text
      const bodyText = document.body.textContent;
      const runtimeMatch = bodyText.match(/(\d{1,3})\s*(?:min|minutes?)\b/i);
      if (runtimeMatch) {
        results.runtime = parseInt(runtimeMatch[1]);
      }
      
      results.extractionMetadata.extractionSuccess.runtime = !!results.runtime;
    } catch (e) {
      results.extractionMetadata.extractionErrors.push(`Runtime extraction: ${e.message}`);
    }

    try {
      // 7. GENRES - Look for individual genre elements and in metadata
      const commonGenres = ['drama', 'comedy', 'thriller', 'documentary', 'animation', 'romance', 'action', 'horror', 'fantasy', 'adventure'];
      const foundGenres = new Set();
      
      // Check individual elements
      document.querySelectorAll('*').forEach(el => {
        if (el.children.length === 0) { // Leaf nodes only
          const text = el.textContent.trim().toLowerCase();
          if (commonGenres.includes(text) && text.length < 15) {
            foundGenres.add(text);
          }
        }
      });
      
      // Check metadata text
      const metadataElement = document.querySelector('h2.css-17fj2cc');
      if (metadataElement) {
        const metaText = metadataElement.textContent.toLowerCase();
        commonGenres.forEach(genre => {
          if (metaText.includes(genre)) {
            foundGenres.add(genre);
          }
        });
      }
      
      results.genres = Array.from(foundGenres);
      results.extractionMetadata.extractionSuccess.genres = results.genres.length > 0;
    } catch (e) {
      results.extractionMetadata.extractionErrors.push(`Genres extraction: ${e.message}`);
    }

    try {
      // 8. CAST & CREW - Extract from dedicated section
      const castCrewHeading = Array.from(document.querySelectorAll('h2')).find(h => 
        h.textContent.toLowerCase().includes('cast') && h.textContent.toLowerCase().includes('crew')
      );
      
      if (castCrewHeading) {
        let nextElement = castCrewHeading.nextElementSibling;
        while (nextElement && nextElement.tagName !== 'H2') {
          if (nextElement.tagName === 'H3') {
            const creditText = nextElement.textContent.trim();
            const parts = creditText.split(/(?=[A-Z][a-z]+(?:,|$))/);
            
            if (parts.length >= 2) {
              const name = parts[0].trim();
              const roles = parts.slice(1).join('').trim();
              
              if (roles.toLowerCase().includes('cast')) {
                results.cast.push(name);
              } else {
                // Categorize crew roles
                const roleTypes = roles.split(',').map(r => r.trim());
                roleTypes.forEach(role => {
                  const roleKey = role.toLowerCase().replace(/[^a-z]/g, '');
                  if (!results.crew[roleKey]) results.crew[roleKey] = [];
                  results.crew[roleKey].push(name);
                });
              }
            }
          }
          nextElement = nextElement.nextElementSibling;
        }
      }
      
      results.extractionMetadata.extractionSuccess.cast = results.cast.length > 0;
      results.extractionMetadata.extractionSuccess.crew = Object.keys(results.crew).length > 0;
    } catch (e) {
      results.extractionMetadata.extractionErrors.push(`Cast & Crew extraction: ${e.message}`);
    }

    try {
      // 9. FESTIVALS - Look for Awards & Festivals section
      const festivalsHeading = Array.from(document.querySelectorAll('h2')).find(h => 
        h.textContent.toLowerCase().includes('awards') && h.textContent.toLowerCase().includes('festivals')
      );
      
      if (festivalsHeading) {
        let nextElement = festivalsHeading.nextElementSibling;
        while (nextElement && nextElement.tagName !== 'H2') {
          if (nextElement.textContent && nextElement.textContent.trim().length > 0) {
            const festivalText = nextElement.textContent.trim();
            if (festivalText.length > 5 && festivalText.length < 200) {
              results.festivals.push(festivalText);
            }
          }
          nextElement = nextElement.nextElementSibling;
        }
      }
      
      results.extractionMetadata.extractionSuccess.festivals = results.festivals.length > 0;
    } catch (e) {
      results.extractionMetadata.extractionErrors.push(`Festivals extraction: ${e.message}`);
    }

    try {
      // 10. STREAMING AVAILABILITY - Look for "Watch now" buttons/links
      const watchButtons = document.querySelectorAll('button, a');
      for (const button of watchButtons) {
        const text = button.textContent.toLowerCase();
        if (text.includes('watch now') || text.includes('stream')) {
          results.streamingAvailable = true;
          break;
        }
      }
      
      results.extractionMetadata.extractionSuccess.streaming = true; // Always succeeds (boolean)
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

// Helper function to validate extracted data
export const validateExtractedData = (data) => {
  const validation = {
    isValid: true,
    warnings: [],
    errors: []
  };

  // Required fields check
  if (!data.title) {
    validation.errors.push('Missing title');
    validation.isValid = false;
  }

  if (!data.synopsis || data.synopsis.length < 50) {
    validation.warnings.push('Synopsis is missing or too short');
  }

  if (!data.director) {
    validation.warnings.push('Director information missing');
  }

  if (!data.year || data.year < 1900 || data.year > new Date().getFullYear() + 5) {
    validation.warnings.push('Year is missing or seems invalid');
  }

  if (data.runtime && (data.runtime < 1 || data.runtime > 600)) {
    validation.warnings.push('Runtime seems invalid');
  }

  return validation;
};

export default { extractFilmData, validateExtractedData };