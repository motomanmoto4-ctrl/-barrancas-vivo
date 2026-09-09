const express=require('express'),cors=require('cors');
const app=express();app.use(cors());
const HOST='https://rastreo.idecgps.com.ar';
let COOKIE='',LAST_LOGIN=0;
async function login(){
 try{
  const U=process.env.STRIX_USER, P=process.env.STRIX_PASS;
  if(!U||!P){console.log('Falta USER/PASS');return '';}
  const fd=new URLSearchParams({j_username:U,j_password:P});
  const r=await fetch(HOST+'/j_spring_security_check',{method:'POST',body:fd,redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded'}});
  const all=r.headers.get('set-cookie')||r.headers.getSetCookie?.()?.join(';')||'';
  const m=all.match(/JSESSIONID=[^;]+/);
  if(m){COOKIE=m[0];LAST_LOGIN=Date.now();console.log('Login OK idecgps',COOKIE);}
  return COOKIE;
 }catch(e){console.log('login err',e.message);return '';}
}
async function getV(){
 if(!COOKIE || Date.now()-LAST_LOGIN>1000*60*30) await login();
 const r=await fetch(HOST+'/api/vehicle/getVehiclesList?mobile=0&streetzUserId=17',{headers:{Cookie:COOKIE,'User-Agent':'Mozilla/5.0'}});
 const txt=await r.text();
 try{const j=JSON.parse(txt);return j.data||j.vehicles||[];}catch(e){console.log('No JSON, re-login');COOKIE='';await login();return [];}
}
let CACHE=[],LAST=0;
app.get('/api/vehicles',async(req,res)=>{
 try{
  if(Date.now()-LAST>15000){
   const raw=await getV();
   CACHE=raw.filter(v=>/38|39|40|41|42|43|44|45|46|VL176|VL/i.test((v.alias||v.name||'').toString()))
 .map(v=>({id:v.id,alias:v.alias||v.name,patente:v.licensePlate||'',lat:parseFloat(v.latitude||v.lat),lng:parseFloat(v.longitude||v.lng),vel:v.speed||0}))
 .filter(v=>!isNaN(v.lat));
   LAST=Date.now();
  }
  res.json({count:CACHE.length,vehicles:CACHE,host:HOST});
 }catch(e){res.status(500).json({error:e.message})}
});
app.get('/',(req,res)=>res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Barrancas Vivo</title><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script><style>body{margin:0;background:#0a0e0a;color:#fff;font-family:system-ui}#map{height:100vh}.b{position:absolute;top:12px;left:50px;z-index:999;background:#111;padding:10px 14px;border-radius:10px;border:1px solid #333;font-weight:700}</style></head><body><div class=b id=i>Cargando camiones 38-46 + VL176...</div><div id=map></div><script>const m=L.map('map').setView([-32.89,-68.84],13);L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19}).addTo(m);let mk={};async function ld(){try{const r=await fetch('/api/vehicles');const d=await r.json();document.getElementById('i').textContent=d.count+' camiones | '+new Date().toLocaleTimeString();d.vehicles.forEach(v=>{if(mk[v.id])mk[v.id].setLatLng([v.lat,v.lng]);else mk[v.id]=L.marker([v.lat,v.lng]).addTo(m).bindPopup('<b>'+v.alias+'</b><br>'+v.patente+' '+v.vel+'km/h')})}catch(e){}}ld();setInterval(ld,20000);<\/script></body></html>`));
app.listen(process.env.PORT||3000,()=>console.log('ok '+HOST));
