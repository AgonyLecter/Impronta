/* nucleo · rete
   Rete neurale ricorrente (GRU) scritta da zero, che CRESCE DA SOLA.
   - parla: modello di linguaggio parola per parola
   - sente: testa affettiva che stima gioia, tristezza, rabbia, paura, affetto, ironia, stanchezza, sorpresa
   - generalizza: ogni parola è anche la somma dei suoi trigrammi di lettere (triste ≈ tristezza ≈ tristissimo)
   - cresce: aggiunge neuroni con Net2Wider (la funzione resta identica, poi impara di più)
   Backprop through time e ottimizzatore Adam scritti a mano. */

export const AFFETTI = ["gioia","tristezza","rabbia","paura","affetto","ironia","stanchezza","sorpresa"];
const K = AFFETTI.length, BUCKETS = 2048;

function rng(seed){ let a = seed|0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function randn(r){ let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
const sig = x => 1/(1+Math.exp(-x));
function hash(s){ let h = 2166136261; for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h>>>0) % BUCKETS; }
function trigrams(w){ if (w.startsWith("<")) return []; const s = "<"+w+">", out = []; for (let i=0;i<s.length-2;i++) out.push(hash(s.slice(i,i+3))); return out; }
const b64 = {
  enc(f32){ const u = new Uint8Array(f32.buffer, f32.byteOffset, f32.byteLength); let s = ""; for (let i=0;i<u.length;i+=0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i+0x8000)); return btoa(s); },
  dec(str){ const s = atob(str), u = new Uint8Array(s.length); for (let i=0;i<s.length;i++) u[i] = s.charCodeAt(i); return new Float32Array(u.buffer); }
};

/* parametro: matrice righe×colonne con gradiente e stato di Adam */
class P {
  constructor(r, c, init){ this.r = r; this.c = c; this.d = new Float32Array(r*c); this.g = new Float32Array(r*c); this.m = new Float32Array(r*c); this.v = new Float32Array(r*c); if (init) for (let i=0;i<this.d.length;i++) this.d[i] = init(); }
  addRows(k, init){ // per il vocabolario che cresce
    const n = (this.r+k)*this.c;
    if (n > this.d.length){ const cap = Math.ceil(n*1.5); for (const f of ["d","g","m","v"]){ const a = new Float32Array(cap); a.set(this[f].subarray(0, this.r*this.c)); this[f] = a; } }
    for (let i=this.r*this.c;i<n;i++){ this.d[i] = init ? init() : 0; this.g[i] = 0; this.m[i] = 0; this.v[i] = 0; }
    this.r += k;
  }
  get size(){ return this.r*this.c; }
}

export class Rete {
  constructor(o = {}){
    this.D = o.D || 40; this.H = o.H || 16; this.r = rng(o.seed || 7);
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

  /* ---------- forward su una frase ---------- */
  fwd(ids, lm = true, drop = 0){
    const { D, H } = this, p = this.p, seq = [0, ...ids], T = seq.length, st = [];
    let h = new Float32Array(H);
    const pool = new Float32Array(H);
    for (let t=0;t<T;t++){
      const dw = drop > 0 && t > 0 && this.tri[seq[t]].length > 0 && this.r() < drop;
      const x = this.emb(seq[t], dw), z = new Float32Array(H), rr = new Float32Array(H), n = new Float32Array(H), Unh = new Float32Array(H), hn = new Float32Array(H);
      for (let j=0;j<H;j++){
        let sz = p.bz.d[j], sr = p.br.d[j], sn = p.bn.d[j], uz = 0, ur = 0, un = 0;
        const oj = j*D, hj = j*H;
        for (let i=0;i<D;i++){ const xi = x[i]; sz += p.Wz.d[oj+i]*xi; sr += p.Wr.d[oj+i]*xi; sn += p.Wn.d[oj+i]*xi; }
        for (let i=0;i<H;i++){ const hi = h[i]; uz += p.Uz.d[hj+i]*hi; ur += p.Ur.d[hj+i]*hi; un += p.Un.d[hj+i]*hi; }
        z[j] = sig(sz+uz); rr[j] = sig(sr+ur); Unh[j] = un; n[j] = Math.tanh(sn + rr[j]*un);
        hn[j] = (1-z[j])*n[j] + z[j]*h[j];
      }
      st.push({ x, hp: h, z, r: rr, n, Unh, h: hn, id: seq[t], dw });
      for (let j=0;j<H;j++) pool[j] += hn[j]/T;
      h = hn;
    }
    const a = new Float32Array(K);
    for (let k=0;k<K;k++){ let s = p.ba.d[k]; for (let j=0;j<H;j++) s += p.Wa.d[k*H+j]*pool[j]; a[k] = sig(s); }
    return { st, pool, a, T };
  }
  probs(h){ const V = this.V, H = this.H, Wo = this.p.Wo.d, bo = this.p.bo.d, z = new Float32Array(V); let mx = -1e9;
    for (let v=0;v<V;v++){ let s = bo[v]; const o = v*H; for (let j=0;j<H;j++) s += Wo[o+j]*h[j]; z[v] = s; if (s > mx) mx = s; }
    let sum = 0; for (let v=0;v<V;v++){ z[v] = Math.exp(z[v]-mx); sum += z[v]; } for (let v=0;v<V;v++) z[v] /= sum; return z; }

  /* ---------- backward: accumula i gradienti, restituisce la perdita ----------
     ex = { ids, lm: peso della parte linguistica, lab: [K] in 0..1 o null, mask: [K] pesi } */
  grad(ex){
    const { D, H } = this, p = this.p, f = this.fwd(ex.ids, true, ex.drop || 0), { st, pool, a, T } = f;
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
    // testa linguistica: da h_t prevede la parola t+1 (e </s> alla fine)
    if (ex.lm){
      const tgt = [...ex.ids, 1], wl = ex.lm/T;
      for (let t=0;t<T;t++){
        const pr = this.probs(st[t].h), y = tgt[t]; loss -= wl*Math.log(pr[y]+1e-9);
        for (let v=0;v<this.V;v++){ const g = wl*(pr[v] - (v===y?1:0)); if (Math.abs(g) < 1e-7) continue; p.bo.g[v] += g; const o = v*H; for (let j=0;j<H;j++){ p.Wo.g[o+j] += g*st[t].h[j]; dh[t][j] += g*p.Wo.d[o+j]; } }
      }
    }
    // backprop through time
    let carry = new Float32Array(H);
    for (let t=T-1;t>=0;t--){
      const s = st[t], d = new Float32Array(H), dhp = new Float32Array(H), dx = new Float32Array(D);
      for (let j=0;j<H;j++) d[j] = dh[t][j] + carry[j];
      for (let j=0;j<H;j++){
        const dn = d[j]*(1-s.z[j]), dz = d[j]*(s.hp[j]-s.n[j]);
        dhp[j] += d[j]*s.z[j];
        const dnp = dn*(1-s.n[j]*s.n[j]);
        const dr = dnp*s.Unh[j], drp = dr*s.r[j]*(1-s.r[j]), dzp = dz*s.z[j]*(1-s.z[j]), du = dnp*s.r[j];
        p.bn.g[j] += dnp; p.br.g[j] += drp; p.bz.g[j] += dzp;
        const oj = j*D, hj = j*H;
        for (let i=0;i<D;i++){ const xi = s.x[i];
          p.Wn.g[oj+i] += dnp*xi; p.Wr.g[oj+i] += drp*xi; p.Wz.g[oj+i] += dzp*xi;
          dx[i] += p.Wn.d[oj+i]*dnp + p.Wr.d[oj+i]*drp + p.Wz.d[oj+i]*dzp; }
        for (let i=0;i<H;i++){ const hi = s.hp[i];
          p.Un.g[hj+i] += du*hi; p.Ur.g[hj+i] += drp*hi; p.Uz.g[hj+i] += dzp*hi;
          dhp[i] += p.Un.d[hj+i]*du + p.Ur.d[hj+i]*drp + p.Uz.d[hj+i]*dzp; }
      }
      // embedding: parola + trigrammi
      const id = s.id, tr = this.tri[id];
      if (!s.dw) for (let i=0;i<D;i++) p.E.g[id*D+i] += dx[i];
      if (tr.length){ const k = 1/tr.length; for (const b of tr) for (let i=0;i<D;i++) p.C.g[b*D+i] += dx[i]*k; }
      carry = dhp;
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
  /* perdita senza aggiornare (per la valutazione) */
  evalLoss(exs){ let loss = 0; for (const ex of exs){ loss += this.grad(ex); } for (const q of Object.values(this.p)) q.g.fill(0); return exs.length ? loss/exs.length : null; }

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

  /* ---------- crescita: Net2Wider (aggiunge neuroni senza cambiare cosa sa) ---------- */
  widen(newH, noise = .01){
    const H = this.H; if (newH <= H) return;
    const g = Array.from({length:newH}, (_, i) => i < H ? i : Math.floor(this.r()*H));
    const cnt = new Float32Array(H); g.forEach(o => cnt[o]++);
    const p = this.p, D = this.D, nz = () => (this.r()-.5)*2*noise;
    const rows = (q, cols) => { const n = new P(newH, cols); for (let i=0;i<newH;i++) for (let j=0;j<cols;j++) n.d[i*cols+j] = q.d[g[i]*cols+j] + (i>=H ? nz()*Math.abs(q.d[g[i]*cols+j]) : 0); return n; };
    const rec = q => { const n = new P(newH, newH); for (let i=0;i<newH;i++) for (let j=0;j<newH;j++) n.d[i*newH+j] = q.d[g[i]*H+g[j]] / cnt[g[j]]; return n; };
    const cols = (q) => { const R = q.r, n = new P(0, newH); n.addRows(R); for (let v=0;v<R;v++) for (let j=0;j<newH;j++) n.d[v*newH+j] = q.d[v*H+g[j]] / cnt[g[j]]; return n; };
    for (const k of ["Wz","Wr","Wn"]) p[k] = rows(p[k], D);
    for (const k of ["bz","br","bn"]) p[k] = rows(p[k], 1);
    for (const k of ["Uz","Ur","Un"]) p[k] = rec(p[k]);
    p.Wo = cols(p.Wo); p.Wa = cols(p.Wa);
    for (const q of Object.values(p)){ q.m.fill(0); q.v.fill(0); }
    this.t = 0; this.growth.push({ from:H, to:newH, steps:this.steps }); this.H = newH;
  }

  /* ---------- salvataggio ---------- */
  save(){ const P_ = {}; for (const [k,q] of Object.entries(this.p)) P_[k] = [q.r, q.c, b64.enc(q.d.subarray(0, q.size))];
    return { v:2, D:this.D, H:this.H, vocab:this.vocab, p:P_, steps:this.steps, growth:this.growth }; }
  static load(d){
    const n = new Rete({ D:d.D, H:d.H }); n.vocab = []; n.idx = new Map(); n.tri = [];
    d.vocab.forEach((w,i) => { n.vocab.push(w); n.idx.set(w,i); n.tri.push(trigrams(w)); });
    for (const [k,[r,c,s]] of Object.entries(d.p)){ const q = new P(r, c); q.d.set(b64.dec(s)); n.p[k] = q; }
    n.steps = d.steps||0; n.growth = d.growth||[]; return n;
  }
}
