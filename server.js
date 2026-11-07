const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const IMG=['png','webp','jpg','jpeg','svg','gif'],AUD=['mp3','wav','ogg','m4a'],MT={png:'image/png',webp:'image/webp',jpg:'image/jpeg',jpeg:'image/jpeg',svg:'image/svg+xml',gif:'image/gif',mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg',m4a:'audio/mp4'};
const ext=f=>path.extname(f).slice(1).toLowerCase();
const ls=(d,x)=>{try{return fs.readdirSync(path.join(__dirname,d)).filter(f=>x.includes(ext(f))).sort()}catch{return[]}};
const srv=http.createServer((q,r)=>{
  let u='';try{u=decodeURIComponent(q.url.split('?')[0])}catch{}
  const d=['cards','sounds','emotes'].find(x=>u.startsWith('/'+x+'/'));
  if(d){const f=path.join(__dirname,d,path.basename(u));
    return fs.readFile(f,(er,b)=>{
      if(er||!MT[ext(f)]){r.writeHead(404);return r.end()}
      r.writeHead(200,{'content-type':MT[ext(f)],'cache-control':'public,max-age=600'});r.end(b)})}
  if(u==='/api/assets'){r.writeHead(200,{'content-type':'application/json','cache-control':'no-cache'});return r.end(JSON.stringify({sounds:ls('sounds',AUD),emotes:ls('emotes',IMG)}))}
  if(u==='/favicon.ico'){r.writeHead(204);return r.end()}
  r.writeHead(200,{'content-type':'text/html;charset=utf-8'});r.end(fs.readFileSync(path.join(__dirname,'index.html')))});
const wss=new WebSocketServer({server:srv,maxPayload:32768}),rooms={},MAX=8,OPT0={pw:1,dr:1,un:1,sb:3};
const tx=(w,m)=>w&&w.readyState===1&&w.send(JSON.stringify(m));
const lobby=R=>({t:'lobby',started:!!R.s,host:R.host,opt:R.opt,players:R.p.map(p=>({n:p.n,c:p.c,on:!!p.w}))});
const all=(R,m)=>R.p.forEach(p=>tx(p.w,m));
const shuf=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const kind=i=>{if(i>=160)return 16+((i-160)>>2);const r=i%40;return r<20?r>>1:r<38?10+((r-20)/3|0):r<39?20:21};
function deal(R){
  const dk=shuf([...Array(176).keys()]),h=R.p.map(()=>dk.splice(0,7)),top=dk.splice(dk.findIndex(i=>kind(i)<10),1)[0];
  R.u1={};
  R.s={pl:R.p.map(p=>({n:p.n,c:p.c})),h,dk,ds:[top],t:0,d:1,col:top/40|0,st:0,out:R.p.map(()=>0),un:R.p.map(()=>0),eo:[],lg:[],pd:null,win:-1,v:0,o:{...R.opt}}}
const bump=R=>{R.s.v++;all(R,{t:'state',s:R.s})};
function drop(R,i){const s=R.s;if(!s||i<0||s.win>=0||s.out[i])return;
  s.out[i]=1;s.eo.push(i);s.dk.unshift(...s.h[i]);s.h[i]=[];s.un[i]=0;s.lg=[['O',i,1]];
  const a=s.out.map((o,j)=>o?-1:j).filter(j=>j>=0),n=s.pl.length;
  if(a.length===1)s.win=a[0];
  else if(s.t===i){s.pd=null;s.st=0;do{s.t=(s.t+s.d+n)%n}while(s.out[s.t])}
  bump(R)}
function uno(R,i){const s=R.s;if(!s||s.win>=0||!s.o.un||!s.h[i]||s.out[i]||s.h[i].length!==1||s.un[i])return;s.un[i]=1;s.lg=[['N',i]];bump(R)}
function call(R,t,by){const s=R.s;
  if(!s||s.win>=0||!s.o.un||t===by||!s.h[t]||!s.h[by]||s.out[t]||s.out[by]||s.h[t].length!==1||s.un[t]||Date.now()-(R.u1[t]||0)<4000)return;
  for(let k=0;k<2;k++){if(!s.dk.length){const x=s.ds.pop();s.dk=shuf(s.ds);s.ds=[x]}if(s.dk.length)s.h[t].push(s.dk.pop())}
  s.lg=[['U',t,by]];bump(R)}
wss.on('connection',w=>{
  let R,me;
  w.on('message',d=>{try{
    let m;try{m=JSON.parse(d)}catch{return}
    if(m.t==='join'&&!R){
      const id=String(m.room||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6),n=String(m.name||'').trim().slice(0,12)||'Player';
      if(!id)return;
      const Q=rooms[id]=rooms[id]||{id,p:[],s:null,host:null,opt:{...OPT0},u1:{}};
      clearTimeout(Q.k);
      let p=Q.p.find(x=>x.n.toLowerCase()===n.toLowerCase());
      if(!p){
        const live=Q.s&&Q.s.win<0;
        if(live||Q.p.length>=MAX)return tx(w,{t:'err',m:live?'Game already started':'Room is full'});
        const free=[...Array(8).keys()].filter(c=>!Q.p.some(x=>x.c===c));
        p={n,c:free.includes(+m.color)?+m.color:free[0]};Q.p.push(p);Q.host=Q.host||n;
      }
      clearTimeout(p.dt);
      const old=p.w;p.w=w;if(old&&old!==w)old.terminate();
      R=Q;me=p;
      tx(w,{t:'hi',i:R.p.indexOf(p),n:p.n,room:id});all(R,lobby(R));if(R.s)tx(w,{t:'state',s:R.s});
      return}
    if(!R)return;
    const i=R.p.indexOf(me),s=R.s;
    if(m.t==='start'&&me.n===R.host&&(!s||s.win>=0)){
      R.p=R.p.filter(p=>p.w);
      if(R.p.length<2)return;
      deal(R);R.p.forEach((p,j)=>tx(p.w,{t:'hi',i:j,n:p.n,room:R.id}));all(R,lobby(R));all(R,{t:'state',s:R.s})}
    else if(m.t==='state'&&s&&s.win<0&&i===s.t&&m.s&&m.s.v===s.v+1&&Array.isArray(m.s.h)&&m.s.h.length===s.h.length){
      m.s.un=Array.isArray(m.s.un)?m.s.un:s.un.slice();
      m.s.h.forEach((h,j)=>{if(h.length===1){if(s.h[j].length!==1){m.s.un[j]=0;R.u1[j]=Date.now()}}else m.s.un[j]=0});
      R.s=m.s;all(R,{t:'state',s:R.s})}
    else if(m.t==='opt'&&me.n===R.host&&(!s||s.win>=0)){
      const v=+m.v;
      if(['pw','dr','un'].includes(m.k))R.opt[m.k]=v?1:0;else if(m.k==='sb'&&[0,3,8,20].includes(v))R.opt.sb=v;
      all(R,lobby(R))}
    else if(m.t==='fx'){
      const now=Date.now(),sb=m.k==='s';
      if(sb){if(!R.opt.sb||now-(R.fs||0)<700||now-(me.fx||0)<R.opt.sb*1000)return;R.fs=now;me.fx=now}
      else{if(now-(me.fe||0)<1500)return;me.fe=now}
      all(R,{t:'fx',k:sb?'s':'e',n:String(m.n||'').slice(0,60),f:i})}
    else if(m.t==='uno')uno(R,i);
    else if(m.t==='call')call(R,+m.i,i);
    else if(m.t==='leave'){
      clearTimeout(me.dt);me.left=1;
      if(s&&s.win<0)drop(R,i);
      else if(!s){R.p.splice(i,1);if(R.host===me.n)R.host=R.p[0]?R.p[0].n:null;all(R,lobby(R))}}
  }catch(e){console.error(e)}});
  w.on('close',()=>{if(!R||me.w!==w)return;me.w=null;all(R,lobby(R));
    me.dt=setTimeout(()=>{if(me.w||me.left)return;const i=R.p.indexOf(me);
      if(R.s&&R.s.win<0)drop(R,i);
      else if(!R.s){if(i>=0)R.p.splice(i,1);if(R.host===me.n)R.host=R.p[0]?R.p[0].n:null;all(R,lobby(R))}
      else if(R.host===me.n){const q=R.p.find(p=>p.w);if(q){R.host=q.n;all(R,lobby(R))}}},20000);
    if(!R.p.some(p=>p.w))R.k=setTimeout(()=>delete rooms[R.id],6e5)});
});
const PORT=process.env.PORT||3000;
srv.listen(PORT,()=>console.log('Uno running on port '+PORT));
