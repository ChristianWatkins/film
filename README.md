<<<<<<< HEAD
# film
Streamestatus på filmfestivalfilmer
=======
# Film Festival & Streaming Availability Tracker

A JavaScript-based system for tracking film festival data and streaming availability. Scrapes festival data from MUBI and enriches it with streaming availability from JustWatch for Norway.

## Features

### Festival Data Collection
- ✅ Scrapes film data from MUBI film festival pages (currently: Cannes, Bergen)
- ✅ Follows pagination automatically
- ✅ Polite scraping with 2.5-second delays between requests
- ✅ Bypasses anti-bot protection using puppeteer-extra-plugin-stealth
- ✅ Extracts complete film information:
  - Movie title
  - Year
  - Country
  - Director
  - Link to MUBI film page
  - Award status (awarded: true/false)
  - Awards received (Palme d'Or, Grand Prix, Main Prize, etc.)

### Streaming Availability
- ✅ Integrates with JustWatch API for Norway
- ✅ Fetches streaming, rent, and buy options
- ✅ Deduplicates films across multiple festivals
- ✅ Tracks which festivals each film appeared in
- ✅ Links to JustWatch, IMDb, and TMDB when available

## Installation

```bash
npm install
```

This will install all required dependencies including:
- `puppeteer` - Headless browser for scraping
- `puppeteer-extra` & `puppeteer-extra-plugin-stealth` - Bot detection bypass
- `axios` & `cheerio` - HTTP requests and HTML parsing utilities
- `justwatch-api-client` - JustWatch API integration for streaming data

## Data Structure

```
data/
├── festivals/
│   ├── cannes/
│   │   ├── 2020.json
│   │   ├── 2021.json
│   │   ├── 2022.json
│   │   ├── 2023.json
│   │   ├── 2024.json
│   │   └── 2025.json
│   ├── bergen/
│   │   └── 2024.json
│   ├── berlin/
│   │   └── (year files)
│   └── venice/
│       └── (year files)
└── streaming/
    └── availability.json    # Streaming data for all unique films
```

**Festival files** contain:
- Film metadata (title, director, country, year)
- MUBI links
- Award information

**Streaming file** contains:
- Deduplicated films from all festivals
- Streaming platforms (Netflix, HBO, etc.)
- Rent/buy options and prices
- Links to JustWatch, IMDb, TMDB
- Which festivals each film appeared in

## Usage

### Scrape Festival Data

To scrape Cannes film data for a specific year:

1. Edit `YEAR` in `scraper.js` (line 9)
2. Run:

```bash
npm run scrape
```

This will create `data/festivals/cannes/YEAR.json` with all films from that year.

To scrape Bergen International Film Festival data:

1. Edit `YEAR` in `scraper-bergen.js` (line 9)
2. Run:

```bash
npm run scrape-bergen
```

This will create `data/festivals/bergen/YEAR.json` with all films from that year.

**Note:** Cannes 2025 hasn't occurred yet. For actual data, use 2024 or earlier.

### Fetch Streaming Availability

After collecting festival data, fetch streaming availability for Norway:

```bash
npm run fetch-streaming
```

This will:
- Read all festival JSON files
- Find unique films (deduplicates across years/festivals)
- Query JustWatch API for each film
- Save results to `data/streaming/availability.json`

**Time estimate:** ~11 minutes for 216 films (3 seconds per film)

**Progress is saved every 10 films** so you can interrupt and resume if needed.

### Add Poster Images

After fetching streaming data, you can add poster images:

```bash
npm run add-posters
```

This will:
- Fetch poster URLs from JustWatch for all films
- Update `data/streaming/availability.json` with poster URLs
- Skip films that already have posters

**Time estimate:** ~7 minutes for 216 films (2 seconds per film)

## Configuration

### Festival Scraper (`scraper.js`)

- `YEAR`: The year to scrape (default: 2025, line 9)
- `DELAY_MS`: Delay between requests (default: 2500ms, line 10)
- `BASE_URL`: The base URL for MUBI festival pages (line 8)

### Streaming Fetcher (`fetch-streaming.js`)

- `COUNTRY`: Country code for JustWatch (default: 'NO' for Norway, line 6)
- `DELAY_MS`: Delay between API requests (default: 3000ms, line 7)
- `FESTIVALS_DIR`: Path to festival data (default: 'data/festivals', line 8)

## Output Formats

### Festival Data (`data/festivals/cannes/YEAR.json`)

```json
[
  {
    "title": "DRIVE MY CAR",
    "year": 2021,
    "country": "Japan",
    "director": "Ryusuke Hamaguchi",
    "link": "https://mubi.com/en/no/films/drive-my-car",
    "awarded": true,
    "awards": ["Best Screenplay"]
  }
]
```

### Streaming Data (`data/streaming/availability.json`)

```json
{
  "last_updated": "2024-10-18T17:45:00.000Z",
  "country": "NO",
  "total_films": 216,
  "films": {
    "drive-my-car-2021": {
      "found": true,
      "title": "Drive My Car",
      "year": 2021,
      "director": "Ryusuke Hamaguchi",
      "justwatch_id": 12345,
      "justwatch_url": "https://www.justwatch.com/no/movie/drive-my-car",
      "imdb_id": "tt14039582",
      "tmdb_id": 508947,
      "streaming": [
        {
          "provider": "Netflix",
          "quality": "hd",
          "url": "https://..."
        }
      ],
      "rent": [],
      "buy": [],
      "festivals": [
        {
          "name": "cannes",
          "year": "2021",
          "awarded": true
        }
      ],
      "last_updated": "2024-10-18T17:45:00.000Z"
    }
  }
}
```

## Combining Data for Your Web App

The data is intentionally kept separate to allow flexibility. Here's how to combine them:

### Example: Get all Cannes 2023 films with streaming info

```javascript
import fs from 'fs/promises';

// Read festival data
const cannes2023 = JSON.parse(
  await fs.readFile('data/festivals/cannes/2023.json', 'utf-8')
);

// Read streaming data
const streaming = JSON.parse(
  await fs.readFile('data/streaming/availability.json', 'utf-8')
);

// Combine them
const enrichedFilms = cannes2023.map(film => {
  const key = `${film.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${film.year}`;
  const streamingInfo = streaming.films[key];
  
  return {
    ...film,
    streaming: streamingInfo || { found: false }
  };
});

console.log(enrichedFilms);
```

## Future Enhancements

- 🎬 Add more festivals (Berlin, Venice, Sundance, etc.)
- 🌍 Support multiple countries for streaming availability
- 📊 Create data analysis scripts
- 🖥️ Build web UI for browsing and filtering
- 🔄 Automated updates on a schedule

## Technical Details

### Festival Scraper

1. **Stealth Mode**: Uses puppeteer-extra-plugin-stealth to avoid bot detection
2. **Cookie Handling**: Automatically accepts cookie consent on first page load
3. **Client-Side Rendering**: Waits for JavaScript to render content before scraping
4. **Smart Extraction**: Targets specific data attributes and HTML structure
5. **Award Detection**: Improved keyword matching to extract actual award names

### Streaming Fetcher

1. **JustWatch API**: Uses unofficial GraphQL API via `justwatch-api-client`
2. **Deduplication**: Automatically finds unique films across all festivals
3. **Error Handling**: Continues on failures, logs issues for review
4. **Progress Saving**: Saves every 10 films so you can interrupt/resume
5. **Year Matching**: Tries to match exact year to avoid wrong films

## Troubleshooting

### Festival Scraper

**No films found**: Year hasn't occurred yet or has no data. Try 2024 or earlier.

**"Access blocked" error**: Increase `DELAY_MS` value or check your internet connection.

**Browser launch errors**: Puppeteer downloads Chromium automatically. Run `npm install` again if issues persist.

### Streaming Fetcher

**Films not found on JustWatch**: Some films may not be available in Norway or have different titles. Check the output for specifics.

**API timeout errors**: Increase timeout in `fetch-streaming.js` (line 69: `new JustWatch(10000)`).

**Rate limiting**: JustWatch may throttle requests. Increase `DELAY_MS` if you get errors.

## Notes

- **Personal Use Only**: Both MUBI scraping and JustWatch API usage are for personal, non-commercial use
- **Data Freshness**: Streaming availability changes frequently. Re-run `fetch-streaming` periodically
- **Festival Data**: Generally stable but awards may need re-scraping after ceremonies

## Requirements

- Node.js 16+ recommended
- Stable internet connection
- ~500MB disk space for Puppeteer's Chromium download
- ~11 minutes for initial streaming data fetch (216 films)

>>>>>>> 7c07c79 (Initial commit)
