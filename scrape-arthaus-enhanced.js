const puppeteer = require('puppeteer');
const fs = require('fs').promises;

async function scrapeArthausStreamingFilms() {
    console.log('🎬 Starting enhanced Arthaus.no streaming film scraper...');
    
    // Read the arthaus film analysis to get the list of films
    let arthausFilms;
    try {
        const data = await fs.readFile('./arthaus-analysis.json', 'utf8');
        arthausFilms = JSON.parse(data);
        console.log(`📚 Loaded ${arthausFilms.length} arthaus films`);
    } catch (error) {
        console.error('❌ Error reading arthaus analysis:', error);
        return;
    }
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false, // Show browser for better debugging
            defaultViewport: { width: 1280, height: 720 },
            timeout: 60000
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        const results = [];
        
        // Let's focus on older films that are more likely to have streaming availability
        // and films from earlier years (2023, 2022, etc.)
        const priorityFilms = arthausFilms.filter(film => 
            film.year <= 2024 || 
            film.title.toLowerCase().includes('mubi') ||
            ['amrum', 'nouvelle vague', 'sound of falling'].includes(film.title.toLowerCase())
        ).slice(0, 15);
        
        console.log(`🎯 Checking ${priorityFilms.length} priority films for streaming availability...`);
        
        for (let i = 0; i < priorityFilms.length; i++) {
            const film = priorityFilms[i];
            console.log(`\n📽️ [${i + 1}/${priorityFilms.length}] ${film.title} (${film.year})`);
            
            // Try multiple slug variations
            const slugVariations = [
                film.title.toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, ''),
                film.title.toLowerCase()
                    .replace(/[^a-z0-9\s]/g, '')
                    .replace(/\s+/g, '-'),
                film.originalTitle?.toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '')
            ].filter(Boolean);
            
            let pageFound = false;
            let bestResult = null;
            
            for (const slug of slugVariations) {
                if (pageFound) break;
                
                const movieUrl = `https://www.arthaus.no/movie/${slug}`;
                console.log(`🔗 Trying: ${slug}`);
                
                try {
                    await page.goto(movieUrl, { 
                        waitUntil: 'networkidle2',
                        timeout: 10000 
                    });
                    
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Handle cookie consent dialog
                    try {
                        await page.evaluate(() => {
                            // Look for common cookie consent buttons
                            const cookieButtons = Array.from(document.querySelectorAll('button, p, a')).filter(el => {
                                const text = el.textContent?.toLowerCase() || '';
                                return text.includes('tillat alle') ||
                                       text.includes('accept all') ||
                                       text.includes('godta alle') ||
                                       text.includes('alle cookies') ||
                                       text.includes('tillat cookies');
                            });
                            
                            if (cookieButtons.length > 0) {
                                console.log('Found cookie consent button, clicking...');
                                cookieButtons[0].click();
                            }
                        });
                        
                        // Wait a bit after clicking cookie consent
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } catch (cookieError) {
                        console.log('    ℹ️ No cookie consent needed or error handling cookies');
                    }
                    
                    // Enhanced detection for streaming content
                    const pageData = await page.evaluate((filmTitle, filmYear) => {
                        // Check if valid page
                        const isValidPage = !document.body.textContent.includes('FINNER IKKE SIDEN') &&
                                           document.title !== 'Arthaus' &&
                                           document.querySelector('h1') !== null;
                        
                        if (!isValidPage) return { isValidPage: false };
                        
                        // Look for Mubi links
                        const allLinks = Array.from(document.querySelectorAll('a[href]'));
                        const mubiLinks = allLinks.filter(link => 
                            link.href.includes('mubi.com')
                        );
                        
                        // Look for streaming sections more broadly
                        const streamingSections = Array.from(document.querySelectorAll('*')).filter(el => {
                            const text = el.textContent?.toLowerCase() || '';
                            const className = (typeof el.className === 'string' ? el.className : el.className?.toString() || '').toLowerCase();
                            return text.includes('se filmen') ||
                                   text.includes('tilgjengelig på') ||
                                   text.includes('streaming') ||
                                   text.includes('watch') ||
                                   className.includes('streaming') ||
                                   className.includes('watch') ||
                                   className.includes('provider');
                        });
                        
                        // Look for any mention of streaming providers
                        const streamingProviders = [];
                        const bodyText = document.body.textContent.toLowerCase();
                        const providers = ['mubi', 'netflix', 'viaplay', 'hbo', 'disney', 'amazon', 'prime', 'filmweb'];
                        providers.forEach(provider => {
                            if (bodyText.includes(provider)) {
                                streamingProviders.push(provider);
                            }
                        });
                        
                        // Get all buttons and links for comprehensive analysis
                        const allButtons = Array.from(document.querySelectorAll('button, a[class*="button"], .btn, [role="button"]'));
                        
                        // Look for any elements that might contain streaming info
                        const potentialStreamingElements = Array.from(document.querySelectorAll('div, section, article')).filter(el => {
                            const text = el.textContent?.toLowerCase() || '';
                            const hasStreamingKeywords = text.includes('se på') || 
                                                       text.includes('streaming') || 
                                                       text.includes('tilgjengelig') ||
                                                       text.includes('watch');
                            return hasStreamingKeywords && el.children.length > 0 && text.length < 500;
                        });
                        
                        return {
                            isValidPage: true,
                            pageTitle: document.title,
                            h1: document.querySelector('h1')?.textContent?.trim(),
                            mubiLinks: mubiLinks.map(link => ({
                                href: link.href,
                                text: link.textContent?.trim()
                            })),
                            streamingSections: streamingSections.slice(0, 5).map(el => ({
                                tag: el.tagName,
                                text: el.textContent?.trim().substring(0, 200),
                                className: typeof el.className === 'string' ? el.className : el.className?.toString() || '',
                                innerHTML: el.innerHTML.substring(0, 300)
                            })),
                            streamingProviders: streamingProviders,
                            allButtonsCount: allButtons.length,
                            potentialStreamingElements: potentialStreamingElements.slice(0, 3).map(el => ({
                                tag: el.tagName,
                                text: el.textContent?.trim().substring(0, 200),
                                className: typeof el.className === 'string' ? el.className : el.className?.toString() || ''
                            })),
                            url: window.location.href,
                            hasStreamingContent: mubiLinks.length > 0 || streamingProviders.length > 0 || streamingSections.length > 0
                        };
                    }, film.title, film.year);
                    
                    if (pageData.isValidPage) {
                        pageFound = true;
                        bestResult = {
                            ...film,
                            slug,
                            url: movieUrl,
                            ...pageData
                        };
                        
                        console.log(`  ✅ Found: ${pageData.pageTitle}`);
                        console.log(`  📊 Mubi links: ${pageData.mubiLinks?.length || 0}`);
                        console.log(`  📺 Streaming providers: ${pageData.streamingProviders?.join(', ') || 'none'}`);
                        console.log(`  🎬 Streaming sections: ${pageData.streamingSections?.length || 0}`);
                        
                        if (pageData.mubiLinks?.length > 0) {
                            console.log(`  🎯 MUBI LINKS FOUND!`);
                            pageData.mubiLinks.forEach(link => {
                                console.log(`    🔗 ${link.text} -> ${link.href}`);
                            });
                        }
                        
                        if (pageData.hasStreamingContent) {
                            console.log(`  ⭐ Has streaming content!`);
                        }
                        
                        break;
                    }
                    
                } catch (error) {
                    console.log(`    ❌ ${error.message}`);
                }
            }
            
            if (bestResult) {
                results.push(bestResult);
            } else {
                console.log(`  ❌ No valid page found for ${film.title}`);
                results.push({
                    ...film,
                    slug: slugVariations[0],
                    isValidPage: false,
                    error: 'No valid page found'
                });
            }
            
            // Wait between requests
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Save detailed results
        const output = {
            summary: {
                totalChecked: priorityFilms.length,
                validPages: results.filter(r => r.isValidPage).length,
                withMubiLinks: results.filter(r => r.mubiLinks?.length > 0).length,
                withStreamingContent: results.filter(r => r.hasStreamingContent).length,
                withStreamingProviders: results.filter(r => r.streamingProviders?.length > 0).length
            },
            filmsWithMubiLinks: results.filter(r => r.mubiLinks?.length > 0),
            filmsWithStreamingContent: results.filter(r => r.hasStreamingContent),
            allResults: results,
            scrapedAt: new Date().toISOString()
        };
        
        await fs.writeFile('./arthaus-enhanced-streaming-results.json', JSON.stringify(output, null, 2));
        console.log('\n💾 Enhanced results saved to arthaus-enhanced-streaming-results.json');
        
        console.log('\n📊 Enhanced Summary:');
        console.log(`- Films checked: ${output.summary.totalChecked}`);
        console.log(`- Valid pages found: ${output.summary.validPages}`);
        console.log(`- Films with Mubi links: ${output.summary.withMubiLinks}`);
        console.log(`- Films with streaming content: ${output.summary.withStreamingContent}`);
        console.log(`- Films mentioning streaming providers: ${output.summary.withStreamingProviders}`);
        
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

// Run the enhanced scraper
if (require.main === module) {
    scrapeArthausStreamingFilms()
        .then(results => {
            if (results) {
                console.log(`\n🎬 Enhanced streaming scraping completed!`);
                if (results.filmsWithMubiLinks.length > 0) {
                    console.log('\n🎯 SUCCESS! Films with Mubi links:');
                    results.filmsWithMubiLinks.forEach(film => {
                        console.log(`- ${film.title}: ${film.mubiLinks.length} links`);
                    });
                }
            }
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Enhanced scraping failed:', error);
            process.exit(1);
        });
}

module.exports = { scrapeArthausStreamingFilms };