const puppeteer = require('puppeteer');
const fs = require('fs').promises;

async function scrapeArthausStreamingSection() {
    console.log('🎬 Starting Arthaus.no streaming section scraper...');
    
    let browser;
    try {
        // Launch browser
        browser = await puppeteer.launch({
            headless: false, // Set to true for production, false for debugging
            defaultViewport: { width: 1280, height: 720 },
            timeout: 60000
        });
        
        const page = await browser.newPage();
        
        // Set user agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log('📡 Navigating to arthaus.no...');
        await page.goto('https://www.arthaus.no', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('🏠 Looking for "Se hjemme" (Watch at home) section...');
        
        // Try to navigate to the streaming section
        const navigationResult = await page.evaluate(() => {
            // Look for "Se hjemme" links
            const links = Array.from(document.querySelectorAll('a'));
            const streamingLink = links.find(link => 
                link.textContent.trim() === 'Se hjemme' ||
                link.href.includes('watch-at-home')
            );
            
            if (streamingLink) {
                console.log('Found streaming link:', streamingLink.href);
                streamingLink.click();
                return { success: true, href: streamingLink.href };
            }
            
            return { success: false, allLinks: links.map(l => ({ text: l.textContent.trim(), href: l.href })) };
        });
        
        if (navigationResult.success) {
            console.log(`✅ Navigating to: ${navigationResult.href}`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Now look for movie listings with streaming information
            const streamingMovies = await page.evaluate(() => {
                // Look for movie elements
                const movieElements = Array.from(document.querySelectorAll('*')).filter(el => {
                    const text = el.textContent || '';
                    return text.includes('Mubi') || 
                           el.querySelector('a[href*="mubi"]') ||
                           (el.tagName === 'DIV' && el.children.length > 2);
                });
                
                // Look specifically for Mubi links
                const mubiLinks = Array.from(document.querySelectorAll('a[href*="mubi"]'));
                
                // Get all links that might be movie pages
                const movieLinks = Array.from(document.querySelectorAll('a[href*="/movie/"]'));
                
                return {
                    mubiLinks: mubiLinks.map(link => ({
                        href: link.href,
                        text: link.textContent?.trim(),
                        parent: link.parentElement?.tagName,
                        parentText: link.parentElement?.textContent?.trim().substring(0, 100)
                    })),
                    movieLinks: movieLinks.slice(0, 10).map(link => ({
                        href: link.href,
                        text: link.textContent?.trim(),
                        movieSlug: link.href.split('/movie/')[1]
                    })),
                    totalMovieElements: movieElements.length,
                    pageTitle: document.title,
                    url: window.location.href
                };
            });
            
            console.log(`📊 Streaming section analysis:`);
            console.log(`- Page title: ${streamingMovies.pageTitle}`);
            console.log(`- Current URL: ${streamingMovies.url}`);
            console.log(`- Mubi links found: ${streamingMovies.mubiLinks.length}`);
            console.log(`- Movie links found: ${streamingMovies.movieLinks.length}`);
            
            if (streamingMovies.mubiLinks.length > 0) {
                console.log('🎯 Mubi links found:');
                streamingMovies.mubiLinks.forEach((link, index) => {
                    console.log(`  ${index + 1}. ${link.text} -> ${link.href}`);
                    console.log(`     (Parent: ${link.parent}, Context: ${link.parentText})`);
                });
            }
            
            if (streamingMovies.movieLinks.length > 0) {
                console.log('🎬 Movie pages found in streaming section:');
                streamingMovies.movieLinks.forEach((link, index) => {
                    console.log(`  ${index + 1}. ${link.text} -> ${link.movieSlug}`);
                });
                
                // Let's check a few of these movie pages for Mubi links
                console.log('\n🔍 Checking individual streaming movie pages...');
                
                const streamingMovieAnalysis = [];
                for (let i = 0; i < Math.min(3, streamingMovies.movieLinks.length); i++) {
                    const movie = streamingMovies.movieLinks[i];
                    console.log(`\n📽️ Checking: ${movie.movieSlug}`);
                    
                    try {
                        await page.goto(`https://www.arthaus.no/movie/${movie.movieSlug}`, {
                            waitUntil: 'networkidle2',
                            timeout: 15000
                        });
                        
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        
                        const moviePageData = await page.evaluate((slug) => {
                            const mubiLinks = Array.from(document.querySelectorAll('a[href*="mubi"]'));
                            const allButtons = Array.from(document.querySelectorAll('button, a[class*="button"], .btn'));
                            const streamingButtons = allButtons.filter(btn => 
                                btn.textContent.toLowerCase().includes('mubi') ||
                                btn.textContent.toLowerCase().includes('se på') ||
                                btn.textContent.toLowerCase().includes('streaming') ||
                                btn.textContent.toLowerCase().includes('watch')
                            );
                            
                            return {
                                slug,
                                title: document.title,
                                mubiLinks: mubiLinks.map(link => ({
                                    href: link.href,
                                    text: link.textContent?.trim()
                                })),
                                streamingButtons: streamingButtons.map(btn => ({
                                    text: btn.textContent?.trim(),
                                    href: btn.href || null,
                                    classes: btn.className
                                }))
                            };
                        }, movie.movieSlug);
                        
                        streamingMovieAnalysis.push(moviePageData);
                        console.log(`  ✅ ${moviePageData.title}`);
                        console.log(`  📊 Mubi links: ${moviePageData.mubiLinks.length}, Streaming buttons: ${moviePageData.streamingButtons.length}`);
                        
                        if (moviePageData.mubiLinks.length > 0) {
                            moviePageData.mubiLinks.forEach(link => {
                                console.log(`    🎯 ${link.text} -> ${link.href}`);
                            });
                        }
                        
                    } catch (error) {
                        console.error(`❌ Error checking ${movie.movieSlug}:`, error.message);
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
                // Save complete results
                const fullResults = {
                    streamingSection: streamingMovies,
                    individualMovies: streamingMovieAnalysis,
                    scrapedAt: new Date().toISOString()
                };
                
                await fs.writeFile('./arthaus-streaming-analysis.json', JSON.stringify(fullResults, null, 2));
                console.log('\n💾 Results saved to arthaus-streaming-analysis.json');
                
                return fullResults;
            }
            
        } else {
            console.log('⚠️ Could not find "Se hjemme" link');
            console.log('Available links:', navigationResult.allLinks.slice(0, 10));
        }
        
        return null;
        
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
    scrapeArthausStreamingSection()
        .then(results => {
            if (results) {
                console.log(`\n🎬 Streaming section scraping completed.`);
                const mubiCount = results.streamingSection.mubiLinks.length;
                const movieCount = results.individualMovies.length;
                const moviesWithMubi = results.individualMovies.filter(m => m.mubiLinks.length > 0).length;
                
                console.log(`📊 Final Summary:`);
                console.log(`- Mubi links in streaming section: ${mubiCount}`);
                console.log(`- Movies checked individually: ${movieCount}`);
                console.log(`- Movies with Mubi links: ${moviesWithMubi}`);
            } else {
                console.log('❌ No results obtained');
            }
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Scraping failed:', error);
            process.exit(1);
        });
}

module.exports = { scrapeArthausStreamingSection };