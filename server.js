import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";
const BG = "https://image.tmdb.org/t/p/w1280";

const catalogs = [
  ["movie","recent_movies","🆕 Recent Movies"],
  ["movie","latest_movies","🎬 Latest Movies"],
  ["movie","upcoming_movies","📅 Upcoming Movies"],
  ["series","recent_series","🆕 Recent Series"],
  ["series","latest_series","📺 Latest Series"],
  ["series","upcoming_series","📅 Upcoming Series"],
  ["movie","trending_movies","🔥 Trending Movies"],
  ["series","trending_series","🔥 Trending Series"],
  ["movie","popular_movies","⭐ Popular Movies"],
  ["series","popular_series","⭐ Popular Series"],
  ["movie","top_rated_movies","🏆 Top Rated Movies"],
  ["series","top_rated_series","🏆 Top Rated Series"],
  ["movie","indian_movies","🇮🇳 Indian Movies"],
  ["series","indian_series","🇮🇳 Indian Series"]
];

app.get("/", (_req,res) => res.json({
  name:"Nuvio TMDB Catalogue v6",
  status:"ok",
  manifest:"/manifest.json"
}));

app.get("/manifest.json", (_req,res) => {
  res.json({
    id:"com.nuvio.tmdb.catalog.v6",
    version:"6.0.0",
    name:"Nuvio TMDB • VegaMovies-style Catalogue",
    description:"TMDB-powered metadata catalogue arranged in a VegaMovies-style browsing layout.",
    resources:[
      {name:"catalog",types:["movie","series"]},
      {name:"meta",types:["movie","series"],idPrefixes:["tmdb:"]}
    ],
    types:["movie","series"],
    catalogs:catalogs.map(([type,id,name]) => ({
      type,id,name,
      extra:[{name:"skip",isRequired:false}],
      extraSupported:["skip"]
    })),
    behaviorHints:{configurable:false}
  });
});

async function tmdb(path, params={}) {
  if (!TMDB_API_KEY) throw new Error("TMDB_API_KEY is missing");
  const url = new URL(TMDB + path);
  url.searchParams.set("api_key",TMDB_API_KEY);
  url.searchParams.set("language","en-US");
  for (const [k,v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k,v);
  }
  const r = await fetch(url);
  if (!r.ok) throw new Error(`TMDB ${r.status}`);
  return r.json();
}

function movie(x) {
  return {
    id:`tmdb:${x.id}`, type:"movie",
    name:x.title || x.original_title || "Untitled",
    poster:x.poster_path ? IMG+x.poster_path : undefined,
    background:x.backdrop_path ? BG+x.backdrop_path : undefined,
    description:x.overview || "",
    releaseInfo:x.release_date || "",
    imdbRating:x.vote_average || undefined
  };
}
function series(x) {
  return {
    id:`tmdb:${x.id}`, type:"series",
    name:x.name || x.original_name || "Untitled",
    poster:x.poster_path ? IMG+x.poster_path : undefined,
    background:x.backdrop_path ? BG+x.backdrop_path : undefined,
    description:x.overview || "",
    releaseInfo:x.first_air_date || "",
    imdbRating:x.vote_average || undefined
  };
}

async function getCatalog(type,id,skip=0) {
  const page=Math.floor(Number(skip||0)/20)+1;
  const today=new Date().toISOString().slice(0,10);
  const past=new Date(Date.now()-60*24*60*60*1000).toISOString().slice(0,10);
  const future=new Date(Date.now()+180*24*60*60*1000).toISOString().slice(0,10);

  if (type==="movie") {
    let path="/discover/movie";
    let params={page,region:"IN",include_adult:false,include_video:false,sort_by:"release_date.desc"};

    if (id==="recent_movies" || id==="latest_movies") {
      params["release_date.gte"]=past;
      params["release_date.lte"]=today;
      params.sort_by="release_date.desc";
    } else if (id==="upcoming_movies") {
      params["release_date.gte"]=today;
      params["release_date.lte"]=future;
      params.sort_by="release_date.asc";
    } else if (id==="trending_movies") {
      path="/trending/movie/week";
      params={page};
    } else if (id==="popular_movies") {
      path="/movie/popular";
      params={page,region:"IN"};
    } else if (id==="top_rated_movies") {
      path="/movie/top_rated";
      params={page,region:"IN"};
    } else if (id==="indian_movies") {
      params["with_origin_country"]="IN";
      params.sort_by="release_date.desc";
    }

    const data=await tmdb(path,params);
    return (data.results||[]).map(movie);
  }

  let path="/discover/tv";
  let params={page,include_adult:false,sort_by:"first_air_date.desc"};

  if (id==="recent_series" || id==="latest_series") {
    params["first_air_date.gte"]=past;
    params["first_air_date.lte"]=today;
    params.sort_by="first_air_date.desc";
  } else if (id==="upcoming_series") {
    params["first_air_date.gte"]=today;
    params["first_air_date.lte"]=future;
    params.sort_by="first_air_date.asc";
  } else if (id==="trending_series") {
    path="/trending/tv/week";
    params={page};
  } else if (id==="popular_series") {
    path="/tv/popular";
    params={page};
  } else if (id==="top_rated_series") {
    path="/tv/top_rated";
    params={page};
  } else if (id==="indian_series") {
    params["with_origin_country"]="IN";
    params.sort_by="first_air_date.desc";
  }

  const data=await tmdb(path,params);
  return (data.results||[]).map(series);
}

app.get("/catalog/:type/:id.json",async(req,res)=>{
  try {
    res.json({metas:await getCatalog(req.params.type,req.params.id,req.query.skip)});
  } catch(e) {
    res.status(500).json({metas:[],error:e.message});
  }
});

app.get("/meta/:type/:id.json",async(req,res)=>{
  try {
    const id=String(req.params.id).replace(/^tmdb:/,"");
    const data=req.params.type==="movie"
      ? await tmdb(`/movie/${id}`,{append_to_response:"credits"})
      : await tmdb(`/tv/${id}`,{append_to_response:"credits"});
    const meta=req.params.type==="movie"?movie(data):series(data);
    meta.description=data.overview||"";
    meta.cast=(data.credits?.cast||[]).slice(0,10).map(x=>x.name);
    meta.director=(data.credits?.crew||[]).filter(x=>x.job==="Director").slice(0,5).map(x=>x.name);
    res.json({meta});
  } catch(e) {
    res.status(500).json({meta:null,error:e.message});
  }
});

app.listen(PORT,()=>console.log(`Nuvio TMDB v6 running on ${PORT}`));
