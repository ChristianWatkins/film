#!/bin/bash
TMDB_API_KEY=$(grep TMDB_API_KEY .env.local 2>/dev/null | cut -d= -f2)

echo "Searching TMDB for: Gunda (2020)"
echo ""
curl -s "https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=Gunda&year=2020" | python3 -m json.tool 2>/dev/null | grep -A 5 '"id"\|"title"\|"release_date"' | head -20
