# MUBI Trailer Auto-Play & Fullscreen Userscript

This userscript automatically plays and fullscreens MUBI trailers when they're opened from the film festival browser.

## Installation

### Step 1: Install a Userscript Manager

Choose one of these browser extensions:

- **ViolentMonkey** (Recommended): [Chrome](https://chrome.google.com/webstore/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfeag) | [Firefox](https://addons.mozilla.org/en-US/firefox/addon/violentmonkey/) | [Edge](https://microsoftedge.microsoft.com/addons/detail/eeagobfjdenkkddmbclomhiblgggliao)
- **Tampermonkey**: [Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) | [Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) | [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/gmlllbghnfkpflemihlggbidejmhlibn)
- **Greasemonkey**: [Firefox](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)

### Step 2: Install the Script

1. Open the userscript manager extension (click its icon in your browser toolbar)
2. Click **"Create a new script"** or **"New script"**
3. Delete all the default template code
4. Copy the entire contents of `mubi-trailer-autoplay-fullscreen.user.js` from this repository
5. Paste it into the script editor
6. Save the script (Ctrl+S or Cmd+S)

### Step 3: Verify Installation

1. The script should now be active
2. When you press **"T"** to open a trailer from the film browser, it should:
   - Automatically start playing
   - Enter fullscreen mode

## How It Works

The script:
- Detects when a MUBI trailer page loads (`/trailer` URL)
- Finds the video element on the page
- Automatically mutes and plays the video (required by browser autoplay policies)
- Unmutes after playback starts
- Requests fullscreen mode
- Works with both direct video elements and embedded iframes (YouTube/Vimeo)

## Troubleshooting

### Script doesn't work

1. **Check the URL**: Make sure you're on a MUBI trailer page (`mubi.com/.../trailer`)
2. **Check script is enabled**: Open your userscript manager and verify the script is enabled
3. **Check browser console**: Press F12, go to Console tab, and look for `[MUBI Trailer Script]` messages
4. **Try manual refresh**: Some pages load dynamically - try refreshing the trailer page

### Fullscreen doesn't work

- Some browsers require user interaction for fullscreen. The script tries multiple times, but you may need to click once on the page first
- If fullscreen fails, the video should still autoplay

### Autoplay doesn't work

- Modern browsers block autoplay with sound. The script mutes the video first, then unmutes after playback starts
- If your browser has strict autoplay policies, you may need to interact with the page first

## Customization

You can edit the script to:
- Change the delay before fullscreen (currently tries at 0ms, 500ms, 1000ms, 2000ms)
- Adjust volume settings
- Modify video selectors if MUBI changes their page structure

## Notes

- The script only runs on MUBI trailer pages, not on other pages
- It's safe to use - it only affects MUBI trailer pages
- The script will automatically update if you reinstall it from the repository

