# Nuvio TMDB Catalogue v6

TMDB-only metadata catalogue arranged in a VegaMovies-style browsing layout.

## Important behavior
This does NOT read or scrape VegaMovies. It uses TMDB release/air-date data to reproduce a similar catalogue organization.

## Main rows
- Recent Movies — last 60 days, newest release first
- Latest Movies — same recent-release window
- Upcoming Movies — today through next 180 days, earliest release first
- Recent Series — last 60 days, newest first
- Latest Series
- Upcoming Series
- Trending / Popular / Top Rated
- Indian Movies / Indian Series

## Render
Build: npm install
Start: npm start
Environment variable:
TMDB_API_KEY=YOUR_NEW_TMDB_KEY

Manifest:
https://YOUR-RENDER-SERVICE.onrender.com/manifest.json

After deploying, remove the old addon from Nuvio and reinstall it so the v6 manifest is fetched.

No streaming/download URLs are provided.
