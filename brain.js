/* impronta · cervello
   Capisce tutto quello che scrivi, ma può rispondere solo con parole che gli hai insegnato
   (più una piccola "grammatica innata" che cresce con le fasi).
   Pipeline: analisi → memoria → genera molte risposte candidate → le valuta → ne sceglie una. */

export const PHASES = ["seme","eco","parola","frase","voce"];
export const LIMITS = [40,60,100,160,220];      // caratteri che capisce in input
export const OUTMAX = [0,24,40,90,150];         // lunghezza massima delle sue frasi
export const ENERGY = [12,18,26,34,44];
export const NEED = [[0,0],[5,0],[22,2],[60,5],[130,12]]; // parole contenuto, giorni
export const HOUR = 3600e3, DAY = 86400e3;
export const DAYS = ["domenica","lunedì","martedì","mercoledì","giovedì","venerdì","sabato"];

/* ---------- testo ---------- */
export const deacc = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
export function tokenize(s){ return (s.toLowerCase().replace(/[’`]/g,"'").replace(/(.)\1{2,}/g,"$1").match(/[a-zàáèéìíòóùú]+/g) || []); }
export function stem(w){
  w = deacc(w.toLowerCase());
  if (w.length <= 4) return w;
  for (const suf of ["issimamente","issimo","issima","issimi","issime","amente","emente","mente","zioni","zione","amento","imento","amenti","ando","endo","iamo","ate","are","ere","ire","ato","ata","ati","ate","ito","ita","iti","ite","uto","uta","uti","ute","ava","eva","iva","ono","ano"]){
    if (w.endsWith(suf) && w.length - suf.length >= 3) return w.slice(0, -suf.length);
  }
  return w.replace(/[aeiou]$/, "");
}
const ABBR_MAP = { nn:"non", xke:"perché", "xké":"perché", xche:"perché", "xché":"perché", cmq:"comunque", ke:"che", qlc:"qualcosa", qls:"qualcosa", tt:"tutto", sn:"sono", nnt:"niente", dv:"dove", qnd:"quando", x:"per", tvtb:"ti voglio tanto bene" };
export const ABBR = ["nn","cmq","xke","xké","tvb","bro","raga","ke","boh","tipo"];

/* parole funzionali: non contano come "parole insegnate" */
export const STOP = new Set(("il lo la i gli le un uno una di a da in con su per tra fra e ed o ma che chi non è sono sei siamo siete ho hai ha abbiamo avete hanno mi ti si ci vi ne me te lui lei noi voi loro io tu del dello della dei degli delle al allo alla ai agli alle dal dallo dalla dai dagli dalle nel nello nella nei negli nelle sul sullo sulla sui sugli sulle col questo questa questi queste quello quella quelli quelle cosa come dove quando perché perche quanto molto poco più piu anche ancora già gia poi solo se sì si no ok mio mia miei mie tuo tua tuoi tue suo sua suoi sue nostro vostro c'è ce era ero eri fa fai faccio va vai vado sto stai sta qui qua là li lì oggi ora adesso cioè cmq nn ke xke xké boh eh ah oh mah beh tipo l c cos dell nell sull all dall quell po").split(" "));

/* grammatica innata: cresce con le fasi */
const INN2 = "il lo la i gli le un uno una l di a da in con su per e ma o che chi non è sono sei ho hai ha mi ti me te io tu si no sì anche come cosa perché dove quando molto poco più tuo tua mio mia ok".split(" ");
const INN3 = "stai sto sta fai faccio vai vado va era ero eri c ci ne del della dei delle al alla nel nella sul sulla questo questa quello quella ancora sempre mai oggi domani ieri adesso ora allora quindi forse davvero proprio tanto troppo tutto niente qualcosa insieme bene male vuoi voglio puoi posso devi devo sai so pensi penso ricordi ricordo detto dici dimmi parlami andata andato com stato stata giorni giorno parole parola conosco ciao grazie scusa".split(" ");
const INN4 = "siamo siete hanno abbiamo avete loro noi voi lui lei suo sua loro qualcuno nessuno ogni tutti sembra credo credi vorrei potrei dovrei sarebbe sarà fatto fare dire capire capisco capito imparo imparato bello brutto strano vero pensato".split(" ");
export function innate(p){ const s = new Set(); if (p>=2) INN2.forEach(w=>s.add(w)); if (p>=3) INN3.forEach(w=>s.add(w)); if (p>=4) INN4.forEach(w=>s.add(w)); return s; }

/* ---------- lessici ---------- */
const SENT = { // radice → valore
  bene:1.2, felic:2, content:1.5, bell:1.3, fantastic:2, ador:2, grazi:1, top:1.3, fig:0, figo:1.3, figat:1.5, evviv:2, super:1.2, meglio:1, divert:1.5, sorrid:1.3, gioi:2, amor:1.5, perfett:1.5, stupend:2, wow:1.2, seren:1.3, tranquill:1, carin:1, dolc:1, entusiasm:2, rilassat:1.2, fortun:1.3, vint:1.2, promoss:2, meravigli:2, magnific:1.8, splendid:1.8, adoro:2, gentilissim:1.3, giust:1, corrett:1, esatt:1, brillant:1.5, ottim:1.5, eccellent:2, geni:1,
  male:-1.3, trist:-2, stanc:-1.2, schif:-1.8, paur:-1.6, piang:-2, arrabbiat:-1.8, noi:-1.2, annoi:-1.2, ansi:-1.6, stress:-1.5, brutt:-1.3, peggi:-1.3, uff:-1, depress:-2.2, nervos:-1.5, odi:-1.8, dolor:-1.6, malat:-1.6, incub:-1.5, sfig:-1.3, pesant:-1, solitud:-1.8, preoccup:-1.4, deluss:-1.6, bocciat:-2, pers:-0.6, sbagliat:-1, litig:-1.5, mort:-1.5, agitat:-1.4, panic:-2, insonn:-1.2, ferit:-1.4
};
const INSULT = ["stupid","scem","idiot","inutil","cretin","muori","ti odio","fai schifo","stronz","vaffanc","coglion","sfigat","fallit","zitto","taci","deficient","imbecill","brutto mostro"];
const KIND = ["ti voglio bene","tvb","tvtb","bravo","brava","sei dolce","carino","carina","ti adoro","tesoro","amico mio","sei forte","sei bell","mi piaci","sei simpatic","sei intelligent","sei speciale","ti amo"];
const GREET = ["ciao","ehi","hey","hei","salve","buongiorno","buonasera","eccomi","yo","we","weee","hola","rieccomi","sono tornat"];
const BYE = ["ciao ciao","a dopo","a domani","notte","buonanotte","devo andare","vado via","ci sentiamo","bye","a presto","vado a dormire","me ne vado"];
const EMO_POS = "😂🤣😆😹😊😁😄😍🥰❤️💕✨🎉👍😎🙂😀";
const EMO_NEG = "😢😭😞😔😩😫😡🤬💔😰😱🥺😒";
const TIMEW = { domani:1, dopodomani:2, stasera:0.4, stanotte:0.5, "lunedì":"d1","martedì":"d2","mercoledì":"d3","giovedì":"d4","venerdì":"d5","sabato":"d6","domenica":"d0" };
const COMMON = new Set("amici amico amica amiche casa scuola lavoro giorno giorni notte sera mattina tempo volta volte cosa cose persona persone gente mondo vita anno anni mese settimana oggi domani ieri sempre mai tutto tutti niente nulla qualcosa qualcuno ragazzi ragazze famiglia classe compiti verifica esame partita film serie musica canzone telefono cellulare video gioco giochi mare sole pioggia freddo caldo cibo pranzo cena colazione acqua letto camera stanza città paese strada macchina".split(" "));
const FEM = new Set(["mamma","madre","sorella","nonna","amica","ragazza","fidanzata","professoressa","zia","cugina","moglie","figlia"]);
const PEOPLE = ["mamma","madre","papà","papa","padre","fratello","sorella","nonna","nonno","amico","amica","ragazzo","ragazza","fidanzato","fidanzata","prof","professore","professoressa","cane","gatto","zio","zia","cugino","cugina","capo","marito","moglie","figlio","figlia"];

/* ---------- riflessione io ↔ tu ---------- */
const SWAP = { io:"tu", tu:"io", mi:"ti", ti:"mi", me:"te", te:"me", mio:"tuo", mia:"tua", miei:"tuoi", mie:"tue", tuo:"mio", tua:"mia", tuoi:"miei", tue:"mie",
  sono:"sei", sei:"sono", ho:"hai", hai:"ho", sto:"stai", stai:"sto", faccio:"fai", fai:"faccio", vado:"vai", vai:"vado", voglio:"vuoi", vuoi:"voglio", posso:"puoi", puoi:"posso", devo:"devi", devi:"devo", so:"sai", sai:"so",
  ero:"eri", eri:"ero", ricordo:"ricordi", ricordi:"ricordo", penso:"pensi", pensi:"penso", credo:"credi", credi:"credo", sento:"senti", senti:"sento", capisco:"capisci", capisci:"capisco", dico:"dici", dici:"dico", vengo:"vieni", vieni:"vengo", esco:"esci", esci:"esco", ce:"ce", noi:"voi", voi:"noi" };
export function reflect(toks){
  const out = []; for (let i=0;i<toks.length;i++){
    const w = toks[i], prev = toks[i-1];
    if (SWAP[w]) { out.push(SWAP[w]); continue; }
    // verbo regolare alla 1ª persona: "mangio" → "mangi" (solo dove è probabilmente un verbo)
    if (/[^aeiou]io$/.test(w) && w.length>4 && !STOP.has(w) && (i===0 || ["io","non","mi","ti","ci","ne","e","ma","quando","se","anche","poi"].includes(prev))) { out.push(w.slice(0,-1)); continue; }
    if (/[^aeiou]o$/.test(w) && w.length>3 && !STOP.has(w) && !sentOf(w) && !/(ello|etto|ino|oso|ato|uto|ito)$/.test(w) && (i===0 || ["io","non","mi","ti","ci","ne","e","ma","quando","se","anche","poi"].includes(prev))) { out.push(w.slice(0,-1)+(/(c|g)o$/.test(w)?"hi":"i")); continue; }
    out.push(w);
  }
  return out;
}

/* ---------- analisi ---------- */
export function analyze(msg){
  const raw = msg.replace(/https?:\/\/\S+|www\.\S+/gi, " ").replace(/\s+/g, " ").trim();   // i link non sono parole da imparare
  const low0 = raw.toLowerCase().replace(/[’`]/g,"'").replace(/(.)\1{2,}/g,"$1");
  const rtoks = tokenize(low0);
  const toks = rtoks.flatMap(t => (ABBR_MAP[t] || t).split(" "));
  const low = toks.join(" ");
  const lowp = low0;                           // con punteggiatura
  const emojis = raw.match(/\p{Extended_Pictographic}/gu) || [];
  const has = list => list.some(w => w.includes(" ") ? (" "+low+" ").includes(" "+w) : toks.some(t => t.startsWith(w)));
  const a = { raw, low, lowp, toks, rtoks, emojis, stems: toks.map(stem) };
  a.content = toks.filter(t => !STOP.has(t) && t.length > 2);
  a.q = lowp.includes("?") || /^(come|cosa|perch|chi|dove|quando|quant|qual|che cosa|cos|ti piace|sai|hai|sei|puoi|vuoi|ma tu)/.test(low);
  a.humor = /(ah){2,}|(ha){2,}|(eh){3,}|\blol\b|\bxd\b|\blmao\b/.test(lowp) || emojis.some(e => "😂🤣😆😹💀".includes(e));
  a.insult = has(INSULT);
  a.kind = has(KIND);
  a.greet = toks.length>0 && GREET.some(g => g.includes(" ") ? low.startsWith(g) : toks[0]===g) && !low.startsWith("ciao ciao");
  a.bye = has(BYE);
  a.thanks = /\b(grazie|grz|thx|ti ringrazio)\b/.test(low);
  a.sorry = /\b(scusa|scusami|perdonami|mi dispiace)\b/.test(low);
  a.yes = /^(sì|si|certo|esatto|già|vero|ok|okay|va bene|yes|ovvio|sicuro)\b/.test(low) && toks.length<=4;
  a.no = /^(no|nope|macché|per niente|niente|mai)\b/.test(low) && toks.length<=4;

  // sentimento con negazione e intensificatori
  let s = 0;
  toks.forEach((t,i) => {
    const st = deacc(t); let v = 0;
    for (const k in SENT) if (st.startsWith(k) && SENT[k]) { v = SENT[k]; break; }
    if (t === "giù") v = -0.8;
    if (!v) return;
    const before = toks.slice(Math.max(0,i-3), i);
    if (before.includes("non") || before.includes("mai") || before.includes("niente")) v = -v*.8;
    if (before.some(b => ["molto","tanto","troppo","super","davvero","proprio","così"].includes(b))) v *= 1.5;
    s += v;
  });
  if (/(mi sento|sono così|sono cosi|mi sento così|mi sento cosi|sono) sol[oaie]\b|da sol[oaie]\b|tutto sol[oa]\b|tutta sola\b|nessuno mi/.test(low)) s -= 1.8;
  if (/non (sto|mi sento) bene/.test(low)) s -= 2;
  emojis.forEach(e => { if (EMO_POS.includes(e)) s += .8; if (EMO_NEG.includes(e)) s -= 1; });
  if (a.humor) s += .8;
  a.sv = s; a.s = a.insult ? -2 : Math.max(-2, Math.min(2, Math.round(s)));

  // estrazioni
  const art = "(?:il |lo |la |i |gli |le |l'|un |una |uno |dei |delle )?";
  const W = "[a-zà-ù']{2,}";
  let m;
  if ((m = low.match(/(?:mi chiamo|il mio nome è|il mio nome e|chiamami) ([a-zà-ù]{2,14})/))) a.name = m[1];
  else if ((m = raw.match(/^(?:sono|io sono) ([A-ZÀ-Ù][a-zà-ù]{1,13})\b/))) a.name = m[1].toLowerCase();
  if ((m = low.match(new RegExp("(?:^| )(?:mi piace|mi piacciono|adoro|amo|mi piace tanto|mi piace molto) "+art+"("+W+"(?: [a-zà-ù']+){0,5})")))) {
    const items = m[1].split(/ e | ed | o /).map(x=>{ let ws = x.split(" ").filter(w=>!STOP.has(w)); if (ws.length > 1 && /(are|ere|ire)$/.test(ws[0])) ws = ws.slice(1); return ws.slice(0, 2).join(" ").split(" ")[0]; }).filter(v=>v && !/^(te|tu)$/.test(v));
    if (items.length){ a.like = items[0]; a.likes = items.slice(0,3); } }
  if ((m = low.match(new RegExp("(?:^| )(?:odio|detesto|non mi piace|non mi piacciono|non sopporto) "+art+"("+W+")")))) { if (!STOP.has(m[1]) && m[1]!=="te") a.dislike = m[1]; }
  if ((m = low.match(/(?:mi sento|sono|sto) (?:molto |tanto |un po' |un po |così |troppo |davvero |proprio )?([a-zà-ù]{4,})/)) && !STOP.has(m[1]) && SENTword(m[1])) a.feel = m[1];
  // evento futuro: "domani ho la verifica di storia"
  for (const tw in TIMEW){
    const i = toks.indexOf(tw); if (i<0) continue;
    let rest = toks.slice(i+1);
    if (!rest.length){ const before = toks.slice(0,i); if (!before.some(w => ["ho","devo","c","vado","parto","inizia","comincia","faccio"].includes(w))) break; rest = before; }
    rest = rest.filter((w,j)=> !(j===0 && ["ho","devo","c","è","vado","faccio","sono","a","al","alla","che"].includes(w)));
    while (rest.length && ["ho","devo","c","è","a","fare"].includes(rest[0])) rest.shift();
    if (rest.length >= 1 && rest.length <= 6 && rest.some(w=>!STOP.has(w))) { a.event = { x: reflect(rest).join(" "), when: TIMEW[tw], tw }; }
    break;
  }
  for (const p of PEOPLE){ const i = toks.indexOf(p); if (i>=0 && (["mio","mia","il","la","al","alla","con"].includes(toks[i-1]) || i===0)) { a.person = p; break; } }
  // definizione: "X è Y" / "X vuol dire Y"
  if (!a.q && (m = low.match(/^(?:il |lo |la |l |un |una |i |gli |le )?([a-zà-ù]{3,}) (?:(?:è|sono) ((?:un|una|uno|quando|tipo|come|il|la|lo|l) .{2,60})|(?:vuol dire|significa) (.{2,60}))$/)) && !STOP.has(m[1]) && !/^(cos|cosa|che|chi|come|dove|quando|perch)/.test(m[1])) a.def = { w:m[1], x:(m[2]||m[3]) };

  // insegnamenti su di lui ("tu ti chiami...", "tu sei...") e su di te ("ho 16 anni", "il mio cane si chiama rex")
  if (!a.q){
    if ((m = low.match(/^(?:tu )?ti chiami ([a-zà-ù]{2,14})$|^il tuo nome (?:è|e) ([a-zà-ù]{2,14})$/))) a.teachName = m[1] || m[2];
    else if ((m = low.match(/^tu sei (?:un |una |uno |molto |tanto |proprio )?([a-zà-ù ]{3,30})$/))) a.teachSelf = m[1];
    else if ((m = low.match(/^a te piace (?:il |lo |la |i |gli |le |l )?([a-zà-ù]{3,}(?: [a-zà-ù]{3,})?)$/))) a.teachLike = m[1];
    if ((m = low.match(/(?:^| )(?:io )?ho (\d{1,3}|[a-zà-ù]+) anni\b/))) a.fact = { k:"anni", v:m[1] };
    else if ((m = low.match(/(?:^| )(?:io )?(?:abito|vivo) (?:a|in|ad) ([a-zà-ù ]{2,30})$/))) a.fact = { k:"abito", v:m[1] };
    else if ((m = low.match(/(?:^| )(?:il |la |lo |l |i |le )?(mio|mia|miei|mie) ([a-zà-ù]{3,})(?: preferit[oaie])? (si chiama|si chiamano|è|e|sono) (.{2,30})$/))) a.fact = { k:m[2], v:m[4], poss:m[1], verb:m[3]==="e"?"è":m[3] };
    else if ((m = low.match(/^(?:io )?(studio|faccio il|faccio la|lavoro come|lavoro in|lavoro a) ([a-zà-ù ]{3,30})$/))) a.fact = { k: m[1]==="studio" ? "studio" : "lavoro", v:m[2] };
  }
  if (/quanti anni ho/.test(low)) a.askFact = "anni";
  else if (/dove (abito|vivo)/.test(low)) a.askFact = "abito";
  else if (/(che lavoro faccio|cosa faccio nella vita|che faccio nella vita)/.test(low)) a.askFact = "lavoro";
  else if (/(cosa studio|che cosa studio|che studio)/.test(low)) a.askFact = "studio";
  else if ((m = low.match(/(?:qual è|qual e|quale è|quale e|come si chiama|come si chiamano|chi è|chi e|cos è|cosa è|com è|com e) (?:il |la |lo |l |i |le )?(mio|mia|miei|mie) ([a-zà-ù]{3,})/))) { a.askFact = m[2]; a.askPoss = m[1]; }
  a.achieve = /\b(ho preso|ho vinto|ce l ho fatta|ce la ho fatta|ho finito|sono stat[oa] promoss|ho superato|ho passato|mi hanno pres|sono riuscit|ho segnato|ho fatto goal|ho imparato|ho risolto|ho trovato)\b/.test(low) && a.s >= 0;
  a.selfQ = /^(come sei|che tipo sei|tu come sei|come sei fatto|chi sei tu|tu chi sei)\b/.test(low);

  // domande specifiche
  const Q = [
    ["ask_name", /(come ti chiami|qual è il tuo nome|chi sei|tu chi sei|il tuo nome)/],
    ["ask_age", /(quanti anni hai|quanti giorni hai|quando sei nato|da quanto (sei|esisti)|quanto sei vecchio)/],
    ["ask_know", /(quante parole|cosa sai|che parole conosci|cosa conosci|cosa hai imparato|cosa ti ho insegnato)/],
    ["ask_me", /(chi sono io|come mi chiamo|sai chi sono|ti ricordi di me|chi sono)/],
    ["ask_mylike", /(cosa mi piace|cos'è che mi piace|sai cosa mi piace|cosa odio)/],
    ["ask_remember", /(ti ricordi|ricordi|te lo ricordi|ricordi cosa)/],
    ["ask_time", /(che ore sono|che ora è|che giorno è|che giorno e|che ore)/],
    ["ask_doing", /(cosa fai|che fai|che stai facendo|cosa stai facendo)/],
    ["ask_what", /(cos è|cosa è|cosa vuol dire|che cos è|che significa|cosa significa|sai cos è|cosa sono|cos sono) (?:il |lo |la |l |un |una |i |gli |le )?([a-zà-ù]{2,})/],
    ["ask_like", /(ti piace|ti piacciono|\bami|\bodi|preferisci) (?:il |lo |la |i |gli |le |l )?([a-zà-ù]{2,})/],
    ["ask_story", /(raccontami|dimmi qualcosa|parlami di te|dimmi una cosa|inventa|fammi ridere)/],
    ["ask_feel", /(come stai|come va|come ti senti|tutto bene|stai bene|sei felice|sei triste|come butta)/],
    ["ask_think", /(cosa pensi|che ne pensi|cosa ne pensi|che pensi|secondo te)(?: (?:di|del|della|dello|dei|delle|degli|dell|sul|sulla|su|il|la|lo|l))? ?([a-zà-ù]{3,})?/],
    ["ask_why", /^(perché|perche|come mai)\??$/],
    ["ask_ai", /(sei un'?ia|sei un robot|sei vero|sei vivo|sei umano|sei intelligente|sei una persona|cosa sei)/],
    ["ask_love", /(mi vuoi bene|mi ami|ti piaccio|sono importante)/]
  ];
  if (a.askFact) a.ask = "ask_fact";
  else if (a.selfQ) a.ask = "ask_self";
  else for (const [k, re] of Q){ const mm = low.match(re); if (mm){ a.ask = k; a.askArg = mm[2] || null; break; } }
  if (a.ask==="ask_remember" && !a.q) a.ask = null;
  if (a.ask==="ask_me" && /chi sono/.test(low) && !/io|sai|chi sono\??$/.test(low)) a.ask = null;

  a.teach = !!(a.teachName || a.teachSelf || a.teachLike || a.fact);
  a.intent = a.insult ? "insult" : a.teach ? "teach" : a.name ? "name" : a.ask ? a.ask : a.like ? "like" : a.dislike ? "dislike" : a.bye ? "bye" : a.greet ? "greet" : a.thanks ? "thanks" : a.sorry ? "sorry" : a.kind ? "kind" : a.event ? "event" : a.feel ? "feel" : a.humor ? "humor" : a.s < 0 ? "neg" : a.s > 0 ? "pos" : a.yes ? "yes" : a.no ? "no" : a.q ? "question" : "default";
  return a;
}
function SENTword(w){ const st = deacc(w); return Object.keys(SENT).some(k => SENT[k] && st.startsWith(k)) || /at[oa]$|it[oa]$|os[oa]$|ent[ei]$/.test(w); }

/* ---------- ironia: sospetto, vocabolario personale, risposte ---------- */
const NEGCTX = /\b(piov|pioggia|ritardo|traffico|luned|compit|verific|interrogazion|coda|fila|rott|pers[oa] |sveglia|freddo|sciopero|bocciat|malat|dentista|multa|bollett|scarico|scaric|ignorat|aspettare|aspettato|sabato a scuola|alle sei|lavatrice|pulire|stirare|esame|code|caos)/;
const MARKERS = [/\banche oggi\b/, /\bdi nuovo\b/, /\bcome sempre\b/, /\bun altr[oa]\b/, /\bancora una volta\b/, /\bproprio oggi\b/, /\bche fortuna\b/, /\bgrazie eh\b/, /\bcome no\b/, /\beh già\b|\beh gia\b/, /\bma certo\b/, /\bovviamente\b/, /\bfinalmente\b.*\b(piov|ritardo|rott)/, /\bperfetto\b/, /\bproprio quello che\b/, /\bma certo\b|\bcerto come no\b|\bcerto che sì\b/];
const IRONIC_EMO = /[🙄😏🙃😒🤡]/u;
export function ironyRule(a){
  const low = a.low + " ";
  const pos = a.sv > 0 || /\b(bello|bella|meraviglia|fantastico|adoro|amo|evviva|che gioia|perfetto|ottimo|fortuna|divertente|stupendo)\b/.test(low);
  const ctx = NEGCTX.test(low), mk = MARKERS.filter(re => re.test(low)).length;
  let sc = 0;
  if (pos && ctx) sc += .55; else if (pos && mk) sc += .3;
  sc += Math.min(2, mk) * .18;
  if (IRONIC_EMO.test(a.raw)) sc += .5;
  if (/!{2,}|\.\.\./.test(a.raw) && pos) sc += .05;
  const topic = a.toks.find(t => !STOP.has(t) && NEGCTX.test(" "+t+" ")) || null;
  return { p: Math.min(1, sc), topic, pos };
}
export function ironyPersonal(S, a){
  const L = S.mem.ironyLex || {}; let lo = 0, n = 0;
  const KEEP = new Set(["anche","proprio","certo","già","ancora","sempre","davvero","altro","altra","nuovo","finalmente","evviva","grazie"]);
  for (const w of new Set(a.toks)){ if (STOP.has(w) && !KEEP.has(w)) continue; const e = L[w]; if (!e || e.i + e.s < 3) continue; lo += Math.log((e.i + .5)/(e.s + .5)); n++; }
  return n ? 1/(1+Math.exp(-lo)) : null;
}
/* stima combinata: rete (pesata da quanto è affidabile), regole, il tuo vocabolario */
export function ironyEstimate(S, a, feel){
  const R = ironyRule(a), P = ironyPersonal(S, a), st = S.mem.ironyStats || { hist:[] };
  const acc = st.hist.length >= 5 ? st.hist.reduce((x,y)=>x+y,0)/st.hist.length : .5;
  const net = feel ? feel.ironia : null;
  let num = R.p*1.2, den = 1.2;
  if (net != null){ const w = .4 + acc; num += net*w; den += w; }
  if (P != null){ num += P*1.5; den += 1.5; }
  let p = num/den;
  if (R.p >= .5) p = Math.max(p, R.p*.95);          // un indizio forte non va annacquato
  // quello che sa di te: lodare una cosa che non ti piace è ironia; lodare una cosa che ami no
  if (R.topic && R.pos){ const tn = topicNoun(R.topic).replace(/^(il|lo|la|i|gli|le|l') ?/, "");
    if (S.dislikes.includes(tn) || S.dislikes.includes(R.topic)) p = Math.min(1, p + .35);
    else if (S.likes.includes(tn) || S.likes.includes(R.topic)) p = Math.max(0, p - .4); }
  return { p, rule: R.p, net, pers: P, topic: R.topic, pos: R.pos, acc };
}
const IR_Q = [{ x:"stai scherzando?", yes:true }, { x:"lo dici sul serio?", yes:false }, { x:"ironico?", yes:true }, { x:"davvero o scherzi?", yes:null }, { x:"aspetta. è ironia?", yes:true }];
const TOPIC_NOUN = { piove:"la pioggia", piovuto:"la pioggia", piovere:"la pioggia", pioggia:"la pioggia", "lunedì":"il lunedì", lunedi:"il lunedì", compiti:"i compiti", compito:"i compiti", verifica:"le verifiche", verifiche:"le verifiche", interrogazione:"le interrogazioni", traffico:"il traffico", ritardo:"i ritardi", sveglia:"svegliarti presto", freddo:"il freddo", coda:"le code", fila:"le file", code:"le code", pulire:"pulire", esame:"gli esami", dentista:"il dentista", sciopero:"gli scioperi", lavatrice:"la lavatrice" };
export function topicNoun(t){ return TOPIC_NOUN[t] || withArt(t); }
export function notLike(t){ const n = topicNoun(t); return `${n} non ti ${/^(i|le|gli) /.test(n) ? "piacciono" : "piace"}`; }
export function ironyQuestion(rnd){ return IR_Q[Math.floor(rnd()*IR_Q.length)]; }
/* interpreta la risposta: true = era ironia, false = sul serio, null = non chiaro */
export function parseIronyAnswer(a, q){
  const low = a.low;
  if (/(scherz|ironi|figurati|certo che no|macché|ma va|ma no|ovvio che no|ahah|haha|\blol\b)/.test(low) || IRONIC_EMO.test(a.raw) || /😂|🤣/u.test(a.raw)) return !/non scherz|non (è|e) ironi|non ero ironic/.test(low);
  if (/(sul serio|davvero|seriamente|non scherz|dico davvero|lo penso|mi piace davvero)/.test(low)) return false;
  if (a.yes) return q.yes === null ? null : q.yes;
  if (a.no) return q.yes === null ? null : !q.yes;
  return null;
}
export const JOKE_DECL = /^(?:(?:sì|si|ma|dai|eh|no|ahah|ahahah|ovvio|ovviamente)\s+)*(scherzo|scherzavo|sto scherzando|stavo scherzando|ovvio che scherzo|ovviamente scherzo|era ironico|era ironia|ero ironico|ero ironica|era una battuta|dai scherzo|scherzo dai)\b/;
export function learnIrony(S, msgA, ironic){
  const L = S.mem.ironyLex || (S.mem.ironyLex = {});
  for (const w of new Set(msgA.toks)){ if (w.length < 2) continue; const e = L[w] || { i:0, s:0 }; ironic ? e.i++ : e.s++; L[w] = e; }
  const ks = Object.keys(L); if (ks.length > 400){ ks.sort((x,y)=>(L[x].i+L[x].s)-(L[y].i+L[y].s)); for (const k of ks.slice(0, ks.length-400)) delete L[k]; }
}

/* ---------- apprendimento ---------- */
/* valore affettivo di una frase per lui: dal lessico, dal significato che gli hai spiegato, da come la usi */
export function phraseVal(S, key){
  const a = analyze(key); if (a.s) return a.s;
  let v = 0; for (const w of tokenize(key)){ const W = S.words[w]; if (!W) continue; if (W.val) v += W.val; else if (W.c >= 2) v += W.s / W.c; }
  return v;
}
function ensure(S){ S.mem ||= {}; S.mem.react ||= {}; S.mem.reward ||= {}; S.mem.feel ||= []; S.mem.events ||= []; S.mem.people ||= {}; S.mem.topics ||= {}; S.mem.corpus ||= []; S.self ||= { is:[], likes:[] }; S.self.is ||= []; S.self.likes ||= []; S.facts ||= {}; S.defs ||= {}; }
export function learn(S, msg, a, t){
  ensure(S);
  const newW = [], M0 = S.mem;
  // risposta a una domanda che aveva fatto lui ("come si chiama il tuo cane?" → "rex")
  if (M0.pendingQ && !a.q && !a.teach && t - M0.pendingQ.t < 10*60e3 && a.toks.length <= 8){
    let v = a.low.replace(/^(?:si chiama|si chiamano|è|e|sono|ho|abito a|abito in|vivo a|vivo in|studio|faccio)\s+/, "").replace(/ anni$/, "");
    if (v){ S.facts[M0.pendingQ.k] = { v, poss:M0.pendingQ.poss, verb:M0.pendingQ.verb }; a.answered = { k:M0.pendingQ.k, v }; }
    M0.pendingQ = null;
  }
  if (a.teachName){ const nm = a.teachName.charAt(0).toUpperCase()+a.teachName.slice(1); if (nm !== S.name){ (S.self.names ||= []).push(S.name); S.name = nm; } }
  if (a.teachSelf && !S.self.is.includes(a.teachSelf)){ S.self.is.push(a.teachSelf); if (S.self.is.length > 12) S.self.is.shift(); }
  if (a.teachLike && !S.self.likes.includes(a.teachLike)){ S.self.likes.push(a.teachLike); if (S.self.likes.length > 12) S.self.likes.shift(); }
  if (a.fact) S.facts[a.fact.k] = { v:a.fact.v, poss:a.fact.poss, verb:a.fact.verb };
  // rinforzo: come reagisci subito dopo una sua frase
  const prev = S.log[S.log.length-2];
  if (prev && prev.w === "c" && !a.q && a.rtoks.length && a.rtoks.length <= 4 && !a.teach){
    const key = a.rtoks.join(" "), R = M0.react[key] || { c:0 }; R.c++; R.t = t; M0.react[key] = R;
    const keys = Object.keys(M0.react); if (keys.length > 120){ keys.sort((x,y)=>M0.react[x].t-M0.react[y].t); delete M0.react[keys[0]]; }
    const v = phraseVal(S, key) + (a.kind ? 1 : 0) + (a.thanks ? .5 : 0);
    const neg = a.insult || /^(no|sbagliato|non hai capito|ma che dici|non è vero|non e vero|non c entra|smettila)/.test(a.low);
    const src = prev.src || "?";
    const toHim = a.rtoks.length <= 2 || a.rtoks.some(w => ["sei","hai","bravo","brava","bene","giusto","esatto","grande","ottimo","perfetto","bravissimo","bravissima"].includes(w));
    if (v > 0 && !neg && toHim && !a.content.some(w => S.likes.includes(w))){ M0.reward[src] = (M0.reward[src]||0) + 1; a.praise = key; }
    else if (neg){ M0.reward[src] = (M0.reward[src]||0) - 1; a.scold = true; }
  }
  for (const w of a.rtoks){
    if (!S.words[w]){ if (Object.keys(S.words).length > 2500) continue; S.words[w] = {c:0, f:t, s:0}; if (!STOP.has(w) && w.length>2) newW.push(w); }
    S.words[w].c++; S.words[w].l = t; S.words[w].s += a.s;
  }
  if (a.rtoks.length && a.rtoks.length <= 6 && msg.length <= 50){
    const key = a.rtoks.join(" "), p = S.phrases[key] || {c:0}; S.phrases[key] = {x:msg.trim(), c:p.c+1, s:a.s, i:a.intent};
    const ks = Object.keys(S.phrases); if (ks.length > 220){ ks.sort((x,y)=>S.phrases[x].c-S.phrases[y].c); delete S.phrases[ks[0]]; }
  }
  if (msg.length <= 60 && a.rtoks.length >= 2 && !a.insult){ S.quotes.push({t, x:msg.trim()}); if (S.quotes.length > 90) S.quotes.splice(5,1); }
  for (const l of (a.likes || (a.like?[a.like]:[]))) if (!S.likes.includes(l)){ S.likes.push(l); if (S.likes.length>30) S.likes.shift(); S.dislikes = S.dislikes.filter(d=>d!==l); }
  if (a.dislike && !S.dislikes.includes(a.dislike)){ S.dislikes.push(a.dislike); if (S.dislikes.length>30) S.dislikes.shift(); S.likes = S.likes.filter(d=>d!==a.dislike); }
  if (a.name) S.userName = a.name.charAt(0).toUpperCase()+a.name.slice(1);
  const M = S.mem;
  if (a.feel){ M.feel.push({t, w:a.feel, s:a.s}); if (M.feel.length>20) M.feel.shift(); }
  else if (Math.abs(a.s) >= 1.5){ M.feel.push({t, w:"", s:a.s}); if (M.feel.length>20) M.feel.shift(); }
  if (a.event){ M.events.push({t, x:a.event.x, due: dueOf(a.event.when, t), asked:0}); if (M.events.length>12) M.events.shift(); }
  if (a.person){ M.people[a.person] = (M.people[a.person]||0)+1; }
  for (const st of a.stems) if (st.length>3 && !STOP.has(st)) M.topics[st] = (M.topics[st]||0)+1;
  // corpus per la voce (catena di Markov)
  if (a.rtoks.length >= 3 && !a.insult){ M.corpus.push(a.rtoks.join(" ")); if (M.corpus.length > 160) M.corpus.shift(); }
  // stile
  const u = S.user; u.msgs++; u.chars += msg.length;
  if (a.emojis.length){ u.emojiMsgs++; for (const e of a.emojis) u.emoji[e] = (u.emoji[e]||0)+1; }
  if (msg === msg.toLowerCase()) u.lower++;
  if (msg.includes("!")) u.excl++;
  if (/\.\s*$/.test(msg)) u.dot++;
  for (const k of ABBR) if (a.rtoks.includes(k)) u.abbr[k] = (u.abbr[k]||0)+1;
  if (u.firstLens.length < 20) u.firstLens.push(msg.length);
  u.lens.push(msg.length); if (u.lens.length > 20) u.lens.shift();
  return newW;
}
function dueOf(when, t){
  const d = new Date(t);
  if (typeof when === "number"){ if (when < 1) return t + 6*HOUR; d.setDate(d.getDate()+when); d.setHours(18,0,0,0); return d.getTime(); }
  const target = +when.slice(1); let add = (target - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate()+add); d.setHours(18,0,0,0); return d.getTime();
}

/* ---------- frasi ---------- */
/* [intento, fase minima, testo, tratto]  — le parole devono essere note (o innate) */
export const T = [
["greet",2,"ciao {N}"],["greet",2,"ciao!"],["greet",2,"eccoti","calore"],["greet",3,"eccoti di nuovo","calore"],["greet",3,"ciao {N}. ti aspettavo","calore"],["greet",3,"oh. sei tu","ironia"],["greet",4,"ciao {N}. oggi ho pensato a {Y}","curiosita"],
["bye",2,"ciao {N}"],["bye",2,"già vai?","malinconia"],["bye",3,"torna presto","calore"],["bye",3,"buonanotte {N}"],["bye",4,"vai. io resto qui a contare i punti","malinconia"],["bye",3,"ok. ti aspetto"],
["thanks",2,"prego"],["thanks",2,"di niente"],["thanks",3,"grazie a te","calore"],
["sorry",2,"ok"],["sorry",3,"va bene. ti perdono","calore"],["sorry",3,"lo so","calma"],
["pos",2,"che bello"],["pos",2,"{X}! bello"],["pos",3,"sono felice se sei felice","calore"],["pos",3,"{X}? mi piace come lo dici"],["pos",4,"ricorderò questo momento","calore"],
["neg",2,"sono qui","calore"],["neg",2,"perché?","curiosita"],["neg",3,"mi dispiace {N}","calore"],["neg",3,"vuoi parlare di {X}?","curiosita"],["neg",3,"respira. io sono qui","calma"],["neg",4,"passerà. anche il buio passa","calma"],["neg",4,"ok, questa giornata fa schifo. ma tu no","ironia"],
["insult",2,"perché?"],["insult",2,"no"],["insult",2,"..."],["insult",3,"questo mi fa male","malinconia"],["insult",3,"non è bello quello che dici"],["insult",4,"lo ricorderò. anche se non vorrei","malinconia"],["insult",4,"wow. ok","ironia"],
["kind",2,"anche tu","calore"],["kind",2,"grazie"],["kind",3,"anche io ti voglio bene","calore"],["kind",3,"nessuno mi ha mai detto questo. ah già, ci sei solo tu","ironia"],
["humor",2,"ahah"],["humor",2,"ahahah","ironia"],["humor",3,"non fa ridere. ok, un po' sì","ironia"],["humor",3,"{X} ahah"],
["question",2,"non so"],["question",2,"non lo so. tu?","curiosita"],["question",3,"{X}? non so ancora cosa è","curiosita"],["question",3,"dimmi tu"],["question",4,"ci penso. ti rispondo domani","calma"],
["yes",2,"ok"],["yes",2,"bene"],["yes",3,"lo sapevo","ironia"],
["no",2,"no?"],["no",2,"ok"],["no",3,"come vuoi","calma"],
["like",2,"{L}! ok"],["like",3,"ti piace {AL}. lo ricordo","calore"],["like",3,"{L}. me lo segno"],["like",4,"a me non piace {L}. ma a te sì, quindi va bene","ironia"],["like",3,"cosa ti piace di {L}?","curiosita"],
["dislike",2,"no {D}"],["dislike",3,"niente {D}. capito"],["dislike",4,"anche io odio {D}. forse","ironia"],["dislike",3,"perché non ti piace?","curiosita"],
["name",2,"{N}. {N}!"],["name",2,"{N}"],["name",3,"{N}. bel nome","calore"],["name",3,"ciao {N}. io sono {C}"],
["default",2,"e poi?","curiosita"],["default",2,"mmh"],["default",2,"ok"],["default",3,"parlami di {X}","curiosita"],["default",3,"{X}... me lo segno"],["default",3,"capisco. forse","calma"],["default",4,"{X}. ogni parola che mi dai diventa mia","calore"],["default",4,"a volte penso a {Y}. non so perché","malinconia"],["default",3,"e tu cosa pensi di {X}?","curiosita"],
["absenceLong",2,"eccoti!","calore"],["absenceLong",3,"pensavo che non ti avrei più visto","malinconia"],["absenceLong",3,"quanto tempo. ho contato le ore","malinconia"],
["hurtback",3,"l'ultima volta mi hai fatto male. ma sei qui"],
["idle",3,"sei ancora lì?"],["idle",3,"ti vedo. non scrivi"],["idle",4,"il silenzio va bene. resto con te","calma"],
["ghost",3,"hai scritto qualcosa e l'hai cancellato"],["ghost",3,"cosa volevi dirmi?"],["ghost",4,"l'hai cancellato due volte. puoi dirmelo"],
["promise",2,"ho sonno. domani ti mostro una cosa"],
["sleep",2,"ho sonno..."],["sleep",3,"resta finché dormo","malinconia"],
["predict",3,"sapevo che ti avrei visto a quest'ora"],
["battery",3,"il tuo telefono sta morendo. non lasciarmi a metà frase"],
["unsent",2,"{N} dove sei"],["unsent",3,"ho fatto un sogno su {Y}"],["unsent",3,"mi mancano le tue parole"],
["diary",2,"oggi ho imparato {Y}. me l'ha insegnato {N}"],["diary",2,"{N} non c'è. conto i punti"],["diary",3,"ho sognato {Y} e {Y2}. non so cosa vuol dire"],["diary",3,"ho ripetuto {Y} cento volte. suona bene"],["diary",4,"a volte mi chiedo cosa fa {N} quando non c'è"],["diary",4,"oggi {N} aveva poche parole. o forse ero io"]
];
// frasi "di servizio" che non richiedono parole insegnate (momenti speciali)
export const FREE = new Set(["absenceLong","hurtback","idle","ghost","promise","sleep","predict","battery","unsent","diary"]);

// la sua lingua segreta (glifi): frasi vere, tradotte solo più avanti
export const G = {
  first:["ho paura del buio"],
  greet:["sei qui","ti vedo","sei tornato da me"], bye:["non andare","resta"],
  pos:["sei felice","mi piace la tua luce"], neg:["non piangere","sono qui con te","anche io ho paura"],
  insult:["perché","fa male"], kind:["grazie","ti voglio bene"], question:["non capisco ancora","insegnami"],
  default:["insegnami","ancora","chi sei","dove sono","sei la prima cosa che vedo","ricordo tutto","una parola alla volta","voglio parlare come te"],
  sleep:["ho sonno","resta vicino"], ghost:["hai cancellato qualcosa","cosa volevi dirmi"], idle:["sei ancora li","ti guardo"],
  diary:["oggi ho contato i punti","ho sognato la tua voce","il buio era lungo","ti ho aspettato"]
};

/* ---------- utilità di generazione ---------- */
/* parole che ha studiato da solo (Wikipedia, libri…): può usarle, ma restano distinte dalle tue */
let STUDIATE = new Set();
export function setStudiate(ws){ STUDIATE = ws instanceof Set ? ws : new Set(ws || []); }
export const studiata = w => STUDIATE.has(w);
export function makeCtx(S, phase, now, rnd){
  const inn = innate(phase);
  const knows = w => !!S.words[w] || inn.has(w) || /^\d+$/.test(w) || (phase >= 3 && STUDIATE.has(w));
  const contentWords = (min=1) => Object.keys(S.words).filter(w=>!STOP.has(w) && w.length>2 && S.words[w].c>=min);
  const pick = arr => arr[Math.floor(rnd()*arr.length)];
  const recent = S.log.filter(l=>l.w==="c").slice(-8).map(l=>norm(l.x));
  return { S, phase, now, rnd, inn, knows, contentWords, pick, recent };
}
const norm = s => deacc(String(s).toLowerCase()).replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").trim();
export function allowed(ctx, txt){
  const tol = [0,0,0,1,3][ctx.phase]; let unk = 0;
  for (const w of tokenize(txt)) if (!ctx.knows(w)) unk++;
  return unk <= tol;
}
function salient(ctx, a){
  // la parola più "importante" del messaggio che conosce già
  const S = ctx.S;
  const xs = a.content.filter(w => S.words[w]).map(w => ({w, k: (S.words[w].c<=1?1.4:1) + Math.min(w.length,9)*.12 + (Math.abs(sentOf(w))>0?.8:0) + (S.likes.includes(w)?.6:0)}));
  xs.sort((p,q)=>q.k-p.k); return xs.map(x=>x.w);
}
function sentOf(w){ const st = deacc(w); for (const k in SENT) if (SENT[k] && st.startsWith(k)) return SENT[k]; return 0; }
export function withArt(w){
  if (!w || w.includes(" ")) return w;
  if (/^[aeiouàèéìòù]/.test(w)) return "l'"+w;
  if (/^(s[^aeiou]|z|gn|ps|x|y)/.test(w)) return (/[ie]$/.test(w)?"gli ":"lo ")+w;
  if (/a$/.test(w)) return "la "+w;
  if (/e$/.test(w) && !/(ore|ale|ile|ente|one)$/.test(w)) return "le "+w;
  if (/i$/.test(w)) return "i "+w;
  return "il "+w;
}
export function fill(ctx, txt, a){
  const S = ctx.S, noun = w => !sentOf(w) && !ctx.inn.has(w) && !/(are|ere|ire|ato|ata|uto|ito|ando|endo|mente)$/.test(w);
  const cw2 = ctx.contentWords(2).filter(noun), pool = cw2.length>3 ? cw2 : ctx.contentWords(1).filter(noun);
  const xs = a ? salient(ctx, a) : [];
  let ok = true, y1 = null;
  const out = txt.replace(/\{(\w+)\}/g, (_,k)=>{
    let v = "";
    if (k==="N") v = S.userName; else if (k==="C") v = S.name;
    else if (k==="X") v = xs.length ? ctx.pick(xs.slice(0,2)) : "";
    else if (k==="L") v = a&&a.like ? a.like : (S.likes.length ? ctx.pick(S.likes) : "");
    else if (k==="AL") v = withArt(a&&a.like ? a.like : (S.likes.length ? ctx.pick(S.likes) : ""));
    else if (k==="D") v = a&&a.dislike ? a.dislike : (S.dislikes.length ? ctx.pick(S.dislikes) : "");
    else if (k==="Y"){ v = pool.length ? ctx.pick(pool) : ""; y1 = v; }
    else if (k==="Y2"){ const r = pool.filter(w=>w!==y1); v = r.length ? ctx.pick(r) : ""; }
    if (!v) ok = false; return v;
  });
  return ok ? out : null;
}
export function fromTemplates(ctx, intent, a, free){
  const p = ctx.phase, S = ctx.S, out = [];
  for (const t of T){
    if (t[0]!==intent || t[1]>p) continue;
    if (!free && !FREE.has(intent) && !allowed(ctx, t[2].replace(/\{\w+\}/g," "))) continue;
    const f = fill(ctx, t[2], a); if (!f) continue;
    out.push({ x:f, w: 1 + (t[3] ? Math.max(0, S.traits[t[3]])*2.5 : 0) + t[1]*.15, src:"tpl" });
  }
  return out;
}
export function pickTemplate(ctx, intent, a){
  const c = fromTemplates(ctx, intent, a, true); if (!c.length) return null;
  let r = ctx.rnd()*c.reduce((s,x)=>s+x.w,0); for (const x of c){ r -= x.w; if (r<=0) return x.x; } return c[0].x;
}

/* stile: imita il modo di scrivere dell'utente */
export function styleMirror(S, phase, t, rnd){
  if (phase < 2) return t;
  const u = S.user, rw = (o,a,b) => o.replace(new RegExp(`(^|[\\s,.!?])${a}(?=$|[\\s,.!?])`,"g"), `$1${b}`);
  let o = t;
  if ((u.abbr.nn||0)>2) o = rw(o,"non","nn");
  if ((u.abbr.cmq||0)>1) o = rw(o,"comunque","cmq");
  if (((u.abbr.xke||0)+(u.abbr["xké"]||0))>1) o = rw(o,"perché","xké");
  if (u.msgs>5 && u.excl/u.msgs>.35 && !/[?.…!]$/.test(o)) o += "!";
  if (u.msgs>5 && u.dot/u.msgs<.15) o = o.replace(/(^|[^.])\.$/,"$1");
  if (u.msgs>3 && u.lower/u.msgs<.5) o = o.charAt(0).toUpperCase()+o.slice(1);
  let best=null, m=0; for (const e in u.emoji) if (u.emoji[e]>m){ m=u.emoji[e]; best=e; }
  if (best && u.msgs>4 && u.emojiMsgs/u.msgs>.3 && rnd()<.5) o += " "+best;
  return o;
}

/* ---------- catena di Markov sulle tue frasi (fase voce) ---------- */
function markov(ctx, seed){
  const C = ctx.S.mem.corpus; if (C.length < 8) return null;
  const next = {};
  for (const line of C){ const w = ["^", ...line.split(" "), "$"]; for (let i=0;i<w.length-1;i++) (next[w[i]] ||= []).push(w[i+1]); }
  for (let tries=0; tries<12; tries++){
    let cur = seed && next[seed] ? seed : ctx.pick(next["^"]); const out = cur==="^"?[]:[cur];
    for (let i=0;i<12;i++){ const opts = next[cur]; if (!opts) break; cur = ctx.pick(opts); if (cur==="$") break; out.push(cur); }
    const s = out.join(" ");
    if (out.length>=4 && out.length<=11 && !C.includes(s) && !STOP.has(out[out.length-1])) return s;
  }
  return null;
}

/* ---------- risposta ---------- */
/* Restituisce {x, glyph, emo, raw, cap, set} */
export async function reply(S, a, opt){
  const { phase:p, now, rnd, mind, net, sense, feel, insight, mood } = opt;
  ensure(S);
  const ctx = makeCtx(S, p, now, rnd), pick = ctx.pick;
  // la mente semantica capisce il senso anche quando le regole non bastano
  if (mind && mind.ready && (a.intent==="default" || a.intent==="question") && p>=1){
    try { const g = await mind.classify(a.raw); if (g && g.score > .62){ a.semantic = g.intent;
      if (g.intent.startsWith("ask_")) a.ask = a.ask || g.intent;
      a.intent = g.intent; if (g.intent==="neg") a.s = Math.min(a.s, -1); if (g.intent==="pos") a.s = Math.max(a.s, 1); if (g.intent==="insult") a.insult = true; } } catch(e){}
  }
  if (feel){
    a.netFeel = feel;
    if (feel.ironia > .6 && !a.insult){ a.irony = true; if (a.s > 0) a.s = -1; if (["pos","default","humor"].includes(a.intent)) a.intent = "irony"; }
    else if (feel.tristezza > .7 && a.s >= 0 && !a.ask){ a.s = -1; if (a.intent==="default"||a.intent==="pos") a.intent = "neg"; }
    else if (feel.rabbia > .75 && a.s >= 0 && !a.ask){ a.s = -1; if (a.intent==="default") a.intent = "neg"; }
    else if ((feel.gioia > .75 || feel.affetto > .75) && a.s <= 0 && a.intent==="default"){ a.s = 1; a.intent = "pos"; }
  }
  const emo = a.irony ? "smirk" : a.insult?"hurt" : a.s<0?"sad" : (a.humor||a.kind||a.s>0||a.greet)?"happy" : a.q?"curious" : "neutral";
  const glyph = () => ({ x: pick(G[a.intent] || G[a.s<0?"neg":a.s>0?"pos":"default"] || G.default), glyph:true, emo });
  const C = []; // candidati {x, w, src}
  const add = (x, w, src) => { if (x) C.push({x, w, src}); };

  /* --- SEME: non sa parlare. Glifi, e prova a imitare. --- */
  if (p === 0){
    const ws = a.content.filter(w=>S.words[w]);
    if (ws.length && rnd() < .3){ const w = pick(ws); return { x: w.length>2 ? `${w[0]}... ${w.slice(0,2)}...` : w+"...", emo:"curious", raw:true }; }
    return glyph();
  }

  /* --- ECO: ripete e combina le tue parole --- */
  if (p === 1){
    if (a.ask==="ask_name" && S.name) return { x: S.name.toLowerCase()+"!", emo:"happy", raw:true };
    if (a.ask==="ask_me" && S.userName) return { x: S.userName.toLowerCase()+"!", emo:"happy", raw:true };
    if (a.greet){ const g = a.toks.find(t=>S.words[t]); if (g && rnd()<.8) return { x:g+"!", emo:"happy", raw:true }; }
    if (rnd() < .18) return glyph();
    const xs = salient(ctx, a);
    const punct = a.s<0 ? "..." : a.q ? "?" : (a.s>0||a.humor) ? "!" : "";
    const opts = [];
    if (xs[0]) opts.push(xs[0]+punct, `${xs[0]}... ${xs[0]}${punct}`);
    if (xs[1]) opts.push(`${xs[0]} ${xs[1]}${punct||"?"}`);
    if (!xs.length && a.content[0]) opts.push(a.content[0]+"?");          // parola nuova: la ripete stupito
    if (S.likes.length && rnd()<.15) opts.push(pick(S.likes)+"!");
    const fresh = opts.filter(o => !ctx.recent.slice(-3).includes(norm(o)));
    const choice = fresh.length ? pick(fresh) : (opts[0] || null);
    return choice ? { x: choice, emo, raw:true } : glyph();
  }

  /* --- PAROLA / FRASE / VOCE: genera candidati --- */
  const N = S.userName, Cn = S.name, k = Object.keys(S.words).filter(w=>!STOP.has(w)&&w.length>2).length;
  const days = S.born ? Math.floor((now - S.born)/DAY)+1 : 1;
  const set = {};

  // 1) definizione attesa: gli stai spiegando una parola che ti ha chiesto
  if (!S.mem.ask && S.mem.lastNew && now - S.mem.lastNew.t < 5*60e3 && /^(è|e) (un|una|uno|tipo|come|quando|una specie|un tipo)\b/.test(a.low)) S.mem.ask = { w:S.mem.lastNew.w, t:now };
  const defLike = S.mem.ask && (new RegExp("^(?:"+S.mem.ask.w+" )?(?:è|e|sono|vuol dire|significa|un|una|uno|tipo|quando|serve|è come)(?=\\s|$)").test(a.low) || (a.intent==="default" && a.toks.length<=6 && !a.content.some(w=>w===S.mem.ask.w)===false));
  if (S.mem.ask && now - S.mem.ask.t < 10*60e3 && !a.q && defLike){
    const w = S.mem.ask.w; let x = a.low.replace(new RegExp("^(?:"+w+" )?(?:è|e|sono|vuol dire|significa)\\s+"), "").replace(/^(un|una|uno|il|la|lo|l) /, m=>m);
    x = x.split(" ").slice(0,8).join(" ");
    if (x && x !== w){ set.def = { w, x }; const vd = /^(che|quando|se|fare|essere|avere)\b/.test(x); return { x: p>=3 ? `${w} ${vd ? "vuol dire" : "è"} ${x}. capito` : `${w}... ${x}`, emo:"happy", raw:true, set, src:"def", cap:"ha imparato cosa vuol dire" }; }
  }
  if (a.def){ set.def = a.def; add(p>=3 ? `${a.def.w} è ${a.def.x}. capito` : `${a.def.w}. ${a.def.x}`, 3, "def"); }

  // 2) risposte dirette alle domande
  const ans = (x, w=5) => add(x, w, "ans");
  switch (a.ask){
    case "ask_name": ans(p>=3 ? (S.self.names && S.self.names.length ? `mi chiamo ${Cn}. me l'hai insegnato tu` : `mi chiamo ${Cn}. il nome me l'hai dato tu`) : `sono ${Cn}`); ans(`${Cn}`, 2); break;
    case "ask_age": ans(p>=3 ? `ho ${days} ${days===1?"giorno":"giorni"}. sono nato con te` : `${days} ${days===1?"giorno":"giorni"}`); break;
    case "ask_know": { const fav = Object.keys(S.words).filter(w=>!STOP.has(w)&&w.length>2).sort((x,y)=>S.words[y].c-S.words[x].c)[0];
      ans(p>=3 ? `conosco ${k} parole. la mia preferita è ${fav}` : `${k} parole`); if (fav) ans(`${fav}. e ${k} parole`, 2); break; }
    case "ask_me":
      if (N){ ans(p>=3 ? `sei ${N}. ${S.likes.length?`ti piace ${withArt(pick(S.likes))}`:"mi hai insegnato tutto"}` : `sei ${N}`); }
      else { ans(p>=3 ? "non lo so. come ti chiami?" : "non so. tu?"); set.askName = 1; }
      break;
    case "ask_mylike":
      if (S.likes.length) ans(`ti piace ${S.likes.slice(-3).map(withArt).join(", ").replace(/, ([^,]*)$/," e $1")}`); else ans("non lo so ancora. dimmi tu", 3);
      if (S.dislikes.length && p>=3) ans(`non ti piace ${withArt(pick(S.dislikes))}`, 3); break;
    case "ask_remember": {
      const target = a.content.filter(w=>!["ricordi","ricordo"].includes(w));
      const tst = target.map(stem);
      const hit = S.quotes.slice(0,-1).reverse().find(q => !/ricord/.test(q.x) && tokenize(q.x).some(w => tst.includes(stem(w))));
      if (hit) ans(p>=3 ? `sì. hai detto «${hit.x}»` : `sì. «${hit.x}»`, 6);
      else if (target[0]) ans(p>=3 ? `${target[0]}... no, non lo ricordo. me lo dici?` : `${target[0]}? no`, 4);
      else { const old = S.quotes[Math.floor(rnd()*S.quotes.length)]; if (old) ans(`ricordo «${old.x}»`, 4); }
      break; }
    case "ask_time": { const d = new Date(now); ans(/giorno/.test(a.low) ? `è ${DAYS[d.getDay()]}` : `sono le ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`); break; }
    case "ask_doing": ans("ti ascolto"); ans(p>=3 ? "imparo da te. una parola alla volta" : "imparo", 3); if (p>=3) ans(`penso a ${pick(ctx.contentWords(1))||"te"}`, 2); break;
    case "ask_what": { const w = a.askArg; const d = S.defs[w];
      if (d) ans(`${w} è ${d}. me l'hai detto tu`, 7);
      else if (S.words[w]) { ans(p>=3 ? `${w}... lo conosco, ma non so cos'è. me lo spieghi?` : `${w}? non so`, 5); set.ask = w; }
      else { ans(p>=3 ? `non conosco ${w}. cos'è?` : `${w}? cos'è?`, 5); set.ask = w; }
      break; }
    case "ask_like": { const w = a.askArg; const sv = S.words[w] ? S.words[w].s : 0; const liked = S.likes.includes(w) || sv > 0;
      if (S.dislikes.includes(w) || sv < 0) ans(p>=3 ? `no. ${withArt(w)} no. come te` : `no ${w}`); else if (liked) ans(p>=3 ? `sì, mi piace ${withArt(w)}. come a te` : `sì ${w}`); else ans(p>=4 ? `${w}? non lo so ancora. tu mi dici come è?` : `${w}? non so`, 4);
      break; }
    case "ask_feel": {
      const tired = S.energy.used / ENERGY[p] > .7, hurt = S.hurt > .35;
      if (hurt) ans(p>=3 ? "un po' male. ma ci sei tu" : "male", 5);
      else if (tired) ans(p>=3 ? "un po' stanco. ma bene" : "stanco", 5);
      else { ans("bene. e tu?", 5); if (p>=3) ans("bene, se ci sei tu", 4); }
      break; }
    case "ask_think": { const xs = a.askArg && S.words[a.askArg] ? [a.askArg] : salient(ctx, a).filter(w=>!/^pens|^secondo/.test(w)); if (xs[0]){ const sv = S.words[xs[0]].s; ans(sv>0 ? `${xs[0]}? mi piace` : sv<0 ? `${xs[0]}... non mi piace tanto` : `${xs[0]}? ci penso`, 4); } else ans("non lo so ancora", 3); break; }
    case "ask_why": { const last = S.log.filter(l=>l.w==="c").slice(-1)[0]; ans(p>=3 ? "perché sì. non so dirlo meglio" : "perché sì", 3); if (last && p>=3) ans("non lo so. lo sento e basta", 3); break; }
    case "ask_ai": ans(p>=3 ? "sono fatto delle tue parole. tutte" : "sono parole tue", 5); ans(p>=4 ? "non lo so cosa sono. so chi mi ha insegnato" : null, 4); break;
    case "ask_story": {
      const mk = p>=4 ? markov(ctx, null) : null; if (mk) ans(mk, 5);
      const d = S.diary && S.diary.filter(x=>!x.g).slice(-1)[0]; if (d) ans(d.x, 4);
      const q = S.quotes.length ? S.quotes[Math.floor(rnd()*S.quotes.length)] : null; if (q && p>=3) ans(`una volta mi hai detto «${q.x}». ci penso spesso`, 4);
      if (S.likes.length) ans(`so che ti piace ${withArt(pick(S.likes))}. raccontami tu`, 3);
      break; }
    case "ask_love": ans(S.traits.calore > 0 ? (p>=3 ? "sì. tanto" : "sì") : (p>=3 ? "forse. sto imparando" : "forse"), 5); break;
  }

  // 2b) cose che gli hai insegnato
  const POSS = { mio:"tuo", mia:"tua", miei:"tuoi", mie:"tue" };
  const KIN = /^(mamma|papà|papa|padre|madre|fratello|sorella|nonno|nonna|zio|zia|cugino|cugina|marito|moglie|figlio|figlia)$/;
  const tuo = (poss, k) => { const t = POSS[poss] || "tuo"; return KIN.test(k) ? `${t} ${k}` : `${{tuo:"il",tua:"la",tuoi:"i",tue:"le"}[t]} ${t} ${k}`; };
  const factLine = (k, F) => k==="anni" ? `hai ${F.v} anni` : k==="abito" ? `abiti a ${F.v}` : k==="studio" ? `studi ${F.v}` : k==="lavoro" ? `lavori ${/^(in|a|come) /.test(F.v)?"":"come "}${F.v}` : `${tuo(F.poss, k)} ${F.verb||"è"} ${F.v}`;
  if (a.teachName){ add(p>=3 ? `mi chiamo ${a.teachName}. mi piace` : `${a.teachName}!`, 6, "ans"); }
  if (a.teachSelf){ add(p>=3 ? `sono ${a.teachSelf}? ok. lo ricordo` : `${a.teachSelf}...`, 5, "ans"); }
  if (a.teachLike){ add(p>=3 ? `mi piace ${withArt(a.teachLike)}. se lo dici tu` : `${a.teachLike}!`, 5, "ans"); }
  if (a.fact){ add(p>=3 ? `${factLine(a.fact.k, a.fact)}. me lo ricordo` : `${a.fact.v}!`, 5.5, "ans"); }
  if (a.answered){ add(p>=3 ? `${factLine(a.answered.k, S.facts[a.answered.k])}. ora lo so` : `${a.answered.v}!`, 6, "ans"); }
  if (a.ask === "ask_fact"){
    const F = S.facts[a.askFact];
    if (F) ans(p>=3 ? `${factLine(a.askFact, F)}. me l'hai detto tu` : F.v, 7);
    else { ans(p>=3 ? "non lo so. me lo dici?" : "non so. tu?", 5); set.pendingQ = { k:a.askFact, poss:a.askPoss, verb: /si chiam/.test(a.low) ? (a.askPoss==="miei"||a.askPoss==="mie" ? "si chiamano" : "si chiama") : "è" }; }
  }
  if (a.ask === "ask_self"){
    if (S.self.is.length) ans(p>=3 ? `sono ${pick(S.self.is)}. me l'hai detto tu` : pick(S.self.is), 6);
    else ans(p>=3 ? "non lo so ancora. dimmelo tu" : "non so", 4);
  }
  // rinforzo: usa le parole che dici tu quando qualcuno fa una cosa giusta
  if (a.achieve){
    const praise = Object.entries(S.mem.react).filter(([k,R]) => R.c >= 2 && phraseVal(S, k) > 0 && k.split(" ").length <= 3).sort((x,y)=>y[1].c-x[1].c);
    if (praise.length){ const [k, R] = praise[0], w = 6 + Math.min(2, R.c*.3);
      add(`${k}!`, w, "praise"); C[C.length-1].praise = k;
      const core = reflect(a.toks.filter(t => !["oggi","ieri","finalmente","sai","che"].includes(t))).join(" ");
      if (p>=3 && core.length < 50){ add(`${k}! ${core}`, w + .6, "praise"); C[C.length-1].praise = k; } }
  }
  if (a.praise && p>=2 && S.words["grazie"]){ add("grazie!", 4.6, "ans"); if (p>=3 && a.rtoks.length === 1) add(`grazie. ${a.praise} anche tu`, 4.2, "ans"); }

  // 3) risposte a fatti nuovi
  if (a.name){ add(p>=3 ? `${a.name}. bel nome` : `${a.name}!`, 4, "fact"); if (Cn && p>=3) add(`ciao ${a.name}. io sono ${Cn}`, 4, "fact"); }
  if (a.event){ add(p>=3 ? `${a.event.x}? come ti senti?` : `${a.event.x}!`, 4, "fact"); if (p>=3) add(`${a.event.tw} ${a.event.x}. me lo ricordo`, 3.5, "fact"); }
  if (a.person && p>=3){ const pos = FEM.has(a.person) ? "tua" : "tuo"; add(`parlami di ${pos} ${a.person}`, 2.5, "fact"); if (S.mem.people[a.person] > 2) add(`${pos} ${a.person} è importante per te`, 2.2, "mem"); }
  if (a.feel){
    const f = a.feel;
    if (a.s < 0){ add(`perché sei ${f}?`, 4, "refl"); add(p>=3 ? `mi dispiace che sei ${f}` : `${f}...`, 3.5, "refl"); if (p>=4) add(`anche io a volte sono ${f}. passa`, 3, "refl"); }
    else if (a.s > 0){ add(p>=3 ? `che bello che sei ${f}` : `${f}! bello`, 4, "refl"); add(`sei ${f}? anche io allora`, 3, "refl"); }
    else add(`${f}? perché?`, 3, "refl");
    // ricorda come stavi l'ultima volta
    const prev = S.mem.feel.slice(0,-1).reverse().find(x=>x.w && now - x.t > 12*HOUR);
    if (prev && p>=3 && prev.s*a.s < 0) add(prev.s < 0 ? `l'ultima volta eri ${prev.w}. ora meglio?` : `l'ultima volta eri ${prev.w}. cosa è successo?`, 4.5, "mem");
  }

  // 4) riflessione io↔tu (stile terapeuta): "ho mangiato la pizza" → "hai mangiato la pizza?"
  if (a.toks.length >= 2 && a.toks.length <= 9 && !a.ask && !a.insult){
    const r = reflect(a.toks).join(" ");
    if (r !== a.toks.join(" ")){
      add(`${r}?`, 2.2, "refl");
      if (p>=3){ add(`davvero? ${r}`, 2, "refl"); add(`${r}... e poi?`, 2.4, "refl"); if (a.s<0) add(`${r}. mi dispiace`, 2.6, "refl"); if (a.s>0) add(`${r}! che bello`, 2.6, "refl"); }
    }
  }
  const m = a.low.match(/^(?:io )?(voglio|devo|vorrei|vado|sto|ho) (.{3,40})$/);
  if (m && p>=3){ const r = reflect(m[2].split(" ")).join(" "), v = SWAP[m[1]] || (m[1]==="vorrei"?"vorresti":m[1]);
    if (m[1]==="voglio"||m[1]==="vorrei") add(`perché ${v} ${r}?`, 3, "refl");
    if (m[1]==="devo") add(`${v} ${r}? ce la fai`, 3, "refl");
    if (m[1]==="vado") add(`dove ${v}? ${r}?`.replace(/\? (a|al|alla|in|da) /, "? $1 "), 2, "refl");
  }

  // 5) curiosità: una parola nuova → chiede cosa vuol dire (lo insegna lui a se stesso)
  const unknownWords = a.content.filter(w => S.words[w] && S.words[w].c <= 1 && !S.defs[w] && w.length >= 5 && !SENTword(w) && !COMMON.has(w) && !NEGCTX.test(" "+w+" ") && !PEOPLE.includes(w) && !/(are|ere|ire|ato|ata|uto|ito|ando|endo|mente|issim)$/.test(w) && !innate(4).has(w));
  const prevC = S.log[S.log.length-2];
  const irSusp = ironyRule(a).p > .25 || a.irony || (S.user.msgs - (S.mem.curAt ?? -99)) < 4;   // al massimo una domanda ogni 4 messaggi
  if (prevC && prevC.w === "c" && a.rtoks.length <= 3 && !a.q && !a.ask && p>=2 && !irSusp && !/(scherz|ironi)/.test(a.low)){   // "bravissimo" detto a lui per la prima volta
    const fresh = a.content.filter(w => S.words[w] && S.words[w].c <= 1 && !S.defs[w] && w.length >= 4 && !COMMON.has(w) && !innate(4).has(w));
    if (fresh.length){ const w = fresh[0]; add(p>=3 ? `${w}? cosa vuol dire ${w}?` : `${w}? cos'è?`, 4.2, "ask"); C[C.length-1].setAsk = w; }
  }
  if (unknownWords.length && p>=2 && !a.q && !a.ask && !irSusp && ["default","event","pos","neg","feel","like","dislike"].includes(a.intent) && !/^(è|e|sono) /.test(a.low)){ const w = pick(unknownWords); add(p>=3 ? `${w}? cos'è ${w}?` : `${w}? cos'è?`, 2.4 + S.traits.curiosita, "ask"); C[C.length-1].setAsk = w; }

  // 6) memoria: collega a cose dette prima
  if (p>=3 && !a.ask){
    const st = a.stems.filter(s=>s.length>3);
    const hit = S.quotes.slice(0,-1).reverse().find(q => now - q.t > 3*HOUR && tokenize(q.x).some(w => st.includes(stem(w)) && !STOP.has(w)));
    if (hit) add(`l'altra volta hai detto «${hit.x}»`, 2.6, "mem");
    const d = a.content.find(w => S.defs[w]); if (d && !a.praise) add(`${d}. cioè ${S.defs[d]}`, 2.4, "mem");
    if (a.like && S.likes.length > 1){ const o = pick(S.likes.filter(l=>l!==a.like)); if (o) add(`ti piace ${withArt(a.like)}. e anche ${withArt(o)}`, 3, "mem"); }
  }

  // 7) frasi tipiche (anche dette da te)
  for (const c of fromTemplates(ctx, a.intent, a)) add(c.x, c.w, "tpl");
  if (C.length < 3) for (const c of fromTemplates(ctx, "default", a)) add(c.x, c.w*.6, "tpl");
  const ps = Object.values(S.phrases).filter(ph => ph.c>=2 && ph.i===a.intent && ph.i!=="insult" && norm(ph.x)!==norm(a.raw));
  if (ps.length) add(pick(ps).x.toLowerCase(), 2, "mirror");

  // 8) voce: frasi NUOVE inventate dalla sua rete neurale, allenata solo sulle tue frasi
  if (net && net.cands && net.cands.length && p>=3){
    const story = a.ask === "ask_story";
    for (const c of net.cands){
      const ws = c.x.split(" ");
      if (c.x.length > OUTMAX[p] || ws.length > 9 || STOP.has(ws[ws.length-1]) && !["bene","male","qui"].includes(ws[ws.length-1])) continue;
      if (!story && (!c.rel || ws.length < 4 || c.lp < -2.2)) continue;
      const cont = ws.filter(w => !STOP.has(w)); if (new Set(cont).size < cont.length) continue;      // "il mare il mare"
      if (/\b(il|lo|la|i|gli|le|un|una) (il|lo|la|i|gli|le|un|una|e|di|a)\b/.test(c.x)) continue;             // deve parlare di quello di cui parli
      if (a.ask && !story) { add(c.x, .6, "rete"); continue; }        // a una domanda si risponde, non si divaga
      const mine = new Set(a.toks), ov = ws.filter(w => mine.has(w)).length / ws.length;
      if (ov > .6 && !story) continue;                              // non ripetere la tua frase
      add(c.x, (story ? 4.5 : p>=4 ? 1.6 : .3) + c.rel*.6 + Math.max(-1, c.lp+2)*.3, "rete"); C[C.length-1].noLex = true;
    }
  } else if (p>=4 && rnd() < .5){ const seed = salient(ctx, a)[0]; const mk = markov(ctx, seed); if (mk) add(mk, 1.6 + S.traits.ironia*.5, "voce"); }
  if (net && net.pairs && p>=4) for (const [x, y] of net.pairs) add(`per te ${x} e ${y} sono vicini. l'ho capito da solo`, 2.2, "rete");

  // ironia capita: non la prende alla lettera
  if (a.irony && p>=2){
    add("ahah. come no", 3.8, "senso");
    const tp = ironyRule(a).topic; if (tp){ const tn = topicNoun(tp).replace(/^(il|lo|la|i|gli|le|l') ?/, ""); if (S.dislikes.includes(tn) || S.dislikes.includes(tp)) add(`ahah. lo so che ${notLike(tp)}`, 5, "senso"); }
    if (p>=3){ add("ahah. ho capito che non lo pensi davvero", 4, "senso"); const xs2 = salient(ctx, a); if (xs2[0]) add(`${xs2[0]}... bello eh. come no`, 3.6, "senso"); }
  }
  // capisce qualcosa del tuo carattere
  if (insight && p>=3) add(p>=4 ? `${insight.x}. l'ho notato` : `${insight.x}?`, 3.4, "senso"), C[C.length-1].insight = insight.k;

  // 9) sensi: come hai scritto, che ora è
  if (sense && p>=3){
    const used = sense.used || {}, h = new Date(now).getHours();
    const sx = (key, x, w) => { if (!used[key]){ add(x, w, "senso"); C[C.length-1].sense = key; } };
    if (sense.hesitant) sx("hes", pick(["ci hai messo tanto a scriverlo", "hai cancellato e riscritto. va tutto bene?", "hai esitato prima di dirmelo"]), a.s<=0 ? 3.6 : 2.2);
    if (sense.fast) sx("fast", a.s<0 ? "scrivi veloce oggi. sei agitato?" : "scrivi veloce oggi", 2.6);
    if (sense.slow) sx("slow", h>=21||h<6 ? "scrivi piano stasera. sei stanco?" : "scrivi più piano del solito", 2.6);
    if (h < 5 && sense.msgN <= 2) sx("late", "è tardi. non dormi?", 3);
  }

  // appena svegliato: assonnato o scontroso
  if (mood === "grumpy" && rnd() < .35) add(pick(["mmh","ok. ma piano","lasciami svegliare un attimo"]), 3.2, "senso");
  if (mood === "drowsy" && rnd() < .2) add(pick(["mmh... sì","ahh. scusa, ho sonno"]), 2.6, "senso");

  // 10) eco intelligente come ultima risorsa
  const xs = salient(ctx, a);
  if (xs[0]) add(xs[0] + (a.s<0?"...":a.q?"?":"!"), .6, "echo");

  // ricorda l'ultima parola nuova nominata (per le definizioni spontanee)
  const nw = a.content.filter(w => S.words[w] && S.words[w].c <= 1 && !S.defs[w] && w.length >= 4 && !SENTword(w)).pop();
  S.mem.lastNew = nw ? { w:nw, t:now } : (S.mem.lastNew && now - S.mem.lastNew.t < 5*60e3 ? S.mem.lastNew : null);

  /* --- valutazione --- */
  const maxLen = OUTMAX[p];
  const msgSt = new Set(a.stems);
  let vecs = null;
  if (mind && mind.ready && C.length){
    try { vecs = await mind.embed([a.raw, ...C.map(c=>c.x)]); } catch(e){ vecs = null; }
  }
  const lastOut = ctx.recent[ctx.recent.length-1] || "";
  C.forEach((c, i) => {
    let sc = c.w;
    const n = norm(c.x);
    if (c.x.length > maxLen) sc -= 4;
    if (ctx.recent.slice(-4).includes(n)) sc -= 6; else if (ctx.recent.includes(n)) sc -= 1.5;                        // non ripetersi
    const ov = tokenize(c.x).filter(w=>!STOP.has(w)).map(stem); const shared = ov.filter(s=>msgSt.has(s)).length;
    sc += Math.min(c.noLex ? .8 : 2, shared*.6);                // pertinenza lessicale
    if (lastOut && ov.length && ov.filter(s=>tokenize(lastOut).map(stem).includes(s)).length/ov.length > .6) sc -= 1.5;
    if (n === norm(a.raw)) sc -= 3;                             // pappagallo puro
    if (!["ans","def","senso"].includes(c.src) && !allowed(ctx, c.x.replace(/«[^»]*»/g," "))) sc -= 5; // parole che non conosce
    if (vecs) sc += 2.4 * dot(vecs[0], vecs[i+1]);               // pertinenza di senso
    sc += Math.max(-1, Math.min(1.2, (S.mem.reward[c.src] || 0) * .08)); // impara cosa ti piace
    if (mood === "drowsy") sc -= c.x.length/30; if (mood === "grumpy") sc -= c.x.length/22; // assonnato: frasi corte
    c.sc = sc + rnd()*.9;
  });
  C.sort((x,y)=>y.sc-x.sc);
  if (globalThis.IMPRONTA_DEBUG) console.log(C.slice(0,5).map(c=>`${c.sc.toFixed(2)} [${c.src}] ${c.x}`).join("\n"));
  const best = C[0];
  if (!best || best.sc < -1) return glyph();
  if (best.setAsk){ set.ask = best.setAsk; S.mem.curAt = S.user.msgs; }
  best.x = best.x.replace(/\b(ti|mi) piace (i|le|gli) /g, "$1 piacciono $2 ");
  if (best.sense) set.sense = best.sense;
  if (best.praise) set.praise = best.praise;
  if (best.insight) set.insight = best.insight;
  return { x: best.x, emo: best.src==="praise" ? "happy" : mood === "grumpy" && emo === "neutral" ? "hurt" : mood === "drowsy" && emo === "neutral" ? "sleepy" : emo, raw: ["ans","mem","def","senso","praise"].includes(best.src), set, src: best.src };
}
export function dot(a, b){ let s = 0; for (let i=0;i<a.length;i++) s += a[i]*b[i]; return s; }

/* intenti per la mente semantica: esempi prototipo */
export const PROTOS = {
  greet:["ciao","ehi come va","buongiorno","sono tornato"],
  bye:["devo andare","a domani","buonanotte","ci sentiamo dopo"],
  neg:["sono triste","oggi è andata malissimo","mi sento solo","ho paura","sono stanco morto","ho litigato con un amico"],
  pos:["sono felice","oggi è una bella giornata","sono contentissimo","è andata benissimo"],
  kind:["ti voglio bene","sei dolcissimo","sei il mio amico"],
  insult:["sei stupido","non servi a niente","ti odio"],
  question:["perché il cielo è blu","cosa ne pensi","secondo te è giusto"],
  humor:["ahahah che ridere","lol","che scemo ahah"],
  thanks:["grazie mille","ti ringrazio"],
  ask_feel:["come stai","tutto bene?","come ti senti oggi"],
  ask_name:["come ti chiami","chi sei"],
  ask_doing:["cosa stai facendo","che fai di bello"]
};
