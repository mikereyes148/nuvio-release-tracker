import express from "express";

const app=express();
const PORT=process.env.PORT||3000;
const WM_KEY=process.env.WATCHMODE_API_KEY;
const TMDB_KEY=process.env.TMDB_API_KEY;
const WM="https://api.watchmode.com/v1";
const TMDB="https://api.themoviedb.org/3";
const POSTER="https://image.tmdb.org/t/p/w500";
const BACKDROP="https://image.tmdb.org/t/p/w1280";

function dateN(n){return new Date(Date.now()+n*86400000).toISOString().slice(0,10).replaceAll("-","");}
function isoDateN(n){return new Date(Date.now()+n*86400000).toISOString().slice(0,10);}

async function wm(path,params={}){
  if(!WM_KEY) throw new Error("WATCHMODE_API_KEY is missing");
  const u=new URL(WM+path);
  for(const [k,v] of Object.entries(params)) if(v!==undefined&&v!=="") u.searchParams.set(k,v);
  const r=await fetch(u,{headers:{"X-API-Key":WM_KEY}});
  if(!r.ok) throw new Error(`Watchmode ${r.status}`);
  return r.json();
}
async function tmdb(path,params={}){
  if(!TMDB_KEY) throw new Error("TMDB_API_KEY is missing");
  const u=new URL(TMDB+path);
  u.searchParams.set("api_key",TMDB_KEY);
  u.searchParams.set("language","en-US");
  for(const [k,v] of Object.entries(params)) if(v!==undefined&&v!=="") u.searchParams.set(k,v);
  const r=await fetch(u);
  if(!r.ok) throw new Error(`TMDB ${r.status}`);
  return r.json();
}

async function enrich(r){
  const type=r.tmdb_type==="tv"||r.type==="tv_series"?"series":"movie";
  let x=null;
  if(r.tmdb_id){
    try{x=await tmdb(`/${type==="movie"?"movie":"tv"}/${r.tmdb_id}`);}catch{}
  }
  return {
    id:`tmdb:${r.tmdb_id||r.id}`,
    type,
    name:r.title||x?.title||x?.name||"Untitled",
    poster:r.poster_url||(x?.poster_path?POSTER+x.poster_path:undefined),
    background:x?.backdrop_path?BACKDROP+x.backdrop_path:undefined,
    description:r.plot_overview||x?.overview||"",
    releaseInfo:r.source_release_date||x?.release_date||x?.first_air_date||"",
    imdbRating:x?.vote_average||undefined,
    genre:r.source_name?`Available on ${r.source_name}`:undefined
  };
}

app.get("/",(_,res)=>res.json({status:"ok",manifest:"/manifest.json"}));

app.get("/manifest.json",(_,res)=>res.json({
  id:"com.nuvio.watchmode.tmdb",
  version:"1.0.0",
  name:"Nuvio OTT Updates",
  description:"Watchmode OTT release updates enriched with TMDB metadata.",
  resources:["catalog","meta"],
  types:["movie","series"],
  catalogs:[
    {type:"movie",id:"new_ott_movies",name:"🆕 New on OTT"},
    {type:"series",id:"new_ott_series",name:"🆕 New Series on OTT"}
  ]
}));

app.get("/catalog/:type/new_ott_movies.json",async(req,res)=>{
  try{
    const d=await wm("/releases/",{start_date:dateN(-14),end_date:dateN(30),limit:250});
    const rows=(d.releases||[]).filter(x=>x.type==="movie"||x.tmdb_type==="movie");
    rows.sort((a,b)=>String(b.source_release_date).localeCompare(String(a.source_release_date)));
    const metas=await Promise.all(rows.slice(0,40).map(enrich));
    res.json({metas});
  }catch(e){res.status(500).json({metas:[],error:e.message});}
});

app.get("/catalog/:type/new_ott_series.json",async(req,res)=>{
  try{
    const d=await wm("/releases/",{start_date:dateN(-14),end_date:dateN(30),limit:250});
    const rows=(d.releases||[]).filter(x=>x.type==="tv_series"||x.tmdb_type==="tv");
    rows.sort((a,b)=>String(b.source_release_date).localeCompare(String(a.source_release_date)));
    const metas=await Promise.all(rows.slice(0,40).map(enrich));
    res.json({metas});
  }catch(e){res.status(500).json({metas:[],error:e.message});}
});

app.get("/meta/:type/:id.json",async(req,res)=>{
  try{
    const id=req.params.id.replace(/^tmdb:/,"");
    const path=req.params.type==="series"?`/tv/${id}`:`/movie/${id}`;
    const x=await tmdb(path);
    res.json({meta:{
      id:`tmdb:${id}`,type:req.params.type,
      name:x.title||x.name,
      poster:x.poster_path?POSTER+x.poster_path:undefined,
      background:x.backdrop_path?BACKDROP+x.backdrop_path:undefined,
      description:x.overview||"",
      releaseInfo:x.release_date||x.first_air_date||"",
      imdbRating:x.vote_average||undefined
    }});
  }catch(e){res.status(500).json({meta:null,error:e.message});}
});

app.listen(PORT,()=>console.log("Nuvio Watchmode + TMDB running"));
