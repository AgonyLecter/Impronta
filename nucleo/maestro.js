/* nucleo · maestro
   Automatizza l'autoapprendimento della rete:
   - curriculum: mescola le tue frasi (per parlare e sentire) con l'istinto (solo per sentire)
   - etichette automatiche: emoji, segnali del linguaggio, tue conferme (pesi diversi per affidabilità)
   - autovalutazione: misura su esempi tenuti da parte, mai visti in allenamento
   - crescita: quando la rete smette di migliorare e ci sono abbastanza dati, aggiunge neuroni
   - incertezza: dice quando non è sicura, così l'app può chiederti "stai scherzando?"
   - studio: impara anche dalle letture (Wikipedia, libri…) e ricorda quali parole vengono da te e quali dai libri
   - limiti di crescita diversi: piccoli sul telefono (che si allena da solo), grandi sul server */
import { Rete, AFFETTI } from "./rete.js";
import { istinto } from "./istinto.js";

const tok = s => (s.toLowerCase().replace(/[’`]/g,"'").match(/[a-zàáèéìíòóùú]+/g) || []);
export const TELEFONO = { hmax: 192, lmax: 1, dmax: 40, vmax: 4000 };
export const SERVER = { hmax: 512, lmax: 4, dmax: 128, vmax: 12000 };
const arr = v => Array.isArray(v) ? v : v ? Object.values(v) : [];

export class Maestro {
  constructor(){ this.net = null; this.user = []; this.labels = new Map(); this.seedTrain = []; this.seedTest = []; this.userTest = []; this.libro = []; this.libroTest = []; this.libroSet = new Set(); this.studiate = new Set(); this.tue = new Set(); this.hist = []; this.best = Infinity; this.stall = 0; this.allow = new Set(); this.rounds = 0; this.lim = TELEFONO; }

  init({ saved, corpus = [], labels = [], seed = 7, letture = [], limiti = TELEFONO }){
    this.net = saved ? Rete.load(saved) : new Rete({ seed, H: 16 });
    this.seedTrain = []; this.seedTest = []; this.hist = []; this.best = Infinity; this.stall = 0; this.rounds = 0; this.studiate = new Set(); // init si può ripetere (rete arrivata dal server)
    // i limiti non possono essere sotto ciò che la rete è già diventata (una rete cresciuta sul server resta com'è)
    this.lim = { ...limiti, lmax: Math.max(limiti.lmax, this.net.L), dmax: Math.max(limiti.dmax, this.net.D) };
    if (saved && saved.maestro){ this.hist = arr(saved.maestro.hist); this.best = saved.maestro.best ?? Infinity; this.rounds = saved.maestro.rounds || 0; arr(saved.maestro.studiate).forEach(w => this.studiate.add(w)); }
    // istinto: 85% per imparare, 15% per verificarsi (scelta deterministica)
    const S = istinto(AFFETTI);
    S.forEach((e, i) => { const ex = { ids: this.net.ids(tok(e.text)), lm: 0, lab: e.lab, mask: AFFETTI.map(() => 1) }; (i % 7 === 3 ? this.seedTest : this.seedTrain).push(ex); });
    this.setCorpus(corpus, labels);
    this.setLetture(letture);
    return this.info();
  }
  /* letture: frasi studiate. Entrano nel vocabolario solo le parole viste almeno 2 volte (o già note),
     le più frequenti per prime, finché c'è posto; le altre diventano <unk> */
  setLetture(letture = []){
    this.libro = []; this.libroTest = []; this.libroSet = new Set();
    this.aggiungiLetture(letture);
  }
  /* letture in più (anche al volo, mentre parli: "cosa sai dei vulcani?" → legge Wikipedia e impara) */
  aggiungiLetture(letture = []){
    const L = letture.map(x => typeof x === "string" ? x : x && x.x).filter(Boolean); if (!L.length){ this.aggiornaAllow(); return 0; }
    const freq = new Map(); for (const l of L) for (const w of tok(l)) freq.set(w, (freq.get(w) || 0) + 1);
    let posto = Math.max(0, this.lim.vmax - this.net.V);
    const minimo = L.length < 200 ? 1 : 2;   // poche frasi lette al volo: entra ogni parola
    const nuove = [...freq].filter(([w, c]) => c >= minimo && !this.net.idx.has(w) && w.length < 24).sort((a, b) => b[1] - a[1]);
    const ok = new Set(); for (const [w] of nuove){ if (posto-- <= 0) break; ok.add(w); }
    const base = this.libro.length + this.libroTest.length; let n = 0;
    L.forEach((line, i) => {
      const ws = tok(line); if (ws.length < 3) return;
      const ids = ws.map(w => { if (this.net.idx.has(w)) return this.net.idx.get(w); if (ok.has(w)) return this.net.word(w); return 2; });
      for (const w of ws) if (!this.tue.has(w) && this.net.idx.has(w)) this.studiate.add(w);
      const ex = { ids, lm: 1, lab: null, mask: null, line };
      ((base + i) % 25 === 12 && this.libroTest.length < 40 ? this.libroTest : this.libro).push(ex); this.libroSet.add(ws.join(" ")); n++;
    });
    if (this.libro.length > 30000) this.libro.splice(0, this.libro.length - 30000);
    this.aggiornaAllow(); return n;
  }
  aggiornaAllow(){ this.allow = new Set(["</s>", ...this.tue, ...[...this.studiate].filter(w => this.net.idx.has(w))]); }
  /* le parole che conosce dai libri e non da te */
  lessico(){ return [...this.studiate].filter(w => !this.tue.has(w)); }
  setCorpus(corpus, labels = []){
    this.labels = new Map(labels.map(l => [l.x, l]));
    this.user = []; this.userTest = []; this.tue = new Set();
    corpus.forEach((line, i) => {
      const words = tok(line); if (!words.length) return; words.forEach(w => { this.tue.add(w); this.studiate.delete(w); });
      const L = this.labels.get(line);
      const ex = { ids: this.net.ids(words), lm: 1, lab: L ? L.l : null, mask: L ? L.m.map(m => m*(L.w ?? 1)) : null, line };
      (corpus.length >= 30 && i % 10 === 9 ? this.userTest : this.user).push(ex);
    });
    this.aggiornaAllow();
  }
  /* una nuova frase (con eventuali etichette) */
  osserva({ x, lab = null, mask = null, w = 1 }){
    const words = tok(x); if (!words.length) return;
    words.forEach(v => { this.allow.add(v); this.tue.add(v); this.studiate.delete(v); });
    const ex = { ids: this.net.ids(words), lm: 1, lab, mask: mask ? mask.map(m => m*w) : null, line: x };
    this.user.push(ex); if (this.user.length > 800) this.user.shift();
  }
  batch(n = 8){
    const out = [], r = this.net.r;
    for (let i=0;i<n;i++){
      // istinto (emozioni) · tue frasi · letture: le tue frasi restano le più importanti
      const x = r(), lib = this.libro.length > 0, u = this.user.length > 0;
      const pSeed = !u && !lib ? 1 : lib ? .25 : (this.user.length < 40 ? .6 : .35), pUser = !u ? 0 : lib ? .4 : 1 - pSeed;
      const src = x < pSeed ? this.seedTrain : x < pSeed + pUser ? this.user : this.libro;
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
    const legge = this.libroTest.length ? net.evalLoss(this.libroTest) : null;
    const score = bce/Math.max(1, this.seedTest.length) + (parla ?? 0) + (legge ?? 0)*.5;
    this.hist.push({ t: Date.now(), capisce: +capisce.toFixed(3), parla: parla != null ? +parla.toFixed(3) : null, legge: legge != null ? +legge.toFixed(3) : null, H: net.H, L: net.L }); if (this.hist.length > 80) this.hist.shift();
    let grew = null;
    if (grow){
      if (score < this.best*.98){ this.best = score; this.stall = 0; } else this.stall++;
      // quanto può crescere dipende da quanto ha da imparare: niente tetto fisso, solo quello della macchina che lo allena
      const N = this.user.length + this.seedTrain.length/6 + this.libro.length/4;
      const room = Math.min(this.lim.hmax, Math.round(16 + 6*Math.sqrt(N)));
      if (this.stall >= 3){
        const H = net.H;
        if (H < room){
          const to = Math.min(room, Math.ceil(H*1.5/8)*8); net.widen(to);
          const d = Math.min(this.lim.dmax, Math.ceil(to/4/8)*8); if (d > net.D) net.widenD(d);
          grew = { from: H, to, D: net.D }; this.stall = 0; this.best = Infinity;
        } else if (net.L < this.lim.lmax && H >= 128 && this.libro.length >= 1500*net.L){
          net.deepen(); grew = { from: H, to: H, strati: net.L }; this.stall = 0; this.best = Infinity;
        }
      }
    }
    return { capisce, parla, legge, grew };
  }
  senti(text){
    const words = tok(text); if (!words.length) return null;
    const f = this.net.fwd(this.net.idsLeggi(words), false), o = {};
    AFFETTI.forEach((k,i) => o[k] = +f.a[i].toFixed(3));
    const vals = Object.values(o), top = Math.max(...vals);
    o._top = AFFETTI[vals.indexOf(top)]; o._conf = top;
    o._incerto = top > .35 && top < .62;
    return o;
  }
  parla({ seeds = [], n = 40, k = 6, max = 12, temp = .8, libero = true }){
    if (this.user.length < 6 || this.net.steps < 600) return [];
    const known = new Set(this.user.map(e => e.line).filter(Boolean)), seen = new Set(), out = [];
    const lines = [...known].map(l => new Set(tok(l)));
    // per parlare di un argomento parte dall'inizio di una tua frase che lo contiene, poi prende un'altra strada
    const prefixes = [];
    for (const sd of seeds){ for (const e of this.user){ if (!e.line) continue; const ws = tok(e.line), j = ws.indexOf(sd); if (j >= 0) prefixes.push(ws.slice(0, Math.max(1, j))); } }
    for (let i=0;i<n;i++){
      const seed = prefixes.length && i % 3 === 0 ? prefixes[Math.floor(this.net.r()*prefixes.length)] : [];
      const g = this.net.gen({ seed, allow: libero ? this.allow : new Set(["</s>", ...this.tue]), temp: temp + (i%3)*.12, max });
      const ws = g.x.split(" ");
      if (ws.length < 3 || seen.has(g.x) || known.has(g.x) || this.libroSet.has(g.x)) continue;   // niente copie, né tue né dei libri
      // deve essere davvero nuova: non una tua frase con una parola cambiata
      const set = new Set(ws); let maxJ = 0;
      for (const L of lines){ let inter = 0; for (const w of L) if (set.has(w)) inter++; const j = inter / (L.size + set.size - inter); if (j > maxJ) maxJ = j; }
      if (maxJ > .6) continue;
      seen.add(g.x);
      const rel = seeds.filter(s => ws.includes(s)).length;
      out.push({ x: g.x, lp: g.lp, rel, libro: ws.filter(w => this.studiate.has(w) && !this.tue.has(w)) });
    }
    return out.sort((a,b) => (b.rel - a.rel) || (b.lp - a.lp)).slice(0, k);
  }
  info(){ const n = this.net; return { H: n.H, D: n.D, L: n.L, V: n.V, params: n.params, steps: n.steps, growth: n.growth, hist: this.hist, frasi: this.user.length + this.userTest.length, letture: this.libro.length + this.libroTest.length, studiate: this.lessico().length, last: this.hist[this.hist.length-1] || null }; }
  save(half = false){ const d = this.net.save(half); d.maestro = { hist: this.hist, best: Number.isFinite(this.best) ? this.best : null, rounds: this.rounds, studiate: this.lessico() }; return d; }
}
