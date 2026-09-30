# Nuvio OTT Updates v3

A Stremio/Nuvio-compatible addon using Watchmode release data and TMDB metadata.

## Render environment variables
- WATCHMODE_API_KEY
- TMDB_API_KEY

## Manifest
https://YOUR-RENDER-SERVICE.onrender.com/manifest.json

## v3 changes
- New addon ID to force Nuvio to treat it as a fresh addon/manifest.
- Explicit `idPrefixes` for TMDB metadata.
- Explicit `behaviorHints`.
- Direct Home catalogs remain in the manifest; no Collection is required by the addon.
- Catalog names are plain text for maximum client compatibility.
