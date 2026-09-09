const express=require('express'),cors=require('cors');
const app=express();app.use(cors());
const HOST='https://rastreo.idecgps.com.ar';
let COOKIE='',LAST_LOGIN=0;

function enMaipu(lat,lng){return lat>=-33.15 && lat<=-32.70 && lng>=-68.95 && lng<=-68.45;}
function horaMza(){return new Date().toLocaleString('es-AR',{timeZone:'America/Argentina/Mendoza',hour12:false});}
function enHorarioServicio(){
  const h=new Date().toLocaleString('es-AR',{timeZone:'America/Argentina/Mendoza',hour:'2-digit',hour12:false});
  const hh=parseInt(h);
  // Mañana 6 a 14, Tarde 19 a 23
  return (hh>=6 && hh<14) || (hh>=19 && hh<=23);
}
function proxServicio(){
  const hh=parseInt(new Date().toLocaleString('es-AR',{timeZone:'America/Argentina/Mendoza',hour:'2-digit',hour12:false}));
  if(hh<6) return '06:00 AM'; if(hh<19) return '19:00 PM'; return '06:00 AM mañana';
}

async function login(){
 const U=process.env.STRIX_USER, P=process.env.STRIX_PASS; if(!U||!P) return '';
 const fd=new URLSearchParams({j_username:U,j_password:P});
 const r=await fetch(HOST+'/j_spring_security_check',{method:'POST',body:fd,redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded'}});
 const all=r.headers.get('set-cookie')||r.headers.getSetCookie?.()?.join(';')||''; const m=all.match(/JSESSIONID=[^;]+/);
 if(m){COOKIE=m[0];LAST_LOGIN=Date.now();} return COOKIE;
}
async function getV(){
 if(!COOKIE || Date.now()-LAST_LOGIN>1800000) await login();
 const r=await fetch(HOST+'/api/vehicle/getVehiclesList?mobile=0&streetzUserId=17',{headers:{Cookie:COOKIE}});
 const j=await r.json();return j.data||j.vehicles||[];
}
let CACHE=[],LAST=0;
app.get('/api/vehicles',async(req,res)=>{
 try{
  if(Date.now()-LAST>15000){
   const raw=await getV(); const visibles=[];
   const servicio=enHorarioServicio();
   if(servicio){
     raw.forEach(v=>{
       const lat=parseFloat(v.latitude||v.lat), lng=parseFloat(v.longitude||v.lng); if(isNaN(lat)) return;
       const id=(v.alias||v.name||'').toString(); if(!/38|39|40|41|42|43|44|45|46|VL176/i.test(id)) return;
       if(enMaipu(lat,lng)) visibles.push({id:v.id,alias:id,patente:v.licensePlate||'',lat,lng,vel:v.speed||0});
     });
   }
   CACHE=visibles; LAST=Date.now();
  }
  res.json({count:CACHE.length,vehicles:CACHE, enServicio:enHorarioServicio(), prox:proxServicio(), hora:horaMza()});
 }catch(e){res.status(500).json({error:e.message})}
});

app.get('/',(req,res)=>res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Barrancas Vivo</title><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script><style>body{margin:0;font-family:system-ui;background:#f5f5f5}#map{height:100vh}.top{position:absolute;top:0;left:0;right:0;z-index:999;background:#E30613;color:#fff;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;font-weight:700}.card{position:absolute;top:60px;left:10px;z-index:998;background:#fff;color:#111;padding:12px 16px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.2);min-width:260px}.on{color:#1a9e32;font-weight:800}.off{color:#666;font-weight:800}.badge{background:#E30613;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px}</style></head><body><div class=top><span>🚛 BARRANCAS VIVO</span><span id=hora style="font-weight:400"></span></div><div class=card id=i>Cargando...</div><div id=map></div><script>const m=L.map('map',{zoomControl:false}).setView([-32.98,-68.78],12);L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19}).addTo(m);L.rectangle([[-33.15,-68.95],[-32.7,-68.45]],{color:'#E30613',weight:2,dashArray:'8,8',fillOpacity:0.05}).addTo(m);let mk={};async function ld(){try{const r=await fetch('/api/vehicles');const d=await r.json();document.getElementById('hora').textContent=d.hora;if(d.enServicio){if(d.count>0)document.getElementById('i').innerHTML='<span class=on>● EN SERVICIO</span> <span class=badge>'+d.count+' en Maipú</span><br><small>Turno: 06:00-14:00 y 19:00-23:00</small><br><small>Actualizado: '+new Date().toLocaleTimeString()+'</small>';else document.getElementById('i').innerHTML='<span class=off>● SERVICIO FINALIZADO</span><br><small>Vehículos fuera de Maipú</small><br><small>Próxima actualización al ingresar</small>';}else{document.getElementById('i').innerHTML='<span class=off>● SERVICIO FINALIZADO</span><br><small>Fuera de horario</small><br><small>Próximo: '+d.prox+'</small>';}Object.values(mk).forEach(x=>x.remove());mk={};d.vehicles.forEach(v=>{mk[v.id]=L.marker([v.lat,v.lng]).addTo(m).bindPopup('<b>'+v.alias+'</b><br>'+v.patente+' '+v.vel+' km/h<br><span style=color:green>En Maipú</span>')})}catch(e){}}ld();setInterval(ld,15000);<\/script></body></html>`));
app.listen(process.env.PORT||3000);
