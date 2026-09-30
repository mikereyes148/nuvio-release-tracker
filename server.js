const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Use a source you are authorized to monitor, or a lawful/public release feed.
const SOURCE_URL = process.env.SOURCE_URL || "https://example.com/releases";
const DB_FILE = path.join(__dirname, "releases.json");

const manifest = {
  id: "com.shelbyverse.release-tracker",
  version: "2.0.0",
  name: "Release Tracker",
  description: "Automatic release tracker with quality/language categories and duplicate detection.",
  resources: ["catalog", "meta"],
  types: ["movie", "series"],
  catalogs: [
    { type: "movie", id: "latest", name: "Latest Releases", extra: [{name:"search",isRequired:false}] },
    { type: "movie", id: "hd-added", name: "HD Added", extra: [{name:"search",isRequired:false}] },
    { type: "movie", id: "hindi-dub-added", name: "Hindi Dub Added", extra: [{name:"search",isRequired:false}] },
    { type: "movie", id: "4k-added", name: "4K Added", extra: [{name:"search",isRequired:false}] },
    { type: "series", id: "latest", name: "Latest Series", extra: [{name:"search",isRequired:false}] },
    { type: "series", id: "episodes-added", name: "Episodes Added", extra: [{name:"search",isRequired:false}] }
  ]
};

function loadDB() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch { return []; }
}
function saveDB(items) {
  fs.writeFileSync(DB_FILE, JSON.stringify(items.slice(0, 1000), null, 2));
}
function idFor(title) {
  return "rt:" + crypto.createHash("sha1").update(title.toLowerCase()).digest("hex").slice(0, 16);
}
function classify(text) {
  const t = text.toLowerCase();
  return {
    is4k: /(4k|2160p|uhd)/i.test(t),
    isHD: /(1080p|720p|web-dl|webrip|bluray|hd)/i.test(t),
    isHindiDub: /(hindi|hin[-\s]?dub|dual audio|multi audio)/i.test(t),
    isEpisode: /(episode|ep[-\s]?\d+|s\d{1,2}e\d{1,2})/i.test(t),
    isSeries: /(season\s*\d+|episode|series|web[-\s]?series)/i.test(t)
  };
}
function cleanTitle(s) {
  return s.replace(/\s+/g, " ").trim();
}

async function scrape() {
  const {data: html} = await axios.get(SOURCE_URL, {
    timeout: 15000,
    headers: {"User-Agent": "ReleaseTracker/2.0"}
  });
  const $ = cheerio.load(html);
  const old = loadDB();
  const byId = new Map(old.map(x => [x.id, x]));

  $("a").each((_, el) => {
    const a = $(el);
    const img = a.find("img").first();
    const raw = cleanTitle(a.text() || img.attr("alt") || "");
    if (!raw || raw.length < 3) return;

    const c = classify(raw);
    if (!(c.isHD || c.is4k || c.isHindiDub || c.isEpisode)) return;

    const id = idFor(raw);
    const type = c.isSeries ? "series" : "movie";
    const poster = img.attr("src") || img.attr("data-src") || "";
    const item = {
      id, type, name: raw,
      poster: poster.startsWith("//") ? "https:" + poster : poster,
      addedAt: byId.get(id)?.addedAt || new Date().toISOString(),
      flags: c
    };
    byId.set(id, item);
  });

  const result = [...byId.values()]
    .sort((a,b) => new Date(b.addedAt) - new Date(a.addedAt))
    .slice(0, 1000);

  saveDB(result);
  return result;
}

async function items() {
  try { return await scrape(); }
  catch (e) {
    console.error("Source refresh failed:", e.message);
    return loadDB();
  }
}

function catalogFilter(all, id) {
  switch (id) {
    case "hd-added": return all.filter(x => x.flags.isHD || x.flags.is4k);
    case "hindi-dub-added": return all.filter(x => x.flags.isHindiDub);
    case "4k-added": return all.filter(x => x.flags.is4k);
    case "episodes-added": return all.filter(x => x.flags.isEpisode);
    case "latest-series": return all.filter(x => x.type === "series");
    case "latest":
    default: return all;
  }
}

app.get("/manifest.json", (_, res) => res.json(manifest));

app.get("/catalog/:type/:id.json", async (req, res) => {
  const all = await items();
  let list = catalogFilter(all, req.params.id)
    .filter(x => x.type === req.params.type);

  const q = String(req.query.search || "").toLowerCase().trim();
  if (q) list = list.filter(x => x.name.toLowerCase().includes(q));

  res.json({
    metas: list.map(x => ({
      id:x.id, type:x.type, name:x.name, poster:x.poster,
      description:`${x.flags.is4k ? "4K • " : ""}${x.flags.isHD ? "HD • " : ""}${x.flags.isHindiDub ? "Hindi/Dual Audio • " : ""}${x.flags.isEpisode ? "Episode" : "New Release"}`,
      releaseInfo:new Date(x.addedAt).toLocaleDateString()
    }))
  });
});

app.get("/meta/:type/:id.json", async (req,res) => {
  const all = await items();
  const x = all.find(i => i.id === req.params.id);
  if (!x) return res.json({meta:null});
  res.json({meta:{
    id:x.id,type:x.type,name:x.name,poster:x.poster,
    description:`Quality: ${x.flags.is4k ? "4K" : x.flags.isHD ? "HD" : "Standard"} | ${x.flags.isHindiDub ? "Hindi/Dual Audio detected" : "Language not detected"}`,
    releaseInfo:new Date(x.addedAt).toLocaleDateString()
  }});
});

app.get("/health", (_,res)=>res.json({ok:true, version:"2.0.0"}));
app.listen(PORT, ()=>console.log(`Release Tracker listening on ${PORT}`));
