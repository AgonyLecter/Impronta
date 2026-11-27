/* impronta · la rete vive qui, in un thread separato: si allena senza fermare le animazioni */
import { Rete } from "./rete.js";

let net = null, corpus = [];

function speak({ seeds = [], near = [], n = 40, temp = 1.05, max = 12, k = 6 }){
  if (!net || corpus.length < 6) return [];
  const known = new Set(corpus), seen = new Set(), out = [];
  for (let i=0;i<n;i++){
    const g = net.gen({ temp: temp + (i%3)*.1, max });
    if (!g.x || g.x.split(" ").length < 3 || known.has(g.x) || seen.has(g.x)) continue;
    // scarta le frasi che sono solo un pezzo copiato di una tua frase
    if (corpus.some(l => l.includes(g.x))) continue;
    seen.add(g.x);
    const ws = g.x.split(" ");
    const rel = seeds.filter(s => ws.includes(s)).length*1 + near.filter(s => ws.includes(s)).length*.5;
    out.push({ x: g.x, lp: g.lp, rel });
  }
  return out.sort((a,b) => (b.rel - a.rel) || (b.lp - a.lp)).slice(0, k);
}

function handle(op, d){
  switch (op){
    case "init": net = d.saved ? Rete.load(d.saved) : new Rete({ seed: d.seed || 7 }); corpus = d.corpus || []; return info();
    case "corpus": corpus = d.corpus || []; return info();
    case "train": { const l = net.train(corpus, d.n || 300); return { ...info(), loss: l }; }
    case "speak": return speak(d);
    case "score": return d.lines.map(l => net.score(l));
    case "near": return net.near(d.w, d.n || 3, d.among || null);
    case "map": return net.map(d.words);
    case "save": return net.save();
  }
  throw new Error("op sconosciuta " + op);
}
function info(){ return { V: net.V, steps: net.steps, loss: net.loss, hist: net.lossHist, params: net.params }; }

// funziona sia come worker sia importato direttamente (fallback)
export { handle };
if (typeof self !== "undefined" && typeof window === "undefined"){
  self.onmessage = e => {
    const { id, op, ...d } = e.data;
    try { self.postMessage({ id, res: handle(op, d) }); }
    catch (err){ self.postMessage({ id, err: String(err && err.message || err) }); }
  };
}
