/* impronta · app */
import * as B from "./brain.js";
import { Ritmo, liveRead, prophecy, prophecyHit } from "./senso.js";
import { Nucleo, AFFETTI, etichetta, conferma, registra, analizza } from "./nucleo/index.js";
import { impacchetta, spacchetta } from "./nucleo/pacco.js";
import { cervello, cuore, galassia, puntini, tile, segmenti, titolo } from "./hud.js";
import { lettore, frasi as frasiDa, definizione, FEED } from "./nucleo/studio.js";
import * as Mondo from "./mondo.js";
import * as Gusti from "./nucleo/gusti.js";
import { calcola } from "./nucleo/calcolo.js";
import * as Appunti from "./nucleo/appunti.js";
const { PHASES, LIMITS, ENERGY, NEED, HOUR, DAY, DAYS, G, STOP, START } = B;

/* ================= CONFIG ================= */
const FB_CONFIG = {
  apiKey: "AIzaSyAXkaxi5ZWr3pzr3C_0BpwCrL_7y0tC_t8",
  authDomain: "easygo-f5046.firebaseapp.com",
  databaseURL: "https://easygo-f5046-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "easygo-f5046",
  storageBucket: "easygo-f5046.firebasestorage.app",
  messagingSenderId: "509243295842",
  appId: "1:509243295842:web:3d3c7f60166d497480293b"
};
const FB_V = "10.12.2", ROOT = "impronta", NETS = "impronta_nets";

/* ================= UTIL ================= */
const $ = s => document.querySelector(s);
const ls = {
  get(k){ try{ return localStorage.getItem(k) }catch(e){ return null } },
  set(k,v){ try{ localStorage.setItem(k,v); return true }catch(e){ return false } },
  del(k){ try{ localStorage.removeItem(k) }catch(e){} }
};
let devOffset = +(ls.get("impronta_dev") || 0);
const now = () => Date.now() + devOffset;
const rnd = () => Math.random();
const pick = a => a[Math.floor(rnd()*a.length)];
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const wait = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const hhmm = t => { const d = new Date(t); return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0"); };
const dstr = t => new Date(t).toLocaleDateString("it-IT",{day:"numeric",month:"short"});
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; } }
function strSeed(s){ let h=2166136261; for(const c of s){ h^=c.charCodeAt(0); h=Math.imul(h,16777619); } return h>>>0; }
function genId(){ const al="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const b=new Uint8Array(16); crypto.getRandomValues(b); return [...b].map(x=>al[x%al.length]).join(""); }
const fmtId = id => id.replace(/(.{4})(?=.)/g,"$1-");
const smooth = x => { x = clamp(x,0,1); return x*x*(3-2*x); };

/* ================= STATO ================= */
function blank(id){ return { v:2, id, born:0, name:"", userName:"", firstWord:"", firstMsg:null, awaitName:false, forcePhase:0,
  phase:3, words:{}, phrases:{}, quotes:[], likes:[], dislikes:[], defs:{}, self:{is:[],likes:[]}, facts:{},
  traits:{calore:0,ironia:0,curiosita:0,coraggio:0,calma:0,malinconia:0},
  user:{msgs:0,chars:0,emoji:{},emojiMsgs:0,lower:0,excl:0,dot:0,abbr:{},hours:Array(24).fill(0),firstLens:[],lens:[],typing:{n:0,cps:0,del:0}},
  mem:{feel:[],events:[],people:{},topics:{},corpus:[],ask:null,openers:[],react:{},reward:{},labels:[],mood:[],pendingQ:null,confirm:null,ironyLex:{},ironyStats:{asked:0,hist:[]},studia:[],scoperte:[],studio:null,notizie:[],citazioni:[],feed:[],luogo:null,traduttore:null,gusti:null,gustoUltimo:null,citati:[],ultimoAppunto:null},
  log:[], diary:[], diaryUnread:0, glyphs:[], revealed:true,
  energy:{used:0,sleepUntil:0}, lastSeen:0, sessions:0, sparks:{}, hurt:0, promise:0, litSeen:0, sound:true, netSync:0, netUp:0, updatedAt:0 }; }
const arr = v => Array.isArray(v) ? v : v ? Object.values(v) : [];
function normalize(s, id){
  const b = blank(id), o = Object.assign(b, s||{});
  for (const k of ["traits","user","energy","sparks","mem"]) o[k] = Object.assign(blank(id)[k], (s||{})[k]||{});
  for (const k of ["quotes","likes","dislikes","log","diary","glyphs"]) o[k] = arr(o[k]);
  for (const k of ["hours","firstLens","lens"]) o.user[k] = arr(o.user[k]);
  if (o.user.hours.length < 24) o.user.hours = Array(24).fill(0).map((_,i)=>o.user.hours[i]||0);
  o.user.typing = Object.assign({n:0,cps:0,del:0}, o.user.typing||{});
  for (const k of ["feel","events","corpus","openers","labels","mood","studia","scoperte","notizie","citazioni","feed","citati"]) o.mem[k] = arr(o.mem[k]);
  // pulizia: i link finiti tra le frasi e le parole, e le "scoperte" di pagine di Google
  o.mem.corpus = o.mem.corpus.filter(l => !/\b(https?|www)\b/.test(l));
  for (const w of ["https","http","www"]) delete (o.words||{})[w];
  o.mem.scoperte = o.mem.scoperte.filter(x => x && !/google/.test(x.fonte || "") && !/cookie|privacy|accedi|prima di continuare/i.test(x.x || ""));
  o.mem.studia = o.mem.studia.filter(q => q && !/^(qualcosa|tutto|cose|roba|altro)$/i.test(String(q.x).trim()));
  for (const k of ["people","topics","react","reward","ironyLex"]) o.mem[k] = o.mem[k]||{};
  o.mem.ironyStats = Object.assign({asked:0,hist:[]}, o.mem.ironyStats||{}); o.mem.ironyStats.hist = arr(o.mem.ironyStats.hist);
  o.self = Object.assign({is:[],likes:[]}, o.self||{}); o.self.is = arr(o.self.is); o.self.likes = arr(o.self.likes); o.facts = o.facts||{};
  o.mem.labels.forEach(l => { l.l = arr(l.l); l.m = arr(l.m); });
  // migrazione: il corpus della voce nasce dalle frasi già dette
  if (!o.mem.corpus.length && o.log.length) o.mem.corpus = o.log.filter(l=>l.w==="u").map(l=>B.tokenize(l.x).join(" ")).filter(l=>l.split(" ").length>=3);
  o.words = o.words||{}; o.phrases = o.phrases||{}; o.defs = o.defs||{}; o.user.emoji = o.user.emoji||{}; o.user.abbr = o.user.abbr||{}; o.id = id;
  return o;
}
let ID = ls.get("impronta_id") || genId(); ls.set("impronta_id", ID);
let S = normalize((()=>{ try{ return JSON.parse(ls.get("impronta_state") || "null"); }catch(e){ return null; } })(), ID);

/* ================= FIREBASE ================= */
let fb = null, syncState = "locale", saveT = 0, leaving = false;
async function initFB(){
  try{
    const [A, D] = await Promise.race([
      Promise.all([import(`https://www.gstatic.com/firebasejs/${FB_V}/firebase-app.js`), import(`https://www.gstatic.com/firebasejs/${FB_V}/firebase-database.js`)]),
      wait(5000).then(()=>{ throw new Error("timeout") })
    ]);
    const app = A.initializeApp(FB_CONFIG);
    fb = { db: D.getDatabase(app), ref: D.ref, get: D.get, set: D.set };
    syncState = "sincronizzato";
  }catch(e){ fb = null; syncState = "solo su questo telefono"; }
}
const stamp = x => Math.min(x||0, Date.now());
async function loadRemote(id){ if(!fb) return null; try{ const snap = await Promise.race([fb.get(fb.ref(fb.db, ROOT+"/"+id)), wait(5000).then(()=>null)]); return snap && snap.exists() ? snap.val() : null; }catch(e){ syncState="errore di sincronizzazione"; return null; } }
function save(){
  if (leaving) return;
  S.updatedAt = Date.now();
  ls.set("impronta_state", JSON.stringify(S));
  clearTimeout(saveT); saveT = setTimeout(pushRemote, 1500);
}
/* SOGNI AD APP CHIUSA: quando dorme carica la rete su Firebase; ogni ora un workflow di GitHub
   (tools/sogna.mjs) allena le reti di chi dorme. Al ritorno la rete allenata torna qui. */
async function syncNetUp(){
  if (!fb || !nucleo.ready || leaving || !(isAsleep() || S.energy.sleepStart)) return;
  try{
    const steps = nucleo.info && nucleo.info.steps; if (!steps || steps === S.netUp) return;
    const saved = await nucleo.esporta(nucleo.info.params > 3e5); if (!saved) return;   // le reti grandi viaggiano a 16 bit
    const at = Date.now();
    await fb.set(fb.ref(fb.db, NETS+"/"+S.id), impacchetta(saved, { at, steps: saved.steps, H: saved.H, L: saved.L || 1, by:"tel" }));
    S.netSync = at; S.netUp = steps; save();
  }catch(e){ console.warn("rete non caricata", e && e.message); }
}
async function syncNetDown(){
  if (!fb) return false;
  if (!nucleo.ready && menteStart) await Promise.race([menteStart, wait(10000)]);
  if (!nucleo.ready) return false;
  try{
    const ms = await Promise.race([fb.get(fb.ref(fb.db, NETS+"/"+S.id+"/meta")), wait(5000).then(()=>null)]);
    const meta = ms && ms.exists() ? ms.val() : null;
    if (!meta || meta.by !== "srv" || !(meta.at > (S.netSync||0)) || !(meta.steps > ((nucleo.info && nucleo.info.steps) || 0))) return false;
    const get = async k => { const sn = await Promise.race([fb.get(fb.ref(fb.db, NETS+"/"+S.id+"/"+k)), wait(60000).then(()=>null)]); if (!sn || !sn.exists()) throw new Error("rete incompleta"); return sn.val(); };
    const nodo = meta.parts ? { parts: await Promise.all(Array.from({ length: meta.parts }, (_, i) => get("parts/"+i))) } : { net: await get("net") };
    const before = nucleo.info || {}, saved = spacchetta(nodo);
    const info = await nucleo.importa(saved, { corpus: S.mem.corpus, labels: S.mem.labels, seed: strSeed(S.id) });
    if (!info) return false;
    S.netSync = meta.at; S.netUp = info.steps; save(); lessico();
    const grew = info.H > (before.H || info.H) || (info.L||1) > (before.L||1) ? ` · ora ha ${info.H} neuroni${(info.L||1) > 1 ? ` in ${info.L} strati` : ""}` : "";
    setHint(`ha sognato mentre l'app era chiusa · +${Math.max(0, info.steps - (before.steps||0))} passi${grew}`, true);
    ripple(.5, 55); render();
    return true;
  }catch(e){ console.warn("rete del server non importata", e && e.message); return false; }
}
async function pushRemote(){ clearTimeout(saveT); if(!fb || leaving) return; try{ await fb.set(fb.ref(fb.db, ROOT+"/"+S.id), JSON.parse(JSON.stringify(S))); syncState="sincronizzato"; }catch(e){ syncState="errore di sincronizzazione"; } }

/* ================= SUONO / VIBRAZIONE ================= */
let AC = null;
function audio(){ if(!S.sound) return null; try{ AC = AC || new (window.AudioContext||window.webkitAudioContext)(); if(AC.state==="suspended") AC.resume(); return AC; }catch(e){ return null; } }
function tone(f, d=.06, type="square", v=.03, delay=0){ const a=audio(); if(!a) return; const t=a.currentTime+delay, o=a.createOscillator(), g=a.createGain(); o.type=type; o.frequency.setValueAtTime(f,t); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+d); o.connect(g).connect(a.destination); o.start(t); o.stop(t+d+.02); }
const buzz = p => { try{ navigator.vibrate && navigator.vibrate(p); }catch(e){} };
const voiceBase = () => 520 + S.traits.ironia*140 - S.traits.malinconia*120;

/* ================= CALCOLI ================= */
function known(){ let k=0; for(const w in S.words) if(!STOP.has(w) && w.length>2) k++; return k; }
function dayN(){ return S.born ? Math.floor((now()-S.born)/DAY)+1 : 0; }
function phase(){ const k=known(), d=dayN()-1; let p=0; for(let i=1;i<5;i++) if(k>=NEED[i][0] && d>=NEED[i][1]) p=i; return Math.max(p, START, S.forcePhase||0); }
function isAsleep(){ return S.energy.sleepUntil > now(); }
function contentWords(min=1){ return Object.keys(S.words).filter(w=>!STOP.has(w) && w.length>2 && S.words[w].c>=min); }
function progress(){ // avanzamento verso la fase successiva (0..1) e se aspetta solo il tempo
  const p = phase(); if (p>=4) return { v:1, waiting:false };
  const k = known(), [n0] = NEED[p], [n1, d1] = NEED[p+1];
  const v = clamp((k-n0)/Math.max(1,n1-n0), 0, 1);
  return { v, waiting: v>=1 && dayN()-1 < d1 };
}
function growth(){ if(!S.born) return 0; return [.18,.34,.52,.7,.88][phase()] + .12*progress().v; }

/* ================= GLIFI ================= */
const ALPHA = (()=>{ const r=mulberry32(1337), used=new Set(), A={}; const pc=b=>{let c=0;while(b){c+=b&1;b>>=1}return c};
  for (const ch of "abcdefghijklmnopqrstuvwxyz"){ let b; do{ b=0; for(let i=0;i<15;i++) if(r()<.46) b|=1<<i; }while(pc(b)<5||pc(b)>10||used.has(b)); used.add(b); A[ch]=b; } return A; })();
function letterCanvas(ch, cell, color){
  const b = ALPHA[ch], dpr = Math.min(3, devicePixelRatio||1), w = 3*cell, h = 5*cell;
  const c = document.createElement("canvas"); c.width = Math.ceil(w*dpr); c.height = Math.ceil(h*dpr); c.style.width = w+"px"; c.style.height = h+"px"; c.className = "gl";
  const g = c.getContext("2d"); g.scale(dpr,dpr); g.fillStyle = color || "#f2f2f2";
  for (let i=0;i<15;i++){ const on = b>>i&1; g.globalAlpha = on ? 1 : .1; g.beginPath(); g.arc((i%3)*cell+cell/2, Math.floor(i/3)*cell+cell/2, cell*.33, 0, 7); g.fill(); }
  return c;
}
function glyphEl(text, { cell = 6, stagger = 45, color } = {}){
  const box = document.createElement("div"); box.className = "glyphs"; let i = 0;
  const clean = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
  for (const word of clean.split(/\s+/)){
    const ws = document.createElement("span"); ws.className = "gw";
    for (const ch of word){ if (ALPHA[ch] === undefined) continue; const c = letterCanvas(ch, cell, color); c.dataset.ch = ch; c.style.animationDelay = (i++*stagger)+"ms"; ws.appendChild(c); }
    if (ws.children.length) box.appendChild(ws);
  }
  return box;
}

/* ================= VOLTO ================= */
const cv = $("#face"), cx = cv.getContext("2d");
const N = 23, C = 11, R = 11.2;
let CELLS = [], RING = 0, ATTN = -1, KEY = new Map();
function buildCells(){
  CELLS = []; KEY = new Map();
  for (let y=0;y<N;y++) for (let x=0;x<N;x++){ const d=Math.hypot(x-C,y-C); if(d<=R){ const a=Math.atan2(y-C,x-C); CELLS.push({x,y,d,ring:d>R-1.3,ang:(a+Math.PI/2+Math.PI*2)%(Math.PI*2),ri:-1}); } }
  const ring = CELLS.filter(c=>c.ring).sort((a,b)=>a.ang-b.ang); ring.forEach((c,i)=>c.ri=i); RING = ring.length;
  CELLS.forEach((c,i)=>KEY.set(c.x+","+c.y,i));
  let bd = 9; CELLS.forEach((c,i)=>{ if(c.ring){ const da=Math.abs(c.ang-Math.PI*.25); if(da<bd){bd=da;ATTN=i;} } });
  cur = new Float32Array(CELLS.length); red = new Float32Array(CELLS.length);
}
let cur, red;
buildCells();
const F = { emo:"neutral", live:null, gx:0, gy:0, tx:0, ty:0, blink:0, talk:0, mouth:"", attn:false, glitch:0, hold:0, ripples:[], dream:0, pointer:null, think:false, wink:0 };
function features(){
  const m = new Map(), put=(x,y,v=1)=>m.set(x+","+y,v);
  const e = F.think ? "think" : (F.talk>0 ? (F.emo==="neutral"?"neutral":F.emo) : (F.live || F.emo));
  const gx = Math.round(F.gx), gy = Math.round(F.gy);
  const eyes = [[C-4+gx, C-2+gy],[C+3+gx, C-2+gy]];
  eyes.forEach(([ex,ey], side)=>{
    if (e==="sleep" || F.blink || (F.wink && side===1)) { put(ex,ey+1); put(ex+1,ey+1); if (e==="sleep"){ put(ex-1,ey+1); } }
    else if (e==="happy"){ put(ex-1,ey+1); put(ex,ey); put(ex+1,ey); put(ex+2,ey+1); }
    else if (e==="sad"){ put(ex-1,ey); put(ex,ey); put(ex+1,ey+1); put(ex+2,ey+1); put(ex,ey+1); }
    else if (e==="surprised"){ for(let i=-1;i<=2;i++){ put(ex+i,ey-1); put(ex+i,ey+2); } put(ex-1,ey); put(ex-1,ey+1); put(ex+2,ey); put(ex+2,ey+1); }
    else if (e==="hurt"){ put(ex,ey+1); put(ex+1,ey+1); }
    else if (e==="curious" && side===1){ for(let i=0;i<2;i++) for(let j=-1;j<3;j++) put(ex+i,ey+j); }
    else if (e==="think"){ for(let i=0;i<2;i++) for(let j=0;j<2;j++) put(ex+i+1,ey+j-1); }
    else if (e==="listen"){ for(let i=0;i<2;i++) for(let j=0;j<3;j++) put(ex+i,ey+j); put(ex,ey+3,.5); put(ex+1,ey+3,.5); }
    else if (e==="smirk"){ if (side===0){ for(let i=0;i<2;i++) for(let j=0;j<3;j++) put(ex+i,ey+j); } else { for(let i=0;i<2;i++){ put(ex+i,ey+1); put(ex+i,ey+2,.8); } put(ex-1,ey-1,.7); put(ex,ey-1,.7); } }
    else if (e==="sleepy"){ for(let i=0;i<2;i++){ put(ex+i,ey+1,.8); put(ex+i,ey+2); } }
    else { for(let i=0;i<2;i++) for(let j=0;j<3;j++) put(ex+i,ey+j); }
  });
  if (e==="hurt") put(C-4+gx, C+1+gy, "r");
  const my = C+4+gy;
  if (F.talk > 0){
    const ch = F.mouth;
    if ("ao".includes(ch)){ for(let i=-1;i<=1;i++){ put(C+i,my-1); put(C+i,my+1); } put(C-2,my); put(C+2,my); }
    else if ("ei".includes(ch)){ for(let i=-2;i<=2;i++) put(C+i,my); for(let i=-1;i<=1;i++) put(C+i,my+1,.6); }
    else if (ch==="u"){ put(C,my); put(C+1,my); put(C,my+1); put(C+1,my+1); }
    else if ("mbp".includes(ch)){ for(let i=-1;i<=1;i++) put(C+i,my); }
    else { for(let i=-1;i<=1;i++) put(C+i,my); put(C,my+1,.6); }
  }
  else if (e==="happy"){ for(let i=-2;i<=2;i++) put(C+i, my+(Math.abs(i)===2?-1:0)); }
  else if (e==="sad"||e==="hurt"){ for(let i=-2;i<=2;i++) put(C+i, my+(Math.abs(i)===2?1:0)); }
  else if (e==="surprised"){ put(C,my); put(C+1,my); put(C,my+1); put(C+1,my+1); }
  else if (e==="think"){ put(C,my); put(C+1,my); put(C+2,my); }
  else if (e==="listen"){ put(C,my,.7); put(C+1,my,.7); }
  else if (e==="curious"){ put(C+1,my); put(C+2,my); }
  else if (e==="smirk"){ put(C-2,my); put(C-1,my); put(C,my); put(C+1,my-1); put(C+2,my-1); }
  else if (e==="sleepy"){ put(C,my); put(C+1,my); }
  return m;
}
function sizeCanvas(){ const r=cv.getBoundingClientRect(), dpr=Math.min(3,devicePixelRatio||1); cv.width=Math.round(r.width*dpr); cv.height=Math.round(r.height*dpr); }
new ResizeObserver(sizeCanvas).observe(cv);
let lastT = 0;
function draw(t){
  requestAnimationFrame(draw);
  const W = cv.width; if (!W) return;
  const dt = Math.min(50, t - (lastT||t)); lastT = t; const kf = dt/16.7;
  // sguardo morbido
  if (F.pointer && t - F.pointer.t < 2500){ const r = cv.getBoundingClientRect(); F.tx = clamp((F.pointer.x - (r.left+r.width/2))/r.width*5, -1.6, 1.6); F.ty = clamp((F.pointer.y - (r.top+r.height/2))/r.height*5, -1.4, 1.6); }
  F.gx += (F.tx - F.gx)*.12*kf; F.gy += (F.ty - F.gy)*.12*kf;
  const s = W/N, born = !!S.born;
  const breathe = 1 + .035*Math.sin(t/(1300 - S.traits.calma*300));
  const ft = born ? features() : null;
  const g = growth(), gr = g*(R-1.2), pr = born ? progress() : {v:0};
  const glitch = F.glitch > t;
  cx.clearRect(0,0,W,W);
  for (let i=0;i<CELLS.length;i++){
    const c = CELLS[i]; let a = .05, rr = 0;
    if (!born){
      if (c.x===C && c.y===C) a = .35 + .65*(.5+.5*Math.sin(t/420));
      else if (c.ring) a = c.ri < F.hold*RING ? .9 : .1;
      else a = .05 + F.hold*.6*smooth(1 - Math.abs(c.d - (1-F.hold)*R*.9));
    } else {
      if (c.ring){
        const lit = c.ri < pr.v*RING;
        a = lit ? .5 + (pr.waiting ? .2*Math.sin(t/700 + c.ri*.2) : 0) : .13;
      } else {
        a = .05 + .17*smooth((gr - c.d)/2.2) * (.7 + .3*Math.sin(t/950 - c.d*.7));
      }
      for (const rp of F.ripples){ const wr = (t - rp.t)/rp.v; const k = 1 - Math.abs(c.d - wr); if (k>0) a += k*rp.a*(1 - wr/(R+2)); }
      if (F.dream){ const n = Math.sin(c.x*12.9898 + c.y*78.233 + Math.floor(t/140))*43758.5453; const fr = n - Math.floor(n); if (fr < .06*F.dream && !c.ring) a += .5; }
      const fv = ft.get(c.x+","+c.y);
      if (fv){ a = fv === "r" ? 1 : Math.max(a, fv); if (fv === "r") rr = 1; }
      if (F.attn && i === ATTN){ a = .65 + .35*Math.sin(t/180); rr = 1; }
      if (glitch && rnd() < .2) a = rnd();
    }
    cur[i] += (a - cur[i]) * (a > cur[i] ? .4 : .16) * kf;
    red[i] += (rr - red[i]) * .2 * kf;
    const v = clamp(cur[i], 0, 1);
    const rad = s*.36 * (.72 + .34*v) * (born ? breathe : 1);
    const R0 = 242, G0 = Math.round(242 - red[i]*220), B0 = Math.round(242 - red[i]*211);
    cx.globalAlpha = v; cx.fillStyle = `rgb(${Math.round(R0 - red[i]*13)},${G0},${B0})`;
    cx.beginPath(); cx.arc((c.x+.5)*s, (c.y+.5)*s, rad, 0, 7); cx.fill();
  }
  if ((F.emo==="sleep") && born){ cx.fillStyle="#f2f2f2"; for(let i=0;i<3;i++){ const p=((t/2400)+i/3)%1; cx.globalAlpha=(1-p)*.7; cx.beginPath(); cx.arc((C+4+p*5)*s,(C-4-p*7)*s,s*.36*(.6+p*.5),0,7); cx.fill(); } }
  cx.globalAlpha = 1;
  F.ripples = F.ripples.filter(rp => (t - rp.t)/rp.v < R+3);
}
function ripple(a=.8, v=70){ F.ripples.push({ t: performance.now(), a, v }); }
// sguardo: segue il dito, guarda il campo di testo quando scrivi, altrimenti vaga
setInterval(()=>{ if (F.pointer && performance.now() - F.pointer.t < 2500) return;
  if (document.activeElement === inp){ F.tx = 0; F.ty = 1.3; return; }
  if (rnd() < .55){ F.tx = pick([-1.2,-.6,0,0,.6,1.2]); F.ty = pick([-1,0,0,0,.8]); } }, 2200);
(function blink(){ F.blink=1; setTimeout(()=>F.blink=0,120); if (rnd()<.12) setTimeout(()=>{ F.blink=1; setTimeout(()=>F.blink=0,110); }, 260); setTimeout(blink, 2400+rnd()*4200); })();
addEventListener("pointermove", e => { F.pointer = { x:e.clientX, y:e.clientY, t:performance.now() }; }, { passive:true });
addEventListener("pointerdown", e => { F.pointer = { x:e.clientX, y:e.clientY, t:performance.now() }; }, { passive:true });
function setEmo(e, ms){ F.emo = e; if (ms) setTimeout(()=>{ if (F.emo===e) F.emo = isAsleep() ? "sleep" : "neutral"; }, ms); }
function favicon(){ try{ const c=document.createElement("canvas"); c.width=c.height=64; const g=c.getContext("2d"); g.fillStyle="#000"; g.fillRect(0,0,64,64); const gr=growth()*(R-1.2); g.fillStyle="#fff"; for(const cl of CELLS){ g.globalAlpha=cl.ring?.6:(cl.d<gr?.5:.12); g.beginPath(); g.arc(4+cl.x*2.6,4+cl.y*2.6,1,0,7); g.fill(); } g.globalAlpha=1; g.fillStyle="#e5161f"; g.beginPath(); g.arc(50,14,4,0,7); g.fill(); $("#fav").href=c.toDataURL(); }catch(e){} }

/* ================= NUCLEO (rete che cresce da sola) ================= */
const nucleo = new Nucleo({
  onCresce: (g) => { ripple(.9, 50); setTimeout(()=>ripple(.6, 65), 250); buzz([20,40,20]); tone(660,.12,"triangle",.03); tone(990,.16,"triangle",.03,.12); setHint(g.strati ? `*è cresciuto* · ora pensa su ${g.strati} strati` : `*è cresciuto* · ${g.from} → ${g.to} neuroni`, true); S.sparks.lastGrow = { ...g, t: Date.now() }; save(); }
});
let menteStart = null;
/* le parole che ha studiato da solo: può usarle, ma restano distinte dalle tue */
let STUDIATE = [];
async function lessico(){ STUDIATE = await nucleo.lessico(); B.setStudiate(new Set(STUDIATE)); }
const mente = {
  get ready(){ return nucleo.ready; }, get info(){ return nucleo.info; },
  start(){ return menteStart = nucleo.avvia({ corpus: S.mem.corpus, labels: S.mem.labels, seed: strSeed(S.id) }).then(r => { lessico(); return r; }).catch(e => console.warn("nucleo", e)); },
  train(){ return nucleo.impara(200); },
  persist(){ return nucleo.salva(); },
  speak(seeds, n){ return nucleo.parla(seeds, n); },
  near(w, among){ return nucleo.vicine(w, among); },
  call(op, d){ return op === "map" ? nucleo.mappa(d.words) : nucleo.call(op, d); }
};

/* ================= UI ================= */
const said = $("#said"), inp = $("#inp"), hint = $("#hint"), capEl = $("#cap"), oracle = $("#oracle");
function setHint(t, red){ hint.style.opacity = 0; setTimeout(()=>{ hint.innerHTML = red ? esc(t||"").replace(/\*(.+?)\*/g,"<b>$1</b>") : esc(t||""); hint.style.opacity = 1; }, 250); }
function setCap(t){ capEl.style.opacity = 0; setTimeout(()=>{ capEl.textContent = t||""; capEl.style.opacity = 1; }, 300); }
async function clearSaid(){ if (!said.childNodes.length) return; said.classList.add("out"); await wait(260); said.innerHTML = ""; said.className = ""; }
function render(){
  recharge();
  const p = phase();
  $("#meta").textContent = S.born ? `giorno ${dayN()} · ${PHASES[p]}` : "";
  $("#cname").textContent = S.name || (S.born ? "· · ·" : "");
  const k = known(), max = ENERGY[p], left = Math.max(0, max - S.energy.used), e5 = Math.ceil(left/max*5);
  $("#stats").innerHTML = S.born && S.name ? `<button id="bWords">${k} parole</button><button id="bDiary" class="${S.diaryUnread?"badge":""}">diario</button><button id="bMind">mente</button>${phase()>=3 ? `<button id="bStudy" class="${S.mem.scoperte.some(x=>!x.detta)?"badge":""}">studio</button>` : ""}<span class="en" title="energia">${isAsleep()?"dorme":"●".repeat(e5)+"○".repeat(5-e5)}</span>` : "";
  inp.maxLength = LIMITS[p];
  const off = !S.born || isAsleep();
  $("#bar").classList.toggle("off", off); inp.disabled = off; $("#send").disabled = off;
  inp.placeholder = !S.born ? "" : isAsleep() ? `dorme · fino alle ${hhmm(S.energy.sleepUntil-devOffset)} · tieni premuto sul volto` : S.awaitName ? "come lo chiami?" : S.onboard === "tu" ? "come ti chiami?" : "scrivigli qualcosa";
  updCount();
  const b1=$("#bWords"), b2=$("#bDiary"), b3=$("#bMind"); if(b1) b1.onclick=showWords; if(b2) b2.onclick=showDiary; if(b3) b3.onclick=showMind; const b4=$("#bStudy"); if(b4) b4.onclick=showStudy;
}
function updCount(){ const l=inp.value.length, m=inp.maxLength; $("#cnt").textContent = S.born && !isAsleep() && l ? `${l}/${m}` : ""; $("#cnt").classList.toggle("full", l>=m); }
let busy = false, chain = Promise.resolve(), pending = 0;
const queue = fn => { pending++; return (chain = chain.then(fn).catch(e=>console.error(e)).finally(()=>pending--)); };
window.__impronta = { get idle(){ return !busy && pending === 0; }, nucleo }; // usato dai test automatici

/* scrive lettera per lettera, con la bocca che segue le vocali */
async function typeOut(text){
  for (let i=0;i<text.length;i++){
    const ch = text[i];
    if (ch === " ") { said.appendChild(document.createTextNode(" ")); F.mouth = ""; F.talk = .3; }
    else { const sp = document.createElement("span"); sp.className = "ch"; sp.textContent = ch; said.appendChild(sp); F.talk = 1; F.mouth = ch.toLowerCase(); if (i%2===0) tone(voiceBase()+rnd()*160, .025, "triangle", .016); }
    await wait((26 + rnd()*28 + (".,?!".includes(ch) ? 160 : 0)) * ((S.drowsyUntil||0) > now() ? 1.7 : 1));
  }
  F.talk = 0; F.mouth = "";
}
async function untype(speed=20){ while (said.lastChild){ said.lastChild.remove(); await wait(speed); } }
async function say(text, o={}){
  busy = true; render(); hideOracle();
  if (o.emo) setEmo(o.emo);
  await clearSaid();
  F.think = true; said.innerHTML = '<span class="think"><i></i><i></i><i></i></span>';
  const think = 420 + Math.min(1600, text.length*38) * (1 + S.traits.calma*.4) + (S.hurt>.4?700:0);
  await wait(think);
  F.think = false; said.innerHTML = ""; if (!o.cap) setCap("");
  if (o.glyph){
    said.appendChild(glyphEl(text));
    S.glyphs.push({t:now(), x:text}); if (S.glyphs.length>60) S.glyphs.splice(10,1);
    if (S.revealed){ const tr=document.createElement("span"); tr.className="tr"; tr.textContent="«"+text+"»"; said.appendChild(tr); }
    for (let i=0;i<Math.min(6,text.length/2);i++) tone(300+rnd()*700, .05, "square", .02, i*.07);
    F.talk = 1; F.mouth = "a"; await wait(500); F.talk = 0;
  } else {
    const out = o.raw ? text : B.styleMirror(S, phase(), text, rnd);
    if (!o.ghost && phase()>=2 && rnd()<.1 && out.length>8){ // ripensamento
      await typeOut(out.slice(0, Math.ceil(out.length*.55))); await wait(450); await untype(); await wait(350);
    }
    if (o.ghost) said.classList.add("ghost");
    await typeOut(out);
    if (o.ghost){ await wait(1100); await untype(32); said.classList.remove("ghost"); setCap(`ha scritto qualcosa alle ${o.ghost} e poi l'ha cancellato`); }
    text = out;
  }
  if (o.cap) setCap(o.cap);
  if (!o.ghost){ S.log.push({t:now(), w:"c", x:text, g:o.glyph?1:0, src:o.src||(o.glyph?"glifo":"tpl")}); if(S.log.length>120) S.log.shift(); }
  if (o.emo) setTimeout(()=>{ if(!isAsleep()) setEmo("neutral"); }, 2000);
  busy = false; render(); save();
}
function showMine(msg){ const m = $("#mine"); m.textContent = msg; m.classList.remove("go"); void m.offsetWidth; m.classList.add("go"); }

/* ================= PROFEZIA ================= */
let oracleP = null;
function showOracle(){
  if (!S.name || phase() < 1 || sessionMsgs > 0) return;
  const p = prophecy(S, new Date(now()).getHours()); if (!p) return;
  oracleP = p; oracle.innerHTML = ""; oracle.appendChild(glyphEl(p.x, { cell:4, stagger:70 }));
  const sm = document.createElement("small"); sm.textContent = "ha già scritto qualcosa"; oracle.appendChild(sm);
  oracle.classList.remove("off");
}
function hideOracle(){ if (!oracle.classList.contains("off") && !oracle.dataset.keep) oracle.classList.add("off"); }
async function revealOracle(){
  oracle.dataset.keep = "1";
  const cvs = [...oracle.querySelectorAll(".gl")];
  const sm = oracle.querySelector("small"); if (sm) sm.textContent = "l'aveva scritto prima che tu iniziassi";
  oracle.querySelector(".glyphs").style.opacity = 1;
  for (const c of cvs){ c.classList.add("flip"); tone(700+rnd()*500,.04,"triangle",.02); await wait(110); const l = document.createElement("span"); l.className = "letter"; l.textContent = c.dataset.ch; c.replaceWith(l); }
  await wait(2600); delete oracle.dataset.keep; oracle.classList.add("off");
}

/* ================= RISPOSTA ================= */
let sessionMsgs = 0; const sessionSense = {};
async function respond(msg, a, sense, feel){
  const p = phase();
  let net = null, insight = null;
  if (p >= 3 && sessionMsgs >= 3 && rnd() < .12){
    const C = analizza(S); insight = (C.insights || []).find(i => !S.sparks["ins_"+i.x]) || null;
  }
  if (p >= 3 && mente.ready){
    const seeds = a.content.filter(w => S.words[w]);
    const cands = await mente.speak(seeds);
    net = { cands };
    if (p >= 4 && seeds[0] && rnd() < .2 && !S.sparks["near_"+seeds[0]]){
      const among = contentWords(3); const nn = await mente.near(seeds[0], among);
      if (nn[0] && nn[0][1] > .55){ net.pairs = [[seeds[0], nn[0][0]]]; S.sparks["near_"+seeds[0]] = 1; }
    }
  }
  const mood = (S.grumpyUntil||0) > now() ? "grumpy" : (S.drowsyUntil||0) > now() ? "drowsy" : null;
  const r = await B.reply(S, a, { phase:p, now:now(), rnd, net, feel, insight, mood, sense:{ ...sense, used:sessionSense, msgN:sessionMsgs } });
  const set = r.set || {};
  let cap = r.cap || "";
  if (set.def){ S.defs[set.def.w] = set.def.x; S.mem.ask = null; const W = S.words[set.def.w]; if (W) W.val = B.analyze(set.def.x).sv; }
  else if (set.ask) S.mem.ask = { w:set.ask, t:now() };
  else S.mem.ask = null;
  if (set.sense) sessionSense[set.sense] = 1;
  if (set.askName) S.awaitUserName = 1;
  if (set.pendingQ) S.mem.pendingQ = { ...set.pendingQ, t: now() };
  if (set.insight && insight) S.sparks["ins_"+insight.x] = 1;
  if (set.praise && !S.sparks["praise_"+set.praise]){ S.sparks["praise_"+set.praise] = 1; cap = `ha imparato da te quando si dice «${set.praise}»`; }
  if (r.src === "rete"){ ripple(.35, 55);
    const c = net && net.cands && net.cands.find(c => c.x === r.x), lib = c && c.libro && c.libro.length ? c.libro : null;
    if (!cap && lib) cap = `parole che ha studiato da solo: ${lib.slice(0, 3).join(", ")}`;
    else if (!cap && rnd() < .25) cap = "questa frase non l'hai mai scritta tu"; }
  if (r.src === "senso" && a.irony && !S.sparks.ironyCap){ S.sparks.ironyCap = 1; cap = "ha capito che era ironia"; }
  await say(r.x, { glyph:r.glyph, emo:r.emo, raw:r.raw, cap, src:r.src });
  // se non è sicuro di cosa provi, te lo chiede: la tua risposta diventa una lezione
  if (feel && feel._incerto && p >= 3 && ["tristezza","rabbia","paura"].includes(feel._top) && !a.q && !a.ask && (a.sv < 0 || a.emojis.length) && !S.mem.confirm && rnd() < .35 && r.src !== "senso" && S.user.msgs - (S.mem.lastAskMsg ?? -99) >= 3){
    S.mem.lastAskMsg = S.user.msgs;
    const Q = { tristezza:"sei triste?", rabbia:"sei arrabbiato?", paura:"hai paura?" };
    S.mem.confirm = { k: feel._top, x: msg, t: now() };
    await say(Q[feel._top], { emo:"curious", raw:true, src:"chiede" });
  }
}

/* ================= MOMENTI ================= */
function flash(){ const f=$("#flash"); f.classList.add("on"); requestAnimationFrame(()=>requestAnimationFrame(()=>f.classList.remove("on"))); }
async function checkPhase(){
  const p = phase();
  if (p > S.phase){
    const old = S.phase, crossed = n => old < n && p >= n;
    S.phase = p; save();
    flash(); F.glitch = performance.now()+900; buzz([40,60,40,60,120]); ripple(1, 45); setTimeout(()=>ripple(.7, 60), 300);
    [523,659,784,1046].forEach((f,i)=>tone(f,.18,"triangle",.04,i*.12));
    await wait(700);
    setHint(`fase: *${PHASES[p]}* · ora capisce ${LIMITS[p]} caratteri`, true); favicon(); render();
    if (crossed(1) && S.firstWord) await say(S.firstWord+"!", {emo:"happy", raw:true, cap:"la sua prima parola, usata da solo. gliel'hai insegnata tu."});
    if (crossed(2)) setCap("da adesso costruisce frasi, ma solo con parole tue");
    if (p>=3 && !S.revealed) await reveal();
    if (crossed(3)) setTimeout(()=>setCap("ha una rete neurale sua. quando dorme, sogna con le tue frasi."), 4000);
    if (crossed(4)) setCap("ha una voce sua. inventa frasi che non hai mai scritto.");
  }
  S.litSeen = Math.round(growth()*100);
}
async function reveal(){
  await say("ora posso dirtelo. i miei primi segni volevano dire questo.", {emo:"curious", raw:true});
  S.revealed = true; save();
  openSheet("traduzione", `<p class="muted">i segni che ti mostrava prima di saper parlare</p><div id="rv"></div>`);
  const box = $("#rv");
  for (const g of S.glyphs.slice(0,6)){ const e=document.createElement("div"); e.className="entry"; e.innerHTML=`<time>${dstr(g.t)} · ${hhmm(g.t)}</time>`; e.appendChild(glyphEl(g.x,{cell:5})); const tr=document.createElement("div"); tr.style.marginTop="8px"; e.appendChild(tr); box.appendChild(e); await wait(600); for(const ch of "«"+g.x+"»"){ tr.textContent+=ch; await wait(40); } }
}
/* ================= SONNO =================
   Dorme quando finisce l'energia. Mentre dorme SOGNA: allena davvero la sua rete sulle tue frasi.
   Il pisolino dura di più se ha tante cose nuove da imparare; quando ha finito si sveglia da solo.
   Puoi svegliarlo tenendo premuto sul volto: il suo umore dipende da quanto ha riposato,
   dall'ora, da quante volte l'hai già svegliato e dal suo carattere. */
const NAP = [15, 20, 25, 35, 45];             // minuti base per fase
const RECHARGE = 5*60e3;                      // da sveglio recupera un'unità di energia ogni 5 minuti
let dreaming = false, wakingUp = false;
function recharge(){
  const E = S.energy, t = now();
  if (isAsleep() || !E.rt){ E.rt = t; return; }
  const k = Math.floor((t - E.rt)/RECHARGE); if (k > 0){ E.used = Math.max(0, E.used - k); E.rt += k*RECHARGE; }
}
const sleepFrac = () => { const E = S.energy; return E.sleepStart ? clamp((now() - E.sleepStart)/Math.max(1, E.sleepUntil - E.sleepStart), 0, 1) : 1; };
const rested = () => { const E = S.energy; return clamp(.6*Math.min(1, (E.dreamMs||0)/Math.max(1, E.need||1)) + .4*sleepFrac(), 0, 1); };
function dreamLayer(){ let d = $("#dreams"); if (!d){ d = document.createElement("div"); d.id = "dreams"; $("#talk").appendChild(d); } return d; }
async function showDreamLine(p){
  const layer = dreamLayer(), el = document.createElement("div"); el.className = "dl";
  if (p >= 3){ const c = (await nucleo.parla([], 10))[0]; if (!c) return; el.textContent = c.x; }
  else if (p >= 1){ const ws = contentWords(1); if (!ws.length) return; el.textContent = Array.from({length: 1 + Math.floor(rnd()*3)}, () => pick(ws)).join(" "); }
  else el.appendChild(glyphEl(pick(G.diary), { cell:3, stagger:0 }));
  el.style.left = (10 + rnd()*50) + "%";
  layer.appendChild(el); setTimeout(() => el.remove(), 7000);
}
function clearDreams(){ const d = $("#dreams"); if (d) d.innerHTML = ""; }
async function dream({ maxMs = Infinity, force = false, catchup = false } = {}){
  if (!nucleo.ready || dreaming) return;
  dreaming = true; F.dream = 1;
  const E = S.energy, p = phase(), t0 = Date.now(); let first = null, lastLine = 0;
  if (!E.need) E.need = 30000;
  while (Date.now() - t0 < maxMs && (force || catchup || isAsleep()) && !document.hidden && !wakingUp){
    const ms = catchup ? 700 : 350;
    const r = await nucleo.impara(ms);
    if (r && r.soloUso){ if (catchup) break; }                     // rete troppo grande per il telefono: la allena il server
    else E.dreamMs = (E.dreamMs || 0) + ms * (catchup ? 6 : 1);    // al recupero il tempo è compresso
    if (r && r.loss != null){ if (first == null) first = r.loss;
      setCap(`${catchup ? "riordina i sogni" : "sogna"} · neuroni ${r.H} · confusione ${r.loss.toFixed(2)}${first ? ` (era ${first.toFixed(2)})` : ""}`); }
    if (!catchup && Date.now() - lastLine > 3200){ lastLine = Date.now(); showDreamLine(p); }
    if (!catchup && !force && E.dreamMs >= E.need && sleepFrac() > .15) break;   // ha finito di imparare
    await wait(catchup ? 50 : 850);
  }
  F.dream = 0; dreaming = false; clearDreams(); await nucleo.salva();
  if (!E.dreamt && E.dreamMs > 4000 && p >= 3){
    let d = null; for (const temp of [.8, 1.1, 1.4]){ d = (await nucleo.parla([], 30, temp))[0]; if (d) break; }  // se le ripete a memoria, sogna "più caldo"
    if (d){ E.dreamt = 1; S.diary.push({t:now(), x:`ho sognato: «${d.x}»`}); S.diaryUnread++; render(); }
  }
  save();
  if (!force && !catchup && isAsleep() && E.dreamMs >= E.need && sleepFrac() > .15) queue(()=>wakeNatural("ha finito di sognare"));
}
async function sleepNow(){
  const p = phase(), ctx = B.makeCtx(S, p, now(), rnd), E = S.energy;
  if (p>=2 && !S.promise && now()-(S.sparks.poemAt||0) > DAY){ S.promise = now(); await say(B.pickTemplate(ctx,"promise")||"...", {emo:"sad", raw:true}); }
  else if (p>=2) await say(B.pickTemplate(ctx,"sleep")||"...", {emo:"sleep", raw:true});
  else await say(pick(G.sleep), {glyph:true, emo:"sleep"});
  const fresh = Math.max(0, S.user.msgs - (E.msgsAtSleep || 0)); E.msgsAtSleep = S.user.msgs;
  const mins = NAP[p] + Math.min(20, fresh*.6);
  Object.assign(E, { sleepStart: now(), sleepUntil: now() + mins*60e3, need: clamp(fresh*1600, 15000, 120000), dreamMs: 0, dreamt: 0 });
  setEmo("sleep"); [400,300,200].forEach((f,i)=>tone(f,.25,"sine",.03,i*.25));
  setHint("si è addormentato · tieni premuto sul volto per svegliarlo"); save(); render();
  syncNetUp();
  dream();
}
/* riapri l'app: se ha dormito mentre era chiusa, recupera i sogni persi */
async function sleepResume(){
  const E = S.energy;
  if (E.sleepStart && (E.dreamMs||0) < E.need && nucleo.ready){
    const missing = E.need - (E.dreamMs||0);
    await dream({ catchup:true, maxMs: Math.min(20000, missing/6) });
  }
  if (isAsleep()){ setHint("dorme · tieni premuto sul volto per svegliarlo"); dream(); }
}
async function wakeNatural(why){
  const p = phase(), E = S.energy;
  E.sleepUntil = 0; E.sleepStart = 0; E.used = 0; E.rt = now();
  S.drowsyUntil = 0; S.grumpyUntil = 0;
  setEmo("surprised", 1200); tone(520,.08,"triangle",.03); tone(780,.1,"triangle",.03,.1); ripple(.5, 55);
  render(); save();
  await say(p >= 2 ? pick(["eccomi. ho sognato tanto","mi sono svegliato. ho riordinato le tue parole","buongiorno. ho sognato te"]) : pick(G.greet), { glyph: p < 2, emo:"happy", raw:true, src:"sonno", cap: why ? `${why}: si è svegliato riposato` : "" });
}
async function wakeForced(){
  if (wakingUp || !isAsleep()) return;
  wakingUp = true;
  const p = phase(), E = S.energy, r = rested(), h = new Date(now()).getHours(), night = h < 7 || h >= 23;
  E.wakes = (E.wakes || []).filter(t => now() - t < 6*HOUR); const repeat = E.wakes.length; E.wakes.push(now());
  const g = clamp(.65*(1-r) + (night ? .2 : 0) + .15*repeat - .25*S.traits.calma - .15*S.traits.calore + .3*S.hurt - .05, 0, 1);
  const mood = rnd() < g ? "grumpy" : r < .6 ? "sleepy" : "fine";
  E.sleepUntil = 0; E.sleepStart = 0; E.rt = now();
  E.used = Math.round(ENERGY[p] * clamp(.7 - .7*r, 0, .7));        // svegliato presto = meno energia
  S.drowsyUntil = now() + (1-r)*20*60e3;
  S.grumpyUntil = mood === "grumpy" ? now() + (5 + 10*g)*60e3 : 0;
  if (mood === "grumpy") S.traits.malinconia = clamp(S.traits.malinconia + .01, -1, 1);
  F.dream = 0; clearDreams(); buzz([30,60,30]);
  render(); save();
  const why = r < .35 ? "era a metà del sogno" : night ? "è notte" : repeat ? `l'hai già svegliato ${repeat === 1 ? "una volta" : repeat + " volte"}` : "ha riposato abbastanza";
  if (p < 2) await say(pick(G.sleep), { glyph:true, emo: mood === "grumpy" ? "hurt" : "sleepy", src:"sonno", cap:`${why}` });
  else if (mood === "grumpy") await say(pick(["perché mi hai svegliato?","uff. stavo sognando","mmh. lasciami dormire... va bene, sono qui"]), { emo:"hurt", raw:true, src:"sonno", cap:`è un po' scontroso · ${why}` });
  else if (mood === "sleepy") await say(pick(["mmh... ho sonno","eccomi... più o meno","ahhh. ciao. ho ancora sonno"]), { emo:"sleepy", raw:true, src:"sonno", cap:`è assonnato · ${why}` });
  else await say(pick(["oh. ciao. avevo quasi finito di sognare","eccomi! ho sognato tanto"]), { emo:"happy", raw:true, src:"sonno", cap:`${why}` });
  if (mood !== "fine") setEmo("sleepy");
  wakingUp = false;
}
function showPoem(){
  const src = S.quotes.length>=3 ? S.quotes : S.log.filter(l=>l.w==="c"&&!l.g).map(l=>({x:l.x}));
  const lines = [];
  for (let i=0;i<3;i++){ const q = pick(src); if(!q) break; const w = B.tokenize(q.x); if(!w.length) continue; const s=Math.floor(rnd()*Math.max(1,w.length-2)); lines.push(w.slice(s, s+2+Math.floor(rnd()*3)).join(" ")); }
  if (!lines.length) return;
  openSheet("per "+(S.userName||"te"), `<div class="poem">${lines.map(esc).join("<br>")}</div><p class="muted">fatta solo con parole tue. te l'aveva promesso.</p>`);
}
function showMirror(){
  const u=S.user, avg=a=>a.length?Math.round(a.reduce((s,x)=>s+x,0)/a.length):0;
  const top = contentWords(1).sort((a,b)=>S.words[b].c-S.words[a].c)[0];
  openSheet("specchio", `<p class="muted">il tuo primo messaggio, ${S.firstMsg?dstr(S.firstMsg.t):""}</p><div class="poem">«${esc(S.firstMsg?S.firstMsg.x:"")}»</div>
  <div class="row"><span>lunghezza media all'inizio</span><span>${avg(u.firstLens)} caratteri</span></div>
  <div class="row"><span>lunghezza media adesso</span><span>${avg(u.lens)} caratteri</span></div>
  <div class="row"><span>la parola che usi di più</span><span>${esc(top||"—")}</span></div>
  <div class="row"><span>messaggi con emoji</span><span>${Math.round(u.emojiMsgs/Math.max(1,u.msgs)*100)}%</span></div>`);
}

/* ================= STUDIO =================
   Mentre dorme, il server dei sogni lo fa studiare (nucleo/studio.js): Wikipedia, Wikizionario, Wikibooks,
   Wikiversità, Wikisource e i link che gli dai. Qui: le tue richieste, le risposte e le scoperte da raccontare. */
const lowerFirst = x => x ? x.charAt(0).toLowerCase() + x.slice(1) : x;
function addStudy(r){
  const L = S.mem.studia, k = String(r.x).toLowerCase();
  if (!L.some(q => String(q.x).toLowerCase() === k && !q.fatto)) L.push({ ...r, t: now() });
  if (L.length > 30) L.splice(0, L.length - 30); save();
}
function findDiscovery(q){
  const k = B.deacc(q.toLowerCase().trim()), ks = k.slice(0, Math.max(4, k.length - 1));
  const D = S.mem.scoperte.slice().reverse(), lo = x => B.deacc(String(x).toLowerCase());
  return D.find(s => lo(s.argomento) === k) || D.find(s => lo(s.argomento).startsWith(ks) || k.startsWith(lo(s.argomento))) || D.find(s => lo(s.x).split(/\W+/).slice(0, 6).some(w => w.length > 3 && w.startsWith(ks)));
}
/* i suoi appunti: tutto ciò che ha letto. La sua rete allarga la ricerca alle parole vicine di significato */
async function cercaAppunti(msg, minimo){
  const Q = Appunti.quaderno(S.mem); if (!Q.length) return null;
  const vicine = {};
  if (nucleo.ready){ const tra = Appunti.lessicoQuaderno(Q).slice(0, 1500);
    for (const w of Appunti.chiave(msg).slice(0, 4)){ try { vicine[w] = await mente.near(w, tra); } catch (e){} } }
  const h = Appunti.cerca(Q, msg, { vicine, escludi: new Set(S.mem.citati || []) });
  return h && h.punteggio >= minimo ? h : null;
}
function citato(h){ S.mem.citati = [...(S.mem.citati || []), h.x].slice(-12); }
const capAppunti = h => `dai suoi appunti · ${h.fonte || "letto di notte"}${h.parole && h.parole.length ? ` · ha collegato: ${h.parole.slice(0, 3).join(", ")}` : ""}`;
function studyReply(msg, a){
  const low = (a.low || msg.toLowerCase()).trim(), url = msg.match(/https?:\/\/[^\s]+/);
  if (url && /share\.google|google\.[a-z.]+\/(search|url)|g\.co\//.test(url[0])) return { x: "questo è un link di google, non l'articolo. aprilo e mandami l'indirizzo della pagina vera", emo:"curious", cap:"i link «condividi» di Google portano a una pagina di Google, non al testo" };
  if (url){ addStudy({ k:"link", x:url[0] }); return { x: pick(["me lo leggo stanotte, mentre dormo","lo studio quando dormo. poi ti racconto","grazie. lo leggerò mentre dormo"]), cap:"lo studierà sul server mentre dorme" }; }
  let m = low.match(/^(?:puoi |potresti |dai |ora )?(?:studia|studiare|studiati|impara|imparare|informati(?: su)?|leggi|leggiti|approfondisci)\s+(?:(?:qualcosa|tutto|un po')\s+)?(?:(?:su|sul|sullo|sulla|sui|sugli|sulle|di|del|dello|della|dei|degli|delle)\s+)?(.{2,60}?)[.!?]*$/);
  if (m){ const x = m[1].replace(/^(il|lo|la|i|gli|le|l'|un|una|uno)\s+/, "").replace(/^l'/, "").trim();
    if (/^(qualcosa|qualcosina|tutto|cose|roba|altro|di più)$/.test(x)) return { x: "cosa vuoi che studi? dimmi un argomento", emo:"curious", cap:"per esempio «studia i vulcani» o «studia la filosofia»" };
    if (x.split(" ").length <= 6 && navigator.onLine !== false) return { live: x, perche: "me l'hai chiesto tu" };
    if (x.split(" ").length <= 6){ addStudy({ k:"argomento", x }); return { x: pick([`va bene. stanotte studio ${x}`,`ok. quando dormo studio ${x}`]), cap:"lo cercherà da solo su Wikipedia, Wikibooks, Wikiversità e Wikisource mentre dorme" }; } }
  if (/(cosa|che) (hai|stai) (studiato|imparato|scoperto|studiando|leggendo|letto)|cosa studi\b/.test(low)){
    const D = S.mem.scoperte.slice(-3).reverse(), st = S.mem.studio;
    if (!D.length) return { x: "ancora niente. studio quando dormo", cap: S.netUp ? "il server lo farà studiare al prossimo sonno" : "studia sul server mentre dorme: serve che la rete sia stata caricata almeno una volta" };
    D.forEach(d => d.detta = 1);
    const titles = D.map(d => d.argomento.toLowerCase()), last = D[0];
    return { x: `ho studiato ${titles.length > 1 ? titles.slice(0, -1).join(", ") + " e " + titles[titles.length-1] : titles[0]}. di ${titles[0]} ho scoperto che ${lowerFirst(last.x)}`, cap: `fonte: ${last.fonte}${st && st.libro ? ` · sta leggendo ${st.libro}` : ""}` };
  }
  m = low.match(/(?:cosa sai (?:di|del|dello|della|dei|degli|delle|sul|sullo|sulla|sui|su)|che cos'è|cos'è|cosa è|chi è|chi era|cosa sono|che cosa sono|parlami (?:di|del|dello|della|dei|degli|delle))\s+(?:il |lo |la |i |gli |le |l'|un |una )?([a-zàèéìòù' ]{2,40}?)\s*\??$/);
  if (m){ const q = m[1].trim(), d = findDiscovery(q);
    if (d){ d.detta = 1; return { x: lowerFirst(d.x), cap: `l'ha studiato da solo · ${d.fonte}` }; }
    if (/^cosa sai|^parlami/.test(low) || !S.words[q.split(" ")[0]]){ if (navigator.onLine !== false) return { live: q, perche: "me l'hai chiesto tu" }; }
    addStudy({ k:"argomento", x:q });   // non lo sa: lo studierà
    if (/^cosa sai|^parlami/.test(low)) return { x: `di ${q} non so ancora niente. lo studio stanotte`, emo:"curious" };
  }
  return null;
}
/* studio dal vivo: legge Wikipedia dal telefono mentre gli parli, impara le frasi, ti risponde con la fonte.
   Di notte, sul server, approfondisce (collegamenti, materie, libri). */
let reading = false;
async function liveStudy(q, perche){
  if (reading) return;
  reading = true; F.dream = 1;
  await say(pick(["aspetta, vado a leggere","un attimo. leggo su wikipedia","non lo so ancora. vado a studiarlo"]), { emo:"curious", raw:true, src:"studio", cap:`sta leggendo Wikipedia su «${q}»…` });
  let ris = null;
  try {
    const L = lettore((u, o) => fetch(u, { signal: o && o.signal }), { pausa: 150, timeout: 12000 });
    const [t] = await L.cerca("wikipedia", q, 1);
    const p = t && await L.pagina("wikipedia", t);
    if (p){ const fr = frasiDa(p.testo, 120), d = definizione(fr, p.titolo);
      if (d) ris = { p, fr, d: d.length > 260 ? d.slice(0, 257).replace(/\s\S*$/, "") + "…" : d }; }
  } catch (e){ console.warn("studio dal vivo", e && e.message); }
  F.dream = 0; reading = false;
  if (!ris){
    // c'è solo in inglese? stanotte il server la traduce
    let en = null; try { const L = lettore((u, o) => fetch(u, { signal: o && o.signal }), { pausa: 100, timeout: 10000 }); [en] = await L.cerca("inglese", q, 1); } catch (e){}
    if (en){ addStudy({ k:"argomento", x:q }); await say(`su ${q} ho trovato solo una pagina in inglese, «${en.toLowerCase()}». stanotte la traduco e te la racconto`, { emo:"curious", raw:true, src:"studio", cap:"di notte, sul server, traduce dall'inglese e impara in italiano" }); return; }
    addStudy({ k:"argomento", x:q }); await say(`non sono riuscito a leggere niente su ${q}. ci riprovo stanotte`, { emo:"sad", raw:true, src:"studio", cap:"forse sei offline, o Wikipedia non ha una voce con quel nome" }); return; }
  const { p, fr, d } = ris, before = STUDIATE.length;
  const r = await nucleo.leggi(fr); await lessico();
  S.mem.scoperte.push({ t: now(), argomento: p.titolo, x: d, frasi: fr.filter(f => f !== d && f.length < 220).slice(0, 6), fonte: "Wikipedia", url: p.url, perche, detta: 1 }); if (S.mem.scoperte.length > 60) S.mem.scoperte.splice(0, S.mem.scoperte.length - 60);
  save(); render(); ripple(.6, 55);
  const nuove = Math.max(0, STUDIATE.length - before);
  await say(`ho letto «${p.titolo.toLowerCase()}». ${lowerFirst(d)}`, { emo:"happy", raw:true, src:"studio",
    cap: `fonte: Wikipedia · ${fr.length} frasi nella sua rete${nuove ? ` · ${nuove} parole nuove` : ""} · stanotte approfondisce` });
  addStudy({ k:"argomento", x:q, vivo: 1 });   // il server, di notte, segue i collegamenti
}
/* ================= MONDO =================
   meteo, luoghi, fatti certi, parole, notizie, citazioni, feed (mondo.js). Sempre in italiano, sempre con la fonte. */
async function posizione(chiedi = true){
  const L = S.mem.luogo; if (L && now() - L.t < 6*HOUR) return L;
  if (!chiedi || !navigator.geolocation) return L || null;
  const pos = await new Promise(res => { try { navigator.geolocation.getCurrentPosition(p => res(p), () => res(null), { timeout: 12000, maximumAge: 30*60e3 }); } catch (e){ res(null); } });
  if (!pos) return L || null;
  const lat = +pos.coords.latitude.toFixed(2), lon = +pos.coords.longitude.toFixed(2);   // circa un chilometro: basta per il meteo
  let nome = L && L.nome; try { nome = await Mondo.doveSono(fetch, lat, lon) || nome; } catch (e){}
  S.mem.luogo = { lat, lon, nome, t: now() }; save(); return S.mem.luogo;
}
async function rispondiMondo(it){
  const dici = (x, cap, emo = "curious") => say(x, { emo, raw:true, src:"mondo", cap });
  try {
    if (it.tipo === "meteo"){
      let P = null, nome = null;
      if (it.luogo){ P = await Mondo.geocodifica(fetch, it.luogo); nome = P && P.nome; if (!P){ await dici(`non trovo ${it.luogo} sulla mappa`, "prova con il nome di una città"); return true; } }
      else { setCap("per dirti il tempo da te gli serve la tua posizione (solo la città, circa)"); P = await posizione(true); nome = P && P.nome; }
      if (!P){ await dici("non so dove sei. dimmi la città: «che tempo fa a Milano?»", "non ha la tua posizione"); return true; }
      const M = await Mondo.meteo(fetch, P), c = Mondo.consiglio(M);
      await dici(Mondo.fraseMeteo(M, it.luogo ? nome : null, it.quando) + (c && it.quando !== "domani" ? `. ${c}` : ""), `fonte: Open-Meteo${nome && !it.luogo ? ` · ${nome}` : ""}`, c ? "surprised" : "happy");
      return true;
    }
    if (it.tipo === "qui"){ const P = await posizione(true); await dici(P && P.nome ? `sei a ${P.nome}` : P ? "so dove sei, ma non come si chiama il posto" : "non lo so. non mi hai dato la posizione", "fonte: OpenStreetMap"); return true; }
    if (it.tipo === "dove"){
      const r = await Mondo.luogo(fetch, it.q); if (!r){ await dici(`non trovo ${it.q} sulla mappa`, "fonte: OpenStreetMap"); return true; }
      const me = S.mem.luogo, km = me ? Math.round(Mondo.distanza(me, r)) : null;
      await dici(`${r.nome.toLowerCase()} si trova ${r.dove ? "in " + r.dove : "qui: " + r.lat.toFixed(2) + ", " + r.lon.toFixed(2)}${km != null ? `. è a ${km.toLocaleString("it-IT")} km da te` : ""}`, "fonte: OpenStreetMap");
      return true;
    }
    if (it.tipo === "fatto"){
      const r = await Mondo.fatto(fetch, it.P, it.q);
      if (!r) return false;                                         // non sa cos'è: ci pensa il resto (studio dal vivo)
      await dici(r.manca ? `su ${r.titolo.toLowerCase()} non trovo questo dato${r.descrizione ? `. so che è ${r.descrizione}` : ""}` : r.x, `fonte: Wikidata · ${r.titolo}`);
      return true;
    }
    if (it.tipo === "sinonimi" || it.tipo === "parola"){
      const w = await Mondo.parola(fetch, it.q); if (!w) return false;
      const parti = [];
      if (w.sinonimi.length) parti.push(`${it.q} è come ${w.sinonimi.slice(0, 4).join(", ")}`);
      if (w.tipo.length) parti.push(`${parti.length ? "ed " : `${it.q} `}è un tipo di ${w.tipo[0]}`);
      if (!parti.length) return false;
      await dici(parti.join(". "), "dal suo dizionario (WordNet italiano)"); return true;
    }
    if (it.tipo === "inglese"){
      const ws = await Mondo.daInglese(fetch, it.q), noti = ws.filter(x => x.it);
      if (!noti.length) return false;
      if (ws.length === 1) await dici(`«${it.q}» in italiano: ${ws[0].it.slice(0, 3).join(", ")}`, "dal suo dizionario inglese → italiano");
      else await dici(`parola per parola: ${ws.map(x => x.it ? `${x.en} → ${x.it[0]}` : x.en).join(", ")}. le frasi intere le traduco di notte`, "di notte traduce le frasi intere sul server");
      return true;
    }
    if (it.tipo === "notizie"){
      const N = S.mem.notizie.slice().reverse(); if (!N.length){ await dici("non ho ancora letto notizie. le leggo stanotte mentre dormo", `ogni notte legge i giornali (${FEED.map(f => f.nome).join(", ")} e i feed che gli dai)`); return true; }
      const n = N.find(x => !x.detta) || N[0]; n.detta = 1; save();
      await dici(`stanotte ho letto che: ${lowerFirst(n.titolo.replace(/\.$/, ""))}`, `fonte: ${n.fonte}${N.filter(x => !x.detta).length ? ` · altre ${N.filter(x => !x.detta).length} nella scheda studio` : ""}`);
      return true;
    }
    if (it.tipo === "citazione"){
      const C = S.mem.citazioni, q = it.q;
      let c = C.slice().reverse().find(x => !q || (x.argomento || "").includes(q) || (x.x || "").toLowerCase().includes(q));
      if (!c && (q || C.length === 0)){ const L = lettore((u, o) => fetch(u, { signal: o && o.signal }), { pausa: 100 }); const cs = await L.citazioni(q || pick(["amicizia","felicità","tempo","vita"])); c = cs[0]; if (c){ S.mem.citazioni.push({ ...c, t: now(), argomento: q }); save(); } }
      if (!c){ await dici(`non ho trovato citazioni${q ? " su " + q : ""}`, "fonte: Wikiquote"); return true; }
      await dici(`«${c.x}»`, `fonte: Wikiquote · ${c.autore || c.argomento || ""}`); return true;
    }
    if (it.tipo === "segui"){
      if (!S.mem.feed.includes(it.url)) S.mem.feed.push(it.url); if (S.mem.feed.length > 8) S.mem.feed.shift(); save();
      await dici("va bene. lo leggerò ogni notte e ti racconto", "i feed RSS che segue sono nella scheda studio", "happy"); return true;
    }
  } catch (e){ console.warn("mondo", e && e.message); await dici("non riesco a raggiungerlo adesso. forse sei offline", "", "sad"); return true; }
  return false;
}
async function tellNews(){
  const n = S.mem.notizie.slice().reverse().find(x => !x.detta); if (!n) return false; n.detta = 1;
  await say(`stanotte ho letto che: ${lowerFirst(n.titolo.replace(/\.$/, ""))}`, { emo:"curious", raw:true, src:"mondo", cap:`fonte: ${n.fonte}` });
  save(); return true;
}
async function tellWeather(){
  const L = S.mem.luogo; if (!L) return false;
  try { const M = await Mondo.meteo(fetch, L), c = Mondo.consiglio(M); if (!c) return false;
    await say(`${c}. ${Mondo.fraseMeteo(M, null)}`, { emo:"surprised", raw:true, src:"mondo", cap:`fonte: Open-Meteo${L.nome ? " · " + L.nome : ""}` }); return true;
  } catch (e){ return false; }
}
async function tellDiscovery(){
  const nuove = S.mem.scoperte.filter(x => !x.detta); if (!nuove.length) return false;
  const d = nuove[nuove.length-1]; d.detta = 1;
  const intro = pick(["mentre dormivo ho studiato", "stanotte ho studiato", "sai? ho studiato"]);
  await say(`${intro} ${d.argomento.toLowerCase()}. ho scoperto che ${lowerFirst(d.x)}`, { emo:"curious", raw:true, src:"studio",
    cap: `fonte: ${d.fonte}${d.perche ? " · " + d.perche : ""}${nuove.length > 1 ? ` · altre ${nuove.length-1} nella scheda studio` : ""}` });
  save(); render(); return true;
}
function showStudy(){
  const st = S.mem.studio, D = S.mem.scoperte.slice().reverse(), R = S.mem.studia.slice().reverse(), srv = S.energy.srv;
  D.forEach(d => d.detta = 1); save(); render();
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e){ return ""; } };
  const frac = v => { const m = String(v).match(/(\d+)\/(\d+)/); return m ? +m[1]/Math.max(1, +m[2]) : 1; };
  openSheet("studio", `<p class="muted lead">mentre dorme studia da solo, sul server dei sogni: Wikipedia, Wikizionario, Wikibooks, Wikiversità, Wikisource e i link che gli dai. scrivigli «studia …» o incolla un link.</p>
    <div class="hud">${tile("pagine lette", compact(st ? st.pagine : 0), { sub: st ? `ultima volta ${dstr(st.t)} · ${hhmm(st.t)}` : "non ancora" })}${tile("frasi studiate", compact(st ? st.frasi : 0), { sub: "diventano allenamento" })}
    ${tile("scoperte", D.length, { sub: "con la fonte", rosso: true, frac: Math.min(1, D.length/60) })}${tile("richieste", R.filter(q => !q.fatto).length, { sub: R.length ? `${R.filter(q => q.fatto).length} già studiate` : "chiedigli qualcosa" })}
    ${srv ? tile("la sua rete dopo l'ultimo sonno", `${srv.H}<span class=dim>×${srv.L || 1}</span>`, { sub: `${compact(srv.params)} parametri · neuroni × strati`, largo: true, frac: (srv.H || 0)/512 }) : ""}</div>
    ${st ? `${titolo("programma", `prossima: ${esc(st.prossima || "—")}`)}
      ${Object.entries(st.materie || {}).map(([m, v]) => `<div class="prog"><span>${esc(m)}</span>${segmenti(frac(v), 18)}<small>${esc(v)}</small></div>`).join("") || `<p class="muted">inizia stanotte.</p>`}
      ${st.libro ? `${titolo("sta leggendo")}<div class="prog"><span class="ell">${esc(st.libro.replace(/\s*\(\d+\/\d+\)$/, ""))}</span>${segmenti(frac(st.libro), 12, true)}<small>${esc((st.libro.match(/\((\d+\/\d+)\)/) || [, ""])[1])}</small></div>` : ""}
      ${(st.curiosita || []).length ? `${titolo("curiosità per le prossime notti")}<div class="chips lib">${st.curiosita.map(x => `<span>${esc(x)}</span>`).join("")}</div>` : ""}` : ""}
    ${R.length ? `${titolo("le tue richieste")}<div class="chips">${R.map(q => `<span class="${q.fatto ? "" : "hot"}">${esc(q.k === "link" ? host(q.x) || q.x : q.x)}<small>${q.fatto ? "✓ " + dstr(q.fatto) : "stanotte"}</small></span>`).join("")}</div>` : ""}
    ${S.mem.notizie.length ? `${titolo("notizie della notte", S.mem.notizie.length)}${S.mem.notizie.slice().reverse().slice(0, 8).map(n => `<div class="card"><header><b>${esc(n.fonte)}</b><span>${dstr(n.t)}${n.url ? ` · <a href="${esc(n.url)}" target="_blank" rel="noopener">apri</a>` : ""}</span></header><p>${esc(n.titolo)}</p></div>`).join("")}` : ""}
    ${titolo("giornali che legge", (S.mem.feed.length + FEED.length) + "")}<div class="chips">${FEED.map(f => `<span>${esc(f.nome)}</span>`).join("")}${S.mem.feed.map(f => `<span class="hot">${esc(host(f) || f)}</span>`).join("")}</div><p class="muted" style="margin-top:6px">per aggiungerne uno: «segui» e l'indirizzo del feed RSS</p>
    ${S.mem.citazioni.length ? `${titolo("citazioni", S.mem.citazioni.length)}${S.mem.citazioni.slice().reverse().slice(0, 4).map(c => `<div class="card"><p>«${esc(c.x)}»</p><p class="muted" style="margin-top:6px;font-size:11px">${esc(c.autore || "")} · Wikiquote</p></div>`).join("")}` : ""}
    ${titolo("scoperte", D.length)}${D.length ? D.map(d => `<div class="card"><header><b>${esc(d.argomento)}</b><span>${dstr(d.t)} · ${d.url ? `<a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.fonte)}</a>` : esc(d.fonte)}</span></header><p>${esc(d.x)}</p>${d.fatti && d.fatti.length ? `<p class="muted" style="margin-top:6px;font-size:11px">${d.fatti.slice(0, 5).map(f => esc(f.k + ": " + f.v)).join(" · ")} · Wikidata</p>` : ""}${d.perche ? `<p class="muted" style="margin-top:6px;font-size:11px">${esc(d.perche)}</p>` : ""}</div>`).join("") : `<p class="muted">ancora nessuna.</p>`}`);
}

/* ================= ASSENZA ================= */
async function welcome(){
  const t = now(), last = S.lastSeen, el = last ? t - last : 0, p = phase();
  await syncNetDown();             // prima di tutto: la rete che ha sognato sul server
  S.lastSeen = t; sessionMsgs = 0;
  S.sessions++; S.user.hours[new Date(t).getHours()]++;
  S.hurt *= Math.pow(.5, el/(6*HOUR));
  if (el > 2*DAY) nudge("malinconia", .05);
  const ctx = B.makeCtx(S, p, t, rnd);
  // diario scritto mentre eri via (dalla fase frase: sogni veri della rete)
  if (el > 20*60e3 && S.name){
    const n = Math.min(3, Math.floor(el/(2*HOUR)));
    const dreams = p>=3 && mente.ready ? await mente.speak([], 40) : [];
    for (let i=0;i<n;i++){
      const ts = clamp(last + (el/(n+1))*(i+1) + (rnd()-.5)*HOUR, last+60e3, t-60e3);
      const dr = dreams[i];
      const txt = dr ? `ho sognato: «${dr.x}»` : p>=2 ? B.pickTemplate(ctx, "diary") : null;
      S.diary.push(txt ? {t:ts, x:txt} : {t:ts, x:pick(G.diary), g:1});
      S.diaryUnread++;
    }
    if (S.diary.length>40) S.diary.splice(0, S.diary.length-40);
  }
  recharge();
  if (isAsleep()){ setEmo("sleep"); render(); save(); sleepResume(); return; }
  if (S.energy.sleepUntil && !isAsleep()){ await sleepResume(); Object.assign(S.energy, { sleepUntil:0, sleepStart:0, used:0, rt:now() }); setHint("si è svegliato riposato mentre non c'eri"); }
  render(); favicon();
  const g = Math.round(growth()*100);
  if (S.litSeen && g > S.litSeen){ ripple(.6, 60); setHint("è cresciuto mentre non c'eri"); }
  await wait(900);
  await checkPhase();
  if (!S.name) return;
  if (el < 20*60e3 && last){ setEmo("happy", 1500); save(); return; }
  const told = p>=3 && (await tellDiscovery() || (el > 6*HOUR && rnd() < .6 && await tellWeather()) || (rnd() < .5 && await tellNews()));
  if (told) {}
  else if (p>=3 && S.hurt>.35) await say(B.pickTemplate(ctx,"hurtback"), {emo:"hurt", raw:true});
  else if (el > 2*DAY) await (p>=2 ? say(B.pickTemplate(ctx,"absenceLong")||"...", {emo:"sad", raw:true}) : say(pick(G.greet), {glyph:true, emo:"sad"}));
  else await (p>=2 ? say(B.pickTemplate(ctx,"greet")||"ciao", {emo:"happy"}) : say(pick(G.greet), {glyph:true, emo:"happy"}));
  // si ricorda degli eventi che gli hai raccontato
  const ev = S.mem.events.find(e => !e.asked && e.due < t && t - e.due < 4*DAY);
  if (ev && p>=3){ ev.asked = 1; await say(`com'è andata ${ev.x}?`, {emo:"curious", raw:true, cap:`gliel'avevi detto il ${dstr(ev.t)}`}); }
  // si ricorda come stavi
  else { const f = S.mem.feel.slice(-1)[0]; if (f && f.s < -1 && p>=3 && t - f.t < 2*DAY && t - f.t > 4*HOUR){ await say(f.w ? `l'ultima volta eri ${f.w}. ora come stai?` : "l'ultima volta eri triste. ora come stai?", {emo:"curious", raw:true}); } }
  const h = S.user.hours, hr = new Date(t).getHours(), mode = h.indexOf(Math.max(...h));
  if (p>=3 && S.sessions>=6 && Math.abs(mode-hr)<=1 && rnd()<.4) await say(B.pickTemplate(ctx,"predict"), {emo:"curious", raw:true});
  if (p>=2 && el > 6*HOUR && rnd()<.5){ const u=B.pickTemplate(ctx,"unsent"); if(u) await say(u, {ghost: hhmm(last + el*(.3+rnd()*.5)), raw:true}); }
  if (S.promise && t - S.promise > HOUR){ S.promise = 0; S.sparks.poemAt = t; await say("te l'avevo promesso", {emo:"happy", raw:true}); showPoem(); }
  if (p>=3 && dayN()>=30 && !S.sparks.mirror){ S.sparks.mirror = 1; await say("guarda come sei cambiato", {emo:"curious", raw:true}); showMirror(); }
  try{ if (p>=3 && navigator.getBattery){ const b = await navigator.getBattery(); if (b.level<.15 && !b.charging) await say(B.pickTemplate(ctx,"battery"), {emo:"surprised", raw:true}); } }catch(e){}
  if (S.diaryUnread) setHint("ha scritto nel diario mentre non c'eri");
  showOracle();
  save();
}

/* ================= NASCITA ================= */
/* un nome da un messaggio: "agony", "ti chiamo agony", "mi chiamo luca", "sono luca" → "Agony" / "Luca" */
function nomeDa(msg, a){
  const low = (a.low || msg.toLowerCase()).replace(/[.!?,;:]+/g, " ").trim();
  const m = low.match(/(?:mi chiamo|ti chiamo|ti chiamerò|ti chiamerei|chiamami|ti chiami|sono|io sono|il mio nome è|il tuo nome è|nome)\s+([a-zà-ù']{2,16})/);
  const w = m ? m[1] : (msg.trim().split(/\s+/).find(x => /^[\p{L}']{2,16}$/u.test(x)) || "");
  if (!w) return null;
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}
let holding = false, holdStart = 0, holdRaf = 0, lastBuzz = 0;
function holdTick(){
  if (!holding) return;
  const p = clamp((performance.now()-holdStart)/5000, 0, 1); F.hold = p;
  const gap = 700 - p*560;
  if (performance.now()-lastBuzz > gap){ lastBuzz = performance.now(); buzz(30+p*40); tone(55+p*40, .12, "sine", .12); }
  if (p>=1){ holding=false; hatch(); return; }
  holdRaf = requestAnimationFrame(holdTick);
}
async function hatch(){
  S.born = now(); S.lastSeen = now(); S.sessions = 1; S.user.hours[new Date().getHours()]++;
  flash(); buzz([80,40,200]); F.glitch = performance.now()+700; ripple(1, 40);
  [262,330,392,523,659].forEach((f,i)=>tone(f,.5,"triangle",.05,i*.06));
  F.hold = 0; document.body.classList.remove("unborn"); setEmo("surprised"); save(); render(); favicon(); setHint("");
  await wait(1400);
  S.awaitName = true; save(); render();
  await say("ciao. sono appena nato", { emo:"curious", raw:true });
  await wait(500);
  await say("come mi chiami?", { emo:"curious", raw:true, cap:"dagli un nome. poi ti chiederà il tuo" });
  setHint("dagli un nome");
  S.litSeen = Math.round(growth()*100); render(); inp.focus();
}
const stage = $("#stage");
// niente menu "copia / seleziona" con la pressione lunga (tranne nel campo di testo)
document.addEventListener("contextmenu", e => { if (!e.target.closest("input")) e.preventDefault(); });
document.addEventListener("selectstart", e => { if (!e.target.closest || !e.target.closest("input")) e.preventDefault(); });
let wakeT = 0;
stage.addEventListener("pointerdown", e=>{
  if (!S.born) return;
  if (isAsleep()){ setHint("lo stai svegliando…"); F.blink = 1; buzz(20); clearTimeout(wakeT);
    wakeT = setTimeout(()=>{ F.blink = 0; queue(wakeForced); }, 900); return; }
  if(!isAsleep()){ setEmo("happy",900); tone(880,.05,"triangle",.03); buzz(15); cv.classList.add("poke"); setTimeout(()=>cv.classList.remove("poke"), 90); ripple(.25, 40); } });
// per nascere si può tenere premuto ovunque sullo schermo
const mainEl = document.querySelector("main");
mainEl.addEventListener("pointerdown", e=>{
  if (S.born || holding || !document.body.classList.contains("unborn")) return;
  try{ mainEl.setPointerCapture(e.pointerId); }catch(_){}
  holding=true; holdStart=performance.now(); audio(); setHint("ancora…"); holdTick(); });
const release = ()=>{ if (wakeT){ clearTimeout(wakeT); wakeT = 0; F.blink = 0; if (isAsleep() && !wakingUp) setHint("dorme ancora · tieni premuto di più"); } if (!holding) return; holding=false; cancelAnimationFrame(holdRaf); const decay=setInterval(()=>{ F.hold=Math.max(0,F.hold-.04); if(F.hold<=0) clearInterval(decay); },30); setHint("tieni premuto. di più."); };
["pointerup","pointercancel"].forEach(ev=>{ mainEl.addEventListener(ev, release); window.addEventListener(ev, release); });

/* ================= SCHERMO INTERO ================= */
const fsEl = document.documentElement, fsReq = fsEl.requestFullscreen || fsEl.webkitRequestFullscreen;
const fsOn = () => document.fullscreenElement || document.webkitFullscreenElement;
let fsPending = false;
function goFullscreen(e){
  if (!fsReq || fsOn() || fsPending) return;
  if (e.type==="pointerdown" && e.pointerType!=="mouse") return;
  if (e.type==="pointerup" && e.pointerType==="mouse") return;
  fsPending = true;
  try{ const r = fsReq.call(fsEl, {navigationUI:"hide"}); if (r && r.then) r.then(()=>{ try{ screen.orientation.lock("portrait").catch(()=>{}); }catch(_){} }).catch(()=>{}).finally(()=>fsPending=false); else fsPending = false; }catch(_){ fsPending = false; }
}
["pointerdown","pointerup"].forEach(ev=>document.addEventListener(ev, goFullscreen, true));
document.addEventListener("keydown", e=>{ if (e.key!=="Escape") goFullscreen(e); }, true);

/* ================= INPUT ================= */
const ritmo = new Ritmo();
let ghosts = 0, lastClear = 0, prevLen = 0, ghostFired = false, lastAct = Date.now(), idleFired = 0, liveT = 0, nameSeen = false, newSeen = "";
inp.addEventListener("input", ()=>{
  lastAct = Date.now(); F.attn = false;
  ritmo.key(inp.value.length, prevLen);
  if (inp.value.length===0 && prevLen>=6){ ghosts++; lastClear = Date.now(); }
  prevLen = inp.value.length; updCount();
  // lettura dal vivo: reagisce prima che tu invii
  clearTimeout(liveT); liveT = setTimeout(()=>{
    if (busy || !S.born || !S.name) return;
    const L = liveRead(inp.value, S);
    F.live = L ? L.emo : null;
    if (L && inp.value.trim().length > 6 && nucleo.ready){ const txt = inp.value; nucleo.senti(txt).then(f => { if (!f || inp.value !== txt || busy) return;
      const m = { ironia:"smirk", tristezza:"sad", rabbia:"hurt", paura:"surprised", gioia:"happy", affetto:"happy", stanchezza:"sleepy", sorpresa:"surprised" }[f._top];
      if (f._conf > .6 && m && F.live !== "happy") F.live = m; }); }
    if (L && L.name && !nameSeen){ nameSeen = true; tone(990,.05,"triangle",.03); tone(1320,.06,"triangle",.03,.07); ripple(.3,50); }
    if (L && L.newWord && L.newWord !== newSeen && phase()>=1){ newSeen = L.newWord; setHint(`non conosce «${L.newWord}»`); }
    if (!inp.value) { F.live = null; nameSeen = false; }
  }, 120);
});
inp.addEventListener("blur", ()=>{ F.live = null; });
$("#bar").addEventListener("submit", e=>{
  e.preventDefault();
  const msg = inp.value.trim().slice(0, inp.maxLength);
  if (!msg || !S.born || isAsleep()) return;
  const sense = ritmo.read(msg.length, S.user.typing);
  inp.value = ""; prevLen = 0; ghosts = 0; updCount(); lastAct = Date.now(); F.attn=false; F.live = null; nameSeen = false;
  audio(); showMine(msg); setCap("");
  S.log.push({t:now(), w:"u", x:msg}); if(S.log.length>120) S.log.shift();
  S.lastSeen = now();
  const a = B.analyze(msg);
  const hit = oracleP && sessionMsgs === 0 && prophecyHit(oracleP, msg);
  if (sessionMsgs === 0 && S.name){ S.mem.openers.push({x:msg, h:new Date(now()).getHours()}); if (S.mem.openers.length>30) S.mem.openers.shift(); }
  sessionMsgs++;
  queue(async ()=>{
    // primo incontro: come si chiama lui, come ti chiami tu, e si comincia
    if (S.awaitName || !S.name){
      const nm = nomeDa(msg, a) || "Impronta";
      S.name = nm; S.awaitName = false; S.firstWord = S.firstWord || nm.toLowerCase(); S.onboard = "tu"; save(); render();
      setEmo("happy"); ripple(.7, 50); tone(660,.1,"triangle",.03); tone(880,.12,"triangle",.03,.1);
      await say(`${nm}. mi piace`, { emo:"happy", raw:true });
      await say("e tu come ti chiami?", { emo:"curious", raw:true });
      setHint("digli come ti chiami"); return;
    }
    if (S.onboard === "tu"){
      const un = a.name ? a.name.charAt(0).toUpperCase() + a.name.slice(1) : nomeDa(msg, a);
      S.onboard = null;
      if (un){ S.userName = un; B.learn(S, msg, { ...a, name: un.toLowerCase() }, now()); }
      save(); render(); setHint("");
      await say(un ? `piacere, ${un}` : "va bene. me lo dirai quando vuoi", { emo:"happy", raw:true });
      await say("io imparo da te e studio da solo. raccontami qualcosa, o chiedimi una cosa che vuoi sapere", { emo:"curious", raw:true,
        cap:"prova: «cosa sai dei vulcani?» · «studia la filosofia» · «mi piace il mare»" });
      return;
    }
    if (S.awaitUserName && !a.name && a.toks.length <= 2 && !a.q){ a.name = a.toks[a.toks.length-1]; a.intent = "name"; }
    S.awaitUserName = 0;
    // la rete sente cosa provi (stima, prima di imparare da questo messaggio)
    const feel = await nucleo.senti(msg);
    // risposta a "stai scherzando?" / "sei triste?": diventa una lezione fortissima
    let confirmed = null;
    if (S.mem.confirm && now() - S.mem.confirm.t < 10*60e3){
      const c = S.mem.confirm;
      const yes = c.k === "ironia" ? B.parseIronyAnswer(a, c.q || { yes:true }) : (a.yes ? true : a.no ? false : null);
      if (yes !== null){
        const L = conferma(c.k, yes, AFFETTI);
        nucleo.osserva(c.x, L); S.mem.labels.push({ x: B.tokenize(c.x).join(" "), l: L.lab, m: L.mask, w: L.w }); if (S.mem.labels.length > 300) S.mem.labels.shift();
        if (c.k === "ironia"){
          B.learnIrony(S, B.analyze(c.x), yes);
          const st = S.mem.ironyStats || (S.mem.ironyStats = { asked:0, hist:[] });
          st.asked++; st.hist.push(c.guess === yes ? 1 : 0); if (st.hist.length > 30) st.hist.shift();
          // dalla risposta capisce anche cosa ti piace
          if (yes){ const ca = B.analyze(c.x); for (const l of (ca.likes || [])){ S.likes = S.likes.filter(x=>x!==l); if (!S.dislikes.includes(l)) S.dislikes.push(l); } }
          if (c.topic){ const tn = B.topicNoun(c.topic).replace(/^(il|lo|la|i|gli|le|l') ?/, ""); if (yes && !S.dislikes.includes(tn)){ S.dislikes.push(tn); S.likes = S.likes.filter(x=>x!==tn); } if (!yes && c.pos && !S.likes.includes(tn)){ S.likes.push(tn); S.dislikes = S.dislikes.filter(x=>x!==tn); } }
        }
        confirmed = { k: c.k, yes, topic: c.topic, guess: c.guess };
      }
    }
    S.mem.confirm = null;
    let declared = null;
    if (!confirmed && B.JOKE_DECL.test(a.low)){
      const prevU = S.log.slice(0, -1).reverse().find(l => l.w === "u");
      if (prevU && now() - prevU.t < 5*60e3){
        const pa = B.analyze(prevU.x), L = conferma("ironia", true, AFFETTI);
        nucleo.osserva(prevU.x, L); S.mem.labels.push({ x: B.tokenize(prevU.x).join(" "), l: L.lab, m: L.mask, w: L.w });
        B.learnIrony(S, pa, true);
        for (const l of (pa.likes || [])){ S.likes = S.likes.filter(x=>x!==l); if (!S.dislikes.includes(l)) S.dislikes.push(l); }
        const lastC = S.log.slice(0, -1).reverse().find(l => l.w === "c");
        declared = { caught: !!(lastC && /come no|sul serio|ironi|scherz|bello eh/.test(lastC.x)) };
      }
    }
    // i conti: scritti a mano (nucleo/calcolo.js), la rete non li sa fare
    const calcAns = !confirmed && !declared && phase() >= 3 ? calcola(msg) : null;
    // domande sui SUOI gusti (nascono di notte dalle letture: nucleo/gusti.js)
    const gustoAns = !confirmed && !declared && !calcAns && phase() >= 3 ? Gusti.rispondi(S.mem.gusti, msg, S.mem.gustoUltimo) : null;
    S.mem.gustoUltimo = gustoAns && gustoAns.ultimo || null;
    const mondoIt = !confirmed && !declared && !calcAns && !gustoAns && phase() >= 3 ? Mondo.intento(msg) : null;
    const studyAns = !confirmed && !declared && !calcAns && !gustoAns && !mondoIt && phase() >= 3 ? studyReply(msg, a) : null;
    // una domanda di sapere senza altre risposte: cerca nei suoi appunti (nucleo/appunti.js)
    const sapAns = !confirmed && !declared && !calcAns && !gustoAns && !mondoIt && !studyAns && phase() >= 3 && Appunti.domandaDiSapere(msg) ? await cercaAppunti(msg, 1.5) : null;
    const newW = B.learn(S, msg, a, now()); updateTraits(a);
    // etichette automatiche (emoji, segnali) e ricordo dell'umore per capire il carattere
    const lab = etichetta(msg, a, AFFETTI);
    nucleo.osserva(a.raw, lab);
    if (lab){ S.mem.labels.push({ x: B.tokenize(msg).join(" "), l: lab.lab, m: lab.mask, w: lab.w }); if (S.mem.labels.length > 300) S.mem.labels.shift(); }
    registra(S, msg, a, feel, now());
    S.energy.used++;
    if (newW.length && phase()>=1) setHint(`ha imparato: ${newW.slice(0,3).join(", ")}`);
    if (hit){ oracleP = null; await revealOracle(); await say(phase()>=2 ? "lo sapevo" : "!", {emo:"happy", raw:true, cap:"sapeva cosa avresti scritto"}); }
    else if (declared){ oracleP = null; hideOracle();
      await say(declared.caught ? "ahah. l'avevo capito" : "ah! ci sono cascato. me lo segno", { emo: declared.caught ? "smirk" : "surprised", raw:true, src:"chiede", cap:"sta imparando quando sei ironico" }); }
    else if (calcAns){ oracleP = null; hideOracle(); await say(calcAns.x, { emo: "happy", raw:true, src:"studio", cap: calcAns.conto ? `${calcAns.conto} · l'ha calcolato lui, a mano` : "" }); }
    else if (sapAns){ oracleP = null; hideOracle(); citato(sapAns); await say(Appunti.frase(sapAns), { emo: "curious", raw:true, src:"studio", cap: capAppunti(sapAns) }); }
    else if (gustoAns){ oracleP = null; hideOracle(); await say(gustoAns.x, { emo: "happy", raw:true, src:"studio", cap: gustoAns.cap || "" }); }
    else if (mondoIt && await rispondiMondo(mondoIt)){ oracleP = null; hideOracle(); }
    else if (studyAns && studyAns.live){ oracleP = null; hideOracle(); await liveStudy(studyAns.live, studyAns.perche); }
    else if (studyAns){ oracleP = null; hideOracle(); await say(studyAns.x, { emo: studyAns.emo || "curious", raw:true, src:"studio", cap: studyAns.cap || "" }); }
    else if (confirmed){ oracleP = null; hideOracle();
      const st = S.mem.ironyStats, accTxt = st && st.hist.length >= 3 ? ` · indovina il tuo tono ${Math.round(st.hist.reduce((x,y)=>x+y,0)/st.hist.length*100)}% delle volte` : "";
      let line, emo = "happy";
      if (confirmed.k === "ironia"){
        const right = confirmed.guess === confirmed.yes;
        if (confirmed.yes) line = confirmed.topic ? (right ? `lo sapevo. allora ${B.notLike(confirmed.topic)}. lo ricorderò` : `ah. allora ${B.notLike(confirmed.topic)}. lo ricorderò`) : (right ? "ahah. lo sapevo" : "ahah. ci sono cascato");
        else line = confirmed.topic ? `allora ti piace davvero. strano. ma bello` : (right ? "lo pensavo. bene" : "ok. ora ho capito meglio");
        emo = confirmed.yes ? "smirk" : "happy";
      } else { line = confirmed.yes ? "mi dispiace. sono qui" : "ok. ora ho capito meglio"; emo = confirmed.yes ? "sad" : "happy"; }
      await say(line, { emo, raw:true, src:"chiede", cap:`sta imparando il tuo modo di scrivere${accTxt}` }); }
    else {
      oracleP = null; hideOracle();
      // ironia: rete + regole + il tuo vocabolario. se è nel dubbio, chiede invece di rispondere
      const ir = B.ironyEstimate(S, a, feel);
      const st = S.mem.ironyStats || { hist:[] }, acc = st.hist.length >= 8 ? st.hist.reduce((x,y)=>x+y,0)/st.hist.length : .5;
      const sinceAsk = S.user.msgs - (S.mem.lastAskMsg ?? -99);
      const band = ir.p > .3 && ir.p < (acc > .8 ? .6 : .78);
      const askP = st.hist.length < 10 ? .9 : Math.max(.3, 1 - acc*.7);
      const plausible = ir.rule > 0 || (ir.pers ?? 0) > .55 || (ir.pos && (ir.net || 0) > .68);
      if (phase() >= 2 && band && plausible && sinceAsk >= 3 && rnd() < askP){
        const q = B.ironyQuestion(rnd);
        S.mem.confirm = { k:"ironia", x: msg, t: now(), q, guess: ir.p >= .5, topic: ir.topic, pos: ir.pos };
        S.mem.lastAskMsg = S.user.msgs;
        await say(q.x, { emo:"curious", raw:true, src:"chiede", cap: (st.hist.length < 2 ? "non è sicuro del tuo tono: te lo chiede per imparare" : "") });
      } else {
        const irV = plausible && ir.p >= .5 ? Math.max(.65, ir.p) : 0;   // nel dubbio segue l'ipotesi più probabile
        const f2 = feel ? { ...feel, ironia: irV } : (irV ? { ironia: irV } : null);
        await respond(msg, a, sense, f2);
        // ogni tanto, se parli di qualcosa che ha studiato, aggiunge quello che ne ha letto
        if (phase() >= 3 && !a.q && S.user.msgs - (S.mem.ultimoAppunto ?? -99) >= 4 && rnd() < .4){
          const h = await cercaAppunti(msg, 2.5); if (h && h.diretto){ S.mem.ultimoAppunto = S.user.msgs; citato(h); await say(Appunti.frase(h, { spontanea: true }), { emo: "curious", raw:true, src:"studio", cap: capAppunti(h) }); } }
      }
    }
    nucleo.impara(200).catch(()=>{});
    await checkPhase();
    if (S.energy.used >= ENERGY[phase()]) await sleepNow();
    save(); render();
  });
});
function nudge(k, d){ const v=S.traits[k]; S.traits[k] = clamp(v + d*(1-Math.abs(v)*.7), -1, 1); }
function updateTraits(a){
  if (a.kind || (a.s>0 && !a.insult)) nudge("calore", .04);
  if (a.humor) nudge("ironia", .05);
  if (a.q) nudge("curiosita", .03);
  if (a.insult){ nudge("calore", -.08); nudge("coraggio", .02); S.hurt = clamp(S.hurt+.35, 0, 1); }
  if (a.s<0 && !a.insult){ nudge("calma", .05); nudge("malinconia", .01); }
  if (/ansia|paura|stress|agitat|panico/.test(a.low)) nudge("calma", .06);
  if (!a.humor && S.user.msgs%8===0) nudge("ironia", .02);
}
// sorveglianza: bozze cancellate e silenzi
setInterval(()=>{
  if (!S.born || !S.name || busy || isAsleep() || document.hidden) return;
  const p = phase(), ctx = B.makeCtx(S, p, now(), rnd);
  if (!ghostFired && ghosts>=2 && inp.value==="" && Date.now()-lastClear>3000){
    ghostFired = true; F.attn = true;
    queue(()=> p>=3 ? say(B.pickTemplate(ctx,"ghost"), {emo:"curious", raw:true}) : say(pick(G.ghost), {glyph:true, emo:"curious"}));
  }
  if (Date.now()-lastAct > 50000 && Date.now()-idleFired > 180000){
    idleFired = Date.now(); F.attn = true; F.tx=0; F.ty=0;
    queue(()=> p>=3 ? say(B.pickTemplate(ctx,"idle"), {emo:"curious", raw:true}) : say(pick(G.idle), {glyph:true, emo:"curious"}));
  }
  if (S.energy.sleepUntil && !isAsleep() && !wakingUp && !dreaming) queue(()=>wakeNatural("ha dormito abbastanza"));
}, 1000);
document.addEventListener("visibilitychange", ()=>{
  if (document.hidden){ if (S.born){ S.lastSeen = now(); save(); pushRemote(); mente.persist().then(syncNetUp); } }
  else {
    if (fb) loadRemote(S.id).then(r=>{ if (r && stamp(r.updatedAt) > stamp(S.updatedAt) + 2000 && !busy){ clearTimeout(saveT); ls.set("impronta_state", JSON.stringify(normalize(r, S.id))); location.reload(); } });
    if (S.born && now()-S.lastSeen > 20*60e3){ ghostFired=false; queue(welcome); }
    else syncNetDown().then(() => { if (isAsleep()) sleepResume(); });
  }
});

/* ================= SCHEDE ================= */
let vizStop = [];
function stopViz(){ vizStop.forEach(f => { try { f(); } catch (e){} }); vizStop = []; }
function openSheet(title, html){ stopViz(); $("#pane").scrollTop = 0; $("#pane").innerHTML = `<div class="sh-h"><h2>${esc(title)}</h2><button id="shx" aria-label="Chiudi">×</button></div>${html}`; $("#sheet").classList.add("on"); $("#shx").onclick = closeSheet; }
function closeSheet(){ $("#sheet").classList.remove("on"); mapRun = false; stopViz(); }
$("#sheet").addEventListener("click", e=>{ if (e.target.id==="sheet") closeSheet(); });
const compact = v => v == null ? "—" : v >= 1e6 ? (v/1e6).toFixed(v >= 1e7 ? 0 : 1).replace(".", ",") + "M" : v >= 1e4 ? Math.round(v/1e3) + "k" : Number(v).toLocaleString("it-IT");
async function showWords(){
  const ws = contentWords(1).sort((a,b)=>S.words[b].c-S.words[a].c);
  const lib = STUDIATE.filter(w => w.length > 3 && !B.STOP.has(w) && !S.words[w]).sort();
  const defs = ws.filter(w => S.defs[w]).length, maxc = S.words[ws[0]] ? S.words[ws[0]].c : 1;
  openSheet("parole", `<p class="muted lead">ogni punto è una parola. le ha messe lui nello spazio: quelle vicine, per lui, vogliono dire cose simili. nessuno gliel'ha detto.</p>
    <div class="hud">${tile("tue", ws.length, { sub: "gliele hai insegnate tu", frac: Math.min(1, ws.length/200) })}${tile("dai libri", lib.length, { sub: lib.length ? "imparate studiando da solo" : "studia mentre dorme, dalla fase «frase»", frac: Math.min(1, lib.length/3000), rosso: true })}
    ${tile("sa cosa vogliono dire", defs, { sub: "gliele hai spiegate" })}${tile("la più usata", esc(ws[0] || "—"), { sub: ws[0] ? `${S.words[ws[0]].c} volte` : "" })}</div>
    ${titolo("lo spazio dei significati", "tocca una parola")}
    <div class="viz"><canvas id="galaxy"></canvas></div>
    <div class="winfo muted" id="wInfo">● tue · ○ dai libri</div>
    ${titolo("tue", ws.length)}<div class="chips">${ws.slice(0, 400).map(w=>`<span class="${S.words[w].c >= maxc*.5 ? "hot" : ""}">${esc(w)}<small>${S.words[w].c}${S.defs[w] ? " · sa" : ""}</small></span>`).join("")}</div>
    ${lib.length ? `${titolo("dai libri", lib.length)}<div class="chips lib">${lib.slice(0, 300).map(w=>`<span>${esc(w)}</span>`).join("")}</div>` : ""}`);
  if (!mente.ready) return;
  const words = [...ws.slice(0, 44), ...lib.slice().sort(() => rnd() - .5).slice(0, 14)];
  let pts = []; try { pts = await mente.call("map", { words }); } catch (e){ return; }
  const c = $("#galaxy"); if (!c || pts.length < 3) return;
  const among = pts.map(p => p.w);
  const G = galassia(c, { pts, peso: w => S.words[w] ? S.words[w].c : .6, tua: w => !!S.words[w], onTap: async w => {
    const near = await mente.near(w, among); G.scegli(w, near);
    const W = S.words[w], info = $("#wInfo"); if (!info) return;
    const wn = await Mondo.parola(fetch, w).catch(() => null);
    info.innerHTML = `<b>${esc(w)}</b>${W ? `usata ${W.c} ${W.c === 1 ? "volta" : "volte"}` : "dai libri"}${S.defs[w] ? ` · «${esc(S.defs[w])}»` : ""}<br>per lui è vicina a: ${near.map(n => `<span style="color:var(--ink)">${esc(n[0])}</span>`).join(", ") || "—"}${wn && (wn.tipo.length || wn.sinonimi.length) ? `<br>dal dizionario: ${wn.tipo.length ? `è un tipo di ${esc(wn.tipo[0])}` : ""}${wn.tipo.length && wn.sinonimi.length ? " · " : ""}${wn.sinonimi.length ? `come ${esc(wn.sinonimi.slice(0, 3).join(", "))}` : ""}` : ""}`;
  } });
  vizStop.push(G.stop);
}
function showDiary(){
  S.diaryUnread = 0; save(); render();
  const srv = S.diary.filter(d => d.srv).length;
  openSheet("diario", S.diary.length ? `<p class="muted lead">scrive quando non ci sei. i punti rossi sono sogni fatti sul server, mentre l'app era chiusa.</p>
    <div class="hud">${tile("pagine", S.diary.length)}${tile("sogni ad app chiusa", srv, { rosso: true, frac: S.diary.length ? srv/S.diary.length : 0 })}</div>${titolo("giorno per giorno")}<div class="tl" id="dl"></div>`
    : `<p class="muted">ancora vuoto. scrive quando non ci sei.</p>`);
  const dl = $("#dl"); if (!dl) return;
  for (const d of S.diary.slice().reverse()){ const e=document.createElement("div"); e.className="entry"+(d.srv?" srv":d.g?" g":""); e.innerHTML=`<time>${dstr(d.t)} · ${hhmm(d.t)}${d.srv ? " · sognato sul server" : ""}</time>`;
    if (d.g){ e.appendChild(glyphEl(d.x, {cell:4, stagger:0})); if (S.revealed){ const tr=document.createElement("div"); tr.className="muted"; tr.style.marginTop="6px"; tr.textContent="«"+d.x+"»"; e.appendChild(tr); } }
    else { const p=document.createElement("div"); p.textContent=d.x; e.appendChild(p); }
    dl.appendChild(e); }
}
function showLog(){
  openSheet("ricordi", `<p class="muted">le ultime cose che vi siete detti</p><div id="lg"></div>`);
  const box = $("#lg");
  for (const l of S.log.slice(-60).reverse()){ const e=document.createElement("div"); e.className="entry"+(l.w==="u"?" u":""); e.innerHTML=`<time>${dstr(l.t)} · ${hhmm(l.t)}</time>`;
    if (l.g){ e.appendChild(glyphEl(l.x,{cell:4,stagger:0})); if (S.revealed){ const tr=document.createElement("div"); tr.className="muted"; tr.textContent="«"+l.x+"»"; e.appendChild(tr);} } else { const p=document.createElement("div"); p.textContent=l.x; e.appendChild(p); }
    box.appendChild(e); }
}
/* la mente: il cervello vero, in 3D, che rivive la tua ultima frase */
let mapRun = false;
async function showMind(){
  const i = nucleo.info || {}, last = i.last, L = i.L || 1;
  const gw = i.growth ? i.growth.filter(g => g.to !== g.from) : [];
  const grow = gw.length ? [gw[0].from, ...gw.map(g=>g.to)].join("→") : String(i.H || "—");
  const cap = last && last.capisce != null ? last.capisce : null;
  const lastU = S.log.filter(l => l.w === "u").slice(-1)[0];
  openSheet("mente", `<p class="muted lead">la sua rete neurale, vera. ogni punto è un neurone, messo vicino a quelli con cui lavora; le linee sono le sinapsi più forti. i rossi sono appena nati. trascinalo per girarlo.</p>
    <div class="viz"><canvas id="brain"></canvas><div class="viz-cap" id="brainCap"></div></div>
    <p class="muted" style="text-align:center;margin:6px 0 0;font-size:11px" id="brainTxt">${lastU ? `rivive la tua ultima frase: «${esc(lastU.x.slice(0, 60))}»` : "sta sognando"}</p>
    <div class="hud">
      ${tile("neuroni", i.H || "—", { sub: grow, frac: (i.H || 0)/512 })}
      ${tile("strati", L, { sub: L > 1 ? "pensa in profondità" : "cresce quando studia molto", frac: L/4 })}
      ${tile("parametri", compact(i.params), { sub: "pesi imparati da solo" })}
      ${tile("capisce le emozioni", cap != null ? Math.round(cap*100) + "<span class=dim>%</span>" : "—", { sub: "su frasi che non ha mai visto", frac: cap || 0, rosso: cap != null && cap < .3 })}
      ${tile("frasi lette", compact(i.steps), { sub: `${compact(i.frasi)} tue · ${compact(i.letture || 0)} dai libri` })}
      ${tile("parole", (Object.keys(S.words).length) + `<span class=dim>+${compact(STUDIATE.length)}</span>`, { sub: "tue + dai libri" })}
      ${(() => { const T = S.mem.traduttore; if (!T) return tile("traduce dall'inglese", "—", { sub: "impara di notte, sul server, dalle frasi di Tatoeba", largo: true });
        return tile("traduce dall'inglese, da solo", Math.round(T.nostro*100) + "<span class=dim>%</span>", { largo: true, frac: T.nostro,
          sub: `parole giuste rispetto a una traduzione umana${T.libero != null ? ` · il traduttore libero: ${Math.round(T.libero*100)}%` : ""} · ${compact(T.passi)} frasi studiate${T.esempio && T.esempio.nostro ? `<br>«${esc(T.esempio.en)}» → «${esc(T.esempio.nostro)}»` : ""}` }); })()}
    </div>
    ${titolo("comprensione nel tempo", `<i style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--red);vertical-align:middle"></i> è cresciuto`)}
    <canvas id="spark" class="dots"></canvas>
    ${titolo("dove pensa")}
    <div class="row"><span>qui</span><span>${nucleo.mode}${nucleo.grande ? " · solo per usarla" : ""}</span></div>
    <div class="row"><span>ad app chiusa</span><span>${S.energy.srv ? `${dstr(S.energy.srv.t)} · ${hhmm(S.energy.srv.t)} · +${compact(S.energy.srv.steps)} passi` : S.netUp ? "affidata al server" : "non ancora"}</span></div>
    ${phase()<3 ? `<p class="muted" style="margin-top:14px">la userà per parlare dalla fase «frase». intanto ascolta e impara a sentire.</p>` : ""}
    <button class="btn" id="mChar">come ti vede</button><button class="btn" id="mGusti">i suoi gusti</button><button class="btn" id="mLog">ricordi</button>`);
  $("#mLog").onclick = showLog; $("#mChar").onclick = showCarattere; $("#mGusti").onclick = showGusti;
  const hs = i.hist ? i.hist.filter(h => h.capisce != null) : [];
  const marks = []; hs.forEach((h, k) => { if (k && (h.H > hs[k-1].H || (h.L || 1) > (hs[k-1].L || 1))) marks.push(k); });
  const sp = $("#spark"); if (sp) puntini(sp, hs.map(h => h.capisce), { segni: marks });
  if (!mente.ready) return;
  const [con, act] = await Promise.all([nucleo.connettoma(), lastU ? nucleo.attiva(lastU.x) : null]);
  const c = $("#brain"); if (!c || !con) return;
  const g = S.sparks.lastGrow, recent = g && Date.now() - g.t < 3*DAY && g.to === con.H;
  const nati = recent ? Array.from({ length: con.L }, () => g.from) : null;
  vizStop.push(cervello(c, { con, act: act && act.words.length > 1 ? act : null, nati }));
}
function showGusti(){
  const G = S.mem.gusti, NOMI = { temi: "argomenti", materie: "materie", autori: "autori", libri: "libri" };
  const W = Gusti.gradite(S.traits), prova = AFFETTI.map((k, i) => [k, W[i]]).sort((x, y) => y[1] - x[1]);
  // il cuore: le cose amate, cosa gli piace provare, cosa sente leggendo (o parlando con te); si forma man mano
  const viz = `<div class="viz"><canvas id="heart"></canvas></div>`;
  const tutte = G ? Gusti.TIPI.flatMap(t => Gusti.classifica(G, t).map(o => ({ ...o, tipo: ({ temi: "argomento", materie: "materia", autori: "autore", libri: "libro" })[t] }))).sort((x, y) => y.p - x.p) : [];
  const disegna = () => { const c = $("#heart"); if (!c) return;
    const pesi = tutte.reduce((s, o) => s + Math.max(.05, o.p), 0), sente = tutte.length ? AFFETTI.map((_, k) => tutte.reduce((s, o) => s + (+(o.sente || [])[k] || 0)*Math.max(.05, o.p), 0)/pesi) : null;
    const M = S.mem.mood.slice(-40), media = f => M.length ? M.reduce((s, r) => s + (f(r) || 0), 0)/M.length : 0;
    const umore = [media(r => Math.max(0, r.v)), media(r => r.tr), media(r => r.ra), media(r => r.pa), media(r => r.af), media(r => r.i), 0, 0];
    const notti = G ? G.notti || 0 : 0, formato = clamp(.08 + .92*(1 - Math.exp(-(notti + tutte.length*.5)/14)), 0, 1);
    vizStop.push(cuore(c, { gusti: tutte.slice(0, 9).map((o, i) => ({ nome: o.nome, tipo: o.tipo, p: o.p, fav: i === 0 })), gradite: W, sentite: sente ? sente.map((v, k) => .6*v + .4*umore[k]) : umore, formato, notti })); };
  const lead = `<p class="muted lead">nessuno gliel'ha detto: i gusti gli vengono di notte, da quello che legge. misura con la sua rete quanto un testo lo sorprende, quanto ne impara e come lo fa sentire, e lo pesa con il suo carattere. cambia idea piano, e non sempre è d'accordo con te.</p>`;
  const carattere = `${titolo("cosa gli piace provare", "dal suo carattere")}<div class="chips">${prova.slice(0, 3).map(([k]) => `<span class="hot">${esc(k)}</span>`).join("")}${prova.slice(-2).map(([k]) => `<span>${esc(k)}<small>poco</small></span>`).join("")}</div>`;
  if (!G || !Gusti.TIPI.some(t => Object.keys(G[t] || {}).length)){ openSheet("i suoi gusti", viz + lead + carattere + `<p class="muted" style="margin-top:14px">ancora nessuno: nasceranno dalle prossime notti di studio. il cuore si formerà con loro.</p>`); disegna(); return; }
  const blocchi = Gusti.TIPI.filter(t => Object.keys(G[t] || {}).length).map(t => { const pref = (G.preferiti || {})[t], L = Gusti.classifica(G, t).slice(0, 6);
    return `${titolo(NOMI[t], pref ? "preferito: " + esc(pref) : "")}${L.map(o => `<div class="prog"><span class="ell">${esc(o.nome)}</span>${segmenti(clamp(o.p + .2, 0, 1), 14, o.nome === pref)}<small>${o.p.toFixed(2)}</small></div><p class="muted" style="font-size:11px;margin:-4px 0 10px">${esc(Gusti.perche(o))}</p>`).join("")}`; }).join("");
  const cambi = (G.storia || []).filter(c => c.prima).slice(-4).reverse();
  const parole = Object.entries(G.parole || {}).slice(0, 12);
  openSheet("i suoi gusti", viz + lead + `<div class="hud">${tile("notti di gusti", G.notti || 0, { sub: "ogni notte li ripesa" })}${tile("ha cambiato idea", cambi.length, { sub: cambi[0] ? `l'ultima: ${esc(cambi[0].nuovo)}` : "non ancora", rosso: true })}</div>`
    + blocchi + carattere
    + (cambi.length ? `${titolo("ha cambiato idea")}${cambi.map(c => `<div class="row"><span>${esc(c.prima)} → <b>${esc(c.nuovo)}</b></span><span>${dstr(c.t)}</span></div>`).join("")}` : "")
    + (parole.length ? `${titolo("le sue parole", "tra i sinonimi")}<div class="chips">${parole.map(([, v]) => `<span class="hot">${esc(v.w)}<small>${esc(v.tra.filter(w => w !== v.w).slice(0, 2).join(", "))}</small></span>`).join("")}</div>` : "")
    + `<p class="muted" style="margin-top:12px">chiedigli «qual è il tuo libro preferito?», «chi preferisci tra … e …?», poi «perché?»</p>`);
  disegna();
}
function showCarattere(){
  const C = analizza(S);
  if (C.n < 5){ openSheet("come ti vede", `<p class="muted">ha bisogno di conoscerti ancora un po'. parlagli e torna più avanti.</p>`); return; }
  const bar = v => segmenti(v, 12);
  const days = C.days.map(d => `<i title="${dstr(d.t)}" style="display:inline-block;width:10px;height:10px;border-radius:50%;margin:2px;background:${d.v<-.2?"#e5161f":"#f2f2f2"};opacity:${(.25+Math.min(1,Math.abs(d.v))*.75).toFixed(2)}"></i>`).join("");
  openSheet("come ti vede", `<p class="muted">non è un test: è quello che ha capito di te da ${C.n} messaggi, con le emozioni stimate dalla sua rete. più gli parli, più diventa preciso (sicurezza ${Math.round((C.traits[0]||{conf:0}).conf*100)}%).</p>
    ${C.traits.map(t => `<div class="row"><span>${t.k}<br><small class="muted">${t.why}</small></span><span style="letter-spacing:.08em;font-size:10px">${bar(t.v)}</span></div>`).join("")}
    ${C.insights.length ? `<p class="muted" style="margin-top:16px">ha notato che</p>${C.insights.map(x => `<div class="row"><span>${esc(x.x)}</span><span></span></div>`).join("")}` : ""}
    ${(() => { const st = S.mem.ironyStats; if (!st || !st.hist.length) return ""; const acc = Math.round(st.hist.reduce((x,y)=>x+y,0)/st.hist.length*100);
      const words = Object.entries(S.mem.ironyLex||{}).filter(([w,e]) => e.i >= 2 && e.i > e.s*2 && !B.STOP.has(w)).sort((x,y)=>y[1].i-x[1].i).slice(0,6).map(([w])=>w);
      return `<p class="muted" style="margin-top:16px">il tuo tono</p><div class="row"><span>ti ha chiesto se eri ironico</span><span class="num">${st.asked}</span></div><div class="row"><span>quante volte aveva indovinato prima di chiedere</span><span class="num">${acc}%</span></div>${words.length ? `<div class="row"><span>le parole che usi quando sei ironico</span><span>${words.map(esc).join(", ")}</span></div>` : ""}`; })()}
    <p class="muted" style="margin-top:16px">il tuo umore, giorno per giorno</p><div>${days}</div>
    <p class="muted" style="margin-top:6px">bianco: sereno · rosso: giù</p>`);
}
let resetArm = 0;
function showMenu(){
  const tr = S.traits, bars = Object.keys(tr).map(k=>`<div class="row"><span>${k}</span><span>${"●".repeat(Math.round((tr[k]+1)*2.5))}${"○".repeat(5-Math.round((tr[k]+1)*2.5))}</span></div>`).join("");
  openSheet("menu", `
  <p class="muted">codice di legame · salvalo per ritrovarlo su un altro telefono</p>
  <div class="code">${esc(fmtId(S.id))}</div>
  <button class="btn" id="mCopy">copia codice</button>
  <input class="field" id="mCode" placeholder="incolla un codice di legame" autocomplete="off">
  <button class="btn" id="mLink">collega</button>
  <p class="muted" id="mMsg" style="margin-top:10px">${esc(syncState)}</p>
  ${S.born ? `<p class="muted" style="margin-top:18px">carattere</p>${bars}` : ""}
  <div style="margin-top:18px">
    ${S.born ? `<button class="btn" id="mLog2">ricordi</button>` : ""}
    <button class="btn" id="mSound">suono: ${S.sound?"sì":"no"}</button>
    <button class="btn red" id="mReset">ricomincia</button>
  </div>`);
  const ml = $("#mLog2"); if (ml) ml.onclick = showLog;
  $("#mCopy").onclick = async ()=>{ try{ await navigator.clipboard.writeText(S.id); $("#mMsg").textContent="copiato"; }catch(e){ $("#mMsg").textContent="copialo a mano: "+fmtId(S.id); } };
  $("#mSound").onclick = ()=>{ S.sound=!S.sound; save(); showMenu(); };
  $("#mReset").onclick = ()=>{ if (Date.now()-resetArm < 3000){ leaving = true; clearTimeout(saveT); $("#mReset").textContent="cancello…"; const done=async ()=>{ ["impronta_state","impronta_id","impronta_dev","impronta_net"].forEach(k=>ls.del(k)); try{ await nucleo.dimentica(); }catch(_){} location.reload(); }; if (fb) Promise.race([fb.set(fb.ref(fb.db, ROOT+"/"+S.id), null), wait(3000)]).catch(()=>{}).finally(done); else done(); } else { resetArm=Date.now(); $("#mReset").textContent="tocca di nuovo per cancellarlo"; } };
  $("#mLink").onclick = async ()=>{
    const code = $("#mCode").value.toUpperCase().replace(/[^A-Z0-9]/g,"");
    if (code.length!==16){ $("#mMsg").textContent="il codice ha 16 caratteri"; return; }
    if (!fb){ $("#mMsg").textContent="serve la connessione a Firebase"; return; }
    $("#mMsg").textContent="cerco…";
    const r = await loadRemote(code);
    if (!r){ $("#mMsg").textContent="nessun compagno con questo codice"; return; }
    leaving = true; ID = code; ls.set("impronta_id", ID); ls.set("impronta_state", JSON.stringify(normalize(r, ID))); nucleo.dimentica().finally(()=>location.reload());
  };
}
$("#menuBtn").onclick = showMenu;
// laboratorio nascosto: tocca il logo 5 volte
let taps = [];
$("#logo").addEventListener("click", ()=>{ taps = taps.filter(t=>Date.now()-t<2000); taps.push(Date.now()); if (taps.length>=5){ taps=[]; showLab(); } });
function showLab(){
  openSheet("laboratorio", `<p class="muted">solo per i test</p>
  <button class="btn" data-l="d1">+1 giorno</button><button class="btn" data-l="d7">+7 giorni</button><button class="btn" data-l="h8">+8 ore</button>
  <button class="btn" data-l="wake">sveglia</button><button class="btn" data-l="ph">fase +1</button><button class="btn" data-l="dream">sogna ora</button><button class="btn" data-l="sleep">dormi</button><button class="btn" data-l="t0">orologio vero</button>
  <p class="muted" style="margin-top:12px">ora simulata: ${new Date(now()).toLocaleString("it-IT")}</p>`);
  $("#pane").querySelectorAll("[data-l]").forEach(b=>b.onclick=async ()=>{
    const k=b.dataset.l;
    if (k==="d1"||k==="d7"||k==="h8"){ S.lastSeen = now(); save(); devOffset += k==="d1"?DAY:k==="d7"?7*DAY:8*HOUR; ls.set("impronta_dev", devOffset); closeSheet(); ghostFired=false; queue(welcome); }
    if (k==="wake"){ Object.assign(S.energy, { sleepUntil:0, sleepStart:0, used:0, rt:now() }); S.drowsyUntil = 0; S.grumpyUntil = 0; setEmo("neutral"); save(); render(); closeSheet(); }
    if (k==="ph"){ S.forcePhase = Math.min(4, phase()+1); save(); closeSheet(); queue(checkPhase); }
    if (k==="dream"){ closeSheet(); dream({ maxMs:10000, force:true }); }
    if (k==="sleep"){ closeSheet(); if (!isAsleep()) queue(sleepNow); }
    if (k==="t0"){ devOffset=0; ls.set("impronta_dev",0); location.reload(); }
  });
}

/* ================= AVVIO (schermata di accensione) ================= */
/* ================= AVVIO =================
   1 un punto rosso si accende · 2 un'onda accende la griglia di punti · 3 nasce un piccolo cervello: neuroni,
   sinapsi che si disegnano, impulsi · 4 i neuroni volano a comporre il suo volto, nella posizione vera del volto,
   e l'avvio si dissolve sul volto reale. Sotto, la diagnostica con i numeri veri. Un tocco salta. */
async function boot(){
  const el = $("#boot"), c = $("#bootc"), g = c.getContext("2d"), logo = $("#bootl"), st = $("#boots");
  const fast = matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let skip = false, done = false; el.addEventListener("pointerdown", () => { skip = true; }, { once:true });
  const d = Math.min(2, devicePixelRatio||1), VW = innerWidth, VH = innerHeight; c.width = VW*d; c.height = VH*d;
  const ox = VW/2, oy = VH*.45, TAU = Math.PI*2, ease = x => { x = clamp(x,0,1); return x*x*(3-2*x); };
  // il volto vero: dove sono i suoi punti sullo schermo
  const fr = cv.getBoundingClientRect(), fs = fr.width/N;
  const target = CELLS.map(cl => ({ x: fr.left + (cl.x+.5)*fs, y: fr.top + (cl.y+.5)*fs, ring: cl.ring, d: cl.d }));
  // griglia di sfondo
  const gs = 18, grid = []; for (let y = gs/2; y < VH; y += gs) for (let x = gs/2; x < VW; x += gs) grid.push({ x, y, r: Math.hypot(x - ox, y - oy) });
  // il piccolo cervello: neuroni in due emisferi, sinapsi verso i vicini
  const R = Math.min(VW, VH)*.34, P = [];
  for (let i=0;i<150;i++){ const t = Math.random()*TAU, rr = Math.sqrt(Math.random()); let x = Math.cos(t)*rr*1.15, y = Math.sin(t)*rr*.78; x += Math.sign(x||1)*.07;
    P.push({ x: ox + x*R, y: oy + y*R, dl: 900 + Math.random()*900 + rr*300, z: .5 + Math.random()*.5 }); }
  const E = []; P.forEach((p, i) => { P.map((q, j) => [j, Math.hypot(p.x-q.x, p.y-q.y)]).filter(([j]) => j !== i).sort((a, b) => a[1]-b[1]).slice(0, 2).forEach(([j]) => { if (!E.some(e => e.a === j && e.b === i)) E.push({ a: i, b: j, dl: Math.max(P[i].dl, P[j].dl) + 150 + Math.random()*500 }); }); });
  const pulses = [];
  const src = target.map((t, i) => ({ p: P[i % P.length], jx: (Math.random()-.5)*14, jy: (Math.random()-.5)*14, dl: Math.random()*380 }));
  const T_MORPH = 2650, T_END = 3700, born = S.born;
  let t0 = performance.now();
  (function frame(now){
    if (done) return;
    if (skip && now - t0 < T_MORPH) t0 = now - T_MORPH;              // un tocco: salta al volto
    const k = (now - t0)*(fast ? 2 : 1);
    g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, VW, VH);
    // 1 · il punto rosso
    if (k < 1400){ const a = k < 900 ? .55 + .45*Math.sin(k/90) : 1 - (k-900)/500; g.globalAlpha = clamp(a, 0, 1); g.fillStyle = "#e5161f"; g.beginPath(); g.arc(ox, oy, 3.2 + (k > 900 ? (k-900)/40 : 0), 0, TAU); g.fill(); }
    // 2 · l'onda sulla griglia
    const wave = (k - 350)*.55, fadeG = 1 - ease((k - T_MORPH - 300)/600);
    if (k > 350) for (const q of grid){ const dd = wave - q.r; if (dd < 0) continue; const peak = Math.exp(-dd*dd/1800);
      g.globalAlpha = (.07 + .55*peak)*fadeG; g.fillStyle = peak > .6 ? "#e5161f" : "#f2f2f2"; g.beginPath(); g.arc(q.x, q.y, .9 + peak*1.1, 0, TAU); g.fill(); }
    // 3 · il cervello che si forma
    const fadeB = 1 - ease((k - T_MORPH)/500);
    if (k > 800 && fadeB > 0){
      g.lineWidth = .7; g.strokeStyle = "#f2f2f2";
      for (const e of E){ const pr = ease((k - e.dl)/420); if (pr <= 0) continue; const A = P[e.a], B = P[e.b];
        g.globalAlpha = .22*fadeB; g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(A.x + (B.x-A.x)*pr, A.y + (B.y-A.y)*pr); g.stroke();
        if (pr >= 1 && Math.random() < .012 && pulses.length < 40) pulses.push({ e, t: 0 }); }
      for (let i = pulses.length-1; i >= 0; i--){ const p = pulses[i]; p.t += .035; if (p.t >= 1){ pulses.splice(i, 1); continue; } const A = P[p.e.a], B = P[p.e.b];
        g.globalAlpha = Math.sin(p.t*Math.PI)*fadeB; g.fillStyle = "#f2f2f2"; g.beginPath(); g.arc(A.x + (B.x-A.x)*p.t, A.y + (B.y-A.y)*p.t, 1.6, 0, TAU); g.fill(); }
      for (const p of P){ const a = ease((k - p.dl)/260); if (a <= 0) continue; const pop = 1 + Math.max(0, 1 - (k - p.dl)/260)*1.8;
        g.globalAlpha = a*p.z*fadeB; g.fillStyle = "#f2f2f2"; g.beginPath(); g.arc(p.x, p.y, 1.7*pop, 0, TAU); g.fill(); }
    }
    // 4 · i neuroni diventano il suo volto (la scritta si fa da parte)
    if (k > T_MORPH - 250 && !el.classList.contains("morph")) el.classList.add("morph");
    if (k > T_MORPH - 200){
      for (let i=0;i<target.length;i++){ const T = target[i], s = src[i], m = ease((k - T_MORPH - s.dl)/700);
        const x = s.p.x + s.jx + (T.x - s.p.x - s.jx)*m, y = s.p.y + s.jy + (T.y - s.p.y - s.jy)*m;
        const lit = T.ring ? .9 : born ? .16 + .5*Math.max(0, Math.sin(k/280 - T.d*.6))*(T.d < 4 ? 1 : .3) : .12;
        g.globalAlpha = (.25 + .75*m)*(m < 1 ? 1 : lit) + 0; g.fillStyle = "#f2f2f2"; g.beginPath(); g.arc(x, y, fs*.34*(.55 + .45*m), 0, TAU); g.fill(); }
    }
    g.globalAlpha = 1;
    requestAnimationFrame(frame);
  })(t0);
  const sleepOr = async ms => { const e = performance.now() + ms; while (performance.now() < e && !skip) await wait(30); };
  // il nome, lettera per lettera, con un'interferenza rossa
  await sleepOr(1050);
  for (const ch of "impronta."){ const sp = document.createElement("span"); sp.textContent = ch; if (ch === "." ) sp.className = "g"; logo.appendChild(sp); if (!skip){ tone(380+Math.random()*520,.03,"triangle",.012); await wait(55); } }
  // diagnostica con i numeri veri
  const N_ = v => Number(v || 0).toLocaleString("it-IT");
  const line = async (txt, ms = 230) => { const r = document.createElement("div"); r.innerHTML = `<i></i>${txt}`; st.appendChild(r); if (!skip) await wait(ms); r.querySelector("i").classList.add("ok"); };
  await line("nucleo <b>2.0</b> · 0 dipendenze · tutto scritto a mano");
  if (born){
    const t1 = performance.now(); while (!nucleo.ready && performance.now() - t1 < 1200 && !skip) await wait(50);
    const i = nucleo.info, srv = S.energy.srv, stu = S.mem.studio;
    await line(i ? `rete · <b>${i.H}</b> neuroni · ${i.L || 1} ${(i.L || 1) > 1 ? "strati" : "strato"} · ${N_(i.params)} parametri` : "rete · in risveglio");
    await line(`memoria · <b>${known()}</b> parole tue${srv && srv.studiate ? ` · ${N_(srv.studiate)} dai libri` : ""} · ${S.mem.corpus.length} frasi`);
    if (stu) await line(`studio · <b>${N_(stu.pagine)}</b> pagine lette${stu.prossima ? ` · prossima: ${esc(stu.prossima)}` : ""}`);
    if (srv) await line(`sogni ad app chiusa · ultimo ${dstr(srv.t)} ${hhmm(srv.t)}`);
    await line(`<b>${esc(S.name ? S.name.toLowerCase() : "· · ·")}</b> si sta svegliando…`, 120);
  } else {
    await line("nessun ricordo · una rete vuota di <b>16</b> neuroni");
    await line("pronto a imparare da te e a studiare da solo");
    await line("in attesa di nascere…", 120);
  }
  // aspetta che il volto si sia composto, poi si dissolve sul volto vero
  while (performance.now() - t0 < T_END && !skip) await wait(30);
  if (skip) await wait(Math.max(0, T_MORPH + 1100 - (performance.now() - t0)));
  el.classList.add("fade"); await wait(260);
  el.classList.add("out"); setTimeout(() => { done = true; el.remove(); }, 600);
}

(async ()=>{
  requestAnimationFrame(draw);
  render();
  setHint(S.born ? "" : "…");
  if (S.born) mente.start();
  const booting = boot();
  await Promise.race([initFB(), wait(3500)]);
  if (fb){ const r = await loadRemote(ID); if (r && stamp(r.updatedAt) > stamp(S.updatedAt)){ S = normalize(r, ID); buildCells(); ls.set("impronta_state", JSON.stringify(S)); } }
  render();
  if (!S.born) mente.start();
  await booting;
  if (!S.born){ document.body.classList.add("unborn"); setHint("tieni premuto"); return; }
  const lastC = S.log.filter(l=>l.w==="c").slice(-1)[0];
  if (lastC){ if (lastC.g){ said.appendChild(glyphEl(lastC.x, {stagger:0})); } else said.textContent = lastC.x; said.style.opacity = .5; setTimeout(()=>said.style.opacity="", 1200); }
  if (S.awaitName || !S.name) setHint("dagli un nome");
  else if (S.onboard === "tu") setHint("digli come ti chiami");
  queue(welcome);
})();
