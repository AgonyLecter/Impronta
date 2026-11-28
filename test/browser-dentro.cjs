/* browser: il suo stato interiore (gli sei mancato, «come stai?» vero) e i suoi ricordi (nascono, tornano, scheda «dentro di lui») */
const {chromium,devices}=require('playwright'); const fs=require('fs'), path=require('path');
const ok=(c,m)=>{console.log((c?'ok   ':'NO   ')+m); if(!c) process.exitCode=1;};
(async()=>{const b=await chromium.launch();const c=await b.newContext({...devices['Pixel 7']});
await c.route('http://impronta.local/**', async r=>{const u=new URL(r.request().url());const f=path.resolve(__dirname,'..')+(u.pathname==='/'?'/index.html':u.pathname);
  if(!fs.existsSync(f)) return r.fulfill({status:404,body:''});
  r.fulfill({status:200,contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.json')?'application/json':'text/html',body:fs.readFileSync(f)});});
await c.route(/wikipedia\.org|wiktionary|firebase|gstatic|open-meteo|nominatim|rainews|ansa/, r=>r.abort());
await c.addInitScript(()=>{ Math.random = () => 0.05; });   // il caso fisso: le cose «a volte» succedono sempre
const p=await c.newPage();const errs=[];
p.on('pageerror',e=>errs.push('PAGE '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/firebase|gstatic|fonts|ERR_|403|Failed to load|vibrate/.test(m.text()))errs.push('CONSOLE '+m.text())});
const DAY=86400e3, H=3600e3, now=Date.now(), ID='DDDDEEEENNNNTTTT';
const words={}; for(const w of 'oggi sono andato al mare con mio fratello mi piace il calcio la pizza nonno sta male triste ciao bene voglio amico casa scuola'.split(' ')) words[w]={c:3,f:now-5*DAY,s:0};
const S={v:2,id:ID,born:now-20*DAY,forcePhase:3,name:'Pixel',userName:'luca',firstWord:'mare',words,lastSeen:now-2*DAY,sessions:9,litSeen:80,revealed:true,
  log:[{t:now-2*DAY,w:'u',x:'ciao'},{t:now-2*DAY,w:'c',x:'ciao luca'}], energy:{used:0,sleepUntil:0,sleepStart:0,dreamMs:40000,need:30000},
  traits:{calore:.4,ironia:0,curiosita:.2,coraggio:0,calma:0,malinconia:.1},
  interno:{t:now-2*DAY,b:{compagnia:.2,curiosita:.4,capito:.3},v:.3,a:.4,eco:[],storia:[{t:now-3*DAY,v:.3,a:.4}],cause:[]},
  ricordi:[{id:1,t:now-5*DAY,x:'il giorno in cui eri triste',tu:'oggi sono triste perché mio nonno sta male',emo:'tristezza',i:.85,f0:.85,n:0,ult:now-5*DAY,k:'',tipo:'emozione'}],
  mem:{corpus:['oggi sono andato al mare con mio fratello'],studia:[],scoperte:[]}};
await c.addInitScript(([id,s])=>{ if(!localStorage.getItem('impronta_state')){ localStorage.setItem('impronta_id',id); localStorage.setItem('impronta_state',s); } },[ID,JSON.stringify(S)]);
await p.goto('http://impronta.local/');
const idle=async()=>{for(let i=0;i<150;i++){ await p.waitForTimeout(300); if(await p.evaluate(()=>window.__impronta&&window.__impronta.idle&&!document.querySelector('#sheet.on'))){ await p.waitForTimeout(500); if(await p.evaluate(()=>window.__impronta.idle)) return; } } };
const said=async()=>((await p.textContent('#said'))||'').trim(), cap=async()=>((await p.textContent('#cap'))||'').trim();
const st=()=>p.evaluate(()=>window.__impronta.S);
const log=async n=>(await st()).log.filter(l=>l.w==='c').slice(-n).map(l=>l.x);
const say=async m=>{await idle();await p.fill('#inp',m);await p.press('#inp','Enter');await p.waitForTimeout(600);await idle(); return said();};
await p.waitForTimeout(7000); await idle();
const l0=await log(4); ok(l0.some(x=>/mi sei mancato/.test(x)), 'dopo due giorni da solo: «'+l0.find(x=>/mancato/.test(x))+'»');
let s=await st(); ok(s.interno && s.interno.b.compagnia < .7 && s.interno.cause.some(c=>c.tipo==='ritorno'), 'il tuo ritorno sazia la sua compagnia ('+(s.interno&&s.interno.b.compagnia)+')');
let r=await say('come stai?'); ok(/però sei tornato|annoio|solo|giù|bene/.test(r) && /umore vero/.test(await cap()), '«come stai?» → «'+r+'»');
r=await say('ti voglio bene'); s=await st(); ok(s.ricordi.some(x=>x.prima==='ti voglio bene'), 'il primo «ti voglio bene» diventa un ricordo che non dimentica');
const n0=((await st()).ricordi.find(x=>x.id===1)||{}).n||0;
r=await say('oggi sono andato a trovare il nonno'); const l2=await log(3); ok(l2.some(x=>/mi ricordo il giorno in cui eri triste/.test(x)), 'parlando del nonno gli torna in mente: «'+l2.find(x=>/ricordo/.test(x))+'»');
s=await st(); ok(((s.ricordi.find(x=>x.id===1)||{}).n||0)===n0+1, 'e ripensarlo lo rinforza (ripensato '+(n0+1)+' volte, anche in sogno mentre non c\'eri)');
await p.click('#bMind'); await p.waitForTimeout(1500); await p.click('#mDentro'); await p.waitForTimeout(800);
const sh=await p.textContent('#pane'); ok(/dentro di lui/.test(sh)&&/compagnia/.test(sh)&&/sentirsi capito/.test(sh)&&/il giorno in cui eri triste/.test(sh)&&/le prime volte/.test(sh), 'la scheda «dentro di lui» mostra bisogni, umore e ricordi');
await p.screenshot({path:path.join(require('os').tmpdir(),'dentro.png')});
ok(!errs.length,'nessun errore '+errs.slice(0,5).join(' | '));
await b.close();})();
