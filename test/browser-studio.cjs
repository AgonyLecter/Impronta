/* browser: un compagno in fase "frase" torna da un sonno in cui ha studiato sul server */
const {chromium,devices}=require('playwright'); const fs=require('fs'), path=require('path');
const ok=(c,m)=>{console.log((c?'ok   ':'NO   ')+m); if(!c) process.exitCode=1;};
(async()=>{const b=await chromium.launch();const c=await b.newContext({...devices['Pixel 7']});
await c.route('http://impronta.local/**', async r=>{const u=new URL(r.request().url());const f=path.resolve(__dirname,'..')+(u.pathname==='/'?'/index.html':u.pathname);
  if(!fs.existsSync(f)) return r.fulfill({status:404,body:''});
  r.fulfill({status:200,contentType:f.endsWith('.js')?'text/javascript':'text/html',body:fs.readFileSync(f)});});
const p=await c.newPage();const errs=[];
p.on('pageerror',e=>errs.push('PAGE '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/firebase|gstatic|fonts|ERR_|403|Failed to load|vibrate/.test(m.text()))errs.push('CONSOLE '+m.text())});
const DAY=86400e3, now=Date.now(), ID='AAAABBBBCCCCDDDD';
const words={}; for(const w of 'oggi sono andato al mare con mio fratello mi piace il calcio la pizza di mia mamma buona scuola geometria verifica storia cane amici musica estate sole casa compiti film gelato sorella giornata partita bello bella felice stanco contento triste domani voglio andare giocato mangiato cucina finito visto fame simpatica noiosa piove vado esco studiare imparare numeri disegnare libro leggere'.split(' ')) words[w]={c:3,f:now-5*DAY,s:0};
const S={v:2,id:ID,born:now-9*DAY,forcePhase:3,name:'Pixel',userName:'luca',firstWord:'mare',words,lastSeen:now-9*3600e3,sessions:5,litSeen:80,revealed:true,
  log:[{t:now-9*3600e3,w:'u',x:'ciao'},{t:now-9*3600e3,w:'c',x:'ciao'}],
  energy:{used:0,sleepUntil:0,sleepStart:0,dreamMs:40000,need:30000,srv:{t:now-3600e3,steps:4000,loss:2.1,H:256,L:2,params:900000,studiate:812}},
  mem:{corpus:['oggi sono andato al mare con mio fratello','mi piace il calcio e la pizza'],studia:[{k:'argomento',x:'geometria',t:now-DAY,fatto:now-3600e3}],
    scoperte:[{t:now-3600e3,argomento:'Geometria',x:"La geometria è la parte della matematica che studia le figure nello spazio.",fonte:'Wikipedia',url:'https://it.wikipedia.org/wiki/Geometria',perche:"me l'hai chiesto tu",detta:0},
              {t:now-3500e3,argomento:'Mare',x:"Il mare è una grande distesa di acqua salata.",fonte:'Wikipedia',url:'https://it.wikipedia.org/wiki/Mare',perche:'ne parli spesso',detta:0}],
    studio:{t:now-3600e3,pagine:14,frasi:820,materie:{matematica:'3/24',geometria:'1/18'},prossima:'fisica',libro:'Le avventure di Pinocchio (2/36)',curiosita:['Oceano','Spiaggia']},
    gusti:{notti:4,temi:{Mare:{s:3.1,prog:.2,sente:[.6,0,0,0,.2,0,0,.3],volte:3,p:.61,c:{curiosita:.8,progresso:.38,cuore:.4}},Geometria:{s:4.9,prog:0,sente:[0,0,0,.1,0,0,.2,0],volte:2,p:.22,c:{curiosita:.2,progresso:0,cuore:-.1}}},
      libri:{'Le avventure di Pinocchio':{s:3.4,prog:.3,sente:[.3,.4,0,.2,.2,0,0,.4],volte:4,p:.58,c:{curiosita:.7,progresso:.5,cuore:.3}}},materie:{},autori:{},
      preferiti:{temi:'Mare',libri:'Le avventure di Pinocchio'},parole:{contento:{w:'contento',tra:['contento','felice','lieto']}},storia:[{t:now-DAY,tipo:'temi',nuovo:'Mare',prima:'Geometria'}]}}};
await c.addInitScript(([id,s])=>{ if(!localStorage.getItem('impronta_state')){ localStorage.setItem('impronta_id',id); localStorage.setItem('impronta_state',s); } },[ID,JSON.stringify(S)]);
await p.goto('http://impronta.local/');
const idle=async()=>{for(let i=0;i<150;i++){ await p.waitForTimeout(300); if(await p.evaluate(()=>window.__impronta&&window.__impronta.idle&&!document.querySelector('#sheet.on'))){ await p.waitForTimeout(500); if(await p.evaluate(()=>window.__impronta.idle)) return; } } };
const said=async()=>((await p.textContent('#said'))||'').trim(), cap=async()=>((await p.textContent('#cap'))||'').trim();
const say=async m=>{await idle();await p.fill('#inp',m);await p.press('#inp','Enter');await p.waitForTimeout(600);await idle(); return said();};
await p.waitForTimeout(6000); await idle();
const log=await p.evaluate(()=>JSON.parse(localStorage.impronta_state).log.filter(l=>l.w==='c').slice(-4).map(l=>l.x));
ok(log.some(x=>/ho studiato (mare|geometria)\. ho scoperto che/.test(x)), 'al ritorno racconta una scoperta: «'+log.find(x=>/studiato/.test(x))+'»');
let r=await say('studia la fotosintesi'); ok(/fotosintesi/.test(r) && /stanotte/.test(r), 'studia la fotosintesi (Wikipedia irraggiungibile) → «'+r+'»');
r=await say('cosa sai del mare?'); ok(/distesa di acqua salata/.test(r), 'cosa sai del mare? → «'+r+'» · '+(await cap()));
r=await say('cosa sai dei vulcani?'); ok(/vulcani/.test(r) && /stanotte/.test(r), 'cosa sai dei vulcani? (Wikipedia irraggiungibile) → «'+r+'»');
r=await say('ti mando questo https://it.wikipedia.org/wiki/Luna'); ok(/stanotte|dormo/.test(r), 'un link → «'+r+'»');
r=await say('studia qualcosa'); ok(/cosa vuoi che studi/.test(r), 'studia qualcosa → «'+r+'»');
r=await say('https://share.google/NdVRRKXN5IEOtFv3Y'); ok(/link di google/.test(r), 'link di Google → «'+r+'»');
ok(await p.evaluate(()=>{const S=JSON.parse(localStorage.impronta_state); return !S.words.https && !S.mem.corpus.some(l=>/https/.test(l));}), 'i link non diventano parole');
r=await say('cosa hai studiato?'); ok(/ho studiato/.test(r), 'cosa hai studiato? → «'+r+'»');
const q=await p.evaluate(()=>JSON.parse(localStorage.impronta_state).mem.studia.map(q=>q.k+':'+q.x+(q.fatto?' (fatto)':'')));
ok(q.length===4, 'richieste per il server: '+q.join(' · '));
await p.click('#bStudy'); await p.waitForTimeout(700);
const sheet=await p.textContent('#pane'); ok(/pagine lette/.test(sheet)&&/Pinocchio/.test(sheet)&&/fotosintesi/.test(sheet)&&/geometria è la parte/.test(sheet),'la scheda studio mostra tutto');
await p.screenshot({path:path.join(require('os').tmpdir(),'studio.png')});
await p.evaluate(()=>document.querySelector('#sheet').classList.remove('on'));
await p.click('#bMind'); await p.waitForTimeout(700); ok(/strati/.test(await p.textContent('#pane'))&&!!(await p.$('#brain')),'la mente mostra il cervello e gli strati');
await p.click('#mGusti'); await p.waitForTimeout(600); { const g=await p.textContent('#pane'); ok(/i suoi gusti/.test(g)&&/Pinocchio/.test(g)&&/preferito: Mare/.test(g)&&/Geometria → Mare/.test(g)&&/contento/.test(g),'la scheda gusti mostra classifiche, perché, cambi di idea e parole sue'); }
await p.screenshot({path:path.join(require('os').tmpdir(),'gusti.png')});
await p.evaluate(()=>document.querySelector('#sheet').classList.remove('on')); await p.click('#bWords'); await p.waitForTimeout(1500); ok(!!(await p.$('#galaxy'))&&/dai libri/i.test(await p.textContent('#pane')),'la scheda parole mostra la galassia');
await p.evaluate(()=>document.querySelector('#sheet').classList.remove('on')); await p.click('#bDiary'); await p.waitForTimeout(500); ok(/diario/.test(await p.textContent('#pane')),'il diario si apre');
await p.evaluate(()=>document.querySelector('#sheet').classList.remove('on'));
r=await say('qual è il tuo libro preferito?'); ok(/^le avventure di pinocchio\./i.test(r) && /\d/.test(r), 'qual è il tuo libro preferito? → «'+r+'»');
r=await say('perché?'); ok(/^perché /i.test(r), 'perché? → «'+r+'»');
r=await say('chi preferisci tra mare e geometria?'); ok(/^mare\./i.test(r), 'chi preferisci tra mare e geometria? → «'+r+'» · '+(await cap()));
r=await say('oggi ho giocato a calcio con mio fratello'); ok(r.length>0,'parla ancora normalmente: «'+r+'»');
ok(!errs.length,'nessun errore '+errs.slice(0,5).join(' | '));
await b.close();})();
