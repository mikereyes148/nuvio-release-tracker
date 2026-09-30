import express from "express";
const app=express(), PORT=process.env.PORT||3000;
const KEY=process.env.TMDB_API_KEY;
const BASE="https://api.themoviedb.org/3";
const POSTER="https://image.tmdb.org/t/p/w500";
const BG="https://image.tmdb.org/t/p/w1280";

const today=()=>new Date().toISOString().slice(0,10);
const daysFromNow=n=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);
const daysAgo=n=>new Date(Date.now()-n*86400000).toISOString().slice(0,10);

async function api(path, params={}){
  if(!KEY) throw new Error("TMDB_API_KEY is missing");
  const u=new URL(BASE+path);
  u.searchParams.set("api_key",KEY);
  u.searchParams.set("language","en-US");
  for(const [k,v] of Object.entries(params)) if(v!==undefined) u.searchParams.set(k,v);
  const r=await fetch(u);
  if(!r.ok) throw new Error("TMDB "+r.status);
  return r.json();
}

function movie(x){
  return {id:`tmdb:${x.id}`,type:"movie",name:x.title||x.original_title,
    poster:x.poster_path?POSTER+x.poster_path:undefined,
    background:x.backdrop_path?BG+x.backdrop_path:undefined,
    description:x.overview||"",releaseInfo:x.release_date||"",
    imdbRating:x.vote_average||undefined};
}
function tv(x){
  return {id:`tmdb:${x.id}`,type:"series",name:x.name||x.original_name,
    poster:x.poster_path?POSTER+x.poster_path:undefined,
    background:x.backdrop_path?BG+x.backdrop_path:undefined,
    description:x.overview||"",releaseInfo:x.first_air_date||"",
    imdbRating:x.vote_average||undefined};
}

app.get("/",(_,res)=>res.json({status:"ok",manifest:"/manifest.json"}));

app.get("/manifest.json",(_,res)=>res.json({
  id:"com.nuvio.tmdb.netflixstyle",
  version:"1.0.0",
  name:"TMDB New & Coming Soon",
  description:"Simple TMDB metadata catalogue.",
  resources:["catalog","meta"],
  types:["movie","series"],
  catalogs:[
    {type:"movie",id:"new_recent",name:"🆕 New & Recent"},
    {type:"movie",id:"coming_soon",name:"⏳ Coming Soon"}
  ]
}));

app.get("/catalog/movie/new_recent.json",async(req,res)=>{
  try{
    const d=await api("/discover/movie",{
      region:"IN",include_adult:"false",include_video:"false",
      "release_date.gte":daysAgo(45),"release_date.lte":today(),
      sort_by:"release_date.desc",page:Math.floor((Number(req.query.skip)||0)/20)+1
    });
    res.json({metas:d.results.map(movie)});
  }catch(e){res.status(500).json({metas:[],error:e.message});}
});

app.get("/catalog/movie/coming_soon.json",async(req,res)=>{
  try{
    const d=await api("/discover/movie",{
      region:"IN",include_adult:"false",include_video:"false",
      "release_date.gte":today(),"release_date.lte":daysFromNow(180),
      sort_by:"release_date.asc",page:Math.floor((Number(req.query.skip)||0)/20)+1
    });
    res.json({metas:d.results.map(movie)});
  }catch(e){res.status(500).json({metas:[],error:e.message});}
});

app.get("/meta/movie/:id.json",async(req,res)=>{
  try{
    const id=req.params.id.replace(/^tmdb:/,"");
    const d=await api(`/movie/${id}`);
    res.json({meta:movie(d)});
  }catch(e){res.status(500).json({meta:null,error:e.message});}
});

app.listen(PORT,()=>console.log("Running on "+PORT));
