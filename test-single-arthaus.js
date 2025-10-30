const puppeteer = require('puppeteer');

async function testSingleArthausMovie() {
    console.log('🎬 Testing single Arthaus movie for Mubi links...');
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false, // Show browser for debugging
            defaultViewport: { width: 1280, height: 720 },
            timeout: 60000
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Test with "Nouvelle Vague" since we know this page exists
        const movieUrl = 'https://www.arthaus.no/movie/nouvelle-vague';
        console.log(`🎭 Testing: ${movieUrl}`);
        
        await page.goto(movieUrl, { 
            waitUntil: 'networkidle2',
            timeout: 15000 
        });
        
        console.log('⏳ Page loaded, waiting...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Handle cookie consent
        console.log('🍪 Looking for cookie consent...');
        try {
            const cookieHandled = await page.evaluate(() => {
                // Look for cookie consent elements
                const cookieButtons = document.querySelectorAll('button, p, a, div[role="button"]');
                for (let btn of cookieButtons) {
                    const text = btn.textContent?.toLowerCase() || '';
                    if (text.includes('tillat alle') || 
                        text.includes('accept all') || 
                        text.includes('godta alle') ||
                        text.includes('alle cookies')) {
                        console.log('Found cookie button:', text);
                        btn.click();
                        return true;
                    }
                }
                return false;
            });
            
            if (cookieHandled) {
                console.log('✅ Cookie consent clicked');
                await new Promise(resolve => setTimeout(resolve, 3000));
            } else {
                console.log('ℹ️ No cookie consent found');
            }
        } catch (error) {
            console.log('⚠️ Cookie handling error:', error.message);
        }
        
        // Scroll down to reveal lazy-loaded content
        console.log('📜 Scrolling to reveal content...');
        try {
            await page.evaluate(async () => {
                // Scroll to bottom in steps to trigger lazy loading
                const scrollStep = 500;
                const scrollDelay = 1000;
                
                for (let i = 0; i < 5; i++) {
                    window.scrollBy(0, scrollStep);
                    await new Promise(resolve => setTimeout(resolve, scrollDelay));
                }
                
                // Scroll to bottom
                window.scrollTo(0, document.body.scrollHeight);
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Scroll back up a bit to ensure all content is loaded
                window.scrollTo(0, document.body.scrollHeight * 0.7);
            });
            
            console.log('✅ Scrolling completed');
            await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error) {
            console.log('⚠️ Scrolling error:', error.message);
        }
        
        // Now analyze the page thoroughly
        console.log('🔍 Analyzing page content...');
        const analysis = await page.evaluate(() => {
            // Basic page info
            const pageInfo = {
                title: document.title,
                h1: document.querySelector('h1')?.textContent?.trim(),
                url: window.location.href,
                isValidPage: !document.body.textContent.includes('FINNER IKKE SIDEN')
            };
            
            // Look for all links
            const allLinks = Array.from(document.querySelectorAll('a[href]'));
            const mubiLinks = allLinks.filter(link => link.href.includes('mubi.com'));
            
            // Look for any mention of streaming providers in text
            const bodyText = document.body.textContent.toLowerCase();
            const providers = ['mubi', 'netflix', 'viaplay', 'hbo', 'disney', 'amazon', 'prime'];
            const foundProviders = providers.filter(provider => bodyText.includes(provider));
            
            // Look for streaming-related text
            const streamingKeywords = ['se på', 'tilgjengelig på', 'streaming', 'watch', 'se filmen'];
            const foundKeywords = streamingKeywords.filter(keyword => bodyText.includes(keyword));
            
            // Get all buttons
            const allButtons = Array.from(document.querySelectorAll('button, a[class*="button"], .btn'));
            const buttonTexts = allButtons.map(btn => btn.textContent?.trim()).filter(text => text && text.length < 50);
            
            // Look for any elements that might contain streaming info
            const streamingElements = Array.from(document.querySelectorAll('*')).filter(el => {
                const text = el.textContent?.toLowerCase() || '';
                const className = el.className?.toString()?.toLowerCase() || '';
                return text.includes('mubi') || 
                       text.includes('se på') || 
                       text.includes('streaming') ||
                       text.includes('tilgjengelig') ||
                       text.includes('watch') ||
                       className.includes('streaming') ||
                       className.includes('watch') ||
                       className.includes('provider');
            }).slice(0, 10);
            
            // Look specifically for sections that might contain streaming providers
            const streamingSections = Array.from(document.querySelectorAll('section, div[class*="stream"], div[class*="watch"], div[class*="provider"]'));
            
            // Look for any divs or sections that might be streaming-related
            const potentialStreamingContainers = Array.from(document.querySelectorAll('div, section')).filter(el => {
                const text = el.textContent?.toLowerCase() || '';
                const hasStreamingText = text.includes('se filmen') || 
                                       text.includes('tilgjengelig på') ||
                                       text.includes('streaming tjenester') ||
                                       text.includes('hvor kan du se');
                // Only include containers with reasonable amount of content
                return hasStreamingText && text.length > 10 && text.length < 1000;
            }).slice(0, 5);
            
            return {
                pageInfo,
                mubiLinks: mubiLinks.map(link => ({
                    href: link.href,
                    text: link.textContent?.trim(),
                    parentText: link.parentElement?.textContent?.trim()?.substring(0, 100)
                })),
                foundProviders,
                foundKeywords,
                buttonTexts: buttonTexts.slice(0, 10),
                streamingElements: streamingElements.map(el => ({
                    tag: el.tagName,
                    text: el.textContent?.trim()?.substring(0, 150),
                    classes: el.className?.toString() || ''
                })),
                streamingSections: streamingSections.map(el => ({
                    tag: el.tagName,
                    text: el.textContent?.trim()?.substring(0, 200),
                    classes: el.className?.toString() || '',
                    id: el.id || ''
                })),
                potentialStreamingContainers: potentialStreamingContainers.map(el => ({
                    tag: el.tagName,
                    text: el.textContent?.trim()?.substring(0, 300),
                    classes: el.className?.toString() || '',
                    innerHTML: el.innerHTML?.substring(0, 200) + '...'
                })),
                totalLinks: allLinks.length,
                totalButtons: allButtons.length,
                bodyTextSample: bodyText.substring(0, 500) + '...'
            };
        });
        
        console.log('\n📊 Analysis Results:');
        console.log('====================');
        console.log(`Page: ${analysis.pageInfo.title}`);
        console.log(`Valid: ${analysis.pageInfo.isValidPage}`);
        console.log(`H1: ${analysis.pageInfo.h1}`);
        console.log(`Total links: ${analysis.totalLinks}`);
        console.log(`Total buttons: ${analysis.totalButtons}`);
        console.log(`Mubi links found: ${analysis.mubiLinks.length}`);
        
        if (analysis.mubiLinks.length > 0) {
            console.log('\n🎯 MUBI LINKS FOUND:');
            analysis.mubiLinks.forEach((link, i) => {
                console.log(`${i + 1}. ${link.text} -> ${link.href}`);
                console.log(`   Context: ${link.parentText}`);
            });
        }
        
        console.log(`\nStreaming providers mentioned: ${analysis.foundProviders.join(', ') || 'none'}`);
        console.log(`Streaming keywords found: ${analysis.foundKeywords.join(', ') || 'none'}`);
        
        if (analysis.streamingElements.length > 0) {
            console.log('\n🎬 Streaming-related elements:');
            analysis.streamingElements.forEach((el, i) => {
                console.log(`${i + 1}. ${el.tag}: ${el.text}`);
                if (el.classes) console.log(`   Classes: ${el.classes}`);
            });
        }
        
        if (analysis.streamingSections && analysis.streamingSections.length > 0) {
            console.log('\n📺 Streaming sections:');
            analysis.streamingSections.forEach((el, i) => {
                console.log(`${i + 1}. ${el.tag}: ${el.text}`);
                if (el.classes) console.log(`   Classes: ${el.classes}`);
                if (el.id) console.log(`   ID: ${el.id}`);
            });
        }
        
        if (analysis.potentialStreamingContainers && analysis.potentialStreamingContainers.length > 0) {
            console.log('\n🎯 Potential streaming containers:');
            analysis.potentialStreamingContainers.forEach((el, i) => {
                console.log(`${i + 1}. ${el.tag}: ${el.text}`);
                console.log(`   Classes: ${el.classes}`);
                console.log(`   HTML sample: ${el.innerHTML}`);
            });
        }
        
        console.log('\n🔘 Sample buttons:');
        analysis.buttonTexts.slice(0, 5).forEach((text, i) => {
            console.log(`${i + 1}. "${text}"`);
        });
        
        console.log('\n📄 Body text sample:');
        console.log(analysis.bodyTextSample);
        
        // Save the full page HTML for manual inspection
        const pageContent = await page.content();
        require('fs').writeFileSync('./nouvelle-vague-page.html', pageContent);
        console.log('\n💾 Full page saved to nouvelle-vague-page.html');
        
        return analysis;
        
    } catch (error) {
        console.error('❌ Error:', error);
        return null;
    } finally {
        if (browser) {
            // Keep browser open for manual inspection
            console.log('\n🔍 Browser kept open for manual inspection. Press Ctrl+C when done.');
            await new Promise(resolve => {
                process.on('SIGINT', () => {
                    browser.close();
                    resolve();
                });
            });
        }
    }
}

// Run the test
testSingleArthausMovie()
    .then(result => {
        if (result) {
            console.log('\n✅ Test completed successfully!');
        }
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Test failed:', error);
        process.exit(1);
    });