/* impronta · rete
   Un piccolo modello di linguaggio neurale scritto da zero (nessuna libreria).
   Architettura: modello n-gram neurale (Bengio 2003) — le ultime K parole diventano vettori,
   un livello nascosto tanh, poi softmax su tutto il vocabolario.
   Nasce vuoto, cresce con ogni parola nuova, si allena con le tue frasi (SGD + backprop scritti a mano). */

const S0 = "<s>", S1 = "</s>";

function randn(r){ let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
function rng(seed){ let a = seed|0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const b64 = {
  enc(f32){ const u = new Uint8Array(f32.buffer, f32.byteOffset, f32.byteLength); let s = ""; for (let i=0;i<u.length;i+=0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i+0x8000)); return btoa(s); },
  dec(str){ const s = atob(str), u = new Uint8Array(s.length); for (let i=0;i<s.length;i++) u[i] = s.charCodeAt(i); return new Float32Array(u.buffer); }
};

export class Rete {
  constructor(o = {}){
    this.E = o.E || 24; this.H = o.H || 64; this.K = o.K || 3;
    this.r = rng(o.seed || 7);
    this.vocab = []; this.idx = new Map();
    this.emb = []; this.W2 = []; this.b2 = [];           // una riga per parola: cresce col vocabolario
    const I = this.K*this.E;
    this.W1 = new Float32Array(this.H*I).map(() => randn(this.r)*Math.sqrt(1/I));
    this.b1 = new Float32Array(this.H);
    this.steps = 0; this.loss = null; this.lossHist = [];
    this.add(S0); this.add(S1);
  }
  get V(){ return this.vocab.length; }
  get params(){ return this.V*(this.E+this.H+1) + this.W1.length + this.H; }
  add(w){
    if (this.idx.has(w)) return this.idx.get(w);
    const i = this.vocab.length; this.vocab.push(w); this.idx.set(w, i);
    this.emb.push(new Float32Array(this.E).map(() => randn(this.r)*.1));
    this.W2.push(new Float32Array(this.H).map(() => randn(this.r)*.05));
    this.b2.push(0);
    return i;
  }
  /* forward: contesto (K indici) → h, probabilità */
  fwd(ctx){
    const { E, H, K } = this, I = K*E, x = new Float32Array(I);
    for (let k=0;k<K;k++) x.set(this.emb[ctx[k]], k*E);
    const h = new Float32Array(H);
    for (let j=0;j<H;j++){ let s = this.b1[j]; const o = j*I; for (let i=0;i<I;i++) s += this.W1[o+i]*x[i]; h[j] = Math.tanh(s); }
    const V = this.V, z = new Float32Array(V); let mx = -1e9;
    for (let v=0;v<V;v++){ const w = this.W2[v]; let s = this.b2[v]; for (let j=0;j<H;j++) s += w[j]*h[j]; z[v] = s; if (s>mx) mx = s; }
    let sum = 0; for (let v=0;v<V;v++){ z[v] = Math.exp(z[v]-mx); sum += z[v]; }
    for (let v=0;v<V;v++) z[v] /= sum;
    return { x, h, p: z };
  }
  /* un passo di SGD su (contesto → parola) */
  step(ctx, y, lr){
    const { E, H, K } = this, I = K*E, { x, h, p } = this.fwd(ctx), V = this.V;
    const loss = -Math.log(p[y] + 1e-9);
    const dh = new Float32Array(H);
    for (let v=0;v<V;v++){
      const g = p[v] - (v===y ? 1 : 0); if (Math.abs(g) < 1e-5) continue;
      const w = this.W2[v];
      for (let j=0;j<H;j++){ dh[j] += g*w[j]; w[j] -= lr*g*h[j]; }
      this.b2[v] -= lr*g;
    }
    const dx = new Float32Array(I);
    for (let j=0;j<H;j++){
      const d = dh[j]*(1-h[j]*h[j]); if (!d) continue; const o = j*I;
      for (let i=0;i<I;i++){ dx[i] += d*this.W1[o+i]; this.W1[o+i] -= lr*d*x[i]; }
      this.b1[j] -= lr*d;
    }
    for (let k=0;k<K;k++){ const e = this.emb[ctx[k]]; for (let i=0;i<E;i++) e[i] -= lr*dx[k*E+i]; }
    return loss;
  }
  samples(lines){
    const out = [], { K } = this;
    for (const line of lines){
      const ids = [...Array(K).fill(0), ...line.split(" ").filter(Boolean).map(w => this.add(w)), 1];
      for (let i=K;i<ids.length;i++) out.push([ids.slice(i-K, i), ids[i]]);
    }
    return out;
  }
  /* allena per n passi su frasi; restituisce la perdita media */
  train(lines, n = 400, lr = .08){
    const D = this.samples(lines); if (!D.length) return null;
    let tot = 0;
    for (let s=0;s<n;s++){
      const [c, y] = D[Math.floor(this.r()*D.length)];
      const rate = lr / (1 + this.steps/20000);
      tot += this.step(c, y, rate); this.steps++;
    }
    this.loss = tot/n; this.lossHist.push(+this.loss.toFixed(3)); if (this.lossHist.length > 60) this.lossHist.shift();
    return this.loss;
  }
  /* genera una frase, opzionalmente partendo da parole date */
  gen({ seed = [], temp = .8, max = 12, ban = [] } = {}){
    const { K } = this; const ctx = Array(K).fill(0); const out = [];
    for (const w of seed){ if (!this.idx.has(w)) continue; ctx.push(this.idx.get(w)); ctx.shift(); out.push(w); }
    const banned = new Set(ban.map(w => this.idx.get(w)).filter(i => i !== undefined));
    let lp = 0, n = 0;
    for (let t=0;t<max;t++){
      const { p } = this.fwd(ctx.slice(-K));
      if (out.length < 2) p[1] = 0;                         // niente frasi di una parola
      p[0] = 0; for (const b of banned) p[b] = 0;
      for (const w of out.slice(-3)) p[this.idx.get(w)] *= .15; // evita ripetizioni
      let sum = 0; const q = new Float32Array(p.length);
      for (let v=0;v<p.length;v++){ q[v] = Math.pow(p[v], 1/temp); sum += q[v]; }
      let r = this.r()*sum, y = 1;
      for (let v=0;v<q.length;v++){ r -= q[v]; if (r <= 0){ y = v; break; } }
      lp += Math.log(p[y]/[...p].reduce((a,b)=>a+b,0) + 1e-9); n++;
      if (y === 1) break;
      out.push(this.vocab[y]); ctx.push(y); ctx.shift();
    }
    return { x: out.join(" "), lp: n ? lp/n : -9 };
  }
  /* quanto una frase "suona sua" (log-probabilità media) */
  score(line){
    const ws = line.split(" ").filter(Boolean); if (!ws.every(w => this.idx.has(w))) return null;
    const ids = [...Array(this.K).fill(0), ...ws.map(w => this.idx.get(w)), 1]; let lp = 0;
    for (let i=this.K;i<ids.length;i++){ const { p } = this.fwd(ids.slice(i-this.K, i)); lp += Math.log(p[ids[i]] + 1e-9); }
    return lp / (ids.length - this.K);
  }
  vec(w){ const i = this.idx.get(w); return i === undefined ? null : this.emb[i]; }
  sim(a, b){ const x = this.vec(a), y = this.vec(b); if (!x || !y) return 0; let d=0, nx=0, ny=0; for (let i=0;i<x.length;i++){ d+=x[i]*y[i]; nx+=x[i]*x[i]; ny+=y[i]*y[i]; } return d/Math.sqrt(nx*ny+1e-9); }
  near(w, n = 3, among = null){
    const c = (among || this.vocab).filter(v => v !== w && v !== S0 && v !== S1 && this.idx.has(v)).map(v => [v, this.sim(w, v)]);
    return c.sort((a,b) => b[1]-a[1]).slice(0, n);
  }
  /* proiezione 2D degli embedding (PCA con power iteration) per la mappa della mente */
  map(words){
    const ws = words.filter(w => this.idx.has(w)); if (ws.length < 3) return [];
    const X = ws.map(w => Array.from(this.vec(w))), E = this.E, mean = Array(E).fill(0);
    X.forEach(x => x.forEach((v,i) => mean[i] += v/X.length)); X.forEach(x => x.forEach((v,i) => x[i] = v - mean[i]));
    const comps = [];
    for (let c=0;c<2;c++){
      let v = Array.from({length:E}, () => this.r()-.5);
      for (let it=0;it<40;it++){
        const nv = Array(E).fill(0);
        for (const x of X){ let d = 0; for (let i=0;i<E;i++) d += x[i]*v[i]; for (let i=0;i<E;i++) nv[i] += d*x[i]; }
        for (const p of comps){ let d = 0; for (let i=0;i<E;i++) d += nv[i]*p[i]; for (let i=0;i<E;i++) nv[i] -= d*p[i]; }
        const nn = Math.hypot(...nv) || 1; v = nv.map(t => t/nn);
      }
      comps.push(v);
    }
    return ws.map((w, k) => ({ w, x: X[k].reduce((s,t,i)=>s+t*comps[0][i],0), y: X[k].reduce((s,t,i)=>s+t*comps[1][i],0) }));
  }
  save(){
    const cat = (rows) => { const f = new Float32Array(rows.length*(rows[0]?.length||0)); rows.forEach((r,i)=>f.set(r, i*r.length)); return b64.enc(f); };
    return { v:1, E:this.E, H:this.H, K:this.K, vocab:this.vocab, emb:cat(this.emb), W2:cat(this.W2), b2:b64.enc(Float32Array.from(this.b2)), W1:b64.enc(this.W1), b1:b64.enc(this.b1), steps:this.steps, loss:this.loss, lossHist:this.lossHist };
  }
  static load(d){
    const n = new Rete({ E:d.E, H:d.H, K:d.K }); n.vocab = []; n.idx = new Map(); n.emb = []; n.W2 = []; n.b2 = [];
    const emb = b64.dec(d.emb), W2 = b64.dec(d.W2), b2 = b64.dec(d.b2);
    d.vocab.forEach((w,i) => { n.vocab.push(w); n.idx.set(w,i); n.emb.push(emb.slice(i*d.E,(i+1)*d.E)); n.W2.push(W2.slice(i*d.H,(i+1)*d.H)); n.b2.push(b2[i]); });
    n.W1 = b64.dec(d.W1); n.b1 = b64.dec(d.b1); n.steps = d.steps||0; n.loss = d.loss; n.lossHist = d.lossHist||[];
    return n;
  }
}
