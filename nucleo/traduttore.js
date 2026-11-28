/* nucleo · traduttore
   La SUA rete che impara a tradurre dall'inglese all'italiano, da sola, dalle coppie di frasi di Tatoeba.
   Encoder-decoder scritto a mano: una GRU legge la frase inglese, un'altra scrive quella italiana partendo
   da dove la prima è arrivata e guardando il "riassunto" di tutta la frase letta (media degli stati).
   Backprop through time su entrambe, Adam, softmax campionata quando le parole sono tante.
   Si misura da sola su frasi tenute da parte (parole giuste rispetto alla traduzione umana). */
import { P, mezza } from "./rete.js";

function rng(seed){ let a = seed|0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function randn(r){ let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
const sig = x => 1/(1+Math.exp(-x));
export const tokEn = s => String(s).toLowerCase().replace(/[’`]/g, "'").match(/[a-z0-9]+(?:'[a-z]+)?/g) || [];
export const tokIt = s => String(s).toLowerCase().replace(/[’`]/g, "'").match(/[a-zàáèéìíòóùú]+'|[a-zàáèéìíòóùú0-9]+/g) || [];
export const unisci = ws => ws.join(" ").replace(/' /g, "'");
const SAMPLE = 600, NEG = 200;

export class Traduttore {
  constructor({ D = 64, H = 128, seed = 11 } = {}){
    this.D = D; this.H = H; this.r = rng(seed); this.steps = 0; this.t = 0; this.hist = [];
    this.src = ["<unk>"]; this.tgt = ["<s>", "</s>", "<unk>"]; this.si = new Map([["<unk>", 0]]); this.ti = new Map(this.tgt.map((w, i) => [w, i]));
    const r = this.r, s = n => () => randn(r)*Math.sqrt(1/n), G = (IN) => ({ Wz: new P(H, IN, s(IN)), Wr: new P(H, IN, s(IN)), Wn: new P(H, IN, s(IN)), Uz: new P(H, H, s(H)), Ur: new P(H, H, s(H)), Un: new P(H, H, s(H)), bz: new P(H, 1), br: new P(H, 1), bn: new P(H, 1) });
    const e = G(D), d = G(D);
    this.p = { Es: new P(1, D, () => randn(r)*.1), Et: new P(3, D, () => randn(r)*.1), Wo: new P(3, 2*H, () => randn(r)*.02), bo: new P(3, 1) };
    for (const k in e) this.p["e" + k] = e[k]; for (const k in d) this.p["d" + k] = d[k];
  }
  get params(){ return Object.values(this.p).reduce((s, q) => s + q.size, 0); }
  g(pre){ const o = {}; for (const k of ["Wz","Wr","Wn","Uz","Ur","Un","bz","br","bn"]) o[k] = this.p[pre + k]; return o; }
  /* vocabolario: le parole più frequenti delle coppie (cresce, non si restringe mai) */
  vocabolario(coppie, vmax = 6000){
    const fs = new Map(), ft = new Map();
    for (const [en, it] of coppie){ for (const w of tokEn(en)) fs.set(w, (fs.get(w) || 0) + 1); for (const w of tokIt(it)) ft.set(w, (ft.get(w) || 0) + 1); }
    const add = (freq, voc, idx, E, extra) => { for (const [w] of [...freq].sort((a, b) => b[1] - a[1])){ if (voc.length >= vmax) break; if (idx.has(w)) continue; idx.set(w, voc.length); voc.push(w); E.addRows(1, () => randn(this.r)*.1); if (extra) extra(); } };
    add(fs, this.src, this.si, this.p.Es);
    add(ft, this.tgt, this.ti, this.p.Et, () => { this.p.Wo.addRows(1, () => randn(this.r)*.02); this.p.bo.addRows(1); });
  }
  ids(en){ return tokEn(en).slice(0, 30).map(w => this.si.get(w) ?? 0); }
  idt(it){ return tokIt(it).slice(0, 30).map(w => this.ti.get(w) ?? 2); }
  emb(E, id){ const D = this.D, x = new Float32Array(D); x.set(E.d.subarray(id*D, id*D + D)); return x; }
  /* una GRU su una sequenza, partendo da h0 */
  gru(G, xs, h0, IN){
    const H = this.H, out = []; let h = h0;
    for (const x of xs){
      const z = new Float32Array(H), rr = new Float32Array(H), n = new Float32Array(H), Unh = new Float32Array(H), hn = new Float32Array(H);
      for (let j=0;j<H;j++){
        let sz = G.bz.d[j], sr = G.br.d[j], sn = G.bn.d[j], uz = 0, ur = 0, un = 0; const oj = j*IN, hj = j*H;
        for (let i=0;i<IN;i++){ const xi = x[i]; sz += G.Wz.d[oj+i]*xi; sr += G.Wr.d[oj+i]*xi; sn += G.Wn.d[oj+i]*xi; }
        for (let i=0;i<H;i++){ const hi = h[i]; uz += G.Uz.d[hj+i]*hi; ur += G.Ur.d[hj+i]*hi; un += G.Un.d[hj+i]*hi; }
        z[j] = sig(sz+uz); rr[j] = sig(sr+ur); Unh[j] = un; n[j] = Math.tanh(sn + rr[j]*un); hn[j] = (1-z[j])*n[j] + z[j]*h[j];
      }
      out.push({ x, hp: h, z, r: rr, n, Unh, h: hn }); h = hn;
    }
    return out;
  }
  /* backprop through time: restituisce i gradienti sugli ingressi e sullo stato iniziale */
  bptt(G, sts, ext, IN){
    const H = this.H, T = sts.length, dIn = new Array(T); let carry = new Float32Array(H);
    for (let t=T-1;t>=0;t--){
      const s = sts[t], d = new Float32Array(H), dhp = new Float32Array(H), dx = new Float32Array(IN);
      for (let j=0;j<H;j++) d[j] = ext[t][j] + carry[j];
      for (let j=0;j<H;j++){
        const dn = d[j]*(1-s.z[j]), dz = d[j]*(s.hp[j]-s.n[j]); dhp[j] += d[j]*s.z[j];
        const dnp = dn*(1-s.n[j]*s.n[j]), drp = dnp*s.Unh[j]*s.r[j]*(1-s.r[j]), dzp = dz*s.z[j]*(1-s.z[j]), du = dnp*s.r[j];
        G.bn.g[j] += dnp; G.br.g[j] += drp; G.bz.g[j] += dzp; const oj = j*IN, hj = j*H;
        for (let i=0;i<IN;i++){ const xi = s.x[i]; G.Wn.g[oj+i] += dnp*xi; G.Wr.g[oj+i] += drp*xi; G.Wz.g[oj+i] += dzp*xi; dx[i] += G.Wn.d[oj+i]*dnp + G.Wr.d[oj+i]*drp + G.Wz.d[oj+i]*dzp; }
        for (let i=0;i<H;i++){ const hi = s.hp[i]; G.Un.g[hj+i] += du*hi; G.Ur.g[hj+i] += drp*hi; G.Uz.g[hj+i] += dzp*hi; dhp[i] += G.Un.d[hj+i]*du + G.Ur.d[hj+i]*drp + G.Uz.d[hj+i]*dzp; }
      }
      dIn[t] = dx; carry = dhp;
    }
    return { dIn, dh0: carry };
  }
  codifica(src){
    const H = this.H, D = this.D, xs = (src.length ? src : [0]).map(i => this.emb(this.p.Es, i)), enc = this.gru(this.g("e"), xs, new Float32Array(H), D);
    const ctx = new Float32Array(H); for (const s of enc) for (let j=0;j<H;j++) ctx[j] += s.h[j]/enc.length;
    return { xs, enc, ctx, hEnc: enc[enc.length-1].h };
  }
  /* una coppia: perdita e gradienti */
  grad(src, tgt, full = false){
    const H = this.H, D = this.D, p = this.p, V = this.tgt.length, E = this.codifica(src);
    const ins = [0, ...tgt], outs = [...tgt, 1], T = ins.length;
    const dec = this.gru(this.g("d"), ins.map(i => this.emb(p.Et, i)), E.hEnc, D);
    let cand = null;
    if (!full && V > SAMPLE){ const rr = rng((this.steps*2654435761 ^ (src[0]||1)*40503 ^ T) | 0), set = new Set(outs); while (set.size < outs.length + NEG) set.add(3 + Math.floor(rr()*(V-3))); cand = [...set]; }
    const NC = cand ? cand.length : V, z = new Float32Array(NC), dh = dec.map(() => new Float32Array(H)), dctx = new Float32Array(H), H2 = 2*H;
    let loss = 0;
    for (let t=0;t<T;t++){
      const h = dec[t].h, y = outs[t]; let mx = -1e9, yi = -1;
      for (let c=0;c<NC;c++){ const v = cand ? cand[c] : c, o = v*H2; let s = p.bo.d[v]; for (let j=0;j<H;j++) s += p.Wo.d[o+j]*h[j] + p.Wo.d[o+H+j]*E.ctx[j]; z[c] = s; if (s > mx) mx = s; if (v === y) yi = c; }
      let sum = 0; for (let c=0;c<NC;c++){ z[c] = Math.exp(z[c]-mx); sum += z[c]; }
      loss -= Math.log(z[yi]/sum + 1e-9)/T;
      for (let c=0;c<NC;c++){ const v = cand ? cand[c] : c, g = (z[c]/sum - (c === yi ? 1 : 0))/T; if (Math.abs(g) < 1e-8) continue; p.bo.g[v] += g; const o = v*H2;
        for (let j=0;j<H;j++){ p.Wo.g[o+j] += g*h[j]; p.Wo.g[o+H+j] += g*E.ctx[j]; dh[t][j] += g*p.Wo.d[o+j]; dctx[j] += g*p.Wo.d[o+H+j]; } }
    }
    const bd = this.bptt(this.g("d"), dec, dh, D);
    for (let t=0;t<T;t++){ const id = ins[t], dx = bd.dIn[t]; for (let i=0;i<D;i++) p.Et.g[id*D+i] += dx[i]; }
    const Te = E.enc.length, ext = E.enc.map((s, t) => { const e = new Float32Array(H); for (let j=0;j<H;j++) e[j] = dctx[j]/Te + (t === Te-1 ? bd.dh0[j] : 0); return e; });
    const be = this.bptt(this.g("e"), E.enc, ext, D), sids = src.length ? src : [0];
    for (let t=0;t<Te;t++){ const id = sids[t], dx = be.dIn[t]; for (let i=0;i<D;i++) p.Es.g[id*D+i] += dx[i]; }
    return loss;
  }
  update(lr = .005, n = 1, clip = 5){
    this.t++; const b1 = .9, b2 = .999, c1 = 1 - Math.pow(b1, this.t), c2 = 1 - Math.pow(b2, this.t);
    let norm = 0; for (const q of Object.values(this.p)){ const g = q.g; for (let i=0;i<q.size;i++){ g[i] /= n; norm += g[i]*g[i]; } }
    const sc = Math.sqrt(norm) > clip ? clip/Math.sqrt(norm) : 1;
    for (const q of Object.values(this.p)){ const { d, g, m, v } = q; for (let i=0;i<q.size;i++){ const gi = g[i]*sc; if (gi === 0 && m[i] === 0) continue; m[i] = b1*m[i] + (1-b1)*gi; v[i] = b2*v[i] + (1-b2)*gi*gi; d[i] -= lr*(m[i]/c1)/(Math.sqrt(v[i]/c2)+1e-8); g[i] = 0; } }
  }
  /* allena per un tempo dato su coppie [inglese, italiano] */
  allena(coppie, ms = 1000, lr = .005, lotto = 8){
    const t0 = Date.now(); let loss = 0, n = 0;
    const es = coppie.map(([en, it]) => [this.ids(en), this.idt(it)]).filter(([a, b]) => a.length && b.length);
    if (!es.length) return null;
    while (Date.now() - t0 < ms){ let l = 0; for (let k=0;k<lotto;k++){ const [a, b] = es[Math.floor(this.r()*es.length)]; l += this.grad(a, b); } this.update(lr, lotto); this.steps += lotto; loss += l/lotto; n++; }
    return { loss: n ? loss/n : null, lotti: n, steps: this.steps };
  }
  traduci(en, max = 30){
    const src = this.ids(en); if (!src.length) return "";
    const E = this.codifica(src), H = this.H, H2 = 2*H, p = this.p, V = this.tgt.length, D = this.D, out = [];
    let h = E.hEnc, prev = 0;
    for (let t=0;t<max;t++){
      const s = this.gru(this.g("d"), [this.emb(p.Et, prev)], h, D)[0]; h = s.h;
      let best = 1, bv = -1e9;
      for (let v=1;v<V;v++){ if (v === 2) continue; const o = v*H2; let z = p.bo.d[v]; for (let j=0;j<H;j++) z += p.Wo.d[o+j]*h[j] + p.Wo.d[o+H+j]*E.ctx[j]; if (out.length < 1 && v === 1) z -= 1e9; if (out.slice(-2).includes(v)) z -= 3; if (z > bv){ bv = z; best = v; } }
      if (best === 1) break; out.push(this.tgt[best]); prev = best;
    }
    return unisci(out);
  }
  save(){ const P_ = {}; for (const [k, q] of Object.entries(this.p)) P_[k] = [q.r, q.c, mezza.enc(q.d.subarray(0, q.size))]; return { v: 1, D: this.D, H: this.H, src: this.src, tgt: this.tgt, steps: this.steps, hist: this.hist, p: P_ }; }
  static load(d){
    const T = new Traduttore({ D: d.D, H: d.H }); T.src = d.src; T.tgt = d.tgt; T.si = new Map(d.src.map((w, i) => [w, i])); T.ti = new Map(d.tgt.map((w, i) => [w, i])); T.steps = d.steps || 0; T.hist = d.hist || [];
    for (const [k, [r, c, s]] of Object.entries(d.p)){ const q = new P(r, c); if (r*c) q.d.set(mezza.dec(s)); T.p[k] = q; }
    return T;
  }
}
/* quanto è buona una traduzione: parole giuste rispetto a quella umana (F1 sulle parole) */
export function somiglianza(a, b){
  const x = tokIt(a), y = tokIt(b); if (!x.length || !y.length) return 0;
  const cnt = new Map(); for (const w of y) cnt.set(w, (cnt.get(w) || 0) + 1);
  let hit = 0; for (const w of x){ const c = cnt.get(w) || 0; if (c > 0){ hit++; cnt.set(w, c - 1); } }
  const pr = hit/x.length, rc = hit/y.length; return pr + rc ? 2*pr*rc/(pr + rc) : 0;
}
export function valuta(tr, coppie){ if (!coppie.length) return 0; let s = 0; for (const [en, it] of coppie) s += somiglianza(tr.traduci(en), it); return s/coppie.length; }
