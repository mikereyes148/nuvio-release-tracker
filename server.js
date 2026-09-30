import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;
const TMDB_API_KEY = process.env.TMDB_API_KEY;

if (!TMDB_API_KEY) {
  console.warn("TMDB_API_KEY is not set. Add it in Render → Environment.");
}

const TMDB = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";

const catalogs = [
  ["movie", "latest_movies", "Latest Movies"],
  ["movie", "now_playing", "Now Playing"],
  ["movie", "upcoming", "Upcoming Movies"],
  ["movie", "popular", "Popular Movies"],
  ["movie", "top_rated", "Top Rated Movies"],
  ["tv", "latest_series", "Latest Series"],
  ["tv", "airing_today", "Airing Today"],
  ["tv", "on_the_air", "On The Air"],
  ["tv", "popular_tv", "Popular Series"],
  ["tv", "top_rated_tv", "Top Rated Series"]
];

app.get("/", (_req, res) => {
  res.json({
    name: "Nuvio TMDB Catalogue",
    status: "ok",
    message: "Metadata-only movie and series catalogue.",
    manifest: "/manifest.json"
  });
});

app.get("/manifest.json", (_req, res) => {
  res.json({
    id: "com.nuvio.tmdb.catalog",
    version: "4.0.0",
    name: "Nuvio TMDB Catalogue",
    description: "TMDB-powered movie and series catalogue with automatic metadata refresh.",
    logo: "https://www.themoviedb.org/assets/2/v4/logos/longer-v4.svg",
    resources: ["catalog", "meta"],
    types: ["movie", "series"],
    catalogs: catalogs.map(([type, id, name]) => ({
      type: type === "tv" ? "series" : "movie",
      id,
      name,
      extra: [{ name: "skip", isRequired: false }]
    }))
  });
});

async function tmdb(path, params = {}) {
  if (!TMDB_API_KEY) throw new Error("TMDB_API_KEY is missing");
  const url = new URL(TMDB + path);
  url.searchParams.set("api_key", TMDB_API_KEY);
  url.searchParams.set("language", "en-US");
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  }
  const r = await fetch(url);
  if (!r.ok) throw new Error(`TMDB ${r.status}`);
  return r.json();
}

function movieMeta(x) {
  return {
    id: `tmdb:${x.id}`,
    type: "movie",
    name: x.title || x.original_title || "Untitled",
    poster: x.poster_path ? IMG + x.poster_path : undefined,
    background: x.backdrop_path ? `https://image.tmdb.org/t/p/w1280${x.backdrop_path}` : undefined,
    description: x.overview || "",
    releaseInfo: x.release_date || "",
    imdbRating: x.vote_average || undefined,
    genres: Array.isArray(x.genre_ids) ? x.genre_ids.map(String) : undefined
  };
}

function seriesMeta(x) {
  return {
    id: `tmdb:${x.id}`,
    type: "series",
    name: x.name || x.original_name || "Untitled",
    poster: x.poster_path ? IMG + x.poster_path : undefined,
    background: x.backdrop_path ? `https://image.tmdb.org/t/p/w1280${x.backdrop_path}` : undefined,
    description: x.overview || "",
    releaseInfo: x.first_air_date || "",
    imdbRating: x.vote_average || undefined,
    genres: Array.isArray(x.genre_ids) ? x.genre_ids.map(String) : undefined
  };
}

async function getCatalog(type, id, skip = 0) {
  const page = Math.floor(Number(skip || 0) / 20) + 1;

  if (type === "movie") {
    let path = "/movie/popular";
    const params = { region: "IN", page };
    if (id === "latest_movies") path = "/movie/now_playing";
    else if (id === "now_playing") path = "/movie/now_playing";
    else if (id === "upcoming") path = "/movie/upcoming";
    else if (id === "top_rated") path = "/movie/top_rated";
    const data = await tmdb(path, params);
    return (data.results || []).map(movieMeta);
  }

  let path = "/tv/popular";
  if (id === "airing_today") path = "/tv/airing_today";
  else if (id === "on_the_air" || id === "latest_series") path = "/tv/on_the_air";
  else if (id === "top_rated_tv") path = "/tv/top_rated";
  const data = await tmdb(path, { page });
  return (data.results || []).map(seriesMeta);
}

app.get("/catalog/:type/:id.json", async (req, res) => {
  try {
    const { type, id } = req.params;
    const items = await getCatalog(type, id, req.query.skip);
    res.json({ metas: items });
  } catch (e) {
    res.status(500).json({ metas: [], error: e.message });
  }
});

app.get("/meta/:type/:id.json", async (req, res) => {
  try {
    const rawId = String(req.params.id).replace(/^tmdb:/, "");
    const type = req.params.type;
    const data = type === "movie"
      ? await tmdb(`/movie/${rawId}`, { append_to_response: "credits" })
      : await tmdb(`/tv/${rawId}`, { append_to_response: "credits" });

    const meta = type === "movie" ? movieMeta(data) : seriesMeta(data);
    meta.description = data.overview || "";
    meta.runtime = data.runtime || (data.episode_run_time?.[0]);
    meta.cast = (data.credits?.cast || []).slice(0, 10).map(c => c.name);
    meta.director = (data.credits?.crew || [])
      .filter(c => c.job === "Director")
      .slice(0, 5)
      .map(c => c.name);

    res.json({ meta });
  } catch (e) {
    res.status(500).json({ meta: null, error: e.message });
  }
});

app.listen(PORT, () => console.log(`Nuvio TMDB Catalogue running on port ${PORT}`));
