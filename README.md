# Nuvio TMDB Catalogue v5

TMDB-powered metadata-only catalogue for Nuvio/Stremio.

Catalogs:
- Latest Movies
- Now Playing
- Upcoming Movies
- Popular Movies
- Top Rated Movies
- Latest Series
- Airing Today
- On The Air
- Popular Series
- Top Rated Series

Render:
Build Command: `npm install`
Start Command: `npm start`
Environment variable: `TMDB_API_KEY=YOUR_NEW_KEY`

Manifest:
`https://YOUR-RENDER-SERVICE.onrender.com/manifest.json`

After deploying v5, remove the old addon from Nuvio and install the manifest again so Nuvio fetches the new manifest.

This addon provides catalogue/metadata only and does not provide download or streaming URLs.
