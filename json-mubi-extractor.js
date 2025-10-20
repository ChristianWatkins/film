// Optimal MUBI film data extraction using embedded JSON data
export const extractFilmDataFromJSON = async (page) => {
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
        dataSource: null,
        extractionSuccess: {},
        extractionErrors: []
      }
    };

    let filmData = null;

    try {
      // Strategy 1: Extract from embedded JSON data (most reliable)
      const scriptElements = Array.from(document.querySelectorAll('script'));
      
      for (const script of scriptElements) {
        const content = script.textContent || script.innerHTML;
        if (content.includes('"initFilm"') || (content.includes('"title"') && content.includes('"year"'))) {
          try {
            // Try to extract JSON that contains film data
            let jsonMatch = content.match(/\{"props":\{"pageProps":\{"initFilm":(.*?)\}\}\}/);
            if (!jsonMatch) {
              // Alternative pattern for different JSON structures
              jsonMatch = content.match(/\{"id":\d+,"slug":"[^"]+","title":"[^"]+","year":\d{4}.*?\}/);
            }
            if (!jsonMatch) {
              // Look for any JSON containing film-like data
              const jsonRegex = /\{[^{}]*"title"[^{}]*"year"[^{}]*\}/g;
              const matches = content.match(jsonRegex);
              if (matches) {
                jsonMatch = [null, matches[0]];
              }
            }
            
            if (jsonMatch) {
              let jsonStr = jsonMatch[1] || jsonMatch[0];
              // Handle potential incomplete JSON by finding the complete object
              let braceCount = 0;
              let endIndex = 0;
              for (let i = 0; i < jsonStr.length; i++) {
                if (jsonStr[i] === '{') braceCount++;
                if (jsonStr[i] === '}') {
                  braceCount--;
                  if (braceCount === 0) {
                    endIndex = i + 1;
                    break;
                  }
                }
              }
              if (endIndex > 0) {
                jsonStr = jsonStr.substring(0, endIndex);
              }
              
              filmData = JSON.parse(jsonStr);
              results.extractionMetadata.dataSource = 'embedded_json';
              break;
            }
          } catch (e) {
            // Continue to next script if JSON parsing fails
            continue;
          }
        }
      }
      
    } catch (e) {
      results.extractionMetadata.extractionErrors.push(`JSON extraction: ${e.message}`);
    }

    // Process JSON data if found
    if (filmData) {
      try {
        // Extract data from JSON structure
        results.title = filmData.title || filmData.title_upcase || null;
        results.originalTitle = filmData.original_title || null;
        results.year = filmData.year || null;
        results.runtime = filmData.duration || null;
        results.synopsis = filmData.short_synopsis || filmData.default_editorial || null;
        results.genres = filmData.genres || [];
        
        // Extract director from directors array
        if (filmData.directors && filmData.directors.length > 0) {
          results.director = filmData.directors[0].name;
        }
        
        // Extract country
        if (filmData.historic_countries && filmData.historic_countries.length > 0) {
          results.country = filmData.historic_countries[0];
        }
        
        // Check streaming availability
        results.streamingAvailable = !!(filmData.consumable && filmData.consumable.availability === 'live');
        
        // Mark successful extractions
        results.extractionMetadata.extractionSuccess = {
          title: !!results.title,
          originalTitle: !!results.originalTitle,
          director: !!results.director,
          year: !!results.year,
          runtime: !!results.runtime,
          synopsis: !!results.synopsis,
          genres: results.genres.length > 0,
          country: !!results.country,
          streaming: true
        };
      } catch (e) {
        results.extractionMetadata.extractionErrors.push(`JSON processing: ${e.message}`);
      }
    }
    
    // Strategy 2: DOM fallbacks for missing data
    if (!filmData) {
      results.extractionMetadata.dataSource = 'dom_fallback';
      
      try {
        // Extract title from page title or H1
        const pageTitle = document.title;
        const titleMatch = pageTitle.match(/^(.+?)\s*\((\d{4})\)\s*\|\s*MUBI/i);
        if (titleMatch) {
          results.title = titleMatch[1].trim();
          results.year = parseInt(titleMatch[2]);
        } else {
          // Try H1 elements
          const h1Elements = Array.from(document.querySelectorAll('h1'));
          for (const h1 of h1Elements) {
            const text = h1.textContent.trim();
            if (text && text.length > 0 && text.length < 100) {
              results.title = text;
              break;
            }
          }
        }
        
        results.extractionMetadata.extractionSuccess.title = !!results.title;
        results.extractionMetadata.extractionSuccess.year = !!results.year;
      } catch (e) {
        results.extractionMetadata.extractionErrors.push(`Title extraction: ${e.message}`);
      }
      
      try {
        // Extract director from Cast & Crew section
        const allElements = Array.from(document.querySelectorAll('h3, div, span'));
        for (const element of allElements) {
          const text = element.textContent.trim();
          if (text.includes('Director') && text.length < 200) {
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
        
        results.extractionMetadata.extractionSuccess.director = !!results.director;
      } catch (e) {
        results.extractionMetadata.extractionErrors.push(`Director extraction: ${e.message}`);
      }
      
      try {
        // Extract synopsis from paragraphs
        const synopsisH2 = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).find(h => 
          h.textContent.toLowerCase().includes('synopsis')
        );
        
        if (synopsisH2) {
          let nextElement = synopsisH2.nextElementSibling;
          while (nextElement && !nextElement.tagName.match(/^H[1-6]$/)) {
            if (nextElement.tagName === 'P') {
              const text = nextElement.textContent.trim();
              if (text.length > 50 && 
                  !text.toLowerCase().includes('not available') &&
                  !text.toLowerCase().includes('cookie')) {
                results.synopsis = text;
                break;
              }
            }
            nextElement = nextElement.nextElementSibling;
          }
        }
        
        results.extractionMetadata.extractionSuccess.synopsis = !!results.synopsis;
      } catch (e) {
        results.extractionMetadata.extractionErrors.push(`Synopsis extraction: ${e.message}`);
      }
      
      try {
        // Extract runtime from text
        const bodyText = document.body.textContent;
        const runtimeMatch = bodyText.match(/(\d{1,3})\s*(?:min|minutes?)\b/i);
        if (runtimeMatch) {
          const runtime = parseInt(runtimeMatch[1]);
          if (runtime >= 1 && runtime <= 600) {
            results.runtime = runtime;
          }
        }
        
        results.extractionMetadata.extractionSuccess.runtime = !!results.runtime;
      } catch (e) {
        results.extractionMetadata.extractionErrors.push(`Runtime extraction: ${e.message}`);
      }
      
      try {
        // Extract genres from text
        const commonGenres = ['drama', 'comedy', 'thriller', 'documentary', 'animation', 'romance', 'action', 'horror', 'fantasy', 'adventure'];
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
        // Check streaming availability
        const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
        for (const button of buttons) {
          const text = button.textContent.toLowerCase();
          if (text.includes('watch') || text.includes('stream')) {
            results.streamingAvailable = true;
            break;
          }
        }
        
        results.extractionMetadata.extractionSuccess.streaming = true;
      } catch (e) {
        results.extractionMetadata.extractionErrors.push(`Streaming extraction: ${e.message}`);
      }
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
    errors: [],
    confidence: 'high'
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

  // Determine confidence level based on data source
  if (data.extractionMetadata.dataSource === 'embedded_json') {
    validation.confidence = 'high';
  } else if (data.extractionMetadata.dataSource === 'dom_fallback') {
    validation.confidence = 'medium';
  } else {
    validation.confidence = 'low';
  }

  // Adjust confidence based on success rate
  if (data.extractionMetadata.successRate < 0.5) {
    validation.confidence = 'low';
  } else if (data.extractionMetadata.successRate < 0.8) {
    validation.confidence = validation.confidence === 'high' ? 'medium' : 'low';
  }

  return validation;
};

export default { extractFilmDataFromJSON, validateExtractedData };