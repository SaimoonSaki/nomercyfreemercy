const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const srv=http.createServer((q,r)=>{
  if(q.url==='/favicon.ico'){r.writeHead(204);return r.end()}
  r.writeHead(200,{'content-type':'text/html;charset=utf-8'});r.end(fs.readFileSync(path.join(__dirname,'index.html')))});
const wss=new WebSocketServer({server:srv,maxPayload:32768}),rooms={},MAX=8;
const tx=(w,m)=>w&&w.readyState===1&&w.send(JSON.stringify(m));
const lobby=R=>({t:'lobby',started:!!R.s,host:R.host,players:R.p.map(p=>({n:p.n,c:p.c,on:!!p.w}))});
const all=(R,m)=>R.p.forEach(p=>tx(p.w,m));
const shuf=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const kind=i=>i<152?(i%38<20?(i%38)>>1:10+((i%38-20)/3|0)):16+((i-152)>>2);
function deal(R){
  const dk=shuf([...Array(168).keys()]),h=R.p.map(()=>dk.splice(0,7));
  const top=dk.splice(dk.findIndex(i=>kind(i)<10),1)[0];
  R.s={pl:R.p.map(p=>({n:p.n,c:p.c})),h,dk,ds:[top],t:0,d:1,col:top/38|0,st:0,out:R.p.map(()=>0),pd:null,win:-1,v:0}}
wss.on('connection',w=>{
  let R,me;
  w.on('message',d=>{
    let m;try{m=JSON.parse(d)}catch{return}
    if(m.t==='join'&&!R){
      const id=String(m.room||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6),n=String(m.name||'').trim().slice(0,12)||'Player';
      if(!id)return;
      const Q=rooms[id]=rooms[id]||{id,p:[],s:null,host:null};
      clearTimeout(Q.k);
      let p=Q.p.find(x=>x.n.toLowerCase()===n.toLowerCase());
      if(!p){
        const live=Q.s&&Q.s.win<0;
        if(live||Q.p.length>=MAX)return tx(w,{t:'err',m:live?'Game already started':'Room is full'});
        const free=[...Array(8).keys()].filter(c=>!Q.p.some(x=>x.c===c));
        p={n,c:free.includes(+m.color)?+m.color:free[0]};Q.p.push(p);Q.host=Q.host||n;
      }
      const old=p.w;p.w=w;if(old&&old!==w)old.terminate();
      R=Q;me=p;
      tx(w,{t:'hi',i:R.p.indexOf(p),n:p.n,room:id});all(R,lobby(R));if(R.s)tx(w,{t:'state',s:R.s});
      return}
    if(!R)return;
    if(m.t==='start'&&me.n===R.host&&(!R.s||R.s.win>=0)&&R.p.length>1){
      deal(R);all(R,lobby(R));all(R,{t:'state',s:R.s})}
    else if(m.t==='state'&&R.s&&R.s.win<0&&R.p.indexOf(me)===R.s.t&&m.s&&m.s.v===R.s.v+1&&Array.isArray(m.s.h)){
      R.s=m.s;all(R,{t:'state',s:R.s})}
  });
  w.on('close',()=>{if(!R||me.w!==w)return;me.w=null;all(R,lobby(R));
    if(!R.p.some(p=>p.w))R.k=setTimeout(()=>delete rooms[R.id],6e5)});
});
const PORT=process.env.PORT||3000;
srv.listen(PORT,()=>console.log('Uno running on port '+PORT));
