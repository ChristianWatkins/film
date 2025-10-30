const puppeteer = require('puppeteer');

async function quickTestArthausMovie() {
    console.log('🎬 Quick test of Arthaus movie for streaming content...');
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true, // Run headless for quick results
            defaultViewport: { width: 1280, height: 720 }
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        const movieUrl = 'https://www.arthaus.no/movie/nouvelle-vague';
        console.log(`🎭 Testing: ${movieUrl}`);
        
        await page.goto(movieUrl, { waitUntil: 'networkidle2', timeout: 15000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Handle cookies
        console.log('🍪 Handling cookies...');
        await page.evaluate(() => {
            const cookieButtons = document.querySelectorAll('button, p, a, div');
            for (let btn of cookieButtons) {
                const text = btn.textContent?.toLowerCase() || '';
                if (text.includes('tillat alle') || text.includes('godta alle') || text.includes('accept all')) {
                    btn.click();
                    break;
                }
            }
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Scroll to load content
        console.log('📜 Scrolling to load content...');
        await page.evaluate(async () => {
            for (let i = 0; i < 3; i++) {
                window.scrollBy(0, 800);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            window.scrollTo(0, document.body.scrollHeight);
        });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Analyze content
        console.log('🔍 Analyzing content...');
        const result = await page.evaluate(() => {
            // Look for Mubi links
            const mubiLinks = Array.from(document.querySelectorAll('a[href*="mubi"]'));
            
            // Look for streaming-related text and elements
            const bodyText = document.body.textContent.toLowerCase();
            const streamingProviders = ['mubi', 'netflix', 'viaplay', 'hbo', 'disney'];
            const foundProviders = streamingProviders.filter(p => bodyText.includes(p));
            
            // Look for streaming keywords
            const streamingKeywords = ['se på', 'tilgjengelig på', 'streaming', 'watch', 'se filmen'];
            const foundKeywords = streamingKeywords.filter(k => bodyText.includes(k));
            
            // Find elements mentioning streaming
            const streamingElements = Array.from(document.querySelectorAll('*')).filter(el => {
                const text = el.textContent?.toLowerCase() || '';
                return (text.includes('mubi') || text.includes('se på') || text.includes('streaming')) 
                       && text.length > 5 && text.length < 200;
            }).slice(0, 10);
            
            // Look for sections that might contain streaming info
            const sections = Array.from(document.querySelectorAll('section, div[class*="content"], div[class*="info"]'));
            const streamingSections = sections.filter(section => {
                const text = section.textContent?.toLowerCase() || '';
                return text.includes('se') || text.includes('streaming') || text.includes('tilgjengelig');
            }).slice(0, 5);
            
            return {
                pageTitle: document.title,
                url: window.location.href,
                mubiLinksCount: mubiLinks.length,
                mubiLinks: mubiLinks.map(link => ({
                    href: link.href,
                    text: link.textContent?.trim()
                })),
                foundProviders,
                foundKeywords,
                streamingElementsCount: streamingElements.length,
                streamingElements: streamingElements.map(el => ({
                    tag: el.tagName,
                    text: el.textContent?.trim()?.substring(0, 100),
                    classes: el.className?.toString() || ''
                })),
                streamingSectionsCount: streamingSections.length,
                streamingSections: streamingSections.map(section => ({
                    tag: section.tagName,
                    text: section.textContent?.trim()?.substring(0, 200),
                    classes: section.className?.toString() || ''
                })),
                bodyTextSample: bodyText.substring(0, 300)
            };
        });
        
        console.log('\n📊 RESULTS:');
        console.log('=============');
        console.log(`Page: ${result.pageTitle}`);
        console.log(`Mubi links: ${result.mubiLinksCount}`);
        
        if (result.mubiLinks.length > 0) {
            console.log('\n🎯 MUBI LINKS FOUND:');
            result.mubiLinks.forEach(link => {
                console.log(`- ${link.text} -> ${link.href}`);
            });
        }
        
        console.log(`\nStreaming providers mentioned: ${result.foundProviders.join(', ') || 'none'}`);
        console.log(`Streaming keywords: ${result.foundKeywords.join(', ') || 'none'}`);
        console.log(`Streaming elements found: ${result.streamingElementsCount}`);
        console.log(`Streaming sections found: ${result.streamingSectionsCount}`);
        
        if (result.streamingElements.length > 0) {
            console.log('\n🎬 Streaming elements:');
            result.streamingElements.forEach((el, i) => {
                console.log(`${i + 1}. ${el.tag}: "${el.text}"`);
            });
        }
        
        if (result.streamingSections.length > 0) {
            console.log('\n📺 Streaming sections:');
            result.streamingSections.forEach((section, i) => {
                console.log(`${i + 1}. ${section.tag}: "${section.text}"`);
            });
        }
        
        console.log('\n📄 Body text sample:');
        console.log(result.bodyTextSample);
        
        return result;
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

quickTestArthausMovie();