const express=require('express'),cors=require('cors');
const app=express();app.use(cors());
const COOKIE=process.env.COOKIE||'';
async function getV(){
 const r=await fetch('https://www.strixby.com/api/vehicle/getVehiclesList?mobile=0&streetzUserId=17',{headers:{Cookie:COOKIE,'User-Agent':'Mozilla/5.0'}});
 const j=await r.json();return j.data||j.vehicles||[];
}
let CACHE=[],LAST=0;
app.get('/api/vehicles',async(req,res)=>{
 try{
  if(Date.now()-LAST>15000){
   const raw=await getV();
   CACHE=raw.filter(v=>{
    const a=(v.alias||v.name||'').toString();
    return /3[8-9]|4[0-6]|VL176/.test(a);
   }).map(v=>({id:v.id,alias:v.alias||v.name,patente:v.licensePlate||'',lat:parseFloat(v.latitude||v.lat),lng:parseFloat(v.longitude||v.lng),vel:v.speed||0})).filter(v=>!isNaN(v.lat));
   LAST=Date.now();
  }
  res.json({count:CACHE.length,vehicles:CACHE});
 }catch(e){res.status(500).json({error:e.message})}
});
app.get('/',(req,res)=>res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Barrancas Vivo</title><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script><style>body{margin:0;font-family:system-ui;background:#0f1113;color:#eee}#map{height:100vh}.badge{position:absolute;top:10px;left:50px;z-index:1000;background:#111;padding:10px 14px;border-radius:10px}</style></head><body><div class=badge id=info>Cargando 38-46 + VL176...</div><div id=map></div><script>const map=L.map('map').setView([-32.896,-68.842],13);L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19}).addTo(map);let ms={};async function load(){try{const r=await fetch('/api/vehicles');const d=await r.json();document.getElementById('info').textContent=d.count+' camiones - '+new Date().toLocaleTimeString();d.vehicles.forEach(v=>{const k=v.id||v.patente;if(ms[k])ms[k].setLatLng([v.lat,v.lng]);else ms[k]=L.marker([v.lat,v.lng]).addTo(map).bindPopup(v.alias+'<br>'+v.patente+' '+v.vel+'km/h')})}catch(e){}}load();setInterval(load,20000);<\/script></body></html>`));
app.listen(process.env.PORT||3000,()=>console.log('ok'));
