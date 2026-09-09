const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.static('public'));
const COOKIE = process.env.COOKIE || '';
async function fetchStrix(){
  const r = await fetch('https://www.strixby.com/api/vehicle/getVehiclesList?mobile=0&streetzUserId=17',{headers:{'Cookie':COOKIE,'User-Agent':'Mozilla/5.0'}});
  const j = await r.json(); return j.data || j.vehicles || [];
}
let CACHE=[]; let LAST=0;
app.get('/api/vehicles', async (req,res)=>{
  try{
    if(Date.now()-LAST>15000){
      const raw=await fetchStrix();
      CACHE=raw.filter(v=>{
        const a=(v.alias||v.name||'').toString();
        return a.includes('38')||a.includes('39')||a.includes('40')||a.includes('41')||a.includes('42')||a.includes('43')||a.includes('44')||a.includes('45')||a.includes('46')||a.includes('VL176');
      }).map(v=>({id:v.id,alias:v.alias||v.name,patente:v.licensePlate||v.patente,chofer:v.driverName||'',lat:parseFloat(v.latitude||v.lat),lng:parseFloat(v.longitude||v.lng),velocidad:v.speed||0})).filter(v=>!isNaN(v.lat));
      LAST=Date.now();
    }
    res.json({count:CACHE.length,vehicles:CACHE});
  }catch(e){res.status(500).json({error:e.message})}
});
app.listen(process.env.PORT||3000,()=>console.log('ok'));
