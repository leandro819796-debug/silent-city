// Silent City - servidor online (salas de até 4 jogadores). O 1o a entrar é o anfitrião.
const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const PORT=process.env.PORT||3000,rooms=new Map();
const HTML=path.join(__dirname,'silent-city.html');
const srv=http.createServer((q,r)=>{if(q.url==='/health'){r.writeHead(200);r.end('ok');return}try{const d=fs.readFileSync(HTML);r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});r.end(d)}catch(e){r.writeHead(404);r.end('silent-city.html nao encontrado')}});
const wss=new WebSocketServer({server:srv});
const GUEST=['k','act','tap','clr','ia'];
const send=(w,o)=>{if(w&&w.readyState===1)w.send(JSON.stringify(o))};
wss.on('connection',ws=>{
  ws.room=null;ws.slot=-1;
  ws.on('message',raw=>{let m;try{m=JSON.parse(raw)}catch(e){return}
    if(m.t==='join'){
      const name=String(m.rm||'sala1').slice(0,20);let r=rooms.get(name);if(!r){r={slots:[null,null,null,null]};rooms.set(name,r)}
      const s=r.slots.findIndex(x=>!x);if(s<0){send(ws,{t:'full'});return}
      r.slots[s]=ws;ws.room=name;ws.slot=s;ws.nm=String(m.nm||'Jogador').slice(0,12);
      send(ws,{t:'hi',me:s,host:s===0});
      if(s>0)send(r.slots[0],{t:'joined',s,nm:ws.nm});
      return}
    const r=rooms.get(ws.room);if(!r)return;
    if(ws.slot===0){if(m.t==='init'||m.t==='snap')for(let i=1;i<4;i++)send(r.slots[i],m)}
    else if(GUEST.includes(m.t)){m.s=ws.slot;send(r.slots[0],m)}
  });
  ws.on('close',()=>{const r=rooms.get(ws.room);if(!r)return;r.slots[ws.slot]=null;
    if(ws.slot===0){for(let i=1;i<4;i++){send(r.slots[i],{t:'end'});try{r.slots[i]&&r.slots[i].close()}catch(e){}}rooms.delete(ws.room)}
    else{send(r.slots[0],{t:'left',s:ws.slot})}
    if(r.slots.every(x=>!x))rooms.delete(ws.room)});
});
setInterval(()=>{for(const c of wss.clients){try{c.ping()}catch(e){}}},25000); // mantém a conexão viva na nuvem
srv.listen(PORT,'0.0.0.0',()=>console.log('Silent City online na porta '+PORT+' -> abra http://localhost:'+PORT));
