/* browser: parole nuove (le capisce da solo col dizionario, o le cerca), ti incalza quando stai zitto */
const {chromium,devices}=require('playwright'); const fs=require('fs'), path=require('path');
const ok=(c,m)=>{console.log((c?'ok   ':'NO   ')+m); if(!c) process.exitCode=1;};
(async()=>{const b=await chromium.launch();const c=await b.newContext({...devices['Pixel 7']});
await c.route('http://impronta.local/**', async r=>{const u=new URL(r.request().url());const f=path.resolve(__dirname,'..')+(u.pathname==='/'?'/index.html':u.pathname);
  if(!fs.existsSync(f)) return r.fulfill({status:404,body:''});
  r.fulfill({status:200,contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.json')?'application/json':'text/html',body:fs.readFileSync(f)});});
// il Wikizionario finto: «zibaldone»
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET, OPTIONS'};
await c.route('https://it.wiktionary.org/**', r=>{ if (r.request().method()==='OPTIONS') return r.fulfill({status:204,headers:CORS}); const q=Object.fromEntries(new URL(r.request().url()).searchParams);
  const t=String(q.titles||q.page||'');
  if (t==='zibaldone') return r.fulfill({status:200,headers:CORS,contentType:'application/json',body:JSON.stringify({query:{pages:[{title:'zibaldone',extract:'\nItaliano\n\n\nSostantivo\nzibaldone m sing (pl.: zibaldoni)\n\nquaderno in cui si annotano pensieri, appunti e ricordi senza ordine\n\n\nSillabazione\nzi | bal | dó | ne\n\n\nEtimologia / Derivazione\ndal toscano zibaldone, mescolanza di cibi\n',links:[]}]}})});
  return r.fulfill({status:200,headers:CORS,contentType:'application/json',body:JSON.stringify({query:{pages:[{title:t,missing:true}]}})}); });
await c.route(/wikipedia\.org|firebase|gstatic/, r=>r.abort());
const p=await c.newPage();const errs=[];
p.on('pageerror',e=>errs.push('PAGE '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/firebase|gstatic|fonts|ERR_|403|Failed to load|vibrate/.test(m.text()))errs.push('CONSOLE '+m.text())});
const DAY=86400e3, now=Date.now(), ID='PPPPAAAARRRROOOO';
const words={}; for(const w of 'oggi sono andato al mare con mio fratello mi piace il calcio la pizza di mia mamma buona scuola verifica storia cane amici musica estate sole casa compiti bello bella felice stanco contento triste domani voglio andare giocato mangiato visto libro leggere'.split(' ')) words[w]={c:3,f:now-5*DAY,s:0};
const S={v:2,id:ID,born:now-9*DAY,forcePhase:3,name:'Pixel',userName:'luca',firstWord:'mare',words,lastSeen:now-60e3,sessions:5,litSeen:80,revealed:true,
  log:[{t:now-120e3,w:'u',x:'ciao'},{t:now-110e3,w:'c',x:'ciao luca'}],
  energy:{used:0,sleepUntil:0,sleepStart:0,dreamMs:40000,need:30000},
  mem:{corpus:['oggi sono andato al mare con mio fratello','mi piace il calcio e la pizza'],studia:[],scoperte:[{t:now-3600e3,argomento:'Vulcano',x:"Un vulcano è una struttura geologica da cui esce il magma.",fonte:'Wikipedia',detta:0}],
    imparate:[],gusti:{notti:3,temi:{Mare:{s:3,prog:.2,sente:[.6,0,0,0,.2,0,0,.3],volte:3,p:.6,c:{curiosita:.8,progresso:.4,cuore:.4}}},libri:{},materie:{},autori:{},preferiti:{temi:'Mare'},storia:[]}}};
await c.addInitScript(([id,s])=>{ if(!localStorage.getItem('impronta_state')){ localStorage.setItem('impronta_id',id); localStorage.setItem('impronta_state',s); } },[ID,JSON.stringify(S)]);
await p.goto('http://impronta.local/');
const idle=async()=>{for(let i=0;i<150;i++){ await p.waitForTimeout(300); if(await p.evaluate(()=>window.__impronta&&window.__impronta.idle&&!document.querySelector('#sheet.on'))){ await p.waitForTimeout(500); if(await p.evaluate(()=>window.__impronta.idle)) return; } } };
const said=async()=>((await p.textContent('#said'))||'').trim(), cap=async()=>((await p.textContent('#cap'))||'').trim();
const st=()=>p.evaluate(()=>JSON.parse(localStorage.impronta_state));
const log=async n=>(await st()).log.filter(l=>l.w==='c').slice(-n).map(l=>l.x);
const say=async m=>{await idle();await p.fill('#inp',m);await p.press('#inp','Enter');await p.waitForTimeout(600);await idle(); return said();};
await p.waitForTimeout(6000); await idle();
// 1) una parola nuova che il suo dizionario conosce: la capisce da solo, non te la chiede, e se la salva
await say('oggi ho camminato in una foresta');
let s=await st(); ok(s.defs && /vegetazione|bosco/.test(s.defs.foresta||'') && /WordNet/.test(s.mem.defFonte.foresta||''), 'capisce da solo «foresta» col suo dizionario e se la salva: '+(s.defs&&s.defs.foresta));
const l1=await log(3); ok(!l1.some(x=>/foresta\? cos/.test(x)), 'non ti chiede cos\'è una parola che ha capito: «'+l1.slice(-2).join(' / ')+'»');
// 2) una parola che non conosce: te la chiede; se dici «cercalo tu» la cerca e se la salva
await p.evaluate(()=>{ const S=window.__impronta.S; S.mem.ask={w:'zibaldone',t:Date.now()}; S.words.zibaldone={c:1,f:Date.now(),s:0}; });
let r=await say('non lo so, cercalo tu');
s=await st(); const l2=await log(2);
ok(/cerco|cercarla/.test(l2[0]||'') && /zibaldone vuol dire quaderno/.test(r), '«cercalo tu» → «'+l2.join(' / ')+'»');
ok(/quaderno/.test(s.defs.zibaldone||'') && s.mem.defFonte.zibaldone==='Wikizionario', 'se la salva con la fonte: '+s.defs.zibaldone);
r=await say('cos\'è lo zibaldone?'); ok(/quaderno/.test(r), 'e la riusa: cos\'è lo zibaldone? → «'+r+'»');
// 3) stai zitto: ti incalza (non solo «sei ancora lì?»)
const prima=(await st()).log.length; await p.waitForTimeout(47000); await idle();
const dopo=await st(), nuove=dopo.log.slice(prima).filter(l=>l.w==='c').map(l=>l.x);
ok(nuove.length>=1 && nuove.some(x=>/scoperto|vulcano|mare|vuol dire|prima hai detto|prima parlavi|ho letto/.test(x)), 'quando stai zitto ti incalza: «'+nuove.join(' / ')+'»');
ok(!errs.length,'nessun errore '+errs.slice(0,5).join(' | '));
await b.close();})();
