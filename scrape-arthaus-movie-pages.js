const puppeteer = require('puppeteer');
const fs = require('fs').promises;

async function scrapeArthaustMoviePages() {
    console.log('🎬 Starting Arthaus.no individual movie page scraper...');
    
    let browser;
    try {
        // Launch browser
        browser = await puppeteer.launch({
            headless: true, // Set to false for debugging
            defaultViewport: { width: 1280, height: 720 },
            timeout: 60000
        });
        
        const page = await browser.newPage();
        
        // Set user agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Let's try to visit individual movie pages to see the structure
        const testMovies = [
            'nouvelle-vague',
            'late-shift',
            'christy',
            'kensuke-s-kingdom'
        ];
        
        const movieResults = [];
        
        for (const movieSlug of testMovies) {
            console.log(`\n🎭 Checking movie: ${movieSlug}`);
            const movieUrl = `https://www.arthaus.no/movie/${movieSlug}`;
            
            try {
                await page.goto(movieUrl, { 
                    waitUntil: 'networkidle2',
                    timeout: 15000 
                });
                
                // Wait a bit for any JavaScript to load
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Look for Mubi links and streaming information
                const movieData = await page.evaluate((slug) => {
                    // Look for any links that contain "mubi"
                    const allLinks = Array.from(document.querySelectorAll('a[href]'));
                    const mubiLinks = allLinks.filter(link => 
                        link.href.includes('mubi.com') || 
                        link.textContent.toLowerCase().includes('mubi')
                    );
                    
                    // Look for streaming provider buttons or sections
                    const streamingElements = Array.from(document.querySelectorAll('*')).filter(el => 
                        el.textContent && (
                            el.textContent.toLowerCase().includes('se på') ||
                            el.textContent.toLowerCase().includes('streaming') ||
                            el.textContent.toLowerCase().includes('se filmen') ||
                            el.textContent.toLowerCase().includes('tilgjengelig') ||
                            el.textContent.toLowerCase().includes('watch') ||
                            el.textContent.toLowerCase().includes('mubi')
                        )
                    );
                    
                    // Look for buttons specifically
                    const buttons = Array.from(document.querySelectorAll('button, a[class*="button"], .btn'));
                    const streamingButtons = buttons.filter(btn => 
                        btn.textContent.toLowerCase().includes('mubi') ||
                        btn.textContent.toLowerCase().includes('se på') ||
                        btn.textContent.toLowerCase().includes('streaming')
                    );
                    
                    // Get page title and key info
                    const title = document.title;
                    const h1 = document.querySelector('h1')?.textContent?.trim();
                    const h2 = document.querySelector('h2')?.textContent?.trim();
                    
                    // Get all button-like elements for analysis
                    const allButtons = buttons.map(btn => ({
                        tag: btn.tagName,
                        text: btn.textContent?.trim().substring(0, 50),
                        classes: btn.className,
                        href: btn.href || null
                    }));
                    
                    return {
                        slug,
                        title,
                        h1,
                        h2,
                        mubiLinks: mubiLinks.map(link => ({
                            href: link.href,
                            text: link.textContent?.trim(),
                            html: link.outerHTML.substring(0, 200) + '...'
                        })),
                        streamingElements: streamingElements.slice(0, 5).map(el => ({
                            tag: el.tagName,
                            text: el.textContent?.trim().substring(0, 100),
                            classes: el.className
                        })),
                        streamingButtons: streamingButtons.map(btn => ({
                            tag: btn.tagName,
                            text: btn.textContent?.trim(),
                            classes: btn.className,
                            href: btn.href || null
                        })),
                        allButtons: allButtons.slice(0, 10), // First 10 buttons for analysis
                        allLinksCount: allLinks.length,
                        totalButtons: buttons.length
                    };
                }, movieSlug);
                
                movieResults.push(movieData);
                console.log(`✅ ${movieData.title || 'Unknown title'}`);
                console.log(`📊 Found ${movieData.mubiLinks.length} Mubi links, ${movieData.streamingElements.length} streaming elements, ${movieData.streamingButtons.length} streaming buttons`);
                
                if (movieData.mubiLinks.length > 0) {
                    console.log('🎯 Mubi links found:');
                    movieData.mubiLinks.forEach((link, index) => {
                        console.log(`  ${index + 1}. ${link.text} -> ${link.href}`);
                    });
                }
                
                if (movieData.streamingButtons.length > 0) {
                    console.log('🔘 Streaming buttons found:');
                    movieData.streamingButtons.forEach((btn, index) => {
                        console.log(`  ${index + 1}. ${btn.text} (${btn.tag}) -> ${btn.href || 'no href'}`);
                    });
                }
                
            } catch (error) {
                console.error(`❌ Error loading ${movieUrl}:`, error.message);
                movieResults.push({
                    slug: movieSlug,
                    error: error.message
                });
            }
            
            // Wait between requests to be polite
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Save results
        await fs.writeFile('./arthaus-movie-pages-analysis.json', JSON.stringify(movieResults, null, 2));
        console.log('\n💾 Results saved to arthaus-movie-pages-analysis.json');
        
        return movieResults;
        
    } catch (error) {
        console.error('❌ Error during scraping:', error);
        return [];
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the scraper
if (require.main === module) {
    scrapeArthaustMoviePages()
        .then(results => {
            console.log(`\n🎬 Scraping completed. Analyzed ${results.length} movie pages.`);
            
            // Summary
            const withMubiLinks = results.filter(r => r.mubiLinks && r.mubiLinks.length > 0);
            const withStreamingButtons = results.filter(r => r.streamingButtons && r.streamingButtons.length > 0);
            
            console.log(`📊 Summary:`);
            console.log(`- Movies with Mubi links: ${withMubiLinks.length}`);
            console.log(`- Movies with streaming buttons: ${withStreamingButtons.length}`);
            
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Scraping failed:', error);
            process.exit(1);
        });
}

module.exports = { scrapeArthaustMoviePages };