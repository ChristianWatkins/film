# Film Festival Browser

A Next.js 15 web application for browsing Cannes Film Festival films (2020-2025) with streaming availability in Norway.

## Features

- 🎬 **216 Cannes films** from 2020-2025
- 📺 **Streaming availability** in Norway (62 films available)
- 🏆 **Award filtering** - Find Palme d'Or winners and other awarded films
- 🔍 **Search** by title or director
- 📊 **Filter** by year, festival, awards, streaming platforms
- 🔗 **Direct links** to MUBI and JustWatch

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration

### Streaming Services

You can customize which streaming platforms to show in `config/app-config.json`.

**Example:** Hide platforms you don't use:
```json
{
  "rent": {
    "Blockbuster": false,
    "Rakuten TV": true
  }
}
```

See `config/README.md` for full documentation.

**Note:** Restart the dev server after editing the config file.

## Data Sources

The app uses data from the parent `data/` directory:
- `data/festivals/cannes/*.json` - Festival film metadata
- `data/streaming/availability.json` - Streaming availability for Norway

Data is loaded server-side and merged on page load for optimal performance.

## Usage

### Filtering

**By Year:**
- Check/uncheck years to filter (2020-2025)

**By Awards:**
- Toggle "Awarded films only" to see prize winners

**By Availability:**
- All films
- Streaming only (subscription services)
- Rent/Buy only

**By Platform:**
- Filter by specific streaming platforms (Netflix, HBO, etc.)

### Search

Type in the search box to filter by:
- Film title
- Director name

### Sorting

Sort films by:
- Year (newest/oldest first)
- Title (A-Z or Z-A)

## Data Updates

To update streaming availability:

```bash
# Go to parent directory
cd ..

# Fetch latest streaming data
npm run fetch-streaming

# Restart the Next.js dev server to pick up changes
```

To add more festival years:

```bash
# Edit scraper.js YEAR constant
# Run scraper
npm run scrape

# Restart Next.js dev server
```

## Technical Details

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **Type Safety**: TypeScript
- **Data Loading**: Server-side with fs/promises
- **Filtering**: Client-side with React state
- **Performance**: Static data, no API calls needed

## Project Structure

```
film-app/
├── app/
│   ├── page.tsx           # Main page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/
│   ├── FilmBrowser.tsx    # Main browser component
│   ├── FilmCard.tsx       # Individual film card
│   ├── FilmGrid.tsx       # Grid layout
│   ├── Filters.tsx        # Filter sidebar
│   ├── StreamingBadge.tsx # Platform badges
│   └── AwardBadge.tsx     # Award indicators
├── lib/
│   ├── data.ts            # Data loading & merging
│   ├── types.ts           # TypeScript interfaces
│   └── filters.ts         # Filter logic
└── public/
    └── data/              # Symlink to ../data/
```

## Future Enhancements

- Add more festivals (Berlin, Venice, Sundance)
- Save favorite films to localStorage
- Export filtered lists as CSV
- Add dark mode
- Film detail modal/page
- Share filtered views via URL parameters
- Performance optimizations (virtualization for large lists)

## License

Personal use only
