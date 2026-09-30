import express from "express";

const app=express();
const PORT=process.env.PORT||3000;
const WM_KEY=process.env.WATCHMODE_API_KEY;
const TMDB_KEY=process.env.TMDB_API_KEY;

const WM="https://api.watchmode.com/v1";
const TMDB="https://api.themoviedb.org/3";
const POSTER="https://image.tmdb.org/t/p/w500";
const BACKDROP="https://image.tmdb.org/t/p/w1280";

app.use((req,res,next)=>{
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","*");
  if(req.method==="OPTIONS") return res.sendStatus(204);
  next();
});

function d(n=0){
  return new Date(Date.now()+n*86400000).toISOString().slice(0,10).replaceAll("-","");
}

async function watchmode(path,params={}){
  if(!WM_KEY) throw new Error("WATCHMODE_API_KEY is missing in Render Environment");
  const u=new URL(WM+path);
  for(const [k,v] of Object.entries(params)) u.searchParams.set(k,String(v));
  const r=await fetch(u,{headers:{"X-API-Key":WM_KEY,"Accept":"application/json"}});
  const text=await r.text();
  let data;
  try{data=JSON.parse(text)}catch{throw new Error(`Watchmode non-JSON response (${r.status})`)}
  if(!r.ok) throw new Error(`Watchmode ${r.status}: ${JSON.stringify(data)}`);
  return data;
}

async function tmdb(path,params={}){
  if(!TMDB_KEY) throw new Error("TMDB_API_KEY is missing in Render Environment");
  const u=new URL(TMDB+path);
  u.searchParams.set("api_key",TMDB_KEY);
  u.searchParams.set("language","en-US");
  for(const [k,v] of Object.entries(params)) u.searchParams.set(k,String(v));
  const r=await fetch(u);
  const data=await r.json();
  if(!r.ok) throw new Error(`TMDB ${r.status}: ${JSON.stringify(data)}`);
  return data;
}

function metaFromRelease(r){
  const type=(r.tmdb_type==="tv"||r.type==="tv_series")?"series":"movie";
  return {
    id:`tmdb:${r.tmdb_id||r.id}`,
    type,
    name:r.title||"Untitled",
    poster:r.poster_url||undefined,
    description:"",
    releaseInfo:r.source_release_date||"",
    genre:r.source_name?`OTT: ${r.source_name}`:undefined
  };
}

async function enrich(r){
  const m=metaFromRelease(r);
  if(!r.tmdb_id) return m;
  try{
    const path=m.type==="movie"?`/movie/${r.tmdb_id}`:`/tv/${r.tmdb_id}`;
    const x=await tmdb(path);
    return {
      ...m,
      name:x.title||x.name||m.name,
      poster:x.poster_path?POSTER+x.poster_path:m.poster,
      background:x.backdrop_path?BACKDROP+x.backdrop_path:undefined,
      description:x.overview||"",
      releaseInfo:r.source_release_date||x.release_date||x.first_air_date||"",
      imdbRating:x.vote_average||undefined,
      genre:r.source_name?`OTT: ${r.source_name}`:undefined
    };
  }catch{return m}
}

app.get("/",(_,res)=>res.json({
  status:"ok",
  version:"3.0.0",
  manifest:"/manifest.json",
  diagnostic:"/debug/watchmode"
}));

app.get("/manifest.json",(_,res)=>res.json({
  id:"com.nuvio.watchmode.tmdb.v3",
  version:"3.0.0",
  name:"Nuvio OTT Updates",
  description:"OTT release catalogues powered by Watchmode and TMDB.",
  resources:[
    {name:"catalog",types:["movie","series"]},
    {name:"meta",types:["movie","series"],idPrefixes:["tmdb:"]}
  ],
  types:["movie","series"],
  idPrefixes:["tmdb:"],
  catalogs:[
    {type:"movie",id:"new_ott_movies",name:"New on OTT"},
    {type:"series",id:"new_ott_series",name:"New Series on OTT"}
  ],
  behaviorHints:{adult:false}
}));

// Diagnostic: shows whether Watchmode is reachable and what its release objects look like.
// Does not expose the API key.
app.get("/debug/watchmode",async(_,res)=>{
  try{
    const data=await watchmode("/releases/",{
      start_date:d(-14),
      end_date:d(30),
      limit:10
    });
    const releases=data.releases||[];
    res.json({
      ok:true,
      count:releases.length,
      sample:releases.slice(0,3).map(r=>({
        id:r.id,title:r.title,type:r.type,tmdb_id:r.tmdb_id,
        tmdb_type:r.tmdb_type,source_name:r.source_name,
        source_release_date:r.source_release_date
      }))
    });
  }catch(e){
    res.status(200).json({ok:false,error:e.message});
  }
});

async function releases(){
  const data=await watchmode("/releases/",{
    start_date:d(-14),
    end_date:d(30),
    limit:250
  });
  return data.releases||[];
}

app.get("/catalog/movie/new_ott_movies.json",async(_,res)=>{
  try{
    const rows=(await releases()).filter(r=>r.type==="movie"||r.tmdb_type==="movie");
    rows.sort((a,b)=>String(b.source_release_date||"").localeCompare(String(a.source_release_date||"")));
    res.json({metas:await Promise.all(rows.slice(0,40).map(enrich))});
  }catch(e){res.status(500).json({metas:[],error:e.message});}
});

app.get("/catalog/series/new_ott_series.json",async(_,res)=>{
  try{
    const rows=(await releases()).filter(r=>r.type==="tv_series"||r.tmdb_type==="tv");
    rows.sort((a,b)=>String(b.source_release_date||"").localeCompare(String(a.source_release_date||"")));
    res.json({metas:await Promise.all(rows.slice(0,40).map(enrich))});
  }catch(e){res.status(500).json({metas:[],error:e.message});}
});

app.get("/meta/:type/:id.json",async(req,res)=>{
  try{
    const id=req.params.id.replace(/^tmdb:/,"");
    const x=await tmdb(req.params.type==="series"?`/tv/${id}`:`/movie/${id}`);
    res.json({meta:{
      id:`tmdb:${id}`,type:req.params.type,name:x.title||x.name,
      poster:x.poster_path?POSTER+x.poster_path:undefined,
      background:x.backdrop_path?BACKDROP+x.backdrop_path:undefined,
      description:x.overview||"",
      releaseInfo:x.release_date||x.first_air_date||"",
      imdbRating:x.vote_average||undefined
    }});
  }catch(e){res.status(500).json({meta:null,error:e.message});}
});

app.listen(PORT,()=>console.log(`Nuvio Watchmode v2 on ${PORT}`));
