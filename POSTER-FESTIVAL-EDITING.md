# 🎨 Poster & Festival Editing Added!

## What's New

You can now edit **posters** and **festivals** directly from the admin interface!

### Poster Editing

Edit two poster fields:
1. **Poster Path (TMDB)**: The TMDB image path (e.g., `/abc123.jpg`)
2. **Poster URL (TMDB full URL)**: Complete TMDB image URL (e.g., `https://image.tmdb.org/t/p/w500/...`)

✅ **Live preview**: See the poster as you edit the URL!

### Festival Management

Manage which festivals a film appears in:
- **View current festivals**: See all festivals the film is in
- **Add to festivals**: Select from dropdowns (arthaus, bergen, berlin, cannes, venice)
- **Remove from festivals**: Click "Remove" next to any festival
- **Automatic sync**: Changes save to festival files automatically

## How It Works

### Data Flow

```
1. Load admin page
   ↓
2. API loads films + festival data
   ↓
3. Edit film → change festivals/posters
   ↓
4. Save
   ↓
5. Backend updates:
   - data/films.json (poster fields)
   - data/festivals/{festival}/{year}.json (add/remove film IDs)
```

### API Endpoints

**New endpoint**: `/api/admin/festivals`
- Returns all available festivals and years
- Used to populate festival dropdowns

**Updated endpoint**: `/api/admin/films`
- Now includes festival appearances for each film
- Loads from all festival files

**Updated endpoint**: `/api/admin/save-film`
- Saves poster fields to films.json
- Updates festival files (adds/removes film IDs)

## UI Features

### Poster Section
```
[Poster Path (TMDB)]  [ /abc123.jpg          ]

[Poster URL (TMDB)]   [ https://image.tmdb.org/t/p/w500/... ]

[Live Preview]
┌───────────┐
│  [Poster] │
│   Image   │
└───────────┘
```

### Festival Section
```
Current Festivals:
┌─────────────────────────────────┐
│ Arthaus 2025          [Remove]  │
│ Berlin 2024           [Remove]  │
└─────────────────────────────────┘

Add to Festivals:
[Add arthaus...  ▼]  [Add bergen... ▼]
[Add berlin...   ▼]  [Add cannes... ▼]
[Add venice...   ▼]
```

## Example Usage

### Edit a Film's Poster

1. Search for "Amrum"
2. Click "Edit"
3. Paste TMDB poster URL: `https://image.tmdb.org/t/p/w500/yrFHlsSa5bK2LrV0oN6xpdodyBI.jpg`
4. See live preview
5. Click "Save Changes"
6. ✅ Poster updated!

### Add Film to Festival

1. Edit any film
2. Scroll to "Festivals" section
3. Select "berlin" → "2025"
4. Film appears in "Current Festivals"
5. Click "Save Changes"
6. ✅ Film added to `data/festivals/berlin/2025.json`!

### Remove Film from Festival

1. Edit any film
2. See current festivals
3. Click "Remove" next to "Cannes 2024"
4. Click "Save Changes"
5. ✅ Film removed from `data/festivals/cannes/2024.json`!

## Technical Details

### Film Interface (Updated)

```typescript
interface MasterFilm {
  id: string;
  filmKey: string;
  title: string;
  year: number;
  poster_path: string | null;
  poster_url_tmdb?: string | null;  // NEW
  festivals?: FestivalAppearance[];  // NEW
  // ... other fields
}

interface FestivalAppearance {
  name: string;  // "berlin", "cannes", etc.
  year: string;  // "2024", "2025", etc.
}
```

### Save Logic

When you save a film:
1. **Film data saved** to `data/films.json` (excluding festivals)
2. **Festival files updated**:
   - Loop through ALL festival files
   - Check if film should be in each one
   - Add film ID if needed
   - Remove film ID if needed

### Why It's Safe

- ✅ Uses permanent IDs (short codes) - festivals won't break if you edit title
- ✅ Validates all changes before saving
- ✅ Updates both film data and festival files atomically
- ✅ Only available in development mode

## Files Changed

- ✅ `app/admin/films/page.tsx` - Added poster + festival UI
- ✅ `app/api/admin/films/route.ts` - Loads festival data
- ✅ `app/api/admin/festivals/route.ts` - NEW: Returns available festivals
- ✅ `app/api/admin/save-film/route.ts` - Saves posters + updates festival files

## Testing

Visit http://localhost:3000/admin/films and try:
1. ✅ Edit a poster URL
2. ✅ Add a film to a festival
3. ✅ Remove a film from a festival
4. ✅ Save and verify changes

All changes persist to disk! 🎉

