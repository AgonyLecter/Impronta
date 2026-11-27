/* impronta · sensi
   1. ritmo: come scrivi (velocità, pause, cancellazioni) confrontato con il tuo solito
   2. lettura dal vivo: capisce cosa stai scrivendo prima che invii
   3. profezia: prevede il tuo prossimo messaggio e lo sigilla in glifi */
import { analyze, tokenize, deacc } from "./brain.js";

/* ---------- 1. ritmo ---------- */
export class Ritmo {
  constructor(){ this.reset(); }
  reset(){ this.t0 = 0; this.last = 0; this.keys = 0; this.dels = 0; this.maxPause = 0; this.clears = 0; this.peak = 0; }
  key(len, prevLen){
    const t = performance.now();
    if (!this.t0 && len > 0) this.t0 = t;
    if (this.last && len > 0) this.maxPause = Math.max(this.maxPause, t - this.last);
    if (len < prevLen) this.dels += prevLen - len; else this.keys += len - prevLen;
    if (len === 0 && prevLen >= 6) this.clears++;
    this.peak = Math.max(this.peak, len);
    this.last = t;
  }
  /* misura del messaggio inviato + confronto con la media dell'utente (aggiornata) */
  read(msgLen, base){
    const dur = this.t0 ? (performance.now() - this.t0)/1000 : 0;
    const cps = dur > .4 ? msgLen / dur : null;
    const delRatio = this.dels / Math.max(1, this.keys);
    const r = { dur, cps, delRatio, pause: this.maxPause/1000, clears: this.clears, rewrote: this.peak > msgLen + 8 };
    if (base.n >= 4 && cps){
      r.fast = cps > base.cps * 1.6 && msgLen > 12;
      r.slow = cps < base.cps * .55 && msgLen > 8;
    }
    r.hesitant = (r.pause > 5 && msgLen > 4) || (delRatio > Math.max(.45, (base.del || 0) + .3) && this.keys > 10) || r.clears > 0 || r.rewrote;
    if (cps && cps < 30){ base.n++; const k = Math.min(.25, 1/base.n); base.cps = base.cps ? base.cps*(1-k) + cps*k : cps; base.del = (base.del || 0)*(1-k) + delRatio*k; }
    this.reset();
    return r;
  }
}

/* ---------- 2. lettura dal vivo ---------- */
export function liveRead(text, S){
  const t = text.trim(); if (!t) return null;
  const a = analyze(t), toks = tokenize(t);
  const name = S.name && toks.includes(S.name.toLowerCase());
  const last = toks[toks.length-1] || "";
  const typingWord = !/\s$/.test(text) ? last : "";
  const knownRatio = toks.length ? toks.filter(w => S.words[w]).length / toks.length : 0;
  const done = /\s$/.test(text) ? toks : toks.slice(0, -1);
  const newWord = done.filter(w => w.length > 3 && !S.words[w]).slice(-1)[0] || null;
  let emo = "listen";
  if (a.insult) emo = "hurt"; else if (name) emo = "happy"; else if (a.s <= -1) emo = "sad"; else if (a.s >= 1 || a.kind || a.humor) emo = "happy"; else if (a.q) emo = "curious"; else if (newWord) emo = "curious";
  return { emo, name, knownRatio, newWord, a };
}

/* ---------- 3. profezia ---------- */
const nrm = s => deacc(String(s).toLowerCase()).replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
/* Prevede il primo messaggio della sessione dalle tue abitudini (stessa fascia oraria pesa di più). */
export function prophecy(S, hour){
  const O = S.mem.openers || []; if (O.length < 3) return null;
  const score = {};
  for (const o of O){ const k = nrm(o.x); if (!k || k.length > 30) continue; const dh = Math.min(Math.abs(o.h - hour), 24 - Math.abs(o.h - hour)); score[k] = (score[k] || 0) + (dh <= 2 ? 1.5 : 1); }
  const tot = Object.values(score).reduce((a,b)=>a+b, 0);
  let best = null, bs = 0; for (const k in score) if (score[k] > bs){ bs = score[k]; best = k; }
  if (!best || bs < 2 || bs/tot < .34) return null;
  const orig = O.slice().reverse().find(o => nrm(o.x) === best);
  return { key: best, x: orig ? orig.x.toLowerCase() : best, conf: bs/tot };
}
export function prophecyHit(p, msg){
  if (!p) return false;
  const a = nrm(msg), b = p.key;
  if (a === b) return true;
  const ta = a.split(" "), tb = b.split(" ");
  return tb.length >= 2 && tb.every(w => ta.includes(w)) && ta.length <= tb.length + 1;
}
