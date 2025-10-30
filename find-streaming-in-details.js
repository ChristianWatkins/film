const puppeteer = require('puppeteer');

async function findStreamingLinksInFilmDetails() {
    console.log('🎬 Looking for streaming links in film details section...');
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false, // Show browser to see what we're doing
            defaultViewport: { width: 1280, height: 720 }
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        const movieUrl = 'https://www.arthaus.no/movie/nouvelle-vague';
        console.log(`🎭 Checking: ${movieUrl}`);
        
        await page.goto(movieUrl, { waitUntil: 'networkidle2', timeout: 15000 });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Handle cookies
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
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Scroll through the page to load all content
        await page.evaluate(async () => {
            window.scrollTo(0, document.body.scrollHeight);
            await new Promise(resolve => setTimeout(resolve, 2000));
            window.scrollTo(0, 0);
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Look specifically in the area where we saw the links in the screenshot
        const result = await page.evaluate(() => {
            // Look for the film details/info section
            const infoSections = Array.from(document.querySelectorAll('div, section, article')).filter(el => {
                const text = el.textContent || '';
                return text.includes('Premieredato') || 
                       text.includes('Språk') || 
                       text.includes('Land') ||
                       text.includes('Sjanger') ||
                       text.includes('Foto');
            });
            
            // Look for IMDb and TMDB links specifically
            const imdbLinks = Array.from(document.querySelectorAll('a[href*="imdb"]'));
            const tmdbLinks = Array.from(document.querySelectorAll('a[href*="themoviedb"], a[href*="tmdb"]'));
            const mubiLinks = Array.from(document.querySelectorAll('a[href*="mubi"]'));
            
            // Look for any links near the film info
            let nearbyLinks = [];
            infoSections.forEach(section => {
                const links = section.querySelectorAll('a[href]');
                links.forEach(link => {
                    nearbyLinks.push({
                        href: link.href,
                        text: link.textContent?.trim(),
                        title: link.title || '',
                        classes: link.className?.toString() || ''
                    });
                });
            });
            
            // Look for elements that might contain streaming provider buttons
            const providerElements = Array.from(document.querySelectorAll('*')).filter(el => {
                const classes = el.className?.toString()?.toLowerCase() || '';
                const text = el.textContent?.toLowerCase() || '';
                return classes.includes('provider') || 
                       classes.includes('streaming') || 
                       classes.includes('watch') ||
                       text.includes('the movie database') ||
                       text.includes('imdb') ||
                       text.includes('mubi');
            });
            
            // Look for images that might be provider logos
            const providerImages = Array.from(document.querySelectorAll('img')).filter(img => {
                const src = img.src?.toLowerCase() || '';
                const alt = img.alt?.toLowerCase() || '';
                return src.includes('mubi') || 
                       src.includes('imdb') || 
                       src.includes('tmdb') ||
                       alt.includes('mubi') ||
                       alt.includes('streaming');
            });
            
            return {
                pageTitle: document.title,
                infoSectionsCount: infoSections.length,
                infoSections: infoSections.slice(0, 3).map(section => ({
                    text: section.textContent?.trim()?.substring(0, 300),
                    html: section.innerHTML?.substring(0, 500),
                    classes: section.className?.toString() || ''
                })),
                imdbLinks: imdbLinks.map(link => ({
                    href: link.href,
                    text: link.textContent?.trim(),
                    title: link.title || ''
                })),
                tmdbLinks: tmdbLinks.map(link => ({
                    href: link.href,
                    text: link.textContent?.trim(),
                    title: link.title || ''
                })),
                mubiLinks: mubiLinks.map(link => ({
                    href: link.href,
                    text: link.textContent?.trim(),
                    title: link.title || ''
                })),
                nearbyLinks: nearbyLinks,
                providerElements: providerElements.slice(0, 5).map(el => ({
                    tag: el.tagName,
                    text: el.textContent?.trim()?.substring(0, 100),
                    classes: el.className?.toString() || '',
                    html: el.innerHTML?.substring(0, 200)
                })),
                providerImages: providerImages.map(img => ({
                    src: img.src,
                    alt: img.alt || '',
                    title: img.title || ''
                }))
            };
        });
        
        console.log('\n📊 DETAILED ANALYSIS:');
        console.log('======================');
        console.log(`Page: ${result.pageTitle}`);
        console.log(`Info sections found: ${result.infoSectionsCount}`);
        console.log(`IMDb links: ${result.imdbLinks.length}`);
        console.log(`TMDB links: ${result.tmdbLinks.length}`);
        console.log(`Mubi links: ${result.mubiLinks.length}`);
        console.log(`Nearby links: ${result.nearbyLinks.length}`);
        console.log(`Provider elements: ${result.providerElements.length}`);
        console.log(`Provider images: ${result.providerImages.length}`);
        
        if (result.mubiLinks.length > 0) {
            console.log('\n🎯 MUBI LINKS FOUND:');
            result.mubiLinks.forEach(link => {
                console.log(`- "${link.text}" -> ${link.href}`);
            });
        }
        
        if (result.imdbLinks.length > 0) {
            console.log('\n🎬 IMDb links:');
            result.imdbLinks.forEach(link => {
                console.log(`- "${link.text}" -> ${link.href}`);
            });
        }
        
        if (result.tmdbLinks.length > 0) {
            console.log('\n📺 TMDB links:');
            result.tmdbLinks.forEach(link => {
                console.log(`- "${link.text}" -> ${link.href}`);
            });
        }
        
        if (result.nearbyLinks.length > 0) {
            console.log('\n🔗 Links near film info:');
            result.nearbyLinks.forEach((link, i) => {
                if (i < 10) { // Show first 10
                    console.log(`${i + 1}. "${link.text}" -> ${link.href}`);
                    if (link.title) console.log(`   Title: ${link.title}`);
                }
            });
        }
        
        if (result.providerElements.length > 0) {
            console.log('\n📱 Provider elements:');
            result.providerElements.forEach((el, i) => {
                console.log(`${i + 1}. ${el.tag}: "${el.text}"`);
                if (el.classes) console.log(`   Classes: ${el.classes}`);
            });
        }
        
        if (result.providerImages.length > 0) {
            console.log('\n🖼️ Provider images:');
            result.providerImages.forEach((img, i) => {
                console.log(`${i + 1}. ${img.src}`);
                if (img.alt) console.log(`   Alt: ${img.alt}`);
            });
        }
        
        if (result.infoSections.length > 0) {
            console.log('\n📋 Film info sections:');
            result.infoSections.forEach((section, i) => {
                console.log(`${i + 1}. Text: ${section.text}`);
                console.log(`   Classes: ${section.classes}`);
                console.log('   HTML sample:', section.html);
                console.log('---');
            });
        }
        
        // Keep browser open for manual inspection
        console.log('\n🔍 Browser kept open for inspection. Look for streaming links and press Ctrl+C when done.');
        await new Promise(resolve => {
            process.on('SIGINT', () => {
                browser.close();
                resolve();
            });
        });
        
        return result;
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

findStreamingLinksInFilmDetails();