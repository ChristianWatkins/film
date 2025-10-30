const puppeteer = require('puppeteer');
const fs = require('fs').promises;

async function scrapeArthausWithCookies() {
    console.log('🎬 Starting Arthaus.no scraper with cookie handling...');
    
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
            headless: false, // Keep visible to see cookie dialogs
            defaultViewport: { width: 1280, height: 720 },
            timeout: 60000,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Handle cookie consent
        async function handleCookieConsent() {
            console.log('🍪 Checking for cookie consent dialog...');
            
            try {
                // Wait a bit for any cookie dialog to appear
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Look for common cookie consent button texts in Norwegian/English
                const cookieSelectors = [
                    'button:contains("Tillat alle")',
                    'button:contains("Accept all")',
                    'button:contains("Godta alle")',
                    'button:contains("TILLAT ALLE")',
                    '[data-translate*="acceptAll"]',
                    '.cookie-consent button',
                    '#cookie-consent button',
                    'button[class*="accept"]',
                    'button[class*="cookie"]'
                ];
                
                // Use page.evaluate to find and click cookie buttons
                const cookieHandled = await page.evaluate(() => {
                    // Look for buttons with cookie-related text
                    const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
                    
                    const cookieButton = buttons.find(btn => {
                        const text = btn.textContent?.toLowerCase() || '';
                        return text.includes('tillat alle') ||
                               text.includes('accept all') ||
                               text.includes('godta alle') ||
                               text.includes('tillat alle cookies') ||
                               text.includes('accepter') ||
                               (text.includes('tillat') && text.includes('cookies'));
                    });
                    
                    if (cookieButton) {
                        console.log('Found cookie button:', cookieButton.textContent);
                        cookieButton.click();
                        return { success: true, buttonText: cookieButton.textContent };
                    }
                    
                    // Also check for cookie consent containers
                    const cookieContainer = document.querySelector('[class*="cookie"], [id*="cookie"]');
                    if (cookieContainer) {
                        const acceptBtn = cookieContainer.querySelector('button');
                        if (acceptBtn) {
                            acceptBtn.click();
                            return { success: true, buttonText: acceptBtn.textContent };
                        }
                    }
                    
                    return { success: false };
                });
                
                if (cookieHandled.success) {
                    console.log(`✅ Clicked cookie consent: "${cookieHandled.buttonText}"`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return true;
                } else {
                    console.log('ℹ️ No cookie consent dialog found');
                    return false;
                }
                
            } catch (error) {
                console.log('⚠️ Error handling cookies:', error.message);
                return false;
            }
        }
        
        const results = [];
        
        // Start with a few high-priority films
        const testFilms = arthausFilms.slice(0, 10);
        console.log(`🎯 Testing ${testFilms.length} films with cookie handling...`);
        
        for (let i = 0; i < testFilms.length; i++) {
            const film = testFilms[i];
            console.log(`\n📽️ [${i + 1}/${testFilms.length}] ${film.title} (${film.year})`);
            
            // Create slug from title
            const slug = film.title.toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            
            const movieUrl = `https://www.arthaus.no/movie/${slug}`;
            
            try {
                console.log(`🌐 Visiting: ${movieUrl}`);
                await page.goto(movieUrl, { 
                    waitUntil: 'networkidle2',
                    timeout: 15000 
                });
                
                // Handle cookies on each page
                await handleCookieConsent();
                
                // Wait for page to fully load after cookie consent
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Look for streaming content with enhanced detection
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
                    
                    // Look for streaming buttons more aggressively
                    const allButtons = Array.from(document.querySelectorAll('button, a[class*="button"], .btn, [role="button"], .streaming-button, .watch-button'));
                    const streamingButtons = allButtons.filter(btn => {
                        const text = btn.textContent?.toLowerCase() || '';
                        const href = btn.href?.toLowerCase() || '';
                        const className = btn.className?.toLowerCase() || '';
                        
                        return text.includes('mubi') ||
                               text.includes('se på') ||
                               text.includes('stream') ||
                               text.includes('watch') ||
                               text.includes('tilgjengelig') ||
                               href.includes('mubi') ||
                               className.includes('mubi') ||
                               className.includes('streaming');
                    });
                    
                    // Look for streaming provider sections
                    const streamingProviderElements = Array.from(document.querySelectorAll('*')).filter(el => {
                        const text = el.textContent?.toLowerCase() || '';
                        const className = el.className?.toLowerCase() || '';
                        
                        return (text.includes('tilgjengelig på') || 
                               text.includes('se filmen på') ||
                               text.includes('streaming') ||
                               className.includes('provider') ||
                               className.includes('streaming')) &&
                               el.children.length > 0 &&
                               text.length > 10 && text.length < 300;
                    });
                    
                    // Check for any mention of streaming services
                    const bodyText = document.body.textContent.toLowerCase();
                    const streamingServices = [];
                    const services = ['mubi', 'netflix', 'viaplay', 'hbo max', 'disney+', 'amazon prime', 'apple tv', 'paramount+'];
                    services.forEach(service => {
                        if (bodyText.includes(service)) {
                            streamingServices.push(service);
                        }
                    });
                    
                    // Look for any elements that might be hidden streaming content
                    const hiddenElements = Array.from(document.querySelectorAll('[style*="display: none"], .hidden, [hidden]'));
                    const hiddenStreamingContent = hiddenElements.filter(el => {
                        const text = el.textContent?.toLowerCase() || '';
                        return text.includes('mubi') || text.includes('streaming');
                    });
                    
                    return {
                        isValidPage: true,
                        pageTitle: document.title,
                        h1: document.querySelector('h1')?.textContent?.trim(),
                        mubiLinks: mubiLinks.map(link => ({
                            href: link.href,
                            text: link.textContent?.trim(),
                            isVisible: link.offsetParent !== null
                        })),
                        streamingButtons: streamingButtons.map(btn => ({
                            text: btn.textContent?.trim(),
                            href: btn.href || null,
                            className: btn.className,
                            isVisible: btn.offsetParent !== null
                        })),
                        streamingProviderElements: streamingProviderElements.slice(0, 3).map(el => ({
                            tag: el.tagName,
                            text: el.textContent?.trim().substring(0, 200),
                            className: el.className,
                            isVisible: el.offsetParent !== null
                        })),
                        streamingServices: streamingServices,
                        hiddenStreamingContent: hiddenStreamingContent.length,
                        url: window.location.href,
                        cookieDialogPresent: document.querySelector('[class*="cookie"], [id*="cookie"]') !== null
                    };
                }, film.title, film.year);
                
                if (pageData.isValidPage) {
                    const result = {
                        ...film,
                        slug,
                        url: movieUrl,
                        ...pageData
                    };
                    
                    results.push(result);
                    
                    console.log(`  ✅ Valid page: ${pageData.pageTitle}`);
                    console.log(`  🍪 Cookie dialog: ${pageData.cookieDialogPresent ? 'Yes' : 'No'}`);
                    console.log(`  📊 Mubi links: ${pageData.mubiLinks?.length || 0}`);
                    console.log(`  🎬 Streaming buttons: ${pageData.streamingButtons?.length || 0}`);
                    console.log(`  📺 Streaming services found: ${pageData.streamingServices?.join(', ') || 'none'}`);
                    console.log(`  🔍 Provider elements: ${pageData.streamingProviderElements?.length || 0}`);
                    
                    if (pageData.mubiLinks?.length > 0) {
                        console.log(`  🎯 MUBI LINKS FOUND!`);
                        pageData.mubiLinks.forEach(link => {
                            console.log(`    🔗 ${link.text} -> ${link.href} (visible: ${link.isVisible})`);
                        });
                    }
                    
                    if (pageData.streamingButtons?.length > 0) {
                        console.log(`  🔘 Streaming buttons:`);
                        pageData.streamingButtons.forEach(btn => {
                            console.log(`    🎮 "${btn.text}" -> ${btn.href || 'no href'} (visible: ${btn.isVisible})`);
                        });
                    }
                    
                    if (pageData.streamingProviderElements?.length > 0) {
                        console.log(`  📡 Provider elements found!`);
                        pageData.streamingProviderElements.forEach(el => {
                            console.log(`    📦 ${el.tag}: ${el.text.substring(0, 100)}...`);
                        });
                    }
                    
                } else {
                    console.log(`  ❌ Invalid page (404 or not found)`);
                }
                
            } catch (error) {
                console.error(`  ❌ Error loading ${movieUrl}:`, error.message);
            }
            
            // Wait between requests
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Save results
        const output = {
            summary: {
                totalChecked: testFilms.length,
                validPages: results.filter(r => r.isValidPage).length,
                withMubiLinks: results.filter(r => r.mubiLinks?.length > 0).length,
                withStreamingButtons: results.filter(r => r.streamingButtons?.length > 0).length,
                withStreamingServices: results.filter(r => r.streamingServices?.length > 0).length,
                withProviderElements: results.filter(r => r.streamingProviderElements?.length > 0).length
            },
            filmsWithMubiLinks: results.filter(r => r.mubiLinks?.length > 0),
            allResults: results,
            scrapedAt: new Date().toISOString()
        };
        
        await fs.writeFile('./arthaus-cookie-enhanced-results.json', JSON.stringify(output, null, 2));
        console.log('\n💾 Cookie-enhanced results saved to arthaus-cookie-enhanced-results.json');
        
        console.log('\n📊 Cookie-Enhanced Summary:');
        console.log(`- Films checked: ${output.summary.totalChecked}`);
        console.log(`- Valid pages found: ${output.summary.validPages}`);
        console.log(`- Films with Mubi links: ${output.summary.withMubiLinks}`);
        console.log(`- Films with streaming buttons: ${output.summary.withStreamingButtons}`);
        console.log(`- Films mentioning streaming services: ${output.summary.withStreamingServices}`);
        console.log(`- Films with provider elements: ${output.summary.withProviderElements}`);
        
        if (output.filmsWithMubiLinks.length > 0) {
            console.log('\n🎯 SUCCESS! Films with Mubi links:');
            output.filmsWithMubiLinks.forEach(film => {
                console.log(`- ${film.title}: ${film.mubiLinks.length} links`);
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

// Run the cookie-enhanced scraper
if (require.main === module) {
    scrapeArthausWithCookies()
        .then(results => {
            if (results) {
                console.log(`\n🎬 Cookie-enhanced scraping completed!`);
            }
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Cookie-enhanced scraping failed:', error);
            process.exit(1);
        });
}

module.exports = { scrapeArthausWithCookies };