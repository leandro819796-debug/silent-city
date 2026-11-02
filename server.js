// Silent City - servidor online (salas de até 4 jogadores).
// O 1º a entrar é o anfitrião e roda o mundo. Se ele sair, o próximo jogador assume com o último save.
const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const PORT=process.env.PORT||3000,rooms=new Map();
const HTML=path.join(__dirname,'silent-city.html');
const srv=http.createServer((q,r)=>{if(q.url==='/health'){r.writeHead(200);r.end('ok');return}try{const d=fs.readFileSync(HTML);r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});r.end(d)}catch(e){r.writeHead(404);r.end('silent-city.html nao encontrado')}});
const wss=new WebSocketServer({server:srv});
const GUEST=['k','act','tap','clr','ia'];
const send=(w,o)=>{if(w&&w.readyState===1)w.send(typeof o==='string'?o:JSON.stringify(o))};
wss.on('connection',ws=>{
  ws.room=null;ws.slot=-1;
  ws.on('message',raw=>{const str=raw.toString();const r=ws.room?rooms.get(ws.room):null;
    if(r&&ws.slot===r.host){
      // repasse direto (sem decodificar) das mensagens grandes do anfitrião
      if(str.startsWith('{"t":"snap"')||str.startsWith('{"t":"init"')){for(let i=0;i<4;i++){const w=r.slots[i];if(i!==r.host&&w&&w.readyState===1&&w.bufferedAmount<262144)w.send(str)}return}
      if(str.startsWith('{"t":"save"')){r.save=str;return}}
    let m;try{m=JSON.parse(str)}catch(e){return}
    if(m.t==='join'){
      const name=String(m.rm||'sala1').slice(0,20);let R=rooms.get(name);if(!R){R={slots:[null,null,null,null],host:0,save:null};rooms.set(name,R)}
      const s=R.slots.findIndex(x=>!x);if(s<0){send(ws,{t:'full'});return}
      if(!R.slots[R.host])R.host=s;
      R.slots[s]=ws;ws.room=name;ws.slot=s;ws.nm=String(m.nm||'Jogador').slice(0,12);
      send(ws,{t:'hi',me:s,host:s===R.host});
      if(s!==R.host)send(R.slots[R.host],{t:'joined',s,nm:ws.nm});
      return}
    if(!r)return;
    if(ws.slot!==r.host&&GUEST.includes(m.t)){m.s=ws.slot;send(r.slots[r.host],m)}
  });
  ws.on('close',()=>{const r=rooms.get(ws.room);if(!r)return;r.slots[ws.slot]=null;
    const others=r.slots.map((w,i)=>w?i:-1).filter(i=>i>=0);
    if(!others.length){rooms.delete(ws.room);return}
    if(ws.slot===r.host){const old=ws.slot,nh=others[0];r.host=nh;
      send(r.slots[nh],'{"t":"promote","old":'+old+',"alive":'+JSON.stringify(others)+',"from":'+(r.save||'null')+'}');
      for(const i of others)if(i!==nh)send(r.slots[i],{t:'newhost',s:nh,nm:r.slots[nh].nm})}
    else send(r.slots[r.host],{t:'left',s:ws.slot})});
});
setInterval(()=>{for(const c of wss.clients){try{c.ping()}catch(e){}}},25000); // mantém a conexão viva na nuvem
srv.listen(PORT,'0.0.0.0',()=>console.log('Silent City online na porta '+PORT+' -> abra http://localhost:'+PORT));
