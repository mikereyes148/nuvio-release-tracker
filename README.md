# Nuvio TMDB Catalogue v4

A metadata-only Nuvio/Stremio-compatible catalogue powered by TMDB.

## Categories
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

## Render setup
Build Command:
`npm install`

Start Command:
`npm start`

Environment variable:
`TMDB_API_KEY=YOUR_TMDB_KEY`

Do not commit your TMDB API key to GitHub. Put it in Render → Environment.

Manifest:
`https://YOUR-SERVICE.onrender.com/manifest.json`

This project provides catalogue/metadata only. It does not provide movie/episode download or streaming URLs.

The VegaMovies-inspired repository is a frontend using TMDB data; this addon uses TMDB directly for the catalogue. It therefore does not detect uploads on third-party movie-download sites.
