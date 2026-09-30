# Nuvio Watchmode + TMDB v2

This version adds a diagnostic endpoint and follows the Watchmode documented `/releases` response fields.

Render:
- Build: `npm install`
- Start: `npm start`
- `WATCHMODE_API_KEY=...`
- `TMDB_API_KEY=...`

After deployment open:
`https://YOUR-RENDER-URL.onrender.com/debug/watchmode`

Expected:
`{"ok":true,"count":...,"sample":[...]}`

If `ok:false`, the response will show the API/account error without exposing the key.

The catalog routes are:
- `/catalog/movie/new_ott_movies.json`
- `/catalog/series/new_ott_series.json`

Watchmode's simple Releases endpoint is primarily US streaming releases. Its paid Title Release Dates endpoint supports region-specific streaming rows such as `regions=IN`. This v2 deliberately uses the simple endpoint first so we can verify the account and feed before requiring a paid regional endpoint.

Metadata only; no streaming/download URLs.
