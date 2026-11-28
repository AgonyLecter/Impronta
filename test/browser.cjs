const {chromium,devices}=require('playwright');
const fs=require('fs');
(async()=>{const b=await chromium.launch();const c=await b.newContext({...devices['Pixel 7']});
await c.route('http://impronta.local/**', async r=>{const u=new URL(r.request().url());const f=require('path').resolve(__dirname,'..')+(u.pathname==='/'?'/index.html':u.pathname);
  if(!fs.existsSync(f)) return r.fulfill({status:404,body:''});
  r.fulfill({status:200,contentType:f.endsWith('.js')?'text/javascript':'text/html',body:fs.readFileSync(f)});});
const p=await c.newPage();const errs=[];
p.on('pageerror',e=>errs.push('PAGE '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/firebase|gstatic|fonts|ERR_|403|Failed to load/.test(m.text()))errs.push('CONSOLE '+m.text())});
await p.goto('http://impronta.local/');await p.waitForTimeout(1500);await p.screenshot({path:require('path').join(require('os').tmpdir(),'b1_boot.png')});
await p.waitForTimeout(3500);
await p.evaluate(()=>{document.querySelector('#hint').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1,pointerType:'touch'}));});
await p.waitForTimeout(5600);
await p.evaluate(()=>{document.querySelector('#hint').dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1,pointerType:'touch'}));});
await p.waitForTimeout(4000);
const idle=async()=>{for(let i=0;i<120;i++){ await p.waitForTimeout(300); const ok=await p.evaluate(()=>window.__impronta&&window.__impronta.idle&&!document.querySelector('#sheet.on')); if(ok){ await p.waitForTimeout(400); if(await p.evaluate(()=>window.__impronta.idle)) return; } else await p.evaluate(()=>document.querySelector('#sheet').classList.remove('on')); } };
const say=async m=>{await idle();await p.fill('#inp',m);await p.press('#inp','Enter');await p.waitForTimeout(600);await idle();};
const lab=async(k)=>{await p.evaluate(()=>document.querySelector('#sheet').classList.remove('on'));for(let i=0;i<5;i++) await p.click('#logo');await p.waitForTimeout(400);await p.click(`[data-l="${k}"]`);await p.waitForTimeout(3000);await idle();};
await say('Agony');await say('luca');
await lab('ph'); await lab('ph'); await lab('ph');
await p.evaluate(()=>document.querySelector('#sheet').classList.remove('on'));
const msgs=['mi chiamo luca','oggi sono felice','ho mangiato la pizza con mia mamma','domani ho la verifica di storia','mi piace il calcio','il mare è bello','sono stanco','voglio andare al mare','il mio cane si chiama rex','ho sedici anni','che bello il sole','ho giocato a calcio','mia mamma cucina bene','la scuola è noiosa','ciao amico','sono contento','mi piace la musica','oggi piove','ho finito i compiti','stasera esco','ho visto un film','mi piace il gelato','sono a casa','che bella giornata','ti voglio bene','domani vado al mare','il calcio è bello','ho fame','mia sorella è simpatica','buonanotte','ancora una cosa','ciao ciao','ultima parola','basta','ok'];
let i=0; while(!(await p.evaluate(()=>JSON.parse(localStorage.impronta_state).energy.sleepUntil>Date.now())) && i<msgs.length){ await say(msgs[i++]); }
if(!(await p.evaluate(()=>JSON.parse(localStorage.impronta_state).energy.sleepUntil>Date.now()))){ console.log('(ancora sveglio dopo '+i+' messaggi: lo addormento dal laboratorio)'); await lab('sleep'); }
console.log('si è addormentato dopo',i,'messaggi:', await p.evaluate(()=>{const e=JSON.parse(localStorage.impronta_state).energy;return 'pisolino '+Math.round((e.sleepUntil-e.sleepStart)/60000)+' min, deve sognare '+Math.round(e.need/1000)+' s'}));
await p.waitForTimeout(9000);
console.log('mentre dorme:', await p.textContent('#cap'), '| sogni a schermo:', await p.evaluate(()=>[...document.querySelectorAll('#dreams .dl')].map(d=>d.textContent).join(' / ')));
await p.screenshot({path:require('path').join(require('os').tmpdir(),'c1_sogno.png')});
// sveglia forzata: pressione lunga sul volto
await p.evaluate(()=>{document.querySelector('#stage').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:2,pointerType:'touch'}));});
await p.waitForTimeout(1200);
await p.evaluate(()=>{window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:2,pointerType:'touch'}));});
await idle();
console.log('svegliato:', await p.textContent('#said'), '|', await p.textContent('#cap'));
await say('come stai?'); console.log('dopo:', await p.textContent('#said'));
// si riaddormenta, poi "passano 8 ore" con l'app chiusa: recupero dei sogni
await lab('sleep'); await p.waitForTimeout(2500);
console.log('riaddormentato:', await p.evaluate(()=>{const e=JSON.parse(localStorage.impronta_state).energy;return 'pisolino '+Math.round((e.sleepUntil-e.sleepStart)/60000)+' min'}));
await lab('h8'); await p.waitForTimeout(2500);
console.log('al ritorno dopo 8 ore:', await p.textContent('#cap'));
await idle(); console.log('poi:', await p.textContent('#hint'), '|', await p.textContent('#said'));
console.log('\nDIALOGO:\n'+(await p.evaluate(()=>JSON.parse(localStorage.impronta_state).log.slice(-8).map(l=>(l.w==='u'?'tu:  ':'lui: ')+(l.g?'[glifo] ':'')+l.x+(l.src&&l.w==='c'?'   ['+l.src+']':'')).join('\n'))));
console.log('errori:',errs.slice(0,10));await b.close();})();
