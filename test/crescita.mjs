/* la rete che cresce: gradienti con più strati e vocabolario grande, crescita che non cambia ciò che sa */
import { Rete, mezza } from '../nucleo/rete.js';
const ok = (c, m) => { console.log((c ? "ok   " : "NO   ") + m); if (!c) process.exitCode = 1; };
const zero = n => { for (const q of Object.values(n.p)) q.g.fill(0); };
function check(n, ex, keys, tag){
  let bad = 0, tot = 0;
  for (const k of keys){
    const q = n.p[k]; zero(n); n.grad(ex); const g = Array.from(q.g.subarray(0, q.size)); zero(n);
    const order = g.map((v,i) => [Math.abs(v), i]).sort((a,b) => b[0]-a[0]).slice(0, 2);
    for (const [, i] of order){ const o = q.d[i], e = 1e-2; q.d[i] = o+e; const l1 = n.grad(ex); zero(n); q.d[i] = o-e; const l2 = n.grad(ex); zero(n); q.d[i] = o;
      const num = (l1-l2)/(2*e), rel = Math.abs(num-g[i])/(Math.abs(num)+Math.abs(g[i])+1e-9); tot++; if (rel > 3e-2) { bad++; console.log("   ", k, num, g[i]); } }
  }
  ok(!bad, `${tag}: gradienti giusti (${tot - bad}/${tot})`);
}
const out = (n, ws) => { const f = n.fwd(n.ids(ws, false)); return [...f.st[f.st.length-1].h, ...f.a]; };
const diff = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
const frase = ["oggi","sono","triste","ma","forte"];

// 1) tre strati: gradienti di tutti i pezzi (anche R e degli strati sopra)
{ const n = new Rete({ D:6, H:5, seed:4 }); const ids = n.ids(frase); n.deepen(); n.deepen();
  for (const k of Object.keys(n.p)) if (/^(W|U|R)/.test(k) && k !== "Wo" && k !== "Wa") n.p[k].d.forEach((v,i,a) => a[i] = k.startsWith("R") ? (Math.random()-.5)*.8 : v*3);
  check(n, { ids, lm:1, lab:[0,1,0,0,0,0,1,0], mask:[1,1,1,1,1,1,1,1] }, ["Wz","Un","Wz1","Uz1","bn1","R1","Wr2","Un2","R2","E","C"], "3 strati"); }
// 2) vocabolario grande: softmax campionata
{ const n = new Rete({ D:6, H:5, seed:5 }); for (let i=0;i<900;i++) n.word("parola"+i); const ids = n.ids(frase);
  check(n, { ids, lm:1, lab:null }, ["Wo","bo","Wz","Un","E"], "900 parole, softmax campionata");
  const t0 = Date.now(); for (let i=0;i<40;i++) n.train([{ ids, lm:1 }], .01); ok(Date.now()-t0 < 3000, `veloce anche con tante parole (${Date.now()-t0} ms per 40 passi)`); }
// 3) crescere non cambia cosa sa
{ const n = new Rete({ D:8, H:8, seed:9 }); const ids = n.ids(frase); for (let i=0;i<30;i++) n.train([{ ids, lm:1, lab:[0,1,0,0,0,0,0,0], mask:[1,1,1,1,1,1,1,1] }], .02);
  let a = out(n, frase); n.deepen(); ok(diff(a, out(n, frase)) < 1e-6, "nuovo strato: stessa funzione");
  n.p.R1.d.forEach((v,i,arr) => arr[i] = (Math.random()-.5)*.3); a = out(n, frase);
  n.widen(16, 0); ok(diff(a.slice(-8), out(n, frase).slice(-8)) < 1e-4, "più neuroni (anche con 2 strati): stesse emozioni");
  a = out(n, frase); n.widenD(20); ok(diff(a, out(n, frase)) < 1e-6, "parole più ricche: stessa funzione");
  for (let i=0;i<20;i++) n.train([{ ids, lm:1 }], .02); ok(Number.isFinite(n.train([{ ids, lm:1 }], .02)), `continua a imparare (H ${n.H}, D ${n.D}, strati ${n.L}, ${n.params} parametri)`);
  // salvataggio a 16 bit
  const s = n.save(true), m = Rete.load(JSON.parse(JSON.stringify(s)));
  ok(m.L === n.L && m.H === n.H && m.D === n.D && diff(out(n, frase), out(m, frase)) < 2e-2, `salvataggio 16 bit: ${JSON.stringify(s).length} caratteri contro ${JSON.stringify(n.save()).length}`);
  const back = mezza.dec(mezza.enc(new Float32Array([0, 1, -2.5, 1e-5, 65000, 1e9, -3e-8]))); ok(Math.abs(back[2]+2.5) < 1e-3 && back[4] > 64000 && back[5] === 65504, "mezza precisione corretta");
}
