const puppeteer = require('puppeteer');

async function findStreamingTabAndLinks() {
    console.log('🎬 Looking for streaming tab and Mubi links...');
    
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
        console.log('🍪 Handling cookie consent...');
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
        console.log('📜 Scrolling to load content...');
        await page.evaluate(async () => {
            window.scrollTo(0, document.body.scrollHeight);
            await new Promise(resolve => setTimeout(resolve, 2000));
            window.scrollTo(0, 0);
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // First, check what tabs are available
        const availableTabs = await page.evaluate(() => {
            const selectButton = document.querySelector('p-selectbutton');
            if (!selectButton) return { error: 'No selectbutton found' };
            
            const buttons = selectButton.querySelectorAll('[role="radio"]');
            return {
                tabCount: buttons.length,
                tabs: Array.from(buttons).map((btn, i) => ({
                    index: i,
                    text: btn.textContent?.trim(),
                    ariaLabel: btn.getAttribute('aria-label'),
                    isSelected: btn.classList.contains('p-highlight'),
                    classes: btn.className
                }))
            };
        });
        
        console.log('\n📊 Available tabs:');
        console.log(JSON.stringify(availableTabs, null, 2));
        
        // Try to find and click the streaming tab
        console.log('\n🔍 Looking for streaming tab...');
        const streamingTabFound = await page.evaluate(() => {
            const selectButton = document.querySelector('p-selectbutton');
            if (!selectButton) return false;
            
            const buttons = selectButton.querySelectorAll('[role="radio"]');
            for (let btn of buttons) {
                const text = btn.textContent?.toLowerCase() || '';
                const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
                
                // Look for streaming-related text
                if (text.includes('se hjemme') || text.includes('streaming') || 
                    ariaLabel.includes('streaming') || ariaLabel.includes('watch-at-home')) {
                    console.log('Found streaming tab:', text, ariaLabel);
                    btn.click();
                    return true;
                }
            }
            return false;
        });
        
        if (streamingTabFound) {
            console.log('✅ Streaming tab clicked, waiting for content...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Scroll again to trigger any lazy loading in the new tab
            await page.evaluate(async () => {
                window.scrollTo(0, document.body.scrollHeight);
                await new Promise(resolve => setTimeout(resolve, 2000));
                window.scrollTo(0, 0);
            });
            await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
            console.log('❌ No streaming tab found');
        }
        
        // Now analyze the streaming content
        const result = await page.evaluate(() => {
            // Look for streaming providers and Mubi links
            const mubiLinks = Array.from(document.querySelectorAll('a[href*="mubi"]'));
            const streamingProviders = Array.from(document.querySelectorAll('*')).filter(el => {
                const text = el.textContent?.toLowerCase() || '';
                const classes = el.className?.toString()?.toLowerCase() || '';
                return text.includes('mubi') || 
                       text.includes('netflix') || 
                       text.includes('viaplay') || 
                       text.includes('streaming') ||
                       classes.includes('provider') ||
                       classes.includes('streaming');
            });
            
            // Look specifically in the streaming widget area
            const streamingWidget = document.getElementById('showtimeStreamingWidget');
            let streamingContent = null;
            if (streamingWidget) {
                streamingContent = {
                    html: streamingWidget.innerHTML.substring(0, 1000),
                    text: streamingWidget.textContent?.substring(0, 500),
                    links: Array.from(streamingWidget.querySelectorAll('a[href]')).map(link => ({
                        href: link.href,
                        text: link.textContent?.trim(),
                        title: link.title || ''
                    }))
                };
            }
            
            // Look for images that might be provider logos
            const providerImages = Array.from(document.querySelectorAll('img')).filter(img => {
                const src = img.src?.toLowerCase() || '';
                const alt = img.alt?.toLowerCase() || '';
                return src.includes('mubi') || 
                       src.includes('netflix') || 
                       src.includes('viaplay') ||
                       src.includes('provider') ||
                       alt.includes('mubi') ||
                       alt.includes('streaming');
            });
            
            // Check for any tab content that might be hidden
            const tabContainers = Array.from(document.querySelectorAll('.tab-container, [class*="tab"]'));
            
            return {
                pageTitle: document.title,
                mubiLinks: mubiLinks.map(link => ({
                    href: link.href,
                    text: link.textContent?.trim(),
                    title: link.title || ''
                })),
                streamingProviders: streamingProviders.slice(0, 10).map(el => ({
                    tag: el.tagName,
                    text: el.textContent?.trim()?.substring(0, 100),
                    classes: el.className?.toString() || '',
                    id: el.id || ''
                })),
                streamingWidget: streamingContent,
                providerImages: providerImages.map(img => ({
                    src: img.src,
                    alt: img.alt || '',
                    title: img.title || ''
                })),
                tabContainers: tabContainers.length,
                bodyText: document.body.textContent?.toLowerCase().includes('mubi')
            };
        });
        
        console.log('\n📊 STREAMING ANALYSIS:');
        console.log('======================');
        console.log(`Page: ${result.pageTitle}`);
        console.log(`Mubi links found: ${result.mubiLinks.length}`);
        console.log(`Streaming providers: ${result.streamingProviders.length}`);
        console.log(`Provider images: ${result.providerImages.length}`);
        console.log(`Tab containers: ${result.tabContainers}`);
        console.log(`Body contains "mubi": ${result.bodyText}`);
        
        if (result.mubiLinks.length > 0) {
            console.log('\n🎯 MUBI LINKS FOUND:');
            result.mubiLinks.forEach((link, i) => {
                console.log(`${i + 1}. "${link.text}" -> ${link.href}`);
                if (link.title) console.log(`   Title: ${link.title}`);
            });
        }
        
        if (result.streamingProviders.length > 0) {
            console.log('\n📱 Streaming providers:');
            result.streamingProviders.forEach((provider, i) => {
                console.log(`${i + 1}. ${provider.tag}: "${provider.text}"`);
                if (provider.classes) console.log(`   Classes: ${provider.classes}`);
                if (provider.id) console.log(`   ID: ${provider.id}`);
            });
        }
        
        if (result.providerImages.length > 0) {
            console.log('\n🖼️ Provider images:');
            result.providerImages.forEach((img, i) => {
                console.log(`${i + 1}. ${img.src}`);
                if (img.alt) console.log(`   Alt: ${img.alt}`);
            });
        }
        
        if (result.streamingWidget) {
            console.log('\n📺 Streaming widget content:');
            console.log(`Links: ${result.streamingWidget.links.length}`);
            result.streamingWidget.links.forEach((link, i) => {
                console.log(`${i + 1}. "${link.text}" -> ${link.href}`);
            });
            console.log(`Text sample: ${result.streamingWidget.text}`);
        }
        
        // Keep browser open for manual inspection
        console.log('\n🔍 Browser kept open for inspection. Look for streaming content and press Ctrl+C when done.');
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

findStreamingTabAndLinks();