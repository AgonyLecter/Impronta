/* nucleo · etichette automatiche
   Da dove impara le emozioni senza che nessuno gliele spieghi:
   1. emoji (affidabili): 😭 = tristezza, 🙄 = ironia...  — la rete impara dalle PAROLE accanto
   2. segnali del linguaggio (deboli): insulti, "ahah", parole di stato d'animo
   3. le tue conferme (fortissime): "stai scherzando?" → "sì" */
export const EMOJI = {
  "😂":["gioia"],"🤣":["gioia"],"😆":["gioia"],"😄":["gioia"],"😁":["gioia"],"😀":["gioia"],"😊":["gioia","affetto"],"🙂":["gioia"],"🎉":["gioia"],"🥳":["gioia"],
  "😍":["affetto","gioia"],"🥰":["affetto"],"❤️":["affetto"],"❤":["affetto"],"💕":["affetto"],"💖":["affetto"],"🤗":["affetto"],"😘":["affetto"],
  "😢":["tristezza"],"😭":["tristezza"],"😞":["tristezza"],"😔":["tristezza"],"💔":["tristezza"],"🥺":["tristezza","affetto"],"☹️":["tristezza"],"🙁":["tristezza"],
  "😡":["rabbia"],"🤬":["rabbia"],"😠":["rabbia"],"😤":["rabbia"],
  "😰":["paura"],"😱":["paura","sorpresa"],"😨":["paura"],"😟":["paura"],"😬":["paura"],
  "😴":["stanchezza"],"🥱":["stanchezza"],"😩":["stanchezza","tristezza"],"😪":["stanchezza"],
  "🙄":["ironia"],"😏":["ironia"],"🙃":["ironia"],"😒":["ironia","rabbia"],"🤡":["ironia"],
  "😮":["sorpresa"],"😲":["sorpresa"],"🤯":["sorpresa"],"😳":["sorpresa"]
};
const WORDS = [
  [/\b(trist|giù|piang|sol[oa] |vuot|deluso|delusa|malinconi|mi manca|mi manchi)/, "tristezza"],
  [/\b(arrabbiat|furios|incazz|nervos|che rabbia|odio|non sopporto)/, "rabbia"],
  [/\b(paura|ansia|terrorizz|agitat|preoccupat|panico)/, "paura"],
  [/\b(stanc|sonno|esaust|distrutt|sfinit)/, "stanchezza"],
  [/\b(felic|content|evviva|che bello|fantastic|benissimo)/, "gioia"],
  [/\b(ti voglio bene|tvb|ti adoro|mi manchi|grazie di)/, "affetto"],
  [/\b(non ci credo|davvero\?|incredibile|wow|ma dai)/, "sorpresa"]
];
/* restituisce { lab, mask, w } oppure null */
export function etichetta(msg, a, AFFETTI){
  const lab = AFFETTI.map(() => 0), mask = AFFETTI.map(() => 0);
  const set = (k, v, m) => { const i = AFFETTI.indexOf(k); if (i < 0) return; lab[i] = v; mask[i] = Math.max(mask[i], m); };
  const emo = msg.match(/\p{Extended_Pictographic}️?/gu) || [];
  let w = 0;
  for (const e of emo){ const ks = EMOJI[e] || EMOJI[e.replace("️","")]; if (ks){ ks.forEach(k => set(k, 1, 1)); w = .8; } }
  if (w){ AFFETTI.forEach((k,i) => { if (!mask[i]) { mask[i] = .25; } }); return { lab, mask, w }; }
  const low = (a && a.low) || msg.toLowerCase();
  if (a && a.insult){ set("rabbia", 1, 1); w = .4; }
  if (a && a.humor){ set("gioia", 1, 1); w = .35; }
  if (a && a.kind){ set("affetto", 1, 1); w = .4; }
  for (const [re, k] of WORDS) if (re.test(low + " ")){ set(k, 1, 1); w = Math.max(w, .35); }
  return w ? { lab, mask, w } : null;
}
/* etichetta forte dopo una tua conferma */
export function conferma(k, si, AFFETTI){
  const lab = AFFETTI.map(() => 0), mask = AFFETTI.map(() => 0), i = AFFETTI.indexOf(k);
  lab[i] = si ? 1 : 0; mask[i] = 1; return { lab, mask, w: 1.2 };
}
/* valenza (piacevole/spiacevole) da un vettore affettivo */
export function valenza(f){ if (!f) return 0; return (f.gioia||0) + .8*(f.affetto||0) + .2*(f.sorpresa||0) - (f.tristezza||0) - .8*(f.rabbia||0) - .7*(f.paura||0) - .4*(f.stanchezza||0); }
