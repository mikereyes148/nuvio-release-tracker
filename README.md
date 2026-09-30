# Nuvio Release Tracker v2

This version adds:

- Latest Releases
- HD Added
- Hindi Dub Added
- 4K Added
- Episodes Added
- Automatic duplicate detection
- Persistent `releases.json` history
- First-seen date for each title
- Basic movie/series classification
- Search support
- Cached history when the source is temporarily unavailable

## Setup

```bash
npm install
SOURCE_URL="https://YOUR-AUTHORIZED-SOURCE.example/releases" npm start
```

Then use:

```text
https://YOUR-HOST/manifest.json
```

in a Nuvio/Stremio-compatible addon installer.

## Important

Configure `SOURCE_URL` only for a site/feed you are authorized to access and monitor. This project is a metadata/release tracker; it does not provide download, torrent, file-hosting, or playback URLs.

The HTML parser is intentionally generic. If your authorized source has a known HTML/API format, the selectors in `scrape()` can be adapted to that format.
