# Nuvio Watchmode + TMDB v1

Uses:
- Watchmode: OTT release/update feed
- TMDB: posters, backdrop, overview, rating and metadata

Catalogues:
- 🆕 New on OTT
- 🆕 New Series on OTT

Render environment variables:
WATCHMODE_API_KEY=YOUR_WATCHMODE_KEY
TMDB_API_KEY=YOUR_TMDB_KEY

Build: npm install
Start: npm start

Important:
The Watchmode `/releases` endpoint is primarily based on US streaming releases. Exact India-specific OTT release tracking depends on Watchmode's enabled regions/plan. The paid `title-release-dates` endpoint supports regional streaming release rows.

No download or streaming URLs are exposed by this addon.
