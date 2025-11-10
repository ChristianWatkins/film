#!/bin/bash
# How to find TMDB ID from IMDB ID

IMDB_ID="tt11318602"  # Gunda 2020's IMDB ID
TMDB_API_KEY=$(grep TMDB_API_KEY .env.local 2>/dev/null | cut -d= -f2)

echo "Looking up TMDB ID for IMDB ID: $IMDB_ID"
echo ""
echo "API Call:"
echo "https://api.themoviedb.org/3/find/${IMDB_ID}?api_key=YOUR_KEY&external_source=imdb_id"
echo ""
echo "Response:"
curl -s "https://api.themoviedb.org/3/find/${IMDB_ID}?api_key=${TMDB_API_KEY}&external_source=imdb_id" | python3 -m json.tool 2>/dev/null | head -20
