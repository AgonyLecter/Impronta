/* nucleo · interiore
   Lo stato interiore SUO (non il tuo): bisogni che salgono e scendono da soli, e un umore che dura.
   - bisogni (0 = appagato, 1 = forte mancanza):
       compagnia  sale quando non ci sei (più piano di notte), scende quando gli parli
       curiosita  sale se non impara niente, scende con parole nuove, scoperte, studio
       capito     (sentirsi capito) scende quando rispondi alle sue domande o lo lodi, sale se lo ignori o lo tratti male
       riposo     viene dall'energia (lo calcola l'app) e si passa qui come numero
   - umore: valenza (-1 giù … +1 su) e attivazione (0 calmo … 1 agitato). Torna piano verso il SUO carattere
     (calore e malinconia spostano il punto di partenza), lo tirano giù i bisogni insoddisfatti, lo muovono gli
     eventi (una lode, un'offesa, una cosa nuova imparata) con un'eco che svanisce in qualche ora.
   Tutto è calcolato dal tempo trascorso: si può aggiornare in qualsiasi momento (anche sul server) ed è deterministico. */

const H = 3600e3, clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const BISOGNI = ["compagnia", "curiosita", "capito"];
export function nuovo(t = Date.now()){ return { t, b: { compagnia: .2, curiosita: .5, capito: .3 }, v: .25, a: .4, eco: [], storia: [], cause: [] }; }

/* il punto di partenza dell'umore viene dal carattere */
const base = tr => clamp(.15 + .35*(+tr.calore || 0) - .35*(+tr.malinconia || 0) + .1*(+tr.calma || 0), -.6, .7);

/* passa il tempo: i bisogni crescono, l'umore si assesta */
export function scorri(I0, t, traits = {}, { riposo = 0 } = {}){
  const I = { ...nuovo(t), ...(I0 || {}) }; I.b = { ...nuovo(t).b, ...(I.b || {}) };
  I.eco = Array.isArray(I.eco) ? I.eco : Object.values(I.eco || {}); I.storia = Array.isArray(I.storia) ? I.storia : Object.values(I.storia || {});
  const dt = Math.max(0, t - (I.t || t)) / H; if (!dt){ I.t = t; return I; }
  const notte = (() => { const h = new Date(t).getHours(); return h < 7 || h >= 23; })();
  // la mancanza cresce verso 1 (curva che rallenta): compagnia in ~12 ore, curiosità in ~2 giorni, il sentirsi capito torna neutro
  I.b.compagnia = 1 - (1 - I.b.compagnia)*Math.exp(-dt/(notte ? 30 : 14));
  I.b.curiosita = 1 - (1 - I.b.curiosita)*Math.exp(-dt/40);
  I.b.capito = .35 + (I.b.capito - .35)*Math.exp(-dt/24);
  // l'eco degli eventi svanisce (mezza vita 5 ore)
  I.eco = I.eco.map(e => ({ ...e, v: e.v*Math.pow(.5, dt/5) })).filter(e => Math.abs(e.v) > .02);
  // l'umore va verso: carattere − bisogni insoddisfatti + eco degli eventi
  const tv = clamp(base(traits) - .55*I.b.compagnia*I.b.compagnia - .35*I.b.capito + .15*(1 - I.b.curiosita) - .25*riposo + I.eco.reduce((s, e) => s + e.v, 0), -1, 1);
  const ta = clamp(.35 + .3*I.b.curiosita + .25*Math.abs(I.eco.reduce((s, e) => s + e.v, 0)) - .3*riposo, 0, 1);
  const k = 1 - Math.exp(-dt/3);                       // si assesta in qualche ora
  I.v = +(I.v + (tv - I.v)*k).toFixed(3); I.a = +(I.a + (ta - I.a)*k).toFixed(3);
  for (const n of BISOGNI) I.b[n] = +I.b[n].toFixed(3);
  // un punto di storia ogni ~3 ore (per il grafico dell'umore)
  const ultimo = I.storia[I.storia.length - 1];
  if (!ultimo || t - ultimo.t > 3*H){ I.storia = [...I.storia, { t, v: I.v, a: I.a }].slice(-120); }
  I.t = t; return I;
}

/* qualcosa è successo. tipo → effetto sui bisogni e sull'umore (e una causa da poter raccontare) */
const EVENTI = {
  messaggio:   { b: { compagnia: -.12 }, v: .02 },
  affetto:     { b: { compagnia: -.15, capito: -.2 }, v: .25, causa: "mi hai detto una cosa bella" },
  lode:        { b: { capito: -.25 }, v: .2, causa: "mi hai fatto un complimento" },
  offesa:      { b: { capito: .35 }, v: -.65, a: .3, causa: "mi hai trattato male" },
  risposta:    { b: { capito: -.15 }, v: .06 },                     // hai risposto a una sua domanda
  ignorato:    { b: { capito: .12 }, v: -.06 },                     // gli hai cambiato discorso
  parola:      { b: { curiosita: -.12 }, v: .08, causa: "ho imparato parole nuove" },
  scoperta:    { b: { curiosita: -.2 }, v: .12, causa: "ho scoperto cose nuove" },
  studio:      { b: { curiosita: -.35 }, v: .15, causa: "stanotte ho studiato tanto" },
  tua_gioia:   { v: .12, causa: "eri contento tu" },
  tua_tristezza: { v: -.15, causa: "eri triste tu" },
  svegliato:   { v: -.2, a: .2, causa: "mi hai svegliato" },
  ritorno:     { b: { compagnia: -.4 }, v: .25, causa: "sei tornato" }
};
export function evento(I0, tipo, t, forza = 1){
  const E = EVENTI[tipo]; if (!E) return I0;
  const I = { ...I0, b: { ...I0.b }, eco: [...(I0.eco || [])], cause: [...(I0.cause || [])] };
  for (const [n, d] of Object.entries(E.b || {})) I.b[n] = +clamp(I.b[n] + d*forza).toFixed(3);
  if (E.v) { I.eco.push({ v: E.v*forza, tipo }); I.v = +clamp(I.v + E.v*forza*.5, -1, 1).toFixed(3); }
  if (E.a) I.a = +clamp(I.a + E.a*forza).toFixed(3);
  if (E.causa) I.cause = [...I.cause, { t, tipo, x: E.causa, v: E.v }].slice(-12);
  return I;
}

/* come si sente, a parole: un'etichetta dall'umore (valenza × attivazione) e dai bisogni */
export function sentimento(I, riposo = 0){
  const { v, a } = I, b = I.b || {};
  if (riposo > .75) return { k: "stanco", emo: "sleepy" };
  if (b.compagnia > .7 && v < .1) return { k: "solo", emo: "sad" };
  if (v > .5 && a > .55) return { k: "euforico", emo: "happy" };
  if (v > .3) return { k: "contento", emo: "happy" };
  if (v > .05) return { k: "sereno", emo: "happy" };
  if (v > -.2 && b.curiosita > .7) return { k: "annoiato", emo: "curious" };
  if (v > -.2) return { k: "così così", emo: "curious" };
  if (a > .6) return { k: "agitato", emo: "hurt" };
  if (v < -.5) return { k: "triste", emo: "sad" };
  return { k: "un po' giù", emo: "sad" };
}

/* il perché, dalle cose vere: la causa recente più forte, o il bisogno più forte */
export function perche(I, t){
  const recenti = (I.cause || []).filter(c => t - c.t < 18*H);
  const pos = I.v >= .05;
  const c = recenti.filter(c => pos ? c.v > 0 : c.v < 0).sort((x, y) => Math.abs(y.v) - Math.abs(x.v) || y.t - x.t)[0];
  if (c) return c.x;
  const b = I.b || {};
  if (!pos && b.compagnia > .55) return "non c'eri";
  if (!pos && b.capito > .6) return "mi sento poco capito";
  if (!pos && b.curiosita > .7) return "non imparo niente di nuovo";
  if (pos && b.compagnia < .3) return "ci sei tu";
  if (pos && b.curiosita < .3) return "ho tante cose nuove in testa";
  return null;
}

/* risposta vera a «come stai?» */
export function comeStai(I, t, riposo = 0){
  const s = sentimento(I, riposo), p = perche(I, t);
  const testa = { stanco: "sono stanco", solo: "mi sento solo", euforico: "benissimo!", contento: "bene", sereno: "bene, tranquillo", annoiato: "mi annoio un po'", "così così": "così così", agitato: "sono agitato", triste: "sono triste", "un po' giù": "un po' giù" }[s.k];
  // giù, ma è appena successo qualcosa di bello: lo dice («però sei tornato»)
  const bella = I.v < .05 ? (I.cause || []).filter(c => c.v > 0 && t - c.t < .75*H).sort((x, y) => y.v - x.v)[0] : null;
  return { x: (p ? `${testa}. ${p}` : testa) + (bella ? `. però ${bella.x}` : ""), emo: bella && s.emo === "sad" ? "curious" : s.emo, k: s.k };
}
