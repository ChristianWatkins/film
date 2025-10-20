# 🎬 Enhanced Film Data Pipeline

## ✅ **Current Status**

### **Complete & Working (96%+ Success Rates):**
- ✅ **Festival Data**: 566 films from 4 festivals (2020-2025)
- ✅ **Streaming Data**: 548/566 films (96.8%) via JustWatch
- ✅ **JSON Extraction**: New MUBI method with 90% success

### **Ready to Launch:**
- 🚀 **Enhanced Pipeline**: MUBI JSON + TMDB integration

---

## 🎯 **NEW: Enhanced Data Strategy**

### **Data Source Priority:**
1. **MUBI JSON** (Primary) → Synopsis, runtime, genres, director
2. **TMDB API** (Enhancement) → Cast, ratings, posters, production details  
3. **JustWatch** (Keep existing) → Streaming availability

### **Expected Results:**
- **90%+ metadata** (vs current 50%)
- **Rich cast/crew data**
- **High-quality posters**
- **User ratings & reviews**
- **Production details**

---

## 🚀 **Quick Start**

### **1. Get TMDB API Key (Optional but Recommended)**
```bash
# Get free API key from: https://www.themoviedb.org/settings/api
export TMDB_API_KEY="your_api_key_here"
```

### **2. Run Enhanced Extraction**
```bash
# Extract enhanced metadata for all 566 films
npm run enhance-all
```

### **3. Monitor Progress**
- Progress saved every 10 films to `data/enhanced/enhanced-films.json`
- Browser runs in visible mode (can watch progress)
- 2-second delay between films (respectful scraping)

---

## 📊 **What Gets Extracted**

### **From MUBI JSON (Primary):**
```json
{
  "synopsis": "Film description from MUBI",
  "runtime": 120,
  "genres": ["Drama", "Comedy"],
  "director": "Director Name",
  "originalTitle": "Titre Original"
}
```

### **From TMDB API (Enhancement):**
```json
{
  "tmdb_id": 12345,
  "imdb_id": "tt1234567",
  "tmdb_rating": 7.8,
  "cast": [
    {
      "name": "Actor Name",
      "character": "Character Name",
      "profile_path": "https://image.tmdb.org/t/p/w185/path.jpg"
    }
  ],
  "crew": {
    "directors": ["Director Name"],
    "writers": ["Writer Name"],
    "cinematographers": ["DP Name"]
  },
  "poster_url_tmdb": "https://image.tmdb.org/t/p/w500/poster.jpg",
  "backdrop_url": "https://image.tmdb.org/t/p/w1280/backdrop.jpg",
  "production_companies": ["Studio Name"],
  "keywords": ["keyword1", "keyword2"]
}
```

### **Existing Data (Preserved):**
```json
{
  "title": "Film Title",
  "year": 2024,
  "country": "France",
  "festival": "cannes",
  "awards": ["Palme d'Or"],
  "streaming": "JustWatch data (96.8% coverage)"
}
```

---

## 🔧 **Technical Details**

### **Extraction Process:**
1. **Load film from festival data** 
2. **Visit MUBI page** with stealth browser
3. **Extract JSON data** from embedded scripts (90% success)
4. **Search TMDB** for matching film
5. **Merge all data sources** with smart fallbacks
6. **Save progress** every 10 films

### **Error Handling:**
- **Automatic retries** for network errors
- **DOM fallback** if JSON extraction fails  
- **Graceful degradation** if TMDB not available
- **Progress preservation** (resume from failures)

### **Rate Limiting:**
- **2-second delays** between MUBI requests
- **Respectful TMDB API** usage
- **Browser stealth mode** to avoid detection

---

## 📈 **Expected Timeline**

### **Processing Time:**
- **566 films** × 5 seconds/film = ~47 minutes
- **Progress saved** every 10 films (resumable)
- **Parallel data sources** (MUBI + TMDB together)

### **Success Rates:**
- **MUBI JSON**: 90%+ (proven in testing)
- **TMDB matches**: ~85% (typical for art house films)
- **Combined metadata**: 95%+ coverage

---

## 🎉 **Final Output**

### **Enhanced Dataset (`data/enhanced/enhanced-films.json`):**
```json
{
  "last_updated": "2024-12-19T10:30:00Z",
  "total_films": 566,
  "data_sources": ["mubi_json", "tmdb_api", "justwatch_existing"],
  "films": [
    {
      "title": "Film Title",
      "synopsis": "Full film description...",
      "runtime": 120,
      "genres": ["Drama"],
      "cast": [...],
      "crew": {...},
      "tmdb_rating": 7.8,
      "streaming": {...},
      "extraction_sources": ["mubi_json", "tmdb"],
      "extraction_success": {
        "mubi_json": 0.9,
        "tmdb": true
      }
    }
  ]
}
```

---

## 🛠 **Troubleshooting**

### **If TMDB API not working:**
```bash
# Run without TMDB (MUBI JSON only)
unset TMDB_API_KEY
npm run enhance-all
```

### **Resume from interruption:**
- Script automatically resumes from `data/enhanced/enhanced-films.json`
- Delete file to start fresh

### **Browser issues:**
- Script runs in visible mode for monitoring
- Close browser to stop gracefully
- Check for CAPTCHA or blocking

---

**Ready to launch! 🚀**

This will give you the most comprehensive film dataset with 90%+ metadata coverage plus rich TMDB enhancements.