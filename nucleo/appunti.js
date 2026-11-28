/* nucleo · appunti
   Tutto quello che ha letto diventa un quaderno di appunti da cui rispondere: le scoperte (con le frasi studiate),
   i fatti certi di Wikidata, le notizie della notte, le citazioni. Quando gli chiedi qualcosa, o parli di qualcosa
   che ha studiato, cerca la frase giusta:
   - parole in comune, ridotte alla radice (vulcani ≈ vulcano ≈ vulcanico) e pesate per rarità (idf);
   - più le parole VICINE DI SIGNIFICATO secondo la sua rete (nucleo.vicine): «lava» trova una frase sui vulcani
     anche se non dice «lava», se la sua rete ha imparato che le due parole stanno vicine;
   - un bonus se l'argomento della scoperta è proprio la cosa di cui parli.
   Puro: niente rete esterna, niente stato globale (la rete entra come mappa parola → [vicine, somiglianza]). */
import { STOP } from "../brain.js";

const deacc = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const parole = s => (deacc(String(s).toLowerCase()).replace(/[’`]/g, "'").match(/[a-z]+/g) || []);
/* radice semplice dell'italiano: toglie le desinenze più comuni (vulcani, vulcano, vulcanico → vulcan) */
export function radice(w){
  w = deacc(String(w).toLowerCase());
  if (w.length <= 4) return w;
  const r = w.replace(/(issim[oaie]|mente|zioni|zione|ament[eo]|ic[oaie]|ich[ei]|ist[aie]|ism[oi]|ent[ei]|al[ei]|os[oaie]|ar[ei]|ir[ei]|er[ei])$/, "").replace(/[aeiou]$/, "").replace(/(?<=..[^aeiou])i$/, "");
  return (r.length >= 4 ? r : w.slice(0, 5)).slice(0, 8);
}
const STOPD = new Set([...STOP].map(deacc));
const contenuto = s => parole(s).filter(w => w.length > 2 && !STOPD.has(w) && !/^(cosa|sai|dimmi|perche|come|mai|quale|quali|sapevi|parlami|conosci|sono|essere|stato|anno|anni|molto|tanto|cose|fatto|fare|dire)$/.test(w));

/* il quaderno: tutte le frasi da cui può rispondere, con la fonte */
export function quaderno(mem = {}){
  const Q = [], arr = v => Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : [];
  for (const d of arr(mem.scoperte)){ if (!d || !d.x) continue;
    const base = { argomento: d.argomento, fonte: d.fonte, url: d.url, tipo: "scoperta" };
    Q.push({ ...base, x: d.x, def: 1 });
    for (const f of arr(d.frasi)) if (f && f !== d.x) Q.push({ ...base, x: f });
    for (const f of arr(d.fatti)) if (f && f.k && f.v) Q.push({ ...base, tipo: "fatto", x: `${d.argomento}: ${f.k} ${f.v}.`, fonte: "Wikidata" });
  }
  for (const n of arr(mem.notizie)) if (n && n.titolo) Q.push({ argomento: n.titolo, x: n.testo ? `${n.titolo}. ${n.testo}` : n.titolo, fonte: n.fonte, url: n.url, tipo: "notizia" });
  for (const c of arr(mem.citazioni)) if (c && c.x) Q.push({ argomento: c.argomento || "", x: c.x, fonte: c.autore ? `${c.autore} · Wikiquote` : "Wikiquote", tipo: "citazione" });
  return Q.map(q => ({ ...q, r: new Set(contenuto(q.x).map(radice)), ra: new Set(contenuto(q.argomento || "").map(radice)) }));
}

/* le parole del quaderno, per chiedere alla rete quali sono vicine a quelle della domanda */
export function lessicoQuaderno(Q){ const s = new Set(); for (const q of Q) for (const w of contenuto(q.x)) if (w.length > 3) s.add(w); return [...s]; }
export function chiave(testo){ return contenuto(testo); }

/* cerca la frase migliore. vicine = { parola: [[vicina, somiglianza], …] } dalla sua rete (facoltativo) */
export function cerca(Q, testo, { vicine = {}, escludi = new Set() } = {}){
  const q = contenuto(testo); if (!q.length || !Q.length) return null;
  const N = Q.length, df = new Map();
  for (const it of Q) for (const r of it.r) df.set(r, (df.get(r) || 0) + 1);
  const idf = r => Math.log(1 + N/(1 + (df.get(r) || 0)));
  // pesi della domanda: le sue parole (1) e le vicine secondo la rete (somiglianza × 0.6)
  const peso = new Map(), da = new Map();
  for (const w of q){ const r = radice(w); peso.set(r, Math.max(peso.get(r) || 0, 1)); da.set(r, w); }
  for (const w of q) for (const [v, s] of (vicine[w] || [])){ if (s < .45) continue; const r = radice(v); if (!peso.has(r) || peso.get(r) < s*.6){ peso.set(r, s*.6); da.set(r, `${v}≈${w}`); } }
  // che tipo di domanda: «perché» vuole una causa, «quando» una data, «quanto/quanti» un numero
  const low = String(testo).toLowerCase(), vuole = /perch|come mai/.test(low) ? /\b(perché|poiché|perciò|quindi|a causa|causa|grazie a|dovut)/i
    : /quando|in che anno/.test(low) ? /\b(1[0-9]{3}|20[0-9]{2}|secolo)\b/i : /quant[oiea]|alto|alta|lungo|grande/.test(low) ? /\d/ : null;
  let best = null;
  for (const it of Q){
    if (escludi.has(it.x)) continue;
    let sc = 0; const usate = [];
    for (const [r, w] of peso) if (it.r.has(r)){ sc += w*idf(r); usate.push(da.get(r)); }
    if (!sc) continue;
    for (const [r, w] of peso) if (it.ra.has(r)) sc += 1.2*w*idf(r);     // ne parla proprio
    let diretto = false; for (const [r] of peso) if (it.ra.has(r)) diretto = true;
    if (vuole && vuole.test(it.x)) sc *= 1.6; else if (it.def) sc *= 1.15;   // la risposta del tipo giusto, o la definizione
    sc /= Math.sqrt(Math.max(4, it.r.size))/2;                           // le frasi lunghissime non vincono per quantità
    if (!best || sc > best.punteggio){ const { r, ra, ...resto } = it; best = { ...resto, punteggio: +sc.toFixed(3), parole: usate, diretto }; }
  }
  return best;
}

/* è una domanda di conoscenza? (non «come stai?», non «ti piace?») */
export function domandaDiSapere(testo){
  const low = String(testo || "").toLowerCase().trim();
  if (!/\?$|^(perch|come mai|cosa|che cos|chi |dove|quando|quanti|quante|qual|sai |sapevi|conosci|hai letto|cos')/.test(low)) return false;
  if (/^(come stai|come va|cosa fai|che fai|chi sei|come ti chiami|dove sei|ti piace|mi vuoi|cosa pensi|che ne pensi|sai chi sono|cosa ti piace|qual è il tuo|qual è la tua)/.test(low)) return false;
  return contenuto(low).length > 0;
}
const minuscola = s => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
/* come lo dice */
export function frase(hit, { spontanea = false } = {}){
  const x = String(hit.x).replace(/\s+/g, " ").trim(), arg = String(hit.argomento || "").toLowerCase();
  if (hit.tipo === "citazione") return spontanea ? `mi viene in mente una frase: «${x}»` : `ho letto questa frase: «${x}»`;
  if (hit.tipo === "notizia") return spontanea ? `stanotte ho letto una notizia: ${minuscola(x)}` : `ho letto nelle notizie: ${minuscola(x)}`;
  if (spontanea) return `a proposito di ${arg}: ho letto che ${minuscola(x)}`;
  return `ho letto che ${minuscola(x)}`;
}
