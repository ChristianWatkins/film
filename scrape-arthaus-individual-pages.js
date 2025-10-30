const puppeteer = require('puppeteer');
const fs = require('fs').promises;

async function scrapeArthausIndividualFilmPages() {
    console.log('🎬 Starting systematic Arthaus.no individual film page scraper...');
    
    // Read the arthaus film analysis to get the list of films
    let arthausFilms;
    try {
        const data = await fs.readFile('./arthaus-analysis.json', 'utf8');
        arthausFilms = JSON.parse(data);
        console.log(`📚 Loaded ${arthausFilms.length} arthaus films for checking`);
    } catch (error) {
        console.error('❌ Error reading arthaus analysis:', error);
        return;
    }
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true, // Set to false for debugging
            defaultViewport: { width: 1280, height: 720 },
            timeout: 60000
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        const results = [];
        const filmsWithMubiLinks = [];
        
        // Let's start with just the first 20 films for testing
        const filmsToCheck = arthausFilms.slice(0, 20);
        console.log(`🎯 Checking first ${filmsToCheck.length} films for Mubi links...`);
        
        for (let i = 0; i < filmsToCheck.length; i++) {
            const film = filmsToCheck[i];
            console.log(`\n📽️ [${i + 1}/${filmsToCheck.length}] Checking: ${film.title} (${film.year})`);
            
            // Create potential slug from title
            const slug = film.title.toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
                .replace(/\s+/g, '-') // Replace spaces with hyphens
                .replace(/-+/g, '-') // Remove multiple hyphens
                .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
            
            const movieUrl = `https://www.arthaus.no/movie/${slug}`;
            
            try {
                console.log(`🌐 Visiting: ${movieUrl}`);
                await page.goto(movieUrl, { 
                    waitUntil: 'networkidle2',
                    timeout: 15000 
                });
                
                // Wait for page to fully load
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Look for Mubi links and streaming information
                const pageData = await page.evaluate((filmTitle, filmYear) => {
                    // Look for Mubi links
                    const allLinks = Array.from(document.querySelectorAll('a[href]'));
                    const mubiLinks = allLinks.filter(link => 
                        link.href.includes('mubi.com')
                    );
                    
                    // Look for streaming buttons or links
                    const streamingElements = Array.from(document.querySelectorAll('*')).filter(el => {
                        const text = el.textContent?.toLowerCase() || '';
                        return text.includes('mubi') || 
                               text.includes('se på') ||
                               text.includes('streaming') ||
                               text.includes('watch') ||
                               text.includes('tilgjengelig');
                    });
                    
                    // Look for buttons that might contain streaming links
                    const buttons = Array.from(document.querySelectorAll('button, a[class*="button"], .btn, [role="button"]'));
                    const streamingButtons = buttons.filter(btn => {
                        const text = btn.textContent?.toLowerCase() || '';
                        return text.includes('mubi') ||
                               text.includes('se på') ||
                               text.includes('streaming') ||
                               text.includes('watch');
                    });
                    
                    // Check if this is a valid film page (not 404)
                    const isValidPage = !document.body.textContent.includes('FINNER IKKE SIDEN') &&
                                       document.title !== 'Arthaus' &&
                                       (document.querySelector('h1') !== null);
                    
                    return {
                        isValidPage,
                        pageTitle: document.title,
                        h1: document.querySelector('h1')?.textContent?.trim(),
                        mubiLinks: mubiLinks.map(link => ({
                            href: link.href,
                            text: link.textContent?.trim(),
                            parentText: link.parentElement?.textContent?.trim().substring(0, 100)
                        })),
                        streamingElements: streamingElements.slice(0, 3).map(el => ({
                            tag: el.tagName,
                            text: el.textContent?.trim().substring(0, 100),
                            classes: el.className
                        })),
                        streamingButtons: streamingButtons.map(btn => ({
                            text: btn.textContent?.trim(),
                            href: btn.href || null,
                            onclick: btn.onclick ? 'has onclick' : null
                        })),
                        url: window.location.href
                    };
                }, film.title, film.year);
                
                const result = {
                    index: film.index,
                    title: film.title,
                    year: film.year,
                    director: film.director,
                    slug: slug,
                    url: movieUrl,
                    ...pageData
                };
                
                results.push(result);
                
                if (pageData.isValidPage) {
                    console.log(`  ✅ Valid page: ${pageData.pageTitle}`);
                    console.log(`  📊 Mubi links: ${pageData.mubiLinks.length}`);
                    
                    if (pageData.mubiLinks.length > 0) {
                        console.log(`  🎯 MUBI LINKS FOUND!`);
                        pageData.mubiLinks.forEach(link => {
                            console.log(`    🔗 ${link.text} -> ${link.href}`);
                        });
                        filmsWithMubiLinks.push(result);
                    }
                    
                    if (pageData.streamingButtons.length > 0) {
                        console.log(`  🎬 Streaming buttons: ${pageData.streamingButtons.length}`);
                        pageData.streamingButtons.forEach(btn => {
                            console.log(`    🔘 ${btn.text}`);
                        });
                    }
                } else {
                    console.log(`  ❌ Invalid page (404 or not found)`);
                }
                
            } catch (error) {
                console.error(`  ❌ Error loading ${movieUrl}:`, error.message);
                results.push({
                    index: film.index,
                    title: film.title,
                    year: film.year,
                    slug: slug,
                    url: movieUrl,
                    error: error.message
                });
            }
            
            // Wait between requests to be polite
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
        // Save results
        const output = {
            summary: {
                totalChecked: filmsToCheck.length,
                validPages: results.filter(r => r.isValidPage).length,
                withMubiLinks: filmsWithMubiLinks.length,
                errors: results.filter(r => r.error).length
            },
            filmsWithMubiLinks: filmsWithMubiLinks,
            allResults: results,
            scrapedAt: new Date().toISOString()
        };
        
        await fs.writeFile('./arthaus-individual-pages-results.json', JSON.stringify(output, null, 2));
        console.log('\n💾 Results saved to arthaus-individual-pages-results.json');
        
        console.log('\n📊 Final Summary:');
        console.log(`- Films checked: ${output.summary.totalChecked}`);
        console.log(`- Valid pages found: ${output.summary.validPages}`);
        console.log(`- Films with Mubi links: ${output.summary.withMubiLinks}`);
        console.log(`- Errors: ${output.summary.errors}`);
        
        if (filmsWithMubiLinks.length > 0) {
            console.log('\n🎯 Films with Mubi links found:');
            filmsWithMubiLinks.forEach(film => {
                console.log(`- ${film.title} (${film.year}): ${film.mubiLinks.length} links`);
            });
        }
        
        return output;
        
    } catch (error) {
        console.error('❌ Error during scraping:', error);
        return null;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the scraper
if (require.main === module) {
    scrapeArthausIndividualFilmPages()
        .then(results => {
            if (results) {
                console.log(`\n🎬 Individual film page scraping completed successfully!`);
            } else {
                console.log('❌ Scraping failed');
            }
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Scraping failed:', error);
            process.exit(1);
        });
}

module.exports = { scrapeArthausIndividualFilmPages };