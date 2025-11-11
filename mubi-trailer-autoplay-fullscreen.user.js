// ==UserScript==
// @name         MUBI Trailer Auto-Play & Fullscreen
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automatically play and fullscreen MUBI trailers when opened
// @author       You
// @match        https://mubi.com/*/trailer
// @match        https://mubi.com/*/trailer/*
// @match        https://*.mubi.com/*/trailer
// @match        https://*.mubi.com/*/trailer/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    console.log('[MUBI Trailer Script] Script loaded');

    // Function to find and control video element
    function findAndControlVideo() {
        // Try multiple selectors to find the video element
        const videoSelectors = [
            'video',
            'iframe[src*="youtube"]',
            'iframe[src*="vimeo"]',
            '[data-video]',
            '.video-player video',
            '.trailer video',
            'video[src]',
            'video source'
        ];

        let video = null;
        let iframe = null;

        // First, try to find a direct video element
        for (const selector of videoSelectors) {
            const element = document.querySelector(selector);
            if (element && element.tagName === 'VIDEO') {
                video = element;
                console.log('[MUBI Trailer Script] Found video element:', selector);
                break;
            } else if (element && element.tagName === 'IFRAME') {
                iframe = element;
                console.log('[MUBI Trailer Script] Found iframe element:', selector);
            }
        }

        // If we found a video element
        if (video) {
            console.log('[MUBI Trailer Script] Attempting to control video element');

            // Set video to muted for autoplay (browser requirement)
            video.muted = true;
            video.volume = 0;

            // Try to play the video
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('[MUBI Trailer Script] Video autoplay started (muted)');
                        
                        // Setup: On first user interaction, unmute and go fullscreen
                        let interactionHandled = false;
                        const handleFirstInteraction = () => {
                            if (interactionHandled) return;
                            interactionHandled = true;
                            
                            try {
                                // Resume if paused
                                if (video.paused) {
                                    video.play();
                                }
                                
                                // Unmute
                                video.muted = false;
                                video.volume = 1;
                                
                                // Request fullscreen (requires user interaction)
                                const requestFullscreen = () => {
                                    if (video.requestFullscreen) {
                                        video.requestFullscreen().catch(err => {
                                            console.log('[MUBI Trailer Script] Fullscreen request failed:', err);
                                        });
                                    } else if (video.webkitRequestFullscreen) {
                                        video.webkitRequestFullscreen();
                                    } else if (video.mozRequestFullScreen) {
                                        video.mozRequestFullScreen();
                                    } else if (video.msRequestFullscreen) {
                                        video.msRequestFullscreen();
                                    }
                                };
                                
                                requestFullscreen();
                                
                                console.log('[MUBI Trailer Script] Video unmuted and fullscreen requested after user interaction');
                                
                                // Remove all listeners
                                document.removeEventListener('click', handleFirstInteraction);
                                document.removeEventListener('touchstart', handleFirstInteraction);
                                document.removeEventListener('keydown', handleFirstInteraction);
                                document.removeEventListener('mousedown', handleFirstInteraction);
                            } catch (error) {
                                console.log('[MUBI Trailer Script] Interaction handler failed:', error);
                            }
                        };
                        
                        // Listen for user interaction (click, tap, keypress, mousedown)
                        document.addEventListener('click', handleFirstInteraction, { once: true });
                        document.addEventListener('touchstart', handleFirstInteraction, { once: true });
                        document.addEventListener('keydown', handleFirstInteraction, { once: true });
                        document.addEventListener('mousedown', handleFirstInteraction, { once: true });
                    })
                    .catch(error => {
                        console.log('[MUBI Trailer Script] Autoplay failed:', error);
                    });
            }

            // Fullscreen will be handled in the user interaction handler above
            // (removed separate fullscreen attempts to avoid conflicts)

            return true;
        }

        // If we found an iframe (YouTube/Vimeo embed), try to modify it for autoplay
        if (iframe) {
            console.log('[MUBI Trailer Script] Found iframe, attempting to enable autoplay');
            
            const iframeSrc = iframe.src;
            
            // Modify YouTube URLs to include autoplay
            if (iframeSrc.includes('youtube.com') || iframeSrc.includes('youtu.be')) {
                let newSrc = iframeSrc;
                
                // Add autoplay=1 if not present
                if (!newSrc.includes('autoplay=1')) {
                    newSrc += (newSrc.includes('?') ? '&' : '?') + 'autoplay=1';
                }
                
                // Add mute=1 for autoplay to work
                if (!newSrc.includes('mute=')) {
                    newSrc += '&mute=1';
                }
                
                // Add enablejsapi=1 for better control
                if (!newSrc.includes('enablejsapi=1')) {
                    newSrc += '&enablejsapi=1';
                }
                
                // Only update if URL changed
                if (newSrc !== iframeSrc) {
                    console.log('[MUBI Trailer Script] Updating YouTube iframe URL for autoplay');
                    iframe.src = newSrc;
                }
            }
            
            // Modify Vimeo URLs to include autoplay
            if (iframeSrc.includes('vimeo.com')) {
                let newSrc = iframeSrc;
                
                // Add autoplay=1 if not present
                if (!newSrc.includes('autoplay=1')) {
                    newSrc += (newSrc.includes('?') ? '&' : '?') + 'autoplay=1';
                }
                
                // Add muted=1 for autoplay to work
                if (!newSrc.includes('muted=')) {
                    newSrc += '&muted=1';
                }
                
                // Only update if URL changed
                if (newSrc !== iframeSrc) {
                    console.log('[MUBI Trailer Script] Updating Vimeo iframe URL for autoplay');
                    iframe.src = newSrc;
                }
            }
            
            // Try to find and click a play button (fallback)
            setTimeout(() => {
                const playButtonSelectors = [
                    '.play-button',
                    '[aria-label*="play" i]',
                    '[aria-label*="Play" i]',
                    'button[class*="play"]',
                    '.ytp-large-play-button', // YouTube
                    '.vp-play-button', // Vimeo
                    'button:has(svg[class*="play"])'
                ];

                for (const selector of playButtonSelectors) {
                    const playButton = document.querySelector(selector);
                    if (playButton) {
                        console.log('[MUBI Trailer Script] Found play button:', selector);
                        playButton.click();
                        break;
                    }
                }
            }, 1000);

            // Try to request fullscreen on the iframe's container
            const iframeContainer = iframe.closest('div') || iframe.parentElement;
            if (iframeContainer) {
                const requestContainerFullscreen = () => {
                    if (iframeContainer.requestFullscreen) {
                        iframeContainer.requestFullscreen().catch(err => {
                            console.log('[MUBI Trailer Script] Container fullscreen failed:', err);
                        });
                    } else if (iframeContainer.webkitRequestFullscreen) {
                        iframeContainer.webkitRequestFullscreen();
                    } else if (iframeContainer.mozRequestFullScreen) {
                        iframeContainer.mozRequestFullScreen();
                    } else if (iframeContainer.msRequestFullscreen) {
                        iframeContainer.msRequestFullscreen();
                    }
                };
                
                // Try multiple times
                setTimeout(requestContainerFullscreen, 1500);
                setTimeout(requestContainerFullscreen, 2500);
            }
            
            return true; // Consider iframe handling successful
        }

        return false;
    }

    // Try immediately
    if (findAndControlVideo()) {
        console.log('[MUBI Trailer Script] Video control successful');
        return;
    }

    // If not found immediately, wait for page to load and try again
    let attempts = 0;
    const maxAttempts = 10;
    const checkInterval = setInterval(() => {
        attempts++;
        console.log(`[MUBI Trailer Script] Attempt ${attempts} to find video...`);
        
        if (findAndControlVideo() || attempts >= maxAttempts) {
            clearInterval(checkInterval);
            if (attempts >= maxAttempts) {
                console.log('[MUBI Trailer Script] Max attempts reached, giving up');
            }
        }
    }, 500);

    // Also listen for DOM changes (in case video is added dynamically)
    const observer = new MutationObserver(() => {
        if (findAndControlVideo()) {
            observer.disconnect();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Clean up observer after 10 seconds
    setTimeout(() => {
        observer.disconnect();
    }, 10000);

})();

