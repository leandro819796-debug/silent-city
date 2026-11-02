// Silent City - servidor online (salas de até 4 jogadores + 1 servidor dedicado).
// Sem servidor dedicado: o 1º a entrar é o anfitrião e roda o mundo; se ele sair, outro assume.
// Com servidor dedicado (variáveis GH_TOKEN e CODESPACE_NAME no Render): ao entrar alguém na sala,
// o Codespace é ligado sozinho, roda o mundo e desliga 10 min depois que todos saírem.
const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const PORT=process.env.PORT||3000,rooms=new Map();
const GH=process.env.GH_TOKEN,CS=process.env.CODESPACE_NAME,DROOM=process.env.SALA_DEDICADA||'sala1';
const HTML=path.join(__dirname,'silent-city.html');
const srv=http.createServer((q,r)=>{if(q.url==='/health'){r.writeHead(200);r.end('ok');return}try{const d=fs.readFileSync(HTML);r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});r.end(d)}catch(e){r.writeHead(404);r.end('silent-city.html nao encontrado')}});
const wss=new WebSocketServer({server:srv});
const GUEST=['k','act','tap','clr','ia'];
const send=(w,o)=>{if(w&&w.readyState===1)w.send(typeof o==='string'?o:JSON.stringify(o))};
async function gh(method,p){if(!GH||!CS)return null;try{const r=await fetch('https://api.github.com/user/codespaces/'+encodeURIComponent(CS)+p,{method,headers:{Authorization:'Bearer '+GH,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'silent-city'}});const j=await r.json().catch(()=>({}));console.log('GitHub',method,p,r.status,j&&j.state||j&&j.message||'');return j}catch(e){console.log('GitHub erro',e.message);return null}}
let lastStart=0;function startCS(){if(Date.now()-lastStart<60000)return;lastStart=Date.now();gh('POST','/start')}
const players=R=>R.slots.map((w,i)=>w&&!w.ded?i:-1).filter(i=>i>=0);
function fallback(R){R.fb=null;if(R.host>=0&&R.slots[R.host])return;const o=players(R);if(!o.length)return;const nh=o[0];R.host=nh;
  send(R.slots[nh],'{"t":"promote","old":-1,"alive":'+JSON.stringify(o)+',"from":'+(R.save||'null')+'}');for(const i of o)if(i!==nh)send(R.slots[i],{t:'newhost',s:nh,nm:R.slots[nh].nm})}
wss.on('connection',ws=>{
  ws.room=null;ws.slot=-1;
  ws.on('message',raw=>{const str=raw.toString();const r=ws.room?rooms.get(ws.room):null;
    if(r&&ws.slot===r.host){
      if(str.startsWith('{"t":"snap"')||str.startsWith('{"t":"init"')){for(let i=0;i<5;i++){const w=r.slots[i];if(i!==r.host&&w&&w.readyState===1&&w.bufferedAmount<262144)w.send(str)}return}
      if(str.startsWith('{"t":"save"')){r.save=str;return}}
    let m;try{m=JSON.parse(str)}catch(e){return}
    if(m.t==='join'){
      const name=String(m.rm||'sala1').slice(0,20);let R=rooms.get(name);if(!R){R={slots:[null,null,null,null,null],host:-1,save:null};rooms.set(name,R)}
      const ded=!!m.ded;
      if(ded&&((R.host>=0&&R.slots[R.host])||R.slots[4])){send(ws,{t:'busy'});return}
      const s=ded?4:R.slots.slice(0,4).findIndex(x=>!x);if(s<0){send(ws,{t:'full'});return}
      R.slots[s]=ws;ws.room=name;ws.slot=s;ws.ded=ded;ws.nm=String(m.nm||'Jogador').slice(0,12);
      if(!ded&&R.stopT){clearTimeout(R.stopT);R.stopT=null}
      if(ded){R.host=4;if(R.fb){clearTimeout(R.fb);R.fb=null}send(ws,{t:'hi',me:4,host:true});for(const i of players(R))send(ws,{t:'joined',s:i,nm:R.slots[i].nm});
        if(!players(R).length)R.stopT=setTimeout(()=>gh('POST','/stop'),10*60000);return}
      if(R.host<0||!R.slots[R.host]){
        if(GH&&CS&&name===DROOM){send(ws,{t:'hi',me:s,host:false,wait:1});startCS();if(!R.fb)R.fb=setTimeout(()=>fallback(R),150000);return}
        R.host=s;send(ws,{t:'hi',me:s,host:true});return}
      send(ws,{t:'hi',me:s,host:false});send(R.slots[R.host],{t:'joined',s,nm:ws.nm});return}
    if(!r)return;
    if(ws.slot!==r.host&&GUEST.includes(m.t)){m.s=ws.slot;send(r.slots[r.host],m)}
  });
  ws.on('close',()=>{const r=rooms.get(ws.room);if(!r)return;r.slots[ws.slot]=null;
    const all=r.slots.map((w,i)=>w?i:-1).filter(i=>i>=0),pl=players(r);
    if(!all.length){if(r.fb)clearTimeout(r.fb);rooms.delete(ws.room);return}
    if(!pl.length&&r.slots[4]&&!r.stopT)r.stopT=setTimeout(()=>gh('POST','/stop'),10*60000);
    if(ws.slot===r.host){if(!pl.length){r.host=-1;return}const nh=pl[0];r.host=nh;
      send(r.slots[nh],'{"t":"promote","old":'+ws.slot+',"alive":'+JSON.stringify(pl)+',"from":'+(r.save||'null')+'}');
      for(const i of pl)if(i!==nh)send(r.slots[i],{t:'newhost',s:nh,nm:r.slots[nh].nm})}
    else if(r.host>=0)send(r.slots[r.host],{t:'left',s:ws.slot})});
});
setInterval(()=>{for(const c of wss.clients){try{c.ping()}catch(e){}}},25000); // mantém a conexão viva na nuvem
srv.listen(PORT,'0.0.0.0',()=>console.log('Silent City online na porta '+PORT+(GH&&CS?' (servidor dedicado: '+CS+', sala '+DROOM+')':'')));
