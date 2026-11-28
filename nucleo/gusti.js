/* nucleo · gusti
   Le preferenze SUE: nascono dai suoi parametri e dalla sua storia, non a caso e non copiate dall'utente.
   Per ogni cosa che legge (un tema, una materia, un autore, un libro) misura con la sua rete:
   - sorpresa: perdita media per parola (quanto il testo è imprevedibile PER LUI)
     → gli piace la sorpresa "giusta": né banale né incomprensibile (curiosità come progresso di compressione)
   - progresso: quanto quella sorpresa scende notte dopo notte (gli piace ciò da cui impara)
   - cuore: le 8 emozioni che la sua testa affettiva legge in quei testi, pesate dal SUO carattere (S.traits)
   - familiarità: quante notti ci è tornato (un po' di affetto per il noto, un po' di gusto per il nuovo)
   Il punteggio cambia piano (media mobile) e il preferito cambia solo se un altro lo supera di SOGLIA:
   così i gusti sono stabili, spiegabili con numeri veri, e possono essere diversi da quelli dell'utente.
   Parole: tra sinonimi sceglie quella che "suona sua" (la sua rete la prevede meglio) e che incontra di più. */
import { AFFETTI } from "./rete.js";

export const TIPI = ["temi", "materie", "autori", "libri"];
export const SOGLIA = .08;         // di quanto un rivale deve superare il preferito per fargli cambiare idea
const LENTO = .25;                 // quanto pesa una notte nuova nel punteggio
const NOME = { temi: "argomento", materie: "materia", autori: "autore", libri: "libro" };

const tok = s => String(s).toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, " ").replace(/'/g, "' ").split(/\s+/).filter(Boolean);
/* Firebase non accetta . # $ / [ ] nelle chiavi; Gutenberg scrive gli autori «Cognome, Nome» */
export const chiave = n => String(n).replace(/^([^,]+), ([^,]+)$/, "$2 $1").replace(/[.#$/\[\]]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
const vuoto = () => ({ temi: {}, materie: {}, autori: {}, libri: {}, preferiti: {}, parole: {}, storia: [], notti: 0 });
const vec = (v, d = 0) => AFFETTI.map((_, i) => { const x = v && v[i]; return Number.isFinite(+x) && x !== null ? +x : d; });

/* quali emozioni gli piace provare, dal suo carattere (tratti in -1..1) */
export function gradite(traits = {}){
  const t = k => Math.max(-1, Math.min(1, +traits[k] || 0));
  const w = { gioia: .35 + .15*t("calore") - .25*t("malinconia"), tristezza: -.15 + .75*t("malinconia"), rabbia: -.35 - .2*t("calma"),
    paura: -.2 + .45*t("coraggio"), affetto: .25 + .35*t("calore"), ironia: .05 + .5*t("ironia"),
    stanchezza: -.3, sorpresa: .2 + .4*t("curiosita") };
  return AFFETTI.map(k => w[k]);
}

/* misura un gruppo di frasi con la sua rete (solo lettura: nessun allenamento) */
export function misura(net, frasi, { max = 40 } = {}){
  const xs = frasi.filter(f => typeof f === "string" && f.length > 8);
  const step = Math.max(1, Math.floor(xs.length / max)), scelte = xs.filter((_, i) => i % step === 0).slice(0, max);
  const exs = scelte.map(f => ({ ids: net.ids(tok(f), false), lm: 1, lab: null })).filter(e => e.ids.length >= 3);
  if (!exs.length) return null;
  const sorpresa = net.evalLoss(exs);
  const sente = AFFETTI.map(() => 0);
  for (const f of scelte){ const a = net.feel(tok(f)); AFFETTI.forEach((k, i) => sente[i] += a[k] / scelte.length); }
  return { sorpresa: +sorpresa.toFixed(3), sente: sente.map(v => +v.toFixed(3)), n: xs.length };
}

const mediana = xs => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length/2)] : 0; };

/* aggiunge le misure di stanotte e ricalcola i gusti. misure = [{ tipo, nome, sorpresa, sente, n }] */
export function aggiorna(G0, misure, traits, ora = Date.now()){
  const G = Object.assign(vuoto(), G0 || {}); for (const t of TIPI) G[t] = { ...(G[t] || {}) };
  G.preferiti = { ...(G.preferiti || {}) }; G.storia = [...(G.storia || [])]; G.notti = (G.notti || 0) + 1;
  for (const m of misure){
    if (!m || !TIPI.includes(m.tipo) || !m.nome || !Number.isFinite(m.sorpresa)) continue;
    const nome = chiave(m.nome), o = G[m.tipo][nome] = { s: null, prog: 0, sente: vec(null), volte: 0, p: 0, ...(G[m.tipo][nome] || {}) };
    o.sente = vec(o.sente);
    if (o.s != null) o.prog = +(.6*o.prog + .4*(o.s - m.sorpresa)).toFixed(3);     // positivo: ora lo capisce meglio
    o.s = +(o.s == null ? m.sorpresa : .6*o.s + .4*m.sorpresa).toFixed(3);
    o.sente = o.volte ? o.sente.map((v, i) => +(.6*v + .4*m.sente[i]).toFixed(3)) : vec(m.sente);
    o.volte++; o.ult = ora; o.frasi = (o.frasi || 0) + (m.n || 0); o.nuovo = 1;
  }
  const W = gradite(traits);
  // la sorpresa "giusta" è vicina alla mediana di tutto ciò che ha letto
  const tutte = TIPI.flatMap(t => Object.values(G[t]).map(o => o.s)).filter(Number.isFinite), centro = mediana(tutte);
  const largo = Math.max(.4, mediana(tutte.map(s => Math.abs(s - centro))) * 2);
  for (const t of TIPI) for (const [nome, o] of Object.entries(G[t])){
    if (!o.nuovo) continue; delete o.nuovo;
    const curiosita = Math.exp(-Math.pow((o.s - centro)/largo, 2));
    const progresso = Math.tanh(o.prog * 2);
    const cuore = o.sente.reduce((s, v, i) => s + v*W[i], 0);
    const familiare = Math.min(1, Math.log(1 + o.volte)/Math.log(8));
    const raw = .35*curiosita + .25*progresso + .3*Math.tanh(cuore*2) + .1*familiare + (o.volte === 1 ? .05 : 0);
    o.p = +(o.volte === 1 ? raw : (1 - LENTO)*o.p + LENTO*raw).toFixed(3);
    o.c = { curiosita: +curiosita.toFixed(2), progresso: +progresso.toFixed(2), cuore: +cuore.toFixed(2) };
  }
  // preferiti con isteresi
  for (const t of TIPI){
    const voci = Object.entries(G[t]); if (!voci.length) continue;
    const [best, ob] = voci.reduce((a, b) => b[1].p > a[1].p ? b : a), cur = G.preferiti[t], oc = cur && G[t][cur];
    if (!oc){ G.preferiti[t] = best; if (voci.length > 1) G.storia.push({ t: ora, tipo: t, nuovo: best }); }
    else if (best !== cur && ob.p > oc.p + SOGLIA){ G.preferiti[t] = best; G.storia.push({ t: ora, tipo: t, nuovo: best, prima: cur }); }
  }
  if (G.storia.length > 30) G.storia = G.storia.slice(-30);
  // non tenere tutto per sempre: per tipo restano le 40 cose più amate o più recenti
  for (const t of TIPI){ const voci = Object.entries(G[t]); if (voci.length > 40){ voci.sort((a, b) => (b[1].p + (b[1].ult||0)/1e13) - (a[1].p + (a[1].ult||0)/1e13)); G[t] = Object.fromEntries(voci.slice(0, 40).concat(voci.filter(([n]) => n === G.preferiti[t]))); } }
  return G;
}

export function classifica(G, tipo){ return Object.entries((G && G[tipo]) || {}).map(([nome, o]) => ({ nome, ...o })).sort((a, b) => b.p - a.p); }

/* il perché, in parole e numeri veri */
export function perche(o, breve = false){
  if (!o) return "";
  const pezzi = [], c = o.c || {}, sente = vec(o.sente), top = sente.indexOf(Math.max(...sente));
  if (c.curiosita >= .6) pezzi.push(`mi sorprende ma lo capisco (sorpresa ${o.s.toFixed(2)})`);
  else if (c.curiosita < .3) pezzi.push(o.s > 0 ? `è difficile da prevedere per me (sorpresa ${o.s.toFixed(2)})` : `è un po' prevedibile (sorpresa ${o.s.toFixed(2)})`);
  if (c.progresso > .15) pezzi.push(`ne capisco sempre di più (−${(o.prog).toFixed(2)} di sorpresa)`);
  else if (c.progresso < -.15) pezzi.push(`ultimamente lo capisco meno`);
  if (sente[top] > .25) pezzi.push(`mi fa sentire ${AFFETTI[top]} (${Math.round(sente[top]*100)}%)`);
  if (o.volte > 2) pezzi.push(`ci sono tornato ${o.volte} volte`);
  if (breve && pezzi.length) return pezzi[0];
  return pezzi.join(", ") || `ci sto ancora pensando (${o.volte} ${o.volte === 1 ? "lettura" : "letture"})`;
}

/* tra sinonimi sceglie la parola che suona "sua": la rete la prevede meglio dopo l'inizio di frase, ed è frequente nelle sue letture.
   gruppi = { concetto: [parole] }; freq = Map parola → conteggio. Isteresi anche qui. */
export function scegliParole(net, gruppi, freq, prima = {}){
  const out = { ...prima };
  for (const [k, ws] of Object.entries(gruppi)){
    const cand = [...new Set(ws)].filter(w => net.idx.has(w)); if (cand.length < 2) continue;
    const sc = cand.map(w => { const l = net.evalLoss([{ ids: [net.idx.get(w)], lm: 1, lab: null }]); return { w, s: -l + .6*Math.log(1 + (freq.get(w) || 0)) - .05*w.length }; }).sort((a, b) => b.s - a.s);
    const cur = prima[k] && cand.includes(prima[k].w) ? sc.find(x => x.w === prima[k].w) : null;
    out[k] = !cur || sc[0].s > cur.s + .3 ? { w: sc[0].w, tra: cand.slice(0, 5) } : { w: cur.w, tra: cand.slice(0, 5) };
  }
  return out;
}

/* domande dell'utente sui suoi gusti. Restituisce { x, cap } oppure null */
const TIPO_DI = [[/(libr|romanz|leggere)/, "libri"], [/(autor|scrittor|scrittric|poet)/, "autori"], [/(materi|studiare|scuola)/, "materie"], [/(argoment|tema|temi|cosa ti piace|di cosa)/, "temi"]];
export function rispondi(G, testo, ultimo = null){
  const low = String(testo || "").toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, " ").trim().replace(/\?$/, "");
  if (!G) return null;
  let m;
  // «perché?» subito dopo aver detto un gusto
  if (ultimo && /^(e )?perch(é|e|è)( ti piace| lo preferisci| proprio (lui|lei|quello|quella))?$/.test(low)){
    const o = G[ultimo.tipo] && G[ultimo.tipo][ultimo.nome]; if (o) return { x: `perché ${perche(o)}`, cap: "i numeri sono della sua rete", ultimo };
  }
  // «chi/cosa preferisci tra X e Y?»
  if ((m = low.match(/^(?:chi|cosa|quale|che cosa) preferisci(?: tra| fra)? (.+?) (?:o|e) (.+)$/))){
    const [a, b] = [m[1], m[2]].map(s => s.replace(/^(il |lo |la |l'|i |gli |le )/, "").trim());
    const trova = q => { for (const t of TIPI) for (const [nome, o] of Object.entries(G[t] || {})) if (nome.toLowerCase().includes(q) || q.includes(nome.toLowerCase())) return { t, nome, o }; return null; };
    const A = trova(a), B = trova(b);
    if (A && B){ const [w, l] = A.o.p >= B.o.p ? [A, B] : [B, A]; const vicini = Math.abs(A.o.p - B.o.p) < .03;
      return { x: vicini ? `quasi uguali. forse ${w.nome}: ${perche(w.o, true)}` : `${w.nome}. ${perche(w.o, true)}. ${l.nome} ${l.o.p < .3 ? "mi piace poco" : "mi piace meno"}`, cap: `punteggi ${w.o.p.toFixed(2)} contro ${l.o.p.toFixed(2)}`, ultimo: { tipo: w.t, nome: w.nome } }; }
    if (A || B){ const k = A || B, altro = A ? b : a; return { x: `${k.nome}. ${altro} non l'ho ancora letto`, cap: perche(k.o), ultimo: { tipo: k.t, nome: k.nome } }; }
    return { x: `non ho ancora letto né ${a} né ${b}. magari stanotte`, cap: "i gusti nascono da quello che legge" };
  }
  // «qual è il tuo libro / autore / argomento / materia preferito?», «cosa ti piace leggere?»
  if (/(tuo|tua) .*preferit|ti piace (leggere|studiare)|cosa ti piace|che cosa ti piace|i tuoi gusti|cosa preferisci/.test(low) && !/(mio|mia) /.test(low)){
    let tipo = null; for (const [re, t] of TIPO_DI) if (re.test(low)){ tipo = t; break; }
    const tipi = tipo ? [tipo] : TIPI.filter(t => G.preferiti && G.preferiti[t]);
    if (!tipi.length || (tipo && !(G.preferiti || {})[tipo])) return { x: tipo ? `non ho ancora un ${NOME[tipo]} preferito. sto leggendo` : "non lo so ancora. i gusti mi vengono leggendo, di notte", cap: "nasceranno dalle sue letture" };
    const t = tipi[0], nome = G.preferiti[t], o = G[t][nome];
    const altri = tipo ? "" : tipi.slice(1, 3).map(k => `${NOME[k]}: ${G.preferiti[k]}`).join(" · ");
    return { x: `${nome}. ${perche(o, true)}`, cap: altri || `${NOME[t]} preferito · punteggio ${o.p.toFixed(2)}`, ultimo: { tipo: t, nome } };
  }
  // «che parola preferisci per dire X?»
  if ((m = low.match(/^(?:che|quale) parola (?:preferisci|usi) per (?:dire )?([a-zà-ù']+)$/))){
    const q = m[1], hit = Object.entries(G.parole || {}).find(([k, v]) => k === q || (v.tra || []).includes(q));
    return hit ? { x: `${hit[1].w}. mi suona meglio di ${hit[1].tra.filter(w => w !== hit[1].w).slice(0, 2).join(" o ")}`, cap: "scelta dalla sua rete tra i sinonimi" } : { x: `per ${q} non ho ancora una parola mia`, cap: "" };
  }
  return null;
}

/* usa davvero le sue parole: nelle SUE frasi un sinonimo diventa la parola che preferisce.
   Solo parole intere; rispetta la maiuscola iniziale. Restituisce { x, cambi: [[da, a]] } */
export function applicaParole(x, parole = {}){
  const cambi = []; let out = String(x);
  for (const v of Object.values(parole || {})){
    if (!v || !v.w || !Array.isArray(v.tra)) continue;
    for (const da of v.tra){ if (!da || da === v.w || da.includes(" ")) continue;
      const re = new RegExp(`(?<![\\p{L}'])${da}(?![\\p{L}])`, "giu");
      if (re.test(out)){ out = out.replace(re, m => m[0] === m[0].toUpperCase() && m[0] !== m[0].toLowerCase() ? v.w.charAt(0).toUpperCase() + v.w.slice(1) : v.w); cambi.push([da, v.w]); } }
  }
  return { x: out, cambi };
}

/* un commento spontaneo quando parli di qualcosa che ama (o che non gli piace) */
const radice = w => String(w).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[aeiou]$/, "").slice(0, 7);
export function commento(G, testo){
  if (!G) return null;
  const ws = new Set(tok(testo).filter(w => w.length > 3).map(radice)); if (!ws.size) return null;
  let best = null;
  for (const t of TIPI) for (const [nome, o] of Object.entries(G[t] || {})){
    const rs = tok(nome).filter(w => w.length > 3).map(radice); if (!rs.length || !rs.some(r => ws.has(r))) continue;
    if (!best || Math.abs(o.p - .4) > Math.abs(best.o.p - .4)) best = { t, nome, o };
  }
  if (!best) return null;
  const { t, nome, o } = best, fav = (G.preferiti || {})[t] === nome, n = nome.toLowerCase();
  const x = fav ? `${n}! è il mio ${NOME[t]} preferito. ${perche(o, true)}`
    : o.p >= .45 ? `${n} mi piace. ${perche(o, true)}` : o.p < .25 ? `a me ${n} piace poco. ${perche(o, true)}` : null;
  return x ? { x, cap: `i suoi gusti · punteggio ${o.p.toFixed(2)}`, ultimo: { tipo: t, nome } } : null;
}
