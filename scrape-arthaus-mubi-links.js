const puppeteer = require('puppeteer');
const fs = require('fs').promises;

async function scrapeArthausMubiLinks() {
    console.log('🎬 Starting Arthaus.no Mubi link scraper...');
    
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
        
        console.log('📡 Navigating to arthaus.no...');
        await page.goto('https://www.arthaus.no', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // Wait a bit for initial load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('🔍 Looking for "Alle filmer" (All films) link...');
        
        // First, let's see what we have on the page
        const pageInfo = await page.evaluate(() => {
            const allLinks = Array.from(document.querySelectorAll('a'));
            const relevantLinks = allLinks.filter(link => 
                link.textContent.includes('Alle filmer') || 
                link.textContent.includes('alle filmer') ||
                link.href.includes('movies/all') ||
                link.href.includes('/movies/')
            );
            
            return {
                totalLinks: allLinks.length,
                relevantLinks: relevantLinks.map(link => ({
                    text: link.textContent.trim(),
                    href: link.href,
                    visible: link.offsetParent !== null
                })),
                title: document.title,
                bodyText: document.body.textContent.substring(0, 500)
            };
        });
        
        console.log(`📊 Page info: ${pageInfo.title}`);
        console.log(`🔗 Found ${pageInfo.totalLinks} total links, ${pageInfo.relevantLinks.length} relevant`);
        
        if (pageInfo.relevantLinks.length > 0) {
            console.log('🎯 Relevant links:');
            pageInfo.relevantLinks.forEach((link, index) => {
                console.log(`${index + 1}. "${link.text}" -> ${link.href} (visible: ${link.visible})`);
            });
            
            // Try to click the first visible relevant link
            const clickResult = await page.evaluate(() => {
                const allLinks = Array.from(document.querySelectorAll('a'));
                const allFilmsLink = allLinks.find(link => 
                    (link.textContent.includes('Alle filmer') || 
                     link.textContent.includes('alle filmer') ||
                     link.href.includes('movies/all')) &&
                    link.offsetParent !== null
                );
                
                if (allFilmsLink) {
                    allFilmsLink.click();
                    return { success: true, href: allFilmsLink.href };
                }
                return { success: false };
            });
            
            if (clickResult.success) {
                console.log(`✅ Clicked link to: ${clickResult.href}`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            } else {
                console.log('⚠️ Could not click any relevant link');
            }
        } else {
            console.log('⚠️ No relevant links found');
        }
        
        console.log('🎭 Looking for film listings...');
        
        // Try different selectors for film items
        const filmSelectors = [
            '.movie-item',
            '.film-item',
            '.movie-card',
            '.film-card',
            '[data-movie]',
            '.movie',
            '.film',
            'article',
            '.card'
        ];
        
        let films = [];
        
        for (const selector of filmSelectors) {
            const elements = await page.$$(selector);
            if (elements.length > 0) {
                console.log(`✅ Found ${elements.length} elements with selector: ${selector}`);
                
                // Extract film data
                films = await page.evaluate((sel) => {
                    const elements = document.querySelectorAll(sel);
                    const filmData = [];
                    
                    elements.forEach(element => {
                        const title = element.querySelector('h1, h2, h3, h4, h5, h6, .title, .movie-title, .film-title')?.textContent?.trim();
                        const links = Array.from(element.querySelectorAll('a[href*="mubi"]'));
                        const mubiLink = links.find(link => link.href.includes('mubi.com'))?.href;
                        
                        if (title) {
                            filmData.push({
                                title,
                                mubiLink: mubiLink || null,
                                element: element.outerHTML.substring(0, 200) + '...'
                            });
                        }
                    });
                    
                    return filmData;
                }, selector);
                
                if (films.length > 0) {
                    break;
                }
            }
        }
        
        if (films.length === 0) {
            console.log('🔍 No films found with standard selectors, trying to extract all links...');
            
            // Get all links and page content for analysis
            const pageData = await page.evaluate(() => {
                const allLinks = Array.from(document.querySelectorAll('a[href]'));
                const mubiLinks = allLinks.filter(link => link.href.includes('mubi.com'));
                
                return {
                    allLinksCount: allLinks.length,
                    mubiLinks: mubiLinks.map(link => ({
                        href: link.href,
                        text: link.textContent?.trim(),
                        html: link.outerHTML
                    })),
                    pageTitle: document.title,
                    bodyText: document.body.textContent.substring(0, 1000)
                };
            });
            
            console.log('📊 Page analysis:');
            console.log(`- Page title: ${pageData.pageTitle}`);
            console.log(`- Total links: ${pageData.allLinksCount}`);
            console.log(`- Mubi links found: ${pageData.mubiLinks.length}`);
            
            if (pageData.mubiLinks.length > 0) {
                console.log('🎯 Mubi links found:');
                pageData.mubiLinks.forEach((link, index) => {
                    console.log(`${index + 1}. ${link.text} -> ${link.href}`);
                });
            }
            
            // Save page content for analysis
            const pageContent = await page.content();
            await fs.writeFile('./arthaus-page-content.html', pageContent);
            console.log('📄 Page content saved to arthaus-page-content.html');
        }
        
        if (films.length > 0) {
            console.log(`🎉 Found ${films.length} films:`);
            films.forEach((film, index) => {
                console.log(`${index + 1}. ${film.title} ${film.mubiLink ? '-> ' + film.mubiLink : '(no Mubi link)'}`);
            });
            
            // Save results
            await fs.writeFile('./arthaus-scraping-results.json', JSON.stringify(films, null, 2));
            console.log('💾 Results saved to arthaus-scraping-results.json');
        }
        
        return films;
        
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
    scrapeArthausMubiLinks()
        .then(films => {
            console.log(`\n🎬 Scraping completed. Found ${films.length} films.`);
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Scraping failed:', error);
            process.exit(1);
        });
}

module.exports = { scrapeArthausMubiLinks };