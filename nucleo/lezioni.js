/* nucleo · lezioni
   Come gli insegni le parole. Capisce tanti modi di dirlo, come si fa con un bambino:
     «ti insegno una parola: zibaldone»            → { tipo: "chiedi", w }         (poi aspetta il significato)
     «zibaldone vuol dire / significa / indica …»   → { tipo: "def", w, x }
     «impara: zibaldone = quaderno di appunti»      → { tipo: "def", w, x }
     «la parola X vuol dire …», «si dice X quando …» → { tipo: "def", w, x }
     «no, X vuol dire …» / «sbagli, X è …»          → { tipo: "correggi", w, x }
     «X è come Y», «X e Y sono sinonimi»            → { tipo: "sinonimo", w, y }
     «il contrario di X è Y»                        → { tipo: "contrario", w, y }
     «dimentica la parola X»                        → { tipo: "dimentica", w }
     «cosa ti ho insegnato?», «che parole ti ho insegnato?» → { tipo: "elenco" }
   attesa = la parola di cui sta aspettando il significato (S.mem.ask), per capire «vuol dire …» senza ripeterla.
   Puro: restituisce cosa ha capito, l'app decide cosa farne. */

const W = "([a-zà-ù'][a-zà-ù'-]{1,30})";
const VUOTE = /^(cosa|che|chi|come|dove|quando|perch[eé]|quale|qual|quanto|quanti|cos|com|dov|io|tu|lui|lei|noi|voi|loro|mi|ti|ci|non|si|ma|e|o|questo|questa|quello|quella|oggi|ieri|domani|ora|adesso)$/;
const pulisci = s => String(s || "").replace(/[«»"“”]/g, "").replace(/\s+/g, " ").replace(/[.!?;,\s]+$/, "").trim();
const art = s => s.replace(/^(il|lo|la|l'|i|gli|le|un|una|uno|un')\s*/i, "");
const ok = w => w && w.length >= 2 && !VUOTE.test(w);

export function lezione(testo, attesa = null){
  const low = pulisci(String(testo).toLowerCase().replace(/[’`]/g, "'"));
  if (!low || /https?:|www\./.test(low)) return null;                 // un link non è una lezione
  const domanda = /\?\s*$/.test(String(testo).trim());
  let m;
  // elenco e dimenticare
  if (/^(cosa|che cosa|quali parole|che parole) (ti ho insegnato|hai imparato da me|ti ho spiegato)$/.test(low) || /^(quali|che) parole (conosci|sai) (da me|che ti ho insegnato)$/.test(low)) return { tipo: "elenco" };
  if ((m = low.match(new RegExp(`^(?:dimentica|scordati|cancella)(?: la parola)? ${W}$`))) && ok(m[1])) return { tipo: "dimentica", w: art(m[1]) };
  if (domanda) return null;                                              // una domanda non è mai una lezione
  // annunciare una parola da insegnare
  if ((m = low.match(new RegExp(`^(?:ti insegno|ti spiego|impara|imparati|ti dico)(?: una nuova parola| una parola nuova| una parola| la parola| questa parola)[:,]?\\s*${W}$`))) && ok(m[1])) return { tipo: "chiedi", w: art(m[1]) };
  // correzioni
  const corr = low.match(/^(?:no|non è così|sbagli|hai sbagliato|ti correggo|non proprio)[,.!:]?\s+(.+)$/);
  const corpo = corr ? corr[1] : low.replace(/^(?:impara|imparati|ricorda|ricordati|segnati|ti insegno|ti spiego)(?: che| questa:| questo:|:)?\s+/, "");
  const tipoDef = corr ? "correggi" : "def";
  // contrario e sinonimi
  if ((m = corpo.match(new RegExp(`^il contrario di ${W} (?:è|e) ${W}$`))) && ok(m[1]) && ok(m[2])) return { tipo: "contrario", w: art(m[1]), y: art(m[2]) };
  if ((m = corpo.match(new RegExp(`^${W} e ${W} sono sinonimi$`))) && ok(m[1]) && ok(m[2])) return { tipo: "sinonimo", w: art(m[1]), y: art(m[2]) };
  if ((m = corpo.match(new RegExp(`^(?:la parola )?${W} (?:è come|vuol dire come|è uguale a|è un sinonimo di|è sinonimo di) ${W}$`))) && ok(m[1]) && ok(m[2]) && !/^(un|una|uno|il|la|lo)$/.test(m[2])) return { tipo: "sinonimo", w: art(m[1]), y: art(m[2]) };
  // definizioni
  const def = (w, x) => { w = art(w); x = pulisci(x); return ok(w) && x.length >= 2 && x.split(" ").length <= 30 && x !== w ? { tipo: tipoDef, w, x } : null; };
  if ((corpo !== low || /^(?:la parola|il termine) /.test(corpo)) && (m = corpo.match(new RegExp(`^(?:la parola |il termine )?${W}\\s*(?:=|:)\\s*(.+)$`)))) { const r = def(m[1], m[2]); if (r) return r; }   // «impara: X = …»
  if ((m = corpo.match(new RegExp(`^(?:la parola |il termine )?(?:il |lo |la |l'|un |una |uno |i |gli |le )?${W} (?:vuol dire|significa|indica|si usa per|serve per|serve a|si dice quando|è quando|sono quando) (.+)$`)))) { const r = def(m[1], m[2]); if (r) return r; }
  if ((m = corpo.match(new RegExp(`^si dice ${W} (quando .+|per .+)$`)))) { const r = def(m[1], m[2]); if (r) return r; }
  if ((m = corpo.match(new RegExp(`^(?:la parola |il termine )?(?:il |lo |la |l'|un |una |uno |i |gli |le )?${W} (?:è|sono) ((?:un|una|uno|un'|il|la|lo|l'|i|gli|le|quando|come|tipo|quella cosa|quel|quella) .+)$`))) && (corr || /^(?:la parola|il termine|impara|ricorda)/.test(low) || m[2].split(" ").length >= 2)){ const r = def(m[1], m[2]); if (r) return r; }
  // stava aspettando il significato di una parola: «vuol dire …», «è …», «significa …», «quando …»
  if (attesa && (m = low.match(/^(?:vuol dire|significa|indica|è|sono|cioè|quando|si usa per|serve per)\s+(.+)$/))){ const r = def(attesa, /^quando/.test(low) ? low : m[1]); if (r) return { ...r, tipo: "def" }; }
  return null;
}

/* come risponde quando impara: ripete con le sue parole, così vedi cosa ha capito */
export function risposta(L, { prima = false, vecchia = null } = {}){
  if (!L) return null;
  const vd = x => /^(quando|se|per|che|fare|essere|avere)\b/.test(x) ? "vuol dire" : /^(un|una|uno|un'|il|la|lo|l'|i|gli|le)\b/.test(x) ? "è" : "vuol dire";
  switch (L.tipo){
    case "chiedi": return `${L.w}... è nuova. cosa vuol dire ${L.w}?`;
    case "def": return prima ? `${L.w} ${vd(L.x)} ${L.x}. è la prima parola che mi insegni. non la dimentico` : `${L.w} ${vd(L.x)} ${L.x}. me lo segno`;
    case "correggi": return vecchia ? `ah. pensavo che ${L.w} fosse ${vecchia}. invece ${vd(L.x)} ${L.x}. grazie` : `${L.w} ${vd(L.x)} ${L.x}. ok, corretto`;
    case "sinonimo": return `${L.w} è come ${L.y}. bello: due parole per la stessa cosa`;
    case "contrario": return `il contrario di ${L.w} è ${L.y}. me lo segno`;
    case "dimentica": return `va bene. ${L.w} la lascio andare`;
    default: return null;
  }
}
