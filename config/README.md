# Application Configuration

Control streaming platforms, their priority, and UI settings through a simple JSON configuration file.

## File: `app-config.json`

### Structure

```json
{
  "platforms": [
    { "name": "NRK TV", "enabled": true },
    { "name": "Netflix", "enabled": true },
    { "name": "HBO Max", "enabled": false }
  ],
  "hideRentBuyIfStreaming": true,
  "showOnlyFirstMatch": true,
  "showMoreIndicator": true,
  "hideDisabledPlatforms": true,
  "enableCardAnimations": true
}
```

### Platform Settings

**platforms** (array) - **Order matters!** Top = highest priority

Each platform has:
- **`name`**: The platform name (must match JustWatch names)
- **`enabled`**: `true` if you have/use this service, `false` to disable it

**To reorder:** Just drag/cut-paste the lines in your editor!

### Global Settings

**hideRentBuyIfStreaming** (boolean)
- `true` (default): If film can be streamed, hide rent/buy options
- `false`: Always show rent/buy even if streaming available

**showOnlyFirstMatch** (boolean)
- `true` (default): Show only your #1 available platform
- `false`: Show all enabled platforms

**showMoreIndicator** (boolean)
- `true` (default): Show "++" when more options exist
- `false`: Don't show the indicator

**hideDisabledPlatforms** (boolean)
- `true` (default): Only consider platforms where `enabled: true`
- `false`: Show all platforms regardless of enabled status

**enableCardAnimations** (boolean)
- `true` (default): Enable smooth animations when cards appear/disappear or change position
- `false`: Disable card animations for instant updates

## How It Works

**Example:** Film available on Netflix, NRK TV, and Viaplay

**Your config:**
```json
{
  "platforms": [
    { "name": "NRK TV", "enabled": true },
    { "name": "TV 2 Play", "enabled": true },
    { "name": "Netflix", "enabled": true },
    { "name": "Viaplay", "enabled": false }
  ]
}
```

**Result:** Shows "**NRK TV** ++ • Streaming"

- NRK TV shown (first in your list that has it)
- "++" indicates more enabled options available (Netflix)
- Viaplay ignored (disabled)
- "Streaming" shows the type

## Quick Setup

**1. Enable platforms you have:**

Set `"enabled": true` for services you subscribe to.

**2. Reorder for preference:**

Cut-paste platform objects to reorder:
```json
[
  { "name": "NRK TV", "enabled": true },      // Most preferred
  { "name": "TV 2 Play", "enabled": true },
  { "name": "Netflix", "enabled": true }      // Least preferred (of enabled)
]
```

**3. Restart:** `npm run dev`

## Common Setups

**Only Norwegian Services:**
```json
{
  "platforms": [
    { "name": "NRK TV", "enabled": true },
    { "name": "TV 2 Play", "enabled": true },
    { "name": "Viaplay", "enabled": true },
    { "name": "Netflix", "enabled": false },
    { "name": "HBO Max", "enabled": false }
  ]
}
```

**Norwegian First, Then International:**
```json
{
  "platforms": [
    { "name": "NRK TV", "enabled": true },
    { "name": "TV 2 Play", "enabled": true },
    { "name": "Netflix", "enabled": true },
    { "name": "Disney Plus", "enabled": true }
  ]
}
```

## Tips

- **Array order** = priority (top = best)
- Set `enabled: false` for platforms you don't have
- The app hides rent/buy when streaming is available (configurable)
- Restart dev server after changes
