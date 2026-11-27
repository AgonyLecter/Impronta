/* nucleo · maestro
   Automatizza l'autoapprendimento della rete:
   - curriculum: mescola le tue frasi (per parlare e sentire) con l'istinto (solo per sentire)
   - etichette automatiche: emoji, segnali del linguaggio, tue conferme (pesi diversi per affidabilità)
   - autovalutazione: misura su esempi tenuti da parte, mai visti in allenamento
   - crescita: quando la rete smette di migliorare e ci sono abbastanza dati, aggiunge neuroni
   - incertezza: dice quando non è sicura, così l'app può chiederti "stai scherzando?" */
import { Rete, AFFETTI } from "./rete.js";
import { istinto } from "./istinto.js";

const tok = s => (s.toLowerCase().replace(/[’`]/g,"'").match(/[a-zàáèéìíòóùú]+/g) || []);
const HMAX = 192;

export class Maestro {
  constructor(){ this.net = null; this.user = []; this.labels = new Map(); this.seedTrain = []; this.seedTest = []; this.userTest = []; this.hist = []; this.best = Infinity; this.stall = 0; this.allow = new Set(); this.rounds = 0; }

  init({ saved, corpus = [], labels = [], seed = 7 }){
    this.net = saved ? Rete.load(saved) : new Rete({ seed, H: 16 });
    this.seedTrain = []; this.seedTest = []; this.hist = []; this.best = Infinity; this.stall = 0; this.rounds = 0; // init si può ripetere (rete arrivata dal server)
    if (saved && saved.maestro){ this.hist = saved.maestro.hist || []; this.best = saved.maestro.best ?? Infinity; this.rounds = saved.maestro.rounds || 0; }
    // istinto: 85% per imparare, 15% per verificarsi (scelta deterministica)
    const S = istinto(AFFETTI);
    S.forEach((e, i) => { const ex = { ids: this.net.ids(tok(e.text)), lm: 0, lab: e.lab, mask: AFFETTI.map(() => 1) }; (i % 7 === 3 ? this.seedTest : this.seedTrain).push(ex); });
    this.setCorpus(corpus, labels);
    return this.info();
  }
  setCorpus(corpus, labels = []){
    this.labels = new Map(labels.map(l => [l.x, l]));
    this.user = []; this.userTest = []; this.allow = new Set(["</s>"]);
    corpus.forEach((line, i) => {
      const words = tok(line); if (!words.length) return; words.forEach(w => this.allow.add(w));
      const L = this.labels.get(line);
      const ex = { ids: this.net.ids(words), lm: 1, lab: L ? L.l : null, mask: L ? L.m.map(m => m*(L.w ?? 1)) : null, line };
      (corpus.length >= 30 && i % 10 === 9 ? this.userTest : this.user).push(ex);
    });
  }
  /* una nuova frase (con eventuali etichette) */
  osserva({ x, lab = null, mask = null, w = 1 }){
    const words = tok(x); if (!words.length) return;
    words.forEach(v => this.allow.add(v));
    const ex = { ids: this.net.ids(words), lm: 1, lab, mask: mask ? mask.map(m => m*w) : null, line: x };
    this.user.push(ex); if (this.user.length > 800) this.user.shift();
  }
  batch(n = 8){
    const out = [], r = this.net.r;
    for (let i=0;i<n;i++){
      const useSeed = !this.user.length || r() < (this.user.length < 40 ? .6 : .35);
      const src = useSeed ? this.seedTrain : this.user;
      const ex = src[Math.floor(r()*src.length)];
      out.push({ ...ex, drop: .25 });
    }
    return out;
  }
  /* allena per un tempo dato (ms); restituisce le statistiche */
  impara(ms = 300){
    const t0 = Date.now(); let loss = 0, n = 0;
    while (Date.now() - t0 < ms){ loss += this.net.train(this.batch(8), .008); n++; }
    this.rounds++;
    const out = { ...this.info(), loss: n ? loss/n : null, batches: n };
    if (this.rounds % 4 === 0) Object.assign(out, this.valuta(true));
    return out;
  }
  /* autovalutazione su esempi mai visti + politica di crescita */
  valuta(grow = false){
    const net = this.net;
    // comprensione emotiva: per ogni frase di prova, l'emozione più forte è giusta?
    let ok = 0, tot = 0, bce = 0;
    for (const ex of this.seedTest){
      const f = net.fwd(ex.ids, false), a = f.a;
      const want = ex.lab.map((v,i) => v ? i : -1).filter(i => i >= 0);
      const top = a.indexOf(Math.max(...a));
      if (want.length){ tot++; if (want.includes(top) && a[top] > .3) ok++; }
      else { tot++; if (Math.max(...a) < .5) ok++; }
      for (let k=0;k<a.length;k++) bce -= ex.lab[k]*Math.log(a[k]+1e-7) + (1-ex.lab[k])*Math.log(1-a[k]+1e-7);
    }
    const capisce = tot ? ok/tot : 0;
    const parla = this.userTest.length ? net.evalLoss(this.userTest.map(e => ({ ...e, lab:null }))) : null;
    const score = bce/Math.max(1, this.seedTest.length) + (parla ?? 0);
    this.hist.push({ t: Date.now(), capisce: +capisce.toFixed(3), parla: parla != null ? +parla.toFixed(3) : null, H: net.H }); if (this.hist.length > 80) this.hist.shift();
    let grew = null;
    if (grow){
      if (score < this.best*.98){ this.best = score; this.stall = 0; } else this.stall++;
      const data = this.user.length + this.seedTrain.length/3;
      const room = Math.min(HMAX, Math.round(16 + 6*Math.sqrt(this.user.length + this.seedTrain.length/6)));
      if (this.stall >= 3 && net.H < room){
        const to = Math.min(room, Math.ceil(net.H*1.5/8)*8);
        net.widen(to); grew = { to, from: net.growth[net.growth.length-1].from }; this.stall = 0; this.best = Infinity;
      }
    }
    return { capisce, parla, grew };
  }
  senti(text){
    const words = tok(text); if (!words.length) return null;
    const f = this.net.fwd(this.net.ids(words, false), false), o = {};
    AFFETTI.forEach((k,i) => o[k] = +f.a[i].toFixed(3));
    const vals = Object.values(o), top = Math.max(...vals);
    o._top = AFFETTI[vals.indexOf(top)]; o._conf = top;
    o._incerto = top > .35 && top < .62;
    return o;
  }
  parla({ seeds = [], n = 40, k = 6, max = 12, temp = .8 }){
    if (this.user.length < 6 || this.net.steps < 600) return [];
    const known = new Set(this.user.map(e => e.line).filter(Boolean)), seen = new Set(), out = [];
    const lines = [...known].map(l => new Set(tok(l)));
    // per parlare di un argomento parte dall'inizio di una tua frase che lo contiene, poi prende un'altra strada
    const prefixes = [];
    for (const sd of seeds){ for (const e of this.user){ if (!e.line) continue; const ws = tok(e.line), j = ws.indexOf(sd); if (j >= 0) prefixes.push(ws.slice(0, Math.max(1, j))); } }
    for (let i=0;i<n;i++){
      const seed = prefixes.length && i % 3 === 0 ? prefixes[Math.floor(this.net.r()*prefixes.length)] : [];
      const g = this.net.gen({ seed, allow: this.allow, temp: temp + (i%3)*.12, max });
      const ws = g.x.split(" ");
      if (ws.length < 3 || seen.has(g.x) || known.has(g.x)) continue;
      // deve essere davvero nuova: non una tua frase con una parola cambiata
      const set = new Set(ws); let maxJ = 0;
      for (const L of lines){ let inter = 0; for (const w of L) if (set.has(w)) inter++; const j = inter / (L.size + set.size - inter); if (j > maxJ) maxJ = j; }
      if (maxJ > .6) continue;
      seen.add(g.x);
      const rel = seeds.filter(s => ws.includes(s)).length;
      out.push({ x: g.x, lp: g.lp, rel });
    }
    return out.sort((a,b) => (b.rel - a.rel) || (b.lp - a.lp)).slice(0, k);
  }
  info(){ const n = this.net; return { H: n.H, D: n.D, V: n.V, params: n.params, steps: n.steps, growth: n.growth, hist: this.hist, frasi: this.user.length + this.userTest.length, last: this.hist[this.hist.length-1] || null }; }
  save(){ const d = this.net.save(); d.maestro = { hist: this.hist, best: Number.isFinite(this.best) ? this.best : null, rounds: this.rounds }; return d; }
}
