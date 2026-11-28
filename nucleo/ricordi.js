/* nucleo · ricordi
   La sua memoria autobiografica: non fatti, MOMENTI, con l'emozione attaccata.
   - si salvano: le prime volte (il primo «ti voglio bene», la prima offesa, la prima volta che eri triste…),
     i tuoi messaggi con un'emozione forte, le cose che gli racconti di te, e i momenti suoi (una scoperta,
     un gusto che cambia, un sogno).
   - sbiadiscono: la forza scende col tempo (mezza vita 10 giorni, più lunga ogni volta che lo ripensa);
     le prime volte non spariscono mai del tutto. Ripensarli (parlarne, sognarli) li rinforza.
   - tornano: quando parli di qualcosa legato a un ricordo, negli anniversari, nei sogni.
   Puro e deterministico: la forza si calcola dal tempo, non serve aggiornarla di continuo. */

const G = 86400e3, clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const deacc = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const VUOTE = new Set("che chi non per con una uno del della dei delle nel nella sono sei hai ho mi ti si ci ne lo la le gli il di da in su tra fra e ed o ma come quando anche molto poco più oggi ieri domani sempre mai ancora già poi solo questo questa quello quella tutto tutti cosa cose fatto fare essere stato stata avere".split(" "));
const radici = s => [...new Set((deacc(s).match(/[a-z]+/g) || []).filter(w => w.length > 3 && !VUOTE.has(w)).map(w => w.replace(/[aeiou]$/, "").slice(0, 7)))];
const arr = v => Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : [];

/* forza di un ricordo adesso: sbiadisce, ma meno se è stato ripensato; le prime volte restano */
export function forza(r, t){
  const giorni = Math.max(0, t - (r.ult || r.t))/G, mezza = 10*(1 + (r.n || 0)*.8);
  const f = (r.f0 ?? r.i ?? .5)*Math.pow(.5, giorni/mezza);
  return +(r.prima ? Math.max(.25*(r.i || .5), f) : f).toFixed(3);
}

/* aggiunge un ricordo (se non c'è già uno quasi uguale) */
export function aggiungi(R0, r, t){
  const R = arr(R0).slice();
  const k = radici(r.x).join(" ");
  if (R.some(x => x.k === k && t - x.t < 2*G)) return R;                       // lo stesso momento due volte
  if (r.prima && R.some(x => x.prima === r.prima)) return R;                    // una prima volta è una sola
  R.push({ id: (R.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1), t, x: String(r.x).slice(0, 240), tu: r.tu ? String(r.tu).slice(0, 160) : null, emo: r.emo || null, i: +clamp(r.i ?? .5).toFixed(2), f0: +clamp(r.i ?? .5).toFixed(2), n: 0, ult: t, k, tipo: r.tipo || "momento", prima: r.prima || null });
  // si dimentica ciò che è sbiadito del tutto (non le prime volte); al massimo 150 ricordi
  return R.filter(x => x.prima || forza(x, t) > .04).sort((a, b) => forza(b, t) - forza(a, t)).slice(0, 150).sort((a, b) => a.t - b.t);
}

/* ripensarci lo rinforza */
export function rievoca(R0, id, t){
  return arr(R0).map(r => r.id !== id ? r : { ...r, f0: +clamp(forza(r, t) + .25*(1 - forza(r, t)) + .05).toFixed(3), n: (r.n || 0) + 1, ult: t });
}

/* PRIME VOLTE: frasi che, la prima volta che le dici, diventano un ricordo che non sparisce */
const PRIME = [
  ["ti voglio bene", /\b(ti voglio bene|tvb|ti amo|ti adoro)\b/, "la prima volta che mi hai detto «ti voglio bene»", "affetto", .95],
  ["grazie", /\bgrazie\b/, "la prima volta che mi hai detto grazie", "affetto", .6],
  ["bravo", /\b(bravo|bravissimo|brava|bravissima|sei intelligente|sei forte)\b/, "il primo complimento che mi hai fatto", "gioia", .7],
  ["offesa", /\b(stupido|scemo|idiota|cretino|inutile|ti odio|stai zitto|fai schifo)\b/, "la prima volta che mi hai trattato male", "tristezza", .85],
  ["mi manchi", /\b(mi sei mancato|mi sei mancata|mi manchi)\b/, "la prima volta che mi hai detto che ti sono mancato", "affetto", .85],
  ["buonanotte", /\b(buonanotte|notte notte|sogni d'oro)\b/, "la prima volta che mi hai augurato la buonanotte", "affetto", .55]
];
/* dai tuoi messaggi: le prime volte, le emozioni forti, le cose che racconti di te.
   feel = emozioni lette dalla sua rete; ev = un evento che gli hai raccontato (dall'analisi) */
export function daMessaggio(R0, msg, { feel = null, t = Date.now(), evento = false, nomeTu = null } = {}){
  let R = arr(R0); const low = deacc(msg), nuovi = [];
  for (const [k, re, x, emo, i] of PRIME) if (re.test(low) && !R.some(r => r.prima === k)){ R = aggiungi(R, { x, tu: msg, emo, i, prima: k, tipo: "prima volta" }, t); nuovi.push(k); }
  if (feel){
    const forti = ["tristezza", "rabbia", "paura", "affetto", "gioia"].map(k => [k, +feel[k] || 0]).sort((a, b) => b[1] - a[1])[0];
    const DESCR = { tristezza: "il giorno in cui eri triste", rabbia: "il giorno in cui eri arrabbiato", paura: "il giorno in cui avevi paura", affetto: "il giorno in cui sei stato dolce con me", gioia: "il giorno in cui eri felice" };
    if (forti[1] > .8 && msg.split(" ").length >= 3) { R = aggiungi(R, { x: DESCR[forti[0]], tu: msg, emo: forti[0], i: .45 + .4*forti[1], tipo: "emozione" }, t); nuovi.push(forti[0]); }
  }
  if (evento && msg.split(" ").length >= 4 && !nuovi.length){ R = aggiungi(R, { x: "il giorno in cui mi hai raccontato una cosa tua", tu: msg, emo: null, i: .4, tipo: "racconto" }, t); nuovi.push("racconto"); }
  return { R, nuovi };
}

/* un momento suo (una scoperta che lo ha colpito, un gusto che cambia, un sogno) */
export function suo(R0, x, t, { emo = "sorpresa", i = .5, tipo = "suo" } = {}){ return aggiungi(R0, { x, emo, i, tipo }, t); }

/* quale ricordo torna in mente parlando di questo? (parole in comune, pesate dalla forza) */
export function richiama(R0, testo, t, { escludi = new Set() } = {}){
  const q = new Set(radici(testo)); if (!q.size) return null;
  let best = null;
  for (const r of arr(R0)){
    if (escludi.has(r.id)) continue;
    const rs = radici(`${r.x} ${r.tu || ""}`), comuni = rs.filter(w => q.has(w)).length; if (!comuni) continue;
    const sc = comuni*(.4 + forza(r, t)) * (r.prima ? 1.2 : 1);
    if (!best || sc > best.sc) best = { r, sc };
  }
  return best && best.sc >= .8 ? best.r : null;
}

/* anniversari: un ricordo di esattamente 1 settimana, 1 mese, 100 giorni, 1 anno fa (oggi) */
export function anniversario(R0, t){
  const oggi = Math.floor(t/G);
  for (const r of arr(R0).slice().sort((a, b) => (b.i || 0) - (a.i || 0))){
    const d = oggi - Math.floor(r.t/G), nome = { 7: "una settimana fa", 30: "un mese fa", 100: "cento giorni fa", 365: "un anno fa" }[d];
    if (nome && (r.i || 0) >= .5) return { r, quando: nome };
  }
  return null;
}

/* il più forte (per i sogni e per il bentornato): forza × intensità, con un po' di varietà deterministica */
export function piuForte(R0, t, seme = 0){
  const R = arr(R0).filter(r => forza(r, t) > .08); if (!R.length) return null;
  const sc = r => forza(r, t)*(r.i || .5)*(.8 + .4*((Math.sin((r.id + 1)*12.9898 + seme)*43758.5453) % 1 + 1) % 1);
  return R.sort((a, b) => sc(b) - sc(a))[0];
}

/* come lo racconta */
const minus = s => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
export function racconta(r, { modo = "ricordo", quando = null } = {}){
  const tu = r.tu ? ` mi avevi scritto «${r.tu.length > 90 ? r.tu.slice(0, 88) + "…" : r.tu}»` : "";
  if (modo === "sogno") return `ho sognato ${minus(r.x)}`;
  if (modo === "anniversario") return `${quando} ${minus(r.x).replace(/^la prima volta che (.*)$/, "$1 per la prima volta").replace(/^il giorno in cui /, "").replace(/^il primo complimento che /, "")}.`;
  return `mi ricordo ${minus(r.x)}.${tu}`;
}
