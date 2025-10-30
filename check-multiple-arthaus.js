const puppeteer = require('puppeteer');

// Test a few different arthaus movies to see the structure
const testMovies = [
    'https://www.arthaus.no/movie/nouvelle-vague',
    'https://www.arthaus.no/movie/anora',  // Try another movie
    'https://www.arthaus.no/movie/emilia-perez'  // And another
];

async function checkMultipleMoviesForMubiPattern() {
    console.log('🎬 Checking multiple arthaus movies for Mubi link patterns...');
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true, // Run faster in headless mode
            defaultViewport: { width: 1280, height: 720 }
        });
        
        for (const movieUrl of testMovies) {
            console.log(`\n🎭 Checking: ${movieUrl}`);
            
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            try {
                await page.goto(movieUrl, { waitUntil: 'networkidle2', timeout: 10000 });
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Handle cookies quickly
                await page.evaluate(() => {
                    const cookieButtons = document.querySelectorAll('button, p, a');
                    for (let btn of cookieButtons) {
                        const text = btn.textContent?.toLowerCase() || '';
                        if (text.includes('tillat alle') || text.includes('accept all')) {
                            btn.click();
                            break;
                        }
                    }
                });
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Quick scroll to load content
                await page.evaluate(() => {
                    window.scrollTo(0, document.body.scrollHeight);
                });
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const analysis = await page.evaluate(() => {
                    // Look for third-party-info sections
                    const thirdPartyInfoSections = document.querySelectorAll('.third-party-info');
                    const allLinks = [];
                    
                    thirdPartyInfoSections.forEach(section => {
                        const links = section.querySelectorAll('a[href]');
                        links.forEach(link => {
                            allLinks.push({
                                href: link.href,
                                text: link.textContent?.trim(),
                                innerHTML: link.innerHTML?.substring(0, 100)
                            });
                        });
                    });
                    
                    // Check for any Mubi mentions anywhere
                    const bodyText = document.body.textContent?.toLowerCase() || '';
                    const mubiMentions = bodyText.includes('mubi');
                    
                    // Look for any Mubi links
                    const mubiLinks = Array.from(document.querySelectorAll('a[href*="mubi"]'));
                    
                    return {
                        title: document.title,
                        thirdPartyLinks: allLinks,
                        mubiMentions: mubiMentions,
                        mubiLinks: mubiLinks.map(link => ({
                            href: link.href,
                            text: link.textContent?.trim()
                        }))
                    };
                });
                
                console.log(`📄 ${analysis.title}`);
                console.log(`   Third-party links: ${analysis.thirdPartyLinks.length}`);
                analysis.thirdPartyLinks.forEach(link => {
                    const provider = link.href.includes('imdb') ? 'IMDb' : 
                                   link.href.includes('themoviedb') ? 'TMDB' :
                                   link.href.includes('mubi') ? 'MUBI' : 'Other';
                    console.log(`   - ${provider}: ${link.href}`);
                });
                
                if (analysis.mubiLinks.length > 0) {
                    console.log(`🎯 MUBI LINKS FOUND: ${analysis.mubiLinks.length}`);
                    analysis.mubiLinks.forEach(link => {
                        console.log(`   - ${link.text}: ${link.href}`);
                    });
                } else {
                    console.log(`❌ No Mubi links found (mentions: ${analysis.mubiMentions})`);
                }
                
            } catch (error) {
                console.log(`❌ Error loading ${movieUrl}: ${error.message}`);
            }
            
            await page.close();
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

checkMultipleMoviesForMubiPattern();