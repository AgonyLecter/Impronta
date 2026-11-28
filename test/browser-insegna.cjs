/* browser: gli insegni le parole (definizioni, correzioni, sinonimi, elenco) e «studia» usa tutte le fonti (Wikimedia simulato) */
const {chromium,devices}=require('playwright'); const fs=require('fs'), path=require('path');
const ok=(c,m)=>{console.log((c?'ok   ':'NO   ')+m); if(!c) process.exitCode=1;};
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET, OPTIONS'};
// pagine finte per sito: titolo → { x: testo, l: collegamenti }
const SITI={
  'it.wikipedia.org':{ 'Vulcano':{x:"Un vulcano è una struttura geologica da cui fuoriesce il magma dall'interno della Terra. I vulcani si trovano spesso ai margini delle placche tettoniche. La lava è il magma che arriva in superficie e si raffredda lentamente.",q:'Q8072'},
                       'Le avventure di Pinocchio':{x:"Le avventure di Pinocchio è un romanzo per ragazzi scritto da Carlo Collodi e pubblicato nel 1883. Racconta la storia di un burattino di legno che vuole diventare un bambino vero."} },
  'it.wikiquote.org':{ 'Vulcano':{x:"Vulcano\n«Il vulcano dorme ma il suo cuore di fuoco non smette mai di battere.»\n"} },
  'it.wiktionary.org':{ 'uggioso':{x:"\nItaliano\n\n\nAggettivo\nuggioso m sing\n\nche annoia e mette malinconia, detto soprattutto del tempo grigio\n\n\nSinonimi\nnoioso, tedioso, malinconico, grigio\n"} },
  'it.wikisource.org':{ 'Le avventure di Pinocchio':{x:"Le avventure di Pinocchio, romanzo di Carlo Collodi, in trentasei capitoli raccontati con allegria e un poco di malinconia."},
                        'Le avventure di Pinocchio/Capitolo I':{x:"C'era una volta un pezzo di legno. Non era un legno di lusso, ma un semplice pezzo da catasta, di quelli che d'inverno si mettono nelle stufe e nei caminetti per accendere il fuoco e per riscaldare le stanze."},
                        'Le avventure di Pinocchio/Capitolo II':{x:"Maestro Ciliegia regalò il pezzo di legno al suo amico Geppetto, che voleva fabbricarsi un burattino meraviglioso."} },
  'it.wikibooks.org':{ 'Astronomia':{x:"Questo libro è un corso di astronomia per principianti che spiega le stelle, i pianeti e le galassie in modo semplice."}, 'Astronomia/Il Sole':{x:"Il Sole è la stella più vicina alla Terra."}, 'Astronomia/La Luna':{x:"La Luna è l'unico satellite naturale della Terra."} }
};
(async()=>{const b=await chromium.launch();const c=await b.newContext({...devices['Pixel 7']});
await c.route('http://impronta.local/**', async r=>{const u=new URL(r.request().url());const f=path.resolve(__dirname,'..')+(u.pathname==='/'?'/index.html':u.pathname);
  if(!fs.existsSync(f)) return r.fulfill({status:404,body:''});
  r.fulfill({status:200,contentType:f.endsWith('.js')?'text/javascript':f.endsWith('.json')?'application/json':'text/html',body:fs.readFileSync(f)});});
await c.route(/^https:\/\/(it\.(wikipedia|wikiquote|wiktionary|wikisource|wikibooks|wikiversity)\.org|www\.wikidata\.org)\//, r=>{
  if (r.request().method()==='OPTIONS') return r.fulfill({status:204,headers:CORS});
  const u=new URL(r.request().url()), q=Object.fromEntries(u.searchParams), sito=SITI[u.hostname]||{}, J=o=>r.fulfill({status:200,headers:CORS,contentType:'application/json',body:JSON.stringify(o)});
  if (u.hostname==='www.wikidata.org'){ if (q.ids==='Q8072') return J({entities:{Q8072:{labels:{it:{value:'vulcano'}},descriptions:{it:{value:'apertura della crosta terrestre'}},claims:{P279:[{rank:'normal',mainsnak:{datavalue:{type:'wikibase-entityid',value:{id:'Q1'}}}}]}}}});
    return J({entities:{Q1:{labels:{it:{value:'forma del terreno'}}}}}); }
  if (q.list==='search'){ const qq=String(q.srsearch).toLowerCase().slice(0,6), k=Object.keys(sito).find(t=>!t.includes('/')&&(t.toLowerCase().includes(qq)||String(q.srsearch).toLowerCase().includes(t.toLowerCase()))); return J({query:{search:k?[{title:k.split('/')[0]}]:[]}}); }
  if (q.list==='allpages'){ return J({query:{allpages:Object.keys(sito).filter(t=>t.startsWith(q.apprefix)).map(title=>({title}))}}); }
  if (q.prop==='pageprops'){ const p=sito[q.titles]; return J({query:{pages:[p&&p.q?{title:q.titles,pageprops:{wikibase_item:p.q}}:{title:q.titles}]}}); }
  const t=q.titles||q.page, p=sito[t]; if (!p) return J({query:{pages:[{title:t,missing:true}]}});
  if (q.action==='parse') return J({parse:{text:'<p>'+p.x+'</p>',links:[]}});
  return J({query:{pages:[{title:t,extract:p.x.length>200?p.x:p.x+' '.repeat(0),links:[]}]}}); });
await c.route(/firebase|gstatic/, r=>r.abort());
const p=await c.newPage();const errs=[];
p.on('pageerror',e=>errs.push('PAGE '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/firebase|gstatic|fonts|ERR_|403|Failed to load|vibrate/.test(m.text()))errs.push('CONSOLE '+m.text())});
const DAY=86400e3, now=Date.now(), ID='IIIINNNNSSSSEEEE';
const words={}; for(const w of 'oggi sono andato al mare con mio fratello mi piace il calcio la pizza ciao bene casa scuola'.split(' ')) words[w]={c:3,f:now-5*DAY,s:0};
const S={v:2,id:ID,born:now-9*DAY,forcePhase:3,name:'Pixel',userName:'luca',firstWord:'mare',words,lastSeen:now-60e3,sessions:5,litSeen:80,revealed:true,
  log:[{t:now-120e3,w:'u',x:'ciao'},{t:now-110e3,w:'c',x:'ciao luca'}], energy:{used:0,sleepUntil:0,sleepStart:0,dreamMs:40000,need:30000},
  mem:{corpus:['oggi sono andato al mare con mio fratello'],studia:[],scoperte:[]}};
await c.addInitScript(([id,s])=>{ if(!localStorage.getItem('impronta_state')){ localStorage.setItem('impronta_id',id); localStorage.setItem('impronta_state',s); } },[ID,JSON.stringify(S)]);
await p.goto('http://impronta.local/');
const idle=async()=>{for(let i=0;i<150;i++){ await p.waitForTimeout(300); if(await p.evaluate(()=>window.__impronta&&window.__impronta.idle&&!document.querySelector('#sheet.on'))){ await p.waitForTimeout(500); if(await p.evaluate(()=>window.__impronta.idle)) return; } } };
const said=async()=>((await p.textContent('#said'))||'').trim(), cap=async()=>((await p.textContent('#cap'))||'').trim();
const st=()=>p.evaluate(()=>window.__impronta.S);
const log=async n=>(await st()).log.filter(l=>l.w==='c').slice(-n).map(l=>l.x);
const say=async m=>{await idle();await p.fill('#inp',m);await p.press('#inp','Enter');await p.waitForTimeout(600);await idle(); return said();};
await p.waitForTimeout(6000); await idle();
// --- lezioni
let r=await say('ti insegno una parola: zibaldone'); ok(/cosa vuol dire zibaldone/.test(r), 'ti insegno una parola → «'+r+'»');
r=await say('vuol dire quaderno di appunti'); let s=await st();
ok(/zibaldone vuol dire quaderno di appunti/.test(r) && /prima parola/.test(r) && s.defs.zibaldone==='quaderno di appunti', '«vuol dire …» → «'+r+'»');
ok(s.ricordi.some(x=>x.prima==='prima parola'), 'la prima parola che gli insegni diventa un ricordo');
r=await say('no, zibaldone vuol dire raccolta di pensieri senza ordine'); s=await st(); ok(/pensavo che zibaldone fosse quaderno di appunti/.test(r) && /raccolta di pensieri/.test(s.defs.zibaldone), 'correzione → «'+r+'»');
r=await say('felice è come contento'); s=await st(); ok(/felice è come contento/.test(r) && (s.mem.sinonimi.felice||[]).includes('contento'), 'sinonimo → «'+r+'»');
r=await say('il contrario di caldo è freddo'); s=await st(); ok(s.mem.contrari.caldo==='freddo', 'contrario → «'+r+'»');
r=await say('cosa ti ho insegnato?'); ok(/zibaldone/.test(r) && /felice/.test(r), 'cosa ti ho insegnato? → «'+r+'»');
r=await say("cos'è lo zibaldone?"); ok(/raccolta di pensieri/.test(r), "e la riusa: cos'è lo zibaldone? → «"+r+"»");
// --- studia con tutte le fonti
r=await say('studia la parola uggioso'); s=await st(); ok(/uggioso vuol dire che annoia/.test(r) && /Wikizionario/.test(await cap()) && /annoia/.test(s.defs.uggioso||''), 'studia la parola uggioso → «'+r+'» · '+(await cap()));
r=await say('studia i vulcani'); const lv=await log(2); ok(lv.some(x=>/struttura geologica/.test(x)) && lv.some(x=>/qualcuno ha scritto: «il vulcano dorme/i.test(x)), 'studia i vulcani → Wikipedia + Wikiquote: «'+lv.join(' / ')+'»');
s=await st(); const sv=s.mem.scoperte.find(x=>x.argomento==='Vulcano'); ok(sv && sv.fatti && sv.fatti.some(f=>/forma del terreno/.test(f.v)) && sv.frasi.length>=1, 'e i fatti certi di Wikidata, nella scoperta');
r=await say('studia il libro pinocchio'); s=await st(); ok(/ho cominciato a leggere «le avventure di pinocchio»/.test(r) && /c'era una volta un pezzo di legno/i.test(r) && (s.mem.leggi||[]).some(x=>x.titolo==='Le avventure di Pinocchio'), 'studia il libro pinocchio → «'+r+'» · '+(await cap()));
r=await say("studia l'astronomia"); ok(/ho trovato un manuale: «astronomia», 2 capitoli/.test(r) && /Wikibooks/.test(await cap()), "studia l'astronomia → «"+r+"» · "+(await cap()));
await p.click('#bWords'); await p.waitForTimeout(1200); const sh=await p.textContent('#pane'); ok(/me le hai insegnate tu/.test(sh) && /zibaldone/.test(sh) && /raccolta di pensieri/.test(sh), 'la scheda parole mostra le parole che gli hai insegnato');
ok(!errs.length,'nessun errore '+errs.slice(0,5).join(' | '));
await b.close();})();
