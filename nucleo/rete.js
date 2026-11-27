/* nucleo · rete
   Rete neurale ricorrente (GRU) scritta da zero, che CRESCE DA SOLA, in larghezza e in profondità.
   - parla: modello di linguaggio parola per parola
   - sente: testa affettiva che stima gioia, tristezza, rabbia, paura, affetto, ironia, stanchezza, sorpresa
   - generalizza: ogni parola è anche la somma dei suoi trigrammi di lettere (triste ≈ tristezza ≈ tristissimo)
   - cresce in larghezza: aggiunge neuroni con Net2Wider (la funzione resta identica, poi impara di più)
   - cresce in profondità: aggiunge strati residui che nascono "spenti" (R = 0) e si accendono imparando
   - allarga le parole: embedding più ricchi (nuove dimensioni con pesi d'ingresso a zero)
   - vocabolario grande: softmax campionata in allenamento (costo indipendente dal numero di parole)
   Backprop through time e ottimizzatore Adam scritti a mano. */

export const AFFETTI = ["gioia","tristezza","rabbia","paura","affetto","ironia","stanchezza","sorpresa"];
const K = AFFETTI.length, BUCKETS = 2048, SAMPLE = 700, NEG = 256;
const GATES = ["Wz","Wr","Wn","Uz","Ur","Un","bz","br","bn"];

function rng(seed){ let a = seed|0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function randn(r){ let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
const sig = x => 1/(1+Math.exp(-x));
function hash(s){ let h = 2166136261; for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h>>>0) % BUCKETS; }
function trigrams(w){ if (w.startsWith("<")) return []; const s = "<"+w+">", out = []; for (let i=0;i<s.length-2;i++) out.push(hash(s.slice(i,i+3))); return out; }
const b64 = {
  enc(ta){ const u = new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength); let s = ""; for (let i=0;i<u.length;i+=0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i+0x8000)); return btoa(s); },
  bytes(str){ const s = atob(str), u = new Uint8Array(s.length); for (let i=0;i<s.length;i++) u[i] = s.charCodeAt(i); return u; },
  dec(str){ return new Float32Array(this.bytes(str).buffer); }
};
/* mezza precisione (16 bit): la rete pesa la metà quando viaggia verso il telefono */
const _f = new Float32Array(1), _u = new Uint32Array(_f.buffer);
function toHalf(v){
  _f[0] = v; const x = _u[0], s = (x >>> 16) & 0x8000, e = ((x >>> 23) & 0xff) - 112; let m = x & 0x7fffff;
  if (e <= 0){ if (e < -10) return s; m = (m | 0x800000) >> (1 - e); return s | ((m + 0x1000) >> 13); }
  if (e >= 31) return s | 0x7bff;                       // satura al massimo finito
  return s | Math.min(0x7bff, (e << 10) + ((m + 0x1000) >> 13));
}
let HALF = null;
function halfTable(){ if (HALF) return HALF; HALF = new Float32Array(65536);
  for (let h=0;h<65536;h++){ const s = h & 0x8000 ? -1 : 1, e = (h >> 10) & 31, m = h & 1023;
    HALF[h] = e === 0 ? s*m*5.960464477539063e-8 : e === 31 ? (m ? NaN : s*Infinity) : s*(1 + m/1024)*Math.pow(2, e-15); }
  return HALF; }
export const mezza = { toHalf, enc(f32){ const h = new Uint16Array(f32.length); for (let i=0;i<f32.length;i++) h[i] = toHalf(f32[i]); return b64.enc(h); },
  dec(str){ const T = halfTable(), u = b64.bytes(str), h = new Uint16Array(u.buffer, 0, u.length >> 1), o = new Float32Array(h.length); for (let i=0;i<h.length;i++) o[i] = T[h[i]]; return o; } };

/* parametro: matrice righe×colonne. Gradiente e stato di Adam nascono solo quando servono
   (un telefono che usa soltanto una rete grande non spreca memoria per allenarla) */
class P {
  constructor(r, c, init){ this.r = r; this.c = c; this.d = new Float32Array(r*c); this._g = this._m = this._v = null; if (init) for (let i=0;i<this.d.length;i++) this.d[i] = init(); }
  get g(){ return this._g || (this._g = new Float32Array(this.d.length)); }
  get m(){ return this._m || (this._m = new Float32Array(this.d.length)); }
  get v(){ return this._v || (this._v = new Float32Array(this.d.length)); }
  get size(){ return this.r*this.c; }
  reset(){ this._m = this._v = null; }
  addRows(k, init){ // per il vocabolario che cresce
    const n = (this.r+k)*this.c, old = this.r*this.c;
    if (n > this.d.length){ const cap = Math.ceil(n*1.5), grow = a => { const b = new Float32Array(cap); b.set(a.subarray(0, old)); return b; };
      this.d = grow(this.d); if (this._g) this._g = grow(this._g); if (this._m) this._m = grow(this._m); if (this._v) this._v = grow(this._v); }
    for (let i=old;i<n;i++){ this.d[i] = init ? init() : 0; if (this._g) this._g[i] = 0; if (this._m) this._m[i] = 0; if (this._v) this._v[i] = 0; }
    this.r += k;
  }
  addCols(k, init){ // per parole più ricche: nuove colonne in coda a ogni riga
    const c = this.c + k, d = new Float32Array(this.r*c);
    for (let i=0;i<this.r;i++){ d.set(this.d.subarray(i*this.c, (i+1)*this.c), i*c); for (let j=this.c;j<c;j++) d[i*c+j] = init ? init() : 0; }
    this.d = d; this.c = c; this._g = this._m = this._v = null;
  }
}

export class Rete {
  constructor(o = {}){
    this.D = o.D || 40; this.H = o.H || 16; this.L = 1; this.r = rng(o.seed || 7);
    this.vocab = []; this.idx = new Map(); this.tri = [];
    const D = this.D, H = this.H, r = this.r, s = (n) => () => randn(r)*Math.sqrt(1/n);
    this.p = {
      E: new P(0, D), C: new P(BUCKETS, D, () => randn(r)*.05),
      Wz: new P(H, D, s(D)), Wr: new P(H, D, s(D)), Wn: new P(H, D, s(D)),
      Uz: new P(H, H, s(H)), Ur: new P(H, H, s(H)), Un: new P(H, H, s(H)),
      bz: new P(H, 1), br: new P(H, 1), bn: new P(H, 1),
      Wo: new P(0, H), bo: new P(0, 1),
      Wa: new P(K, H, s(H)), ba: new P(K, 1, () => -1.5)
    };
    this.t = 0; this.steps = 0; this.growth = [];
    this.word("<s>"); this.word("</s>"); this.word("<unk>");
  }
  get V(){ return this.vocab.length; }
  get params(){ return Object.values(this.p).reduce((s, q) => s + q.size, 0); }
  word(w){
    if (this.idx.has(w)) return this.idx.get(w);
    const i = this.vocab.length; this.vocab.push(w); this.idx.set(w, i); this.tri.push(trigrams(w));
    this.p.E.addRows(1, () => randn(this.r)*.05); this.p.Wo.addRows(1, () => randn(this.r)*.02); this.p.bo.addRows(1);
    return i;
  }
  ids(words, add = true){ return words.map(w => add ? this.word(w) : (this.idx.has(w) ? this.idx.get(w) : 2)); }
  emb(id, drop = false){ const D = this.D, x = new Float32Array(D), E = this.p.E.d, C = this.p.C.d, tr = this.tri[id];
    if (!drop) for (let i=0;i<D;i++) x[i] = E[id*D+i];
    if (tr.length){ const k = 1/tr.length; for (const b of tr) for (let i=0;i<D;i++) x[i] += C[b*D+i]*k; }
    return x; }
  /* i parametri di uno strato: lo strato 0 legge le parole, gli altri leggono lo strato sotto */
  lay(l){ const s = l ? String(l) : "", p = this.p, o = { IN: l ? this.H : this.D, R: l ? p["R"+s] : null }; for (const k of GATES) o[k] = p[k+s]; return o; }

  /* ---------- uno strato GRU su tutta la frase ---------- */
  gru(Lp, IN, xs){
    const H = this.H, out = []; let h = new Float32Array(H);
    const Wz = Lp.Wz.d, Wr = Lp.Wr.d, Wn = Lp.Wn.d, Uz = Lp.Uz.d, Ur = Lp.Ur.d, Un = Lp.Un.d, bz = Lp.bz.d, br = Lp.br.d, bn = Lp.bn.d;
    for (const x of xs){
      const z = new Float32Array(H), rr = new Float32Array(H), n = new Float32Array(H), Unh = new Float32Array(H), hn = new Float32Array(H);
      for (let j=0;j<H;j++){
        let sz = bz[j], sr = br[j], sn = bn[j], uz = 0, ur = 0, un = 0;
        const oj = j*IN, hj = j*H;
        for (let i=0;i<IN;i++){ const xi = x[i]; sz += Wz[oj+i]*xi; sr += Wr[oj+i]*xi; sn += Wn[oj+i]*xi; }
        for (let i=0;i<H;i++){ const hi = h[i]; uz += Uz[hj+i]*hi; ur += Ur[hj+i]*hi; un += Un[hj+i]*hi; }
        z[j] = sig(sz+uz); rr[j] = sig(sr+ur); Unh[j] = un; n[j] = Math.tanh(sn + rr[j]*un);
        hn[j] = (1-z[j])*n[j] + z[j]*h[j];
      }
      out.push({ x, hp: h, z, r: rr, n, Unh, h: hn });
      h = hn;
    }
    return out;
  }
  /* backprop through time di uno strato: ext[t] = gradiente che arriva da sopra su h_t; restituisce il gradiente sugli ingressi */
  bptt(Lp, IN, sts, ext){
    const H = this.H, T = sts.length, dIn = new Array(T); let carry = new Float32Array(H);
    for (let t=T-1;t>=0;t--){
      const s = sts[t], d = new Float32Array(H), dhp = new Float32Array(H), dx = new Float32Array(IN);
      for (let j=0;j<H;j++) d[j] = ext[t][j] + carry[j];
      for (let j=0;j<H;j++){
        const dn = d[j]*(1-s.z[j]), dz = d[j]*(s.hp[j]-s.n[j]);
        dhp[j] += d[j]*s.z[j];
        const dnp = dn*(1-s.n[j]*s.n[j]);
        const dr = dnp*s.Unh[j], drp = dr*s.r[j]*(1-s.r[j]), dzp = dz*s.z[j]*(1-s.z[j]), du = dnp*s.r[j];
        Lp.bn.g[j] += dnp; Lp.br.g[j] += drp; Lp.bz.g[j] += dzp;
        const oj = j*IN, hj = j*H, gWn = Lp.Wn.g, gWr = Lp.Wr.g, gWz = Lp.Wz.g, Wn = Lp.Wn.d, Wr = Lp.Wr.d, Wz = Lp.Wz.d;
        for (let i=0;i<IN;i++){ const xi = s.x[i];
          gWn[oj+i] += dnp*xi; gWr[oj+i] += drp*xi; gWz[oj+i] += dzp*xi;
          dx[i] += Wn[oj+i]*dnp + Wr[oj+i]*drp + Wz[oj+i]*dzp; }
        const gUn = Lp.Un.g, gUr = Lp.Ur.g, gUz = Lp.Uz.g, Un = Lp.Un.d, Ur = Lp.Ur.d, Uz = Lp.Uz.d;
        for (let i=0;i<H;i++){ const hi = s.hp[i];
          gUn[hj+i] += du*hi; gUr[hj+i] += drp*hi; gUz[hj+i] += dzp*hi;
          dhp[i] += Un[hj+i]*du + Ur[hj+i]*drp + Uz[hj+i]*dzp; }
      }
      dIn[t] = dx; carry = dhp;
    }
    return dIn;
  }

  /* ---------- forward su una frase ----------
     strato 0: y0 = h0;  strato l: y_l = y_(l-1) + R_l · h_l  (residuo: un nuovo strato con R = 0 non cambia nulla) */
  fwd(ids, lm = true, drop = 0){
    const H = this.H, seq = [0, ...ids], T = seq.length, xs = [], meta = [];
    for (let t=0;t<T;t++){ const dw = drop > 0 && t > 0 && this.tri[seq[t]].length > 0 && this.r() < drop; xs.push(this.emb(seq[t], dw)); meta.push({ id: seq[t], dw }); }
    const layers = [this.gru(this.lay(0), this.D, xs)];
    let ys = layers[0].map(s => s.h);
    for (let l=1;l<this.L;l++){
      const Lp = this.lay(l), st = this.gru(Lp, H, ys), R = Lp.R.d; layers.push(st);
      ys = ys.map((y, t) => { const o = new Float32Array(H), h = st[t].h; for (let j=0;j<H;j++){ let s = y[j]; const oj = j*H; for (let i=0;i<H;i++) s += R[oj+i]*h[i]; o[j] = s; } return o; });
    }
    const st = meta.map((m, t) => ({ ...m, h: ys[t] }));
    const pool = new Float32Array(H); for (const y of ys) for (let j=0;j<H;j++) pool[j] += y[j]/T;
    const p = this.p, a = new Float32Array(K);
    for (let k=0;k<K;k++){ let s = p.ba.d[k]; for (let j=0;j<H;j++) s += p.Wa.d[k*H+j]*pool[j]; a[k] = sig(s); }
    return { st, layers, pool, a, T };
  }
  probs(h){ const V = this.V, H = this.H, Wo = this.p.Wo.d, bo = this.p.bo.d, z = new Float32Array(V); let mx = -1e9;
    for (let v=0;v<V;v++){ let s = bo[v]; const o = v*H; for (let j=0;j<H;j++) s += Wo[o+j]*h[j]; z[v] = s; if (s > mx) mx = s; }
    let sum = 0; for (let v=0;v<V;v++){ z[v] = Math.exp(z[v]-mx); sum += z[v]; } for (let v=0;v<V;v++) z[v] /= sum; return z; }

  /* ---------- backward: accumula i gradienti, restituisce la perdita ----------
     ex = { ids, lm: peso della parte linguistica, lab: [K] in 0..1 o null, mask: [K] pesi }
     full = softmax su tutto il vocabolario (valutazione); altrimenti, se le parole sono tante, campionata */
  grad(ex, full = false){
    const H = this.H, p = this.p, f = this.fwd(ex.ids, true, ex.drop || 0), { st, pool, a, T } = f;
    let loss = 0;
    const dh = st.map(() => new Float32Array(H));
    // testa affettiva (BCE sulle dimensioni etichettate)
    if (ex.lab){
      const dpool = new Float32Array(H);
      for (let k=0;k<K;k++){ const w = ex.mask ? ex.mask[k] : 1; if (!w) continue;
        const y = ex.lab[k]; loss -= w*(y*Math.log(a[k]+1e-7) + (1-y)*Math.log(1-a[k]+1e-7));
        const g = w*(a[k]-y); p.ba.g[k] += g; for (let j=0;j<H;j++){ p.Wa.g[k*H+j] += g*pool[j]; dpool[j] += g*p.Wa.d[k*H+j]; } }
      for (let t=0;t<T;t++) for (let j=0;j<H;j++) dh[t][j] += dpool[j]/T;
    }
    // testa linguistica: da y_t prevede la parola t+1 (e </s> alla fine)
    if (ex.lm){
      const tgt = [...ex.ids, 1], wl = ex.lm/T, Wo = p.Wo.d, bo = p.bo.d, gWo = p.Wo.g, gbo = p.bo.g;
      let cand = null;
      if (!full && this.V > SAMPLE){   // softmax campionata: le parole giuste + NEG parole a caso
        const rr = rng((Math.imul(this.steps + 1, 2654435761) ^ Math.imul(tgt[0] + 7, 40503) ^ T) | 0), set = new Set(tgt);
        while (set.size < tgt.length + NEG) set.add(3 + Math.floor(rr()*(this.V - 3)));
        cand = [...set];
      }
      const NC = cand ? cand.length : this.V, z = new Float32Array(NC);
      for (let t=0;t<T;t++){
        const h = st[t].h, y = tgt[t]; let mx = -1e9, yi = -1;
        for (let c=0;c<NC;c++){ const v = cand ? cand[c] : c, o = v*H; let s = bo[v]; for (let j=0;j<H;j++) s += Wo[o+j]*h[j]; z[c] = s; if (s > mx) mx = s; if (v === y) yi = c; }
        let sum = 0; for (let c=0;c<NC;c++){ z[c] = Math.exp(z[c]-mx); sum += z[c]; }
        loss -= wl*Math.log(z[yi]/sum + 1e-9);
        for (let c=0;c<NC;c++){ const v = cand ? cand[c] : c, g = wl*(z[c]/sum - (c===yi?1:0)); if (Math.abs(g) < 1e-7) continue; gbo[v] += g; const o = v*H, dht = dh[t]; for (let j=0;j<H;j++){ gWo[o+j] += g*h[j]; dht[j] += g*Wo[o+j]; } }
      }
    }
    // dall'alto verso il basso: ogni strato residuo, poi lo strato delle parole
    let dY = dh;
    for (let l=this.L-1;l>=1;l--){
      const Lp = this.lay(l), sl = f.layers[l], R = Lp.R, Rd = R.d, Rg = R.g, ext = sl.map(() => new Float32Array(H));
      for (let t=0;t<T;t++){ const dy = dY[t], h = sl[t].h, e = ext[t];
        for (let j=0;j<H;j++){ const g = dy[j]; if (!g) continue; const o = j*H; for (let i=0;i<H;i++){ Rg[o+i] += g*h[i]; e[i] += g*Rd[o+i]; } } }
      const dIn = this.bptt(Lp, H, sl, ext);
      dY = dY.map((dy, t) => { const o = new Float32Array(H), di = dIn[t]; for (let j=0;j<H;j++) o[j] = dy[j] + di[j]; return o; });
    }
    const dX = this.bptt(this.lay(0), this.D, f.layers[0], dY), D = this.D;
    // embedding: parola + trigrammi
    for (let t=0;t<T;t++){
      const id = st[t].id, tr = this.tri[id], dx = dX[t];
      if (!st[t].dw) for (let i=0;i<D;i++) p.E.g[id*D+i] += dx[i];
      if (tr.length){ const k = 1/tr.length; for (const b of tr) for (let i=0;i<D;i++) p.C.g[b*D+i] += dx[i]*k; }
    }
    return loss;
  }
  /* ---------- Adam ---------- */
  update(lr = .01, n = 1, clip = 5, wd = 2e-4){
    this.t++; const b1 = .9, b2 = .999, c1 = 1 - Math.pow(b1, this.t), c2 = 1 - Math.pow(b2, this.t);
    let norm = 0; for (const q of Object.values(this.p)){ const g = q.g; for (let i=0;i<q.size;i++){ g[i] /= n; norm += g[i]*g[i]; } }
    norm = Math.sqrt(norm); const sc = norm > clip ? clip/norm : 1;
    for (const q of Object.values(this.p)){ const { d, g, m, v } = q;
      for (let i=0;i<q.size;i++){ const gi = g[i]*sc; if (gi === 0 && m[i] === 0) continue; m[i] = b1*m[i] + (1-b1)*gi; v[i] = b2*v[i] + (1-b2)*gi*gi; d[i] -= lr*((m[i]/c1)/(Math.sqrt(v[i]/c2)+1e-8) + wd*d[i]); g[i] = 0; } }
    return norm;
  }
  /* allena su un lotto di esempi */
  train(batch, lr = .01){ let loss = 0; for (const ex of batch) loss += this.grad(ex); this.update(lr, batch.length); this.steps += batch.length; return loss/batch.length; }
  /* perdita senza aggiornare (per la valutazione, sempre sul vocabolario intero) */
  evalLoss(exs){ let loss = 0; for (const ex of exs){ loss += this.grad(ex, true); } for (const q of Object.values(this.p)) q.g.fill(0); return exs.length ? loss/exs.length : null; }

  /* ---------- usi ---------- */
  feel(words){ const f = this.fwd(this.ids(words, false)); const o = {}; AFFETTI.forEach((k,i) => o[k] = +f.a[i].toFixed(3)); return o; }
  gen({ seed = [], allow = null, temp = .85, max = 12 } = {}){
    const { D, H } = this, out = [];
    let ids = [], lp = 0, n = 0;
    for (const w of seed) if (this.idx.has(w)){ ids.push(this.idx.get(w)); out.push(w); }
    for (let t=0;t<max;t++){
      const f = this.fwd(ids, false), h = f.st[f.st.length-1].h, pr = this.probs(h);
      pr[0] = 0; pr[2] = 0; if (out.length < 2) pr[1] = 0;
      if (allow) for (let v=3;v<pr.length;v++) if (!allow.has(this.vocab[v])) pr[v] = 0;
      for (const w of out.slice(-3)) pr[this.idx.get(w)] *= .1;
      let sum = 0; for (let v=0;v<pr.length;v++){ pr[v] = Math.pow(pr[v], 1/temp); sum += pr[v]; }
      if (!sum) break;
      let r = this.r()*sum, y = 1; for (let v=0;v<pr.length;v++){ r -= pr[v]; if (r <= 0){ y = v; break; } }
      lp += Math.log(pr[y]/sum + 1e-9); n++;
      if (y === 1) break; ids.push(y); out.push(this.vocab[y]);
    }
    return { x: out.join(" "), lp: n ? lp/n : -9 };
  }
  vec(w){ if (!this.idx.has(w)) return null; return this.emb(this.idx.get(w)); }
  sim(a, b){ const x = this.vec(a), y = this.vec(b); if (!x || !y) return 0; let d=0, nx=0, ny=0; for (let i=0;i<x.length;i++){ d+=x[i]*y[i]; nx+=x[i]*x[i]; ny+=y[i]*y[i]; } return d/Math.sqrt(nx*ny+1e-9); }
  near(w, n = 3, among = null){ return (among || this.vocab.slice(3)).filter(v => v !== w && this.idx.has(v)).map(v => [v, this.sim(w, v)]).sort((a,b) => b[1]-a[1]).slice(0, n); }
  map(words){
    const ws = words.filter(w => this.idx.has(w)); if (ws.length < 3) return [];
    const X = ws.map(w => Array.from(this.vec(w))), E = this.D, mean = Array(E).fill(0);
    X.forEach(x => x.forEach((v,i) => mean[i] += v/X.length)); X.forEach(x => x.forEach((v,i) => x[i] = v - mean[i]));
    const comps = [];
    for (let c=0;c<2;c++){ let v = Array.from({length:E}, () => this.r()-.5);
      for (let it=0;it<40;it++){ const nv = Array(E).fill(0);
        for (const x of X){ let d = 0; for (let i=0;i<E;i++) d += x[i]*v[i]; for (let i=0;i<E;i++) nv[i] += d*x[i]; }
        for (const q of comps){ let d = 0; for (let i=0;i<E;i++) d += nv[i]*q[i]; for (let i=0;i<E;i++) nv[i] -= d*q[i]; }
        const nn = Math.hypot(...nv) || 1; v = nv.map(t => t/nn); }
      comps.push(v); }
    return ws.map((w, k) => ({ w, x: X[k].reduce((s,t,i)=>s+t*comps[0][i],0), y: X[k].reduce((s,t,i)=>s+t*comps[1][i],0) }));
  }


  /* ---------- crescita in larghezza: Net2Wider su tutti gli strati (aggiunge neuroni senza cambiare cosa sa) ---------- */
  widen(newH, noise = .01){
    const H = this.H; if (newH <= H) return;
    const g = Array.from({length:newH}, (_, i) => i < H ? i : Math.floor(this.r()*H));
    const cnt = new Float32Array(H); g.forEach(o => cnt[o]++);
    const p = this.p, D = this.D, nz = () => (this.r()-.5)*2*noise;
    // righe duplicate (con un filo di rumore per rompere la simmetria), colonne nello spazio dei neuroni divise
    const rows = (q, cols) => { const n = new P(newH, cols); for (let i=0;i<newH;i++) for (let j=0;j<cols;j++){ const v = q.d[g[i]*cols+j]; n.d[i*cols+j] = v + (i>=H ? nz()*Math.abs(v) : 0); } return n; };
    const rec = (q, noisy) => { const n = new P(newH, newH); for (let i=0;i<newH;i++) for (let j=0;j<newH;j++){ const v = q.d[g[i]*H+g[j]] / cnt[g[j]]; n.d[i*newH+j] = v + (noisy && i>=H ? nz()*Math.abs(v) : 0); } return n; };
    const cols = (q) => { const R = q.r, n = new P(0, newH); n.addRows(R); for (let v=0;v<R;v++) for (let j=0;j<newH;j++) n.d[v*newH+j] = q.d[v*H+g[j]] / cnt[g[j]]; return n; };
    for (let l=0;l<this.L;l++){
      const s = l ? String(l) : "";
      for (const k of ["Wz","Wr","Wn"]) p[k+s] = l ? rec(p[k+s], true) : rows(p[k+s], D);
      for (const k of ["bz","br","bn"]) p[k+s] = rows(p[k+s], 1);
      for (const k of ["Uz","Ur","Un"]) p[k+s] = rec(p[k+s], l > 0);
      if (l) p["R"+s] = rec(p["R"+s], false);
    }
    p.Wo = cols(p.Wo); p.Wa = cols(p.Wa);
    for (const q of Object.values(p)) q.reset();
    this.t = 0; this.growth.push({ from:H, to:newH, steps:this.steps }); this.H = newH;
  }
  /* ---------- crescita in profondità: un nuovo strato residuo, nato spento (non cambia nulla finché non impara) ---------- */
  deepen(){
    const l = this.L, H = this.H, r = this.r, s = (n) => () => randn(r)*Math.sqrt(1/n), p = this.p, k = String(l);
    for (const q of ["Wz","Wr","Wn","Uz","Ur","Un"]) p[q+k] = new P(H, H, s(H));
    for (const q of ["bz","br","bn"]) p[q+k] = new P(H, 1);
    p["R"+k] = new P(H, H);
    for (const q of Object.values(p)) q.reset();
    this.t = 0; this.L++; this.growth.push({ from:H, to:H, strati:this.L, steps:this.steps });
  }
  /* ---------- parole più ricche: nuove dimensioni dell'embedding (ingresso a zero: non cambia nulla) ---------- */
  widenD(newD){
    const k = newD - this.D; if (k <= 0) return;
    const p = this.p, r = this.r;
    p.E.addCols(k, () => randn(r)*.05); p.C.addCols(k, () => randn(r)*.05);
    for (const q of ["Wz","Wr","Wn"]) p[q].addCols(k, () => 0);
    for (const q of Object.values(p)) q.reset();
    this.t = 0; this.growth.push({ from:this.H, to:this.H, D:newD, steps:this.steps }); this.D = newD;
  }

  /* ---------- salvataggio (half = 16 bit, per viaggiare) ---------- */
  save(half = false){ const P_ = {}; for (const [k,q] of Object.entries(this.p)){ const d = q.d.subarray(0, q.size); P_[k] = half ? [q.r, q.c, mezza.enc(d), "h"] : [q.r, q.c, b64.enc(d)]; }
    return { v:3, D:this.D, H:this.H, L:this.L, vocab:this.vocab, p:P_, steps:this.steps, growth:this.growth }; }
  static load(d){
    const n = new Rete({ D:d.D, H:d.H }); n.L = d.L || 1; n.vocab = []; n.idx = new Map(); n.tri = [];
    (d.vocab || []).forEach((w,i) => { n.vocab.push(w); n.idx.set(w,i); n.tri.push(trigrams(w)); });
    for (const [k,[r,c,s,f]] of Object.entries(d.p)){ const q = new P(r, c); if (r*c) q.d.set(f === "h" ? mezza.dec(s) : b64.dec(s)); n.p[k] = q; }
    n.steps = d.steps||0; n.growth = d.growth||[]; return n;
  }
}
