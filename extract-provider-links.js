const puppeteer = require('puppeteer');

async function extractAllProviderLinks() {
    console.log('🎬 Extracting all provider links from third-party-info section...');
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1280, height: 720 }
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        const movieUrl = 'https://www.arthaus.no/movie/nouvelle-vague';
        console.log(`🎭 Analyzing: ${movieUrl}`);
        
        await page.goto(movieUrl, { waitUntil: 'networkidle2', timeout: 15000 });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Handle cookies
        console.log('🍪 Handling cookies...');
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
        
        // Progressive scrolling to trigger any lazy loading
        console.log('📜 Progressive scrolling...');
        await page.evaluate(async () => {
            const scrollHeight = document.body.scrollHeight;
            const viewportHeight = window.innerHeight;
            const steps = 5;
            
            for (let i = 0; i <= steps; i++) {
                const scrollPosition = (scrollHeight / steps) * i;
                window.scrollTo(0, scrollPosition);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Scroll back to top
            window.scrollTo(0, 0);
            await new Promise(resolve => setTimeout(resolve, 1000));
        });
        
        // Wait a bit more for any dynamic content
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Extract all provider information
        const result = await page.evaluate(() => {
            // Look for the third-party-info sections specifically
            const thirdPartyInfoSections = document.querySelectorAll('.third-party-info');
            const allProviderLinks = [];
            
            thirdPartyInfoSections.forEach((section, sectionIndex) => {
                const links = section.querySelectorAll('li a[href]');
                links.forEach(link => {
                    const linkInfo = {
                        section: sectionIndex,
                        href: link.href,
                        text: link.textContent?.trim(),
                        title: link.title || '',
                        className: link.className || '',
                        innerHTML: link.innerHTML?.substring(0, 200)
                    };
                    
                    // Identify the provider type
                    if (link.href.includes('imdb.com')) {
                        linkInfo.provider = 'IMDb';
                    } else if (link.href.includes('themoviedb.org') || link.href.includes('tmdb')) {
                        linkInfo.provider = 'TMDB';
                    } else if (link.href.includes('mubi.com')) {
                        linkInfo.provider = 'Mubi';
                    } else {
                        linkInfo.provider = 'Unknown';
                    }
                    
                    allProviderLinks.push(linkInfo);
                });
            });
            
            // Also look for any Mubi links anywhere on the page
            const allMubiLinks = Array.from(document.querySelectorAll('a[href*="mubi"]'));
            
            // Look for streaming widget content
            const streamingWidget = document.getElementById('showtimeStreamingWidget');
            let streamingInfo = null;
            if (streamingWidget) {
                const streamingLinks = streamingWidget.querySelectorAll('a[href]');
                streamingInfo = {
                    linkCount: streamingLinks.length,
                    links: Array.from(streamingLinks).map(link => ({
                        href: link.href,
                        text: link.textContent?.trim(),
                        classes: link.className || ''
                    }))
                };
            }
            
            // Check if there are any hidden or dynamically loaded elements
            const hiddenElements = Array.from(document.querySelectorAll('[style*="display: none"], [class*="hidden"], [class*="hide"]')).filter(el => {
                const text = el.textContent?.toLowerCase() || '';
                return text.includes('mubi') || text.includes('streaming');
            });
            
            return {
                pageTitle: document.title,
                thirdPartyInfoSections: thirdPartyInfoSections.length,
                providerLinks: allProviderLinks,
                allMubiLinks: allMubiLinks.map(link => ({
                    href: link.href,
                    text: link.textContent?.trim(),
                    context: link.closest('li, div, section')?.textContent?.trim()?.substring(0, 100)
                })),
                streamingWidget: streamingInfo,
                hiddenElements: hiddenElements.length,
                hiddenMubiContent: hiddenElements.map(el => ({
                    tag: el.tagName,
                    classes: el.className || '',
                    text: el.textContent?.trim()?.substring(0, 100)
                }))
            };
        });
        
        console.log('\n📊 PROVIDER ANALYSIS:');
        console.log('======================');
        console.log(`Page: ${result.pageTitle}`);
        console.log(`Third-party info sections: ${result.thirdPartyInfoSections}`);
        console.log(`Provider links found: ${result.providerLinks.length}`);
        console.log(`All Mubi links: ${result.allMubiLinks.length}`);
        console.log(`Hidden elements: ${result.hiddenElements}`);
        
        if (result.providerLinks.length > 0) {
            console.log('\n🔗 Provider links:');
            result.providerLinks.forEach((link, i) => {
                console.log(`${i + 1}. ${link.provider}: "${link.text}"`);
                console.log(`   URL: ${link.href}`);
                if (link.title) console.log(`   Title: ${link.title}`);
                console.log(`   Section: ${link.section}`);
                console.log('---');
            });
        }
        
        if (result.allMubiLinks.length > 0) {
            console.log('\n🎯 MUBI LINKS FOUND:');
            result.allMubiLinks.forEach((link, i) => {
                console.log(`${i + 1}. "${link.text}" -> ${link.href}`);
                if (link.context) console.log(`   Context: ${link.context}`);
            });
        } else {
            console.log('\n❌ NO MUBI LINKS FOUND');
        }
        
        if (result.streamingWidget) {
            console.log('\n📺 Streaming widget:');
            console.log(`Links: ${result.streamingWidget.linkCount}`);
            if (result.streamingWidget.links.length > 0) {
                result.streamingWidget.links.forEach((link, i) => {
                    console.log(`${i + 1}. "${link.text}" -> ${link.href}`);
                });
            }
        }
        
        if (result.hiddenMubiContent.length > 0) {
            console.log('\n👻 Hidden Mubi content:');
            result.hiddenMubiContent.forEach((el, i) => {
                console.log(`${i + 1}. ${el.tag}: "${el.text}"`);
                console.log(`   Classes: ${el.classes}`);
            });
        }
        
        // Try to interact with any tabs to see if there are additional provider links
        console.log('\n🔄 Checking for additional tabs or interactions...');
        const tabInteractionResult = await page.evaluate(() => {
            // Look for any clickable elements that might reveal more content
            const clickableElements = document.querySelectorAll('button, [role="tab"], [role="radio"], .tab, .button');
            let interactions = [];
            
            for (let element of clickableElements) {
                const text = element.textContent?.toLowerCase() || '';
                if (text.includes('streaming') || text.includes('se hjemme') || text.includes('watch')) {
                    interactions.push({
                        tag: element.tagName,
                        text: element.textContent?.trim(),
                        role: element.getAttribute('role'),
                        classes: element.className || ''
                    });
                    
                    // Try clicking it
                    try {
                        element.click();
                        return { clicked: true, element: text };
                    } catch (e) {
                        // Ignore click errors
                    }
                }
            }
            
            return { interactions: interactions, clicked: false };
        });
        
        if (tabInteractionResult.clicked) {
            console.log(`✅ Clicked element: ${tabInteractionResult.element}`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Re-check for provider links after interaction
            const updatedResult = await page.evaluate(() => {
                const newMubiLinks = Array.from(document.querySelectorAll('a[href*="mubi"]'));
                const newProviderLinks = Array.from(document.querySelectorAll('.third-party-info a[href]'));
                
                return {
                    newMubiLinks: newMubiLinks.length,
                    newProviderLinks: newProviderLinks.length,
                    mubiLinks: newMubiLinks.map(link => ({
                        href: link.href,
                        text: link.textContent?.trim()
                    }))
                };
            });
            
            if (updatedResult.newMubiLinks > 0) {
                console.log('\n🎉 NEW MUBI LINKS FOUND AFTER INTERACTION:');
                updatedResult.mubiLinks.forEach((link, i) => {
                    console.log(`${i + 1}. "${link.text}" -> ${link.href}`);
                });
            }
        } else {
            console.log('No streaming-related interactive elements found');
        }
        
        console.log('\n🔍 Browser kept open for manual inspection. Press Ctrl+C when done.');
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

extractAllProviderLinks();