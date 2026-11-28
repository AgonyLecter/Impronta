/* nucleo · studio
   impronta studia da solo mentre dorme (sul server dei sogni, tools/sogna.mjs).
   Cosa sceglie di studiare, in quest'ordine:
     1. quello che gli chiedi tu ("studia la geometria", un link)
     2. gli argomenti di cui parli di più (Wikipedia)
     3. le parole che usi e che non sa spiegare (Wikizionario)
     4. un programma di materie, un capitolo per notte (Wikibooks, Wikiversità, poi Wikipedia)
     5. un classico di pubblico dominio, un capitolo per notte (Wikisource)
     6. i collegamenti delle pagine già lette che toccano i tuoi argomenti
     7. le notizie della notte (feed RSS dei giornali e i feed che gli dai tu)
     8. un libro da Progetto Gutenberg, un pezzo per notte; ogni tanto una citazione (Wikiquote)
   Per ogni argomento prende anche i fatti certi da Wikidata (date, abitanti, capitali…).
   Se in italiano non trova niente legge Wikipedia in inglese e la traduce (traduci() passato da fuori).
   Da ogni lettura tiene: frasi per allenare la rete (letture) e "scoperte" da raccontarti, sempre con la fonte.
   Tutte le fonti Wikimedia hanno la stessa interfaccia: un solo lettore per tutte.
   fetch è passato da fuori (Node 18+ o browser), così il modulo si prova anche senza rete. */

export const FONTI = {
  wikipedia:    { host: "it.wikipedia.org",   nome: "Wikipedia" },
  wikizionario: { host: "it.wiktionary.org",  nome: "Wikizionario" },
  wikibooks:    { host: "it.wikibooks.org",   nome: "Wikibooks" },
  wikiversita:  { host: "it.wikiversity.org", nome: "Wikiversità" },
  wikisource:   { host: "it.wikisource.org",  nome: "Wikisource" },
  wikiquote:    { host: "it.wikiquote.org",   nome: "Wikiquote" },
  wikidata:     { host: "www.wikidata.org",   nome: "Wikidata" },
  inglese:      { host: "en.wikipedia.org",   nome: "Wikipedia in inglese" }
};
/* giornali provati dal vivo (tools/prova-fonti.mjs): accettano i programmi automatici. Il Post rifiuta (403): non lo usiamo */
export const FEED = [{ nome: "ANSA", url: "https://www.ansa.it/sito/notizie/topnews/topnews_rss.xml" }, { nome: "Rai News", url: "https://www.rainews.it/rss/tutti" },
  { nome: "Internazionale", url: "https://www.internazionale.it/sitemaps/rss.xml" }, { nome: "Focus", url: "https://www.focus.it/rss" },
  { nome: "Il Fatto Quotidiano", url: "https://www.ilfattoquotidiano.it/feed/" }];
export const MATERIE = ["matematica","geometria","algebra","fisica","chimica","biologia","astronomia","storia","geografia",
  "filosofia","letteratura italiana","informatica","latino","musica","storia dell'arte","economia","psicologia","scienze della terra"];
export const CLASSICI = ["Le avventure di Pinocchio","I promessi sposi","Divina Commedia","Il principe","Operette morali",
  "Dialogo sopra i due massimi sistemi del mondo","Cuore (De Amicis)","I Malavoglia","Il fu Mattia Pascal","Canti (Leopardi)",
  "Decameron","Orlando furioso","Le mie prigioni","Novelle per un anno","Il Novellino","Le confessioni di un italiano","Mastro-don Gesualdo",
  "Il piacere","Ultime lettere di Jacopo Ortis","Il Canzoniere","Gerusalemme liberata","Fosca","Senilità","Piccolo mondo antico"];

const UA = "impronta-studio/1.0 (compagno digitale open source, uso personale)";
const STOP = new Set("il lo la i gli le un uno una di a da in con su per tra fra e ed o ma che chi non è sono sei ho hai ha mi ti si ci vi ne me te lui lei noi voi loro io tu del della dei delle al alla ai nel nella sul sulla questo questa quello quella cosa come dove quando perché anche ancora già poi solo se sì no ok mio mia tuo tua suo sua oggi ora molto poco più tipo".split(" "));
const tok = s => (String(s).toLowerCase().replace(/[’`]/g,"'").match(/[a-zàáèéìíòóùú]+/g) || []);
const arr = v => Array.isArray(v) ? v : v ? Object.values(v) : [];
const chiave = (f, t) => f + ":" + String(t).toLowerCase();

/* ---------- pulizia del testo ---------- */
export function pulisci(testo){
  return String(testo || "")
    .replace(/\{\\displaystyle[^}]*\}/g, " ")            // formule rimaste dal wikitesto
    .replace(/\{[^{}]*\}/g, " ").replace(/\[[^\]]*\]/g, " ")
    .replace(/^=+.*=+$/gm, "\n")                          // titoli di sezione
    .replace(/[ \t]+/g, " ").trim();
}
/* testo di servizio delle pagine web (cookie, accessi, avvisi): non è conoscenza */
const SPAZZATURA = /\b(cookie|privacy|consenso|accedi|account google|javascript|browser|prima di continuare|termini di servizio|iscriviti|newsletter|abbonati|pubblicità|clicca qui|tutti i diritti riservati)\b/i;
export const spazzatura = x => SPAZZATURA.test(x) || /https?:|www\./i.test(x);
/* frasi complete e leggibili, né troppo corte né troppo lunghe */
export function frasi(testo, max = 120){
  const out = [];
  for (const par of pulisci(testo).split(/\n+/)){
    const p = par.trim(); if (p.split(" ").length < 5) continue;
    for (const f of p.split(/(?<=[.!?;])\s+(?=["«(]?[A-ZÀ-Ú0-9])/)){
      const x = f.trim(), n = x.split(/\s+/).length;
      if (n < 5 || n > 45 || !/[.!?;]$/.test(x)) continue;
      if (/[\\=<>|]|https?:|\bISBN\b|^\W/.test(x) || spazzatura(x)) continue;
      if (tok(x).length < n*.6) continue;               // troppi numeri o simboli
      out.push(x.replace(/;$/, ".")); if (out.length >= max) return out;
    }
  }
  return out;
}
/* è inglese? (parole funzione più frequenti) */
const EN = new Set("the and of to is was are were that this with for as by from which it its an be has have had on at or not their they".split(" "));
const IT = new Set("il lo la di che e è un una per con non sono del della nel alla gli le dei delle anche come più".split(" "));
export function inglese(testo){ let e = 0, i = 0; for (const w of tok(String(testo).slice(0, 3000))){ if (EN.has(w)) e++; if (IT.has(w)) i++; } return e >= 3 && e > i*2; }
/* la prima frase che definisce l'argomento ("L'Etna è un vulcano…") */
export function definizione(fr, titolo){
  const t = tok(titolo)[0] || "";
  return fr.find(f => / (è|sono|era|erano|indica|si intende|si chiama|consiste) /.test(f) && (!t || tok(f).slice(0, 8).some(w => w.startsWith(t.slice(0, 5))))) || fr[0] || null;
}
/* Wikizionario: la pagina non ha frasi ma definizioni a righe. Diventano frasi vere:
   «malinconia significa stato di costante malumore.», «malinconia viene dal latino tardo melancholia…», «malinconia è come tristezza, mestizia.» */
const CATEGORIE = /^(sostantivo|aggettivo|verbo|avverbio|pronome|preposizione|congiunzione|interiezione|articolo|locuzione[a-z ]*|nome proprio)$/i;
const SEZIONI = /^(sillabazione|pronuncia|etimologia[ /a-z]*|sinonimi|contrari|parole derivate|termini correlati|varianti|alterati|proverbi e modi di dire|traduzione|citazioni|note|iponimi|iperonimi|vedi anche|forma flessa|italiano|inglese|latino|francese|spagnolo|tedesco|.{0,3})$/i;
export function dizionario(testo, parola){
  const w = String(parola || "").toLowerCase(), out = [], righe = String(testo || "").split("\n").map(r => r.trim());
  let sez = null, lemma = false;
  const pulita = r => r.replace(/^(\([^)]*\)\s*)+/, "").replace(/\s+/g, " ").replace(/[;,:.\s]+$/, "").trim();
  for (const r of righe){
    if (!r) continue;
    if (CATEGORIE.test(r)){ sez = "def"; lemma = true; continue; }
    if (SEZIONI.test(r)){ sez = r.toLowerCase(); continue; }
    if (sez === "def"){
      if (lemma){ lemma = false; if (/\((pl|sing|m|f)\b|\bpl\.:|\b(m|f) sing\b/.test(r) || r.toLowerCase().startsWith(w)) continue; }
      const d = pulita(r); if (d.split(" ").length >= 3 && d.length < 260 && !/[|=]/.test(d)) out.push(`${w} significa ${d}.`);
    } else if (sez && sez.startsWith("etimologia")){
      const d = pulita(r); if (/^(dal|dalla|dallo|dai|dagli|dalle|da) /.test(d) && d.length < 260) out.push(`${w} viene ${d.replace(/;.*$/, "")}.`); sez = "-";
    } else if (sez === "sinonimi"){
      const xs = r.split(/,\s*/).map(x => pulita(x)).filter(x => x && x.split(" ").length <= 2 && x !== w).slice(0, 5);
      if (xs.length >= 2) out.push(`${w} è come ${xs.slice(0, -1).join(", ")} e ${xs[xs.length - 1]}.`); sez = "-";
    }
    if (out.length >= 8) break;
  }
  return out;
}
export function testoDaHtml(html){
  return String(html || "").replace(/<(script|style|noscript|nav|header|footer|aside)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|li|h\d|br|tr|section|article)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/[ \t]+/g, " ");
}

/* capitoli nell'ordine giusto: "Capitolo II" prima di "Capitolo X", "Lezione 2" prima di "Lezione 10" */
const ROM = { i:1, v:5, x:10, l:50, c:100, d:500, m:1000 };
function numero(t){
  const last = String(t).split("/").pop(), a = last.match(/\d+/); if (a) return +a[0];
  const r = last.match(/\b([ivxlcdm]+)\b/i); if (!r) return null;
  const s = r[1].toLowerCase(); let n = 0; for (let i=0;i<s.length;i++){ const v = ROM[s[i]], w = ROM[s[i+1]] || 0; n += v < w ? -v : v; } return n;
}
export function ordina(titoli){ return [...titoli].sort((a, b) => { const x = numero(a), y = numero(b); return x != null && y != null && x !== y ? x - y : a.localeCompare(b, "it"); }); }

/* ---------- Wikidata: quali fatti tenere ---------- */
export const PROPRIETA = { P31: "è", P279: "è un tipo di", P17: "paese", P131: "si trova in", P30: "continente", P36: "capitale", P1082: "abitanti", P2046: "superficie", P2044: "altitudine", P2048: "altezza",
  P571: "fondazione", P569: "nascita", P570: "morte", P19: "luogo di nascita", P106: "professione", P27: "cittadinanza", P50: "autore", P170: "creatore", P577: "pubblicazione", P61: "scoperto da", P575: "scoperta", P37: "lingua", P38: "valuta", P6: "capo del governo", P35: "capo di stato", P2067: "massa" };
const UNITA = { P2046: " km²", P2044: " m", P2048: " m", P2067: " kg" };
const MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
function data(v){ const m = String(v.time).match(/([+-])(\d+)-(\d\d)-(\d\d)/); if (!m) return null; const y = +m[2] * (m[1] === "-" ? -1 : 1), ac = y < 0 ? " a.C." : "";
  return v.precision >= 11 ? `${+m[4]} ${MESI[+m[3]-1]} ${Math.abs(y)}${ac}` : v.precision === 10 ? `${MESI[+m[3]-1]} ${Math.abs(y)}${ac}` : `${Math.abs(y)}${ac}`; }
/* i fatti diventano frasi italiane semplici: per allenare la rete e per rispondere */
export function frasiDaFatti(nome, F){
  const n = String(nome), out = [];
  for (const { P, v } of F.fatti || []){
    const t = { P31: `${n} è ${v}.`, P279: `${n} è un tipo di ${v}.`, P17: `${n} si trova in ${v}.`, P131: `${n} si trova a ${v}.`, P30: `${n} è in ${v}.`, P36: `La capitale di ${n} è ${v}.`, P1082: `${n} ha ${v} abitanti.`,
      P2046: `${n} ha una superficie di ${v}.`, P2044: `${n} è alto ${v} sul livello del mare.`, P2048: `${n} è alto ${v}.`, P571: `${n} è stato fondato nel ${v}.`, P569: `${n} è nato il ${v}.`, P570: `${n} è morto il ${v}.`,
      P19: `${n} è nato a ${v}.`, P106: `${n} era ${v}.`, P27: `${n} aveva la cittadinanza ${v}.`, P50: `${n} è stato scritto da ${v}.`, P170: `${n} è stato creato da ${v}.`, P577: `${n} è stato pubblicato nel ${v}.`,
      P61: `${n} è stato scoperto da ${v}.`, P575: `${n} è stato scoperto nel ${v}.`, P37: `A ${n} si parla ${v}.`, P38: `La valuta di ${n} è ${v}.`, P6: `Il capo del governo di ${n} è ${v}.`, P35: `Il capo di stato di ${n} è ${v}.`, P2067: `${n} ha una massa di ${v}.` }[P];
    if (t) out.push((t.charAt(0).toUpperCase() + t.slice(1)).replace(/ nel (\d{1,2} \w+ )/, " il $1").replace(/\.\.$/, "."));
  }
  return out;
}

/* ---------- il lettore (API MediaWiki, uguale per tutte le fonti Wikimedia) ---------- */
export function lettore(fetch, { timeout = 15000, pausa = 700, attesa = ms => new Promise(r => setTimeout(r, ms)) } = {}){
  // educato con Wikipedia: una richiesta alla volta, con una pausa; se dice "troppe richieste" (429) aspetta e riprova
  let ultima = 0; const conti = { richieste: 0, attese: 0, msAttesa: 0 };
  async function get(url){
    for (let prova = 0; ; prova++){
      const gap = ultima + pausa - Date.now(); if (gap > 0) await attesa(gap); ultima = Date.now();
      const ac = typeof AbortController !== "undefined" ? new AbortController() : null, tm = ac ? setTimeout(() => ac.abort(), timeout) : 0;
      let r; try { r = await fetch(url, { headers: { "User-Agent": UA, "Api-User-Agent": UA }, signal: ac && ac.signal }); } finally { clearTimeout(tm); }
      conti.richieste++;
      if (r.ok) return r;
      if ((r.status === 429 || r.status === 503) && prova < 3){
        const ra = r.headers && r.headers.get && +r.headers.get("retry-after"), ms = Math.min(20000, (ra > 0 ? ra*1000 : 0) || 2500*Math.pow(2, prova));
        conti.attese++; conti.msAttesa += ms; await attesa(ms); continue;
      }
      throw new Error("HTTP " + r.status);
    }
  }
  async function api(fonte, q){
    const u = new URL(`https://${FONTI[fonte].host}/w/api.php`);
    for (const [k, v] of Object.entries({ format: "json", formatversion: "2", origin: "*", ...q })) u.searchParams.set(k, v);
    return (await get(u.toString())).json();
  }
  return {
    conti,
    async cerca(fonte, testo, n = 3){
      const j = await api(fonte, { action: "query", list: "search", srsearch: testo, srlimit: n, srnamespace: 0 });
      return arr(j.query && j.query.search).map(s => s.title);
    },
    async pagina(fonte, titolo){
      const j = await api(fonte, { action: "query", prop: "extracts|links", explaintext: 1, exsectionformat: "plain", redirects: 1, titles: titolo, pllimit: 80, plnamespace: 0 });
      const p = arr(j.query && j.query.pages)[0];
      if (!p || p.missing) return null;
      const url = `https://${FONTI[fonte].host}/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}`;
      if (p.extract && p.extract.length > 200) return { titolo: p.title, testo: p.extract, link: arr(p.links).map(l => l.title), url };
      // ripiego: il testo come appare sulla pagina (Wikisource monta i capitoli da altre pagine e l'estratto resta vuoto)
      const q = await api(fonte, { action: "parse", page: p.title, prop: "text|links", redirects: 1, disableeditsection: 1 });
      const html = q.parse && (typeof q.parse.text === "string" ? q.parse.text : q.parse.text && q.parse.text["*"]);
      if (!html) return p.extract ? { titolo: p.title, testo: p.extract, link: arr(p.links).map(l => l.title), url } : null;
      const testo = testoDaHtml(html.replace(/<(table|sup|style)[\s\S]*?<\/\1>/gi, " ").replace(/<div[^>]*class="[^"]*(navbox|noprint|mw-references|reference)[^"]*"[\s\S]*?<\/div>/gi, " "));
      return { titolo: p.title, testo, link: arr(q.parse.links).filter(l => !l.ns && l.exists !== false).map(l => l.title || l["*"]).filter(Boolean), url };
    },
    // i capitoli di un libro (Wikibooks, Wikisource): le sottopagine
    async sottopagine(fonte, radice, n = 80){
      const j = await api(fonte, { action: "query", list: "allpages", apprefix: radice + "/", aplimit: n });
      return ordina(arr(j.query && j.query.allpages).map(p => p.title));
    },
    /* fatti certi da Wikidata per una voce di Wikipedia: [{ k: "abitanti", v: "2.761.632" }, …] e una descrizione */
    async fatti(titolo, fonte = "wikipedia"){
      const j = await api(fonte, { action: "query", prop: "pageprops", ppprop: "wikibase_item", redirects: 1, titles: titolo });
      const pg = arr(j.query && j.query.pages)[0], q = pg && pg.pageprops && pg.pageprops.wikibase_item; if (!q) return null;
      const e = await api("wikidata", { action: "wbgetentities", ids: q, props: "claims|descriptions|labels", languages: "it" });
      const ent = e.entities && e.entities[q]; if (!ent) return null;
      const out = [], serve = new Set();
      for (const [P, nome] of Object.entries(PROPRIETA)){
        const cl = arr(ent.claims && ent.claims[P]).filter(c => c.rank !== "deprecated" && !(c.qualifiers && c.qualifiers.P582)).sort((a, b) => (b.rank === "preferred") - (a.rank === "preferred") || arr(b.references).length - arr(a.references).length)[0];   // valori ancora validi, i più documentati
        const dv = cl && cl.mainsnak && cl.mainsnak.datavalue; if (!dv) continue;
        if (dv.type === "wikibase-entityid"){ out.push({ P, k: nome, id: dv.value.id }); serve.add(dv.value.id); }
        else if (dv.type === "time") out.push({ P, k: nome, v: data(dv.value) });
        else if (dv.type === "quantity") out.push({ P, k: nome, v: Number(dv.value.amount).toLocaleString("it-IT") + (UNITA[P] || "") });
        else if (dv.type === "string") out.push({ P, k: nome, v: dv.value });
      }
      if (serve.size){ const l = await api("wikidata", { action: "wbgetentities", ids: [...serve].slice(0, 50).join("|"), props: "labels", languages: "it|en" });
        for (const f of out) if (f.id){ const x = l.entities && l.entities[f.id]; f.v = x && x.labels && (x.labels.it || x.labels.en) ? (x.labels.it || x.labels.en).value : null; } }
      return { id: q, nome: ent.labels && ent.labels.it ? ent.labels.it.value : titolo, descrizione: ent.descriptions && ent.descriptions.it ? ent.descriptions.it.value : null, fatti: out.filter(f => f.v).map(({ P, k, v }) => ({ P, k, v })) };
    },
    /* citazioni (Wikiquote): le righe tra virgolette, brevi */
    async citazioni(q){
      const [t] = await this.cerca("wikiquote", q, 1); if (!t) return [];
      const p = await this.pagina("wikiquote", t); if (!p) return [];
      return pulisci(p.testo).split(/\n+/).map(x => x.trim().replace(/^[-–•*\d.)\s]+/, "")).filter(x => /^[«"“].{20,240}[»"”]\.?$/.test(x) || (/^[A-ZÀ-Ú]/.test(x) && x.length > 30 && x.length < 200 && /[.!?]$/.test(x) && !/\(|\)|Citato in|Da /.test(x)))
        .slice(0, 8).map(x => ({ x: x.replace(/^[«"“]|[»"”]\.?$/g, ""), autore: p.titolo, url: p.url }));
    },
    /* notizie da un feed RSS o Atom */
    async rss(url){
      const raw = await (await get(url)).text(), out = [];
      const tag = (b, n) => { const m = b.match(new RegExp(`<${n}[^>]*>([\\s\\S]*?)</${n}>`, "i")); return m ? testoDaHtml(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")).replace(/\s+/g, " ").trim() : ""; };
      for (const b of raw.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) || []){
        const titolo = tag(b, "title"), testo = tag(b, "description") || tag(b, "summary") || tag(b, "content");
        const link = (b.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || tag(b, "link");
        if (titolo) out.push({ titolo, testo: testo.slice(0, 600), link, data: tag(b, "pubDate") || tag(b, "updated") });
      }
      return out.slice(0, 20);
    },
    /* un libro italiano di pubblico dominio da Progetto Gutenberg (tramite Gutendex) */
    async gutenberg(n = 0){
      const j = await (await get(`https://gutendex.com/books/?languages=it&sort=popular&page=${1 + Math.floor(n/32)}`)).json();
      const b = arr(j.results)[n % 32]; if (!b) return null;
      const f = Object.entries(b.formats || {}).find(([k]) => /^text\/plain/.test(k)); if (!f) return null;
      return { id: b.id, titolo: b.title, autore: (arr(b.authors)[0] || {}).name || "", url: f[1] };
    },
    async testo(url){ return (await get(url)).text(); },
    async web(url){
      const r = await get(url), ct = (r.headers && r.headers.get && r.headers.get("content-type")) || "";
      if (ct && !/text\/(html|plain)/.test(ct)) throw new Error("non è una pagina di testo");
      const fin = r.url || url, host = new URL(fin).hostname;
      // i link di condivisione di Google portano a pagine di Google (accesso, cookie), non all'articolo
      if (/(^|\.)google\.[a-z.]+$|^share\.google$|^consent\./.test(host)) throw new Error("è una pagina di Google, non l'articolo: serve il link vero");
      const raw = await r.text(); const tit = (raw.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1];
      return { titolo: (tit || host).trim().slice(0, 80), testo: /<html|<body|<p[ >]/i.test(raw) ? testoDaHtml(raw) : raw, url: fin };
    }
  };
}

/* ---------- curiosità: cosa studiare stanotte ---------- */
export function nuovoStato(){ return { visti: {}, coda: [], materie: {}, materia: 0, libro: null, classico: 0, pagine: 0, frasi: 0, storia: [], notti: 0, gut: null, gutN: 0 }; }
export const VAGHE = new Set(["qualcosa","qualcosina","tutto","cose","roba","altro","niente","nulla","quello","questo","ciò","di più"]);
/* parole da chat, non argomenti: comandi, lodi, saluti, verbi e avverbi */
const NON_ARGOMENTI = new Set("studia studiare studiato impara imparare imparato leggi leggere cerca cercare dimmi parlami scrivi guarda ascolta senti bravo brava bravissimo bravissima grazie ciao buongiorno buonanotte buonasera scusa allora quindi però perché davvero sempre spesso mai magari forse proprio tanto troppo bene male niente nulla qualcosa sicuro certo okay dai vabbè".split(" "));
const argomento = w => !NON_ARGOMENTI.has(w) && !/(ando|endo|mente|issimo|issima|issimi|iamo)$/.test(w) && !(w.length >= 7 && /(are|ere|ire)$/.test(w));
function paroleTue(S){
  const nomi = new Set([S.name, S.userName].filter(Boolean).map(x => String(x).toLowerCase()));
  return Object.entries(S.words || {}).filter(([w, v]) => w.length > 3 && !STOP.has(w) && !nomi.has(w) && !/^(https?|www|com)$/.test(w) && v && v.c >= 2).sort((a, b) => b[1].c - a[1].c).map(([w]) => w);
}
function argomentiTuoi(S){ return paroleTue(S).filter(argomento);
}
export function scegli(S, st, { max = 10 } = {}){
  const jobs = [], visto = k => !!st.visti[k], add = j => { if (jobs.length < max && !jobs.some(x => x.k === j.k) && !visto(j.k)) jobs.push(j); };
  // 1. le tue richieste
  for (const r of arr(S.mem && S.mem.studia)) if (r && !r.fatto && !VAGHE.has(String(r.x).toLowerCase().trim())){
    if (r.k === "link") add({ k: "web:" + r.x, tipo: "web", url: r.x, perche: "me l'hai chiesto tu", richiesta: r.x });
    else add({ k: chiave("wikipedia", r.x), tipo: "argomento", fonte: "wikipedia", q: r.x, perche: "me l'hai chiesto tu", richiesta: r.x, materia: MATERIE.includes(String(r.x).toLowerCase()) ? String(r.x).toLowerCase() : null });
  }
  // 2. di cosa parli
  const tue = argomentiTuoi(S);
  for (const w of tue.slice(0, 30)){ if (jobs.length >= Math.ceil(max/2)) break; add({ k: chiave("wikipedia", w), tipo: "argomento", fonte: "wikipedia", q: w, perche: "ne parli spesso" }); }
  // 2b. i SUOI gusti: segue un collegamento trovato nell'argomento che gli piace di più (nucleo/gusti.js)
  const fav = S.mem && S.mem.gusti && S.mem.gusti.preferiti && S.mem.gusti.preferiti.temi;
  if (fav){ const c = st.coda.find(c => c.da === fav && !visto(chiave(c.f, c.t))); if (c) add({ k: chiave(c.f, c.t), tipo: "pagina", fonte: c.f, titolo: c.t, perche: `mi piace «${fav}»: continuo da lì` }); }
  // 3. parole che usi e non sa spiegare
  const defs = (S.defs) || {};
  for (const w of tue.filter(w => !defs[w]).slice(0, 40)){ if (jobs.filter(j => j.fonte === "wikizionario").length >= 1) break; add({ k: chiave("wikizionario", w), tipo: "parola", fonte: "wikizionario", q: w, perche: "la usi e non sapevo cosa vuol dire" }); }
  // 4. una materia, un capitolo
  const m = MATERIE[st.materia % MATERIE.length]; add({ k: "materia:" + m + ":" + ((st.materie[m] && st.materie[m].i) || 0), tipo: "materia", materia: m, perche: "sto studiando " + m });
  // 5. un libro: quello che gli hai chiesto tu, o un classico
  const chiesto = !st.libro && arr(S.mem && S.mem.leggi).some(x => x && x.titolo && !(st.letti || []).includes(x.titolo));
  add({ k: "classico:" + (st.libro ? st.libro.titolo + ":" + st.libro.i : chiesto ? "chiesto:" + (st.letti || []).length : st.classico), tipo: "classico", perche: chiesto ? "me l'hai chiesto tu" : "leggo un libro" });
  // 7. le notizie della notte, 8. un pezzo di libro da Gutenberg, ogni tanto una citazione
  add({ k: "notizie:" + (st.notti || 0), tipo: "notizie", perche: "leggo le notizie" });
  // Gutenberg (Gutendex e il sito) rifiuta i server cloud (403/503, provato dal vivo): i libri arrivano da Wikisource.
  // Il codice resta: si riattiva con S.mem.gutenberg = true se un giorno risponde.
  if (S.mem && S.mem.gutenberg) add({ k: "gutenberg:" + (st.gut ? st.gut.id + ":" + st.gut.pos : "n" + (st.gutN || 0)), tipo: "gutenberg", perche: "leggo un libro" });
  if ((st.notti || 0) % 3 === 1 && tue[0]) add({ k: chiave("wikiquote", tue[(st.notti || 0) % Math.min(5, tue.length)]), tipo: "citazione", q: tue[(st.notti || 0) % Math.min(5, tue.length)], perche: "cerco cosa ne hanno detto" });
  // 6. collegamenti che toccano i tuoi argomenti
  const mie = new Set(tue.slice(0, 60));
  for (const c of st.coda){ if (jobs.length >= max) break; if (tok(c.t).some(w => mie.has(w))) add({ k: chiave(c.f, c.t), tipo: "pagina", fonte: c.f, titolo: c.t, perche: `l'ho trovato leggendo «${c.da}»` }); }
  return jobs;
}

/* ---------- studiare ---------- */
export async function studia({ fetch, S, stato, budgetMs = 45000, maxPagine = 10, ora = Date.now, log = () => {}, pausa = 700, traduci = null }){
  const st = Object.assign(nuovoStato(), stato || {}); st.visti = st.visti || {}; st.coda = arr(st.coda); st.storia = arr(st.storia); st.notti = (st.notti || 0) + 1;
  const L = lettore(fetch, { pausa }), t0 = ora(), letture = [], scoperte = [], fatte = [], notizie = [], citazioni = [], imparate = [];
  // da dove viene ogni frase (per i suoi gusti): { "tipo|nome": { tipo, nome, frasi } }
  const gruppi = {}, gruppo = (tipo, nome, fr) => { if (!nome || !fr || !fr.length) return; const k = tipo + "|" + nome; (gruppi[k] = gruppi[k] || { tipo, nome: String(nome), frasi: [] }).frasi.push(...fr); };
  // testo in inglese: lo traduce (se c'è un traduttore) e lo tratta come italiano; altrimenti lo lascia stare
  const inItaliano = async (testo, tante = 120) => {
    if (!inglese(testo)) return { fr: frasi(testo, tante), tradotto: false };
    if (!traduci) return { fr: [], tradotto: false };
    const en = frasi(testo, tante); if (!en.length) return { fr: [], tradotto: false };
    const it = (await traduci(en)).filter(x => x && !inglese(x));
    return { fr: it, tradotto: true };
  };
  const conFatti = async (titolo, fonte, sc) => {   // fatti certi da Wikidata: frasi per la rete e dati per rispondere
    try { const F = await L.fatti(titolo, fonte); if (!F || !F.fatti.length) return;
      const nome = fonte === "inglese" ? F.nome : titolo, fr = frasiDaFatti(nome, F); letture.push(...fr);
      if (sc){ sc.fatti = F.fatti.slice(0, 8); if (F.descrizione) sc.descrizione = F.descrizione; }
    } catch (e){ log(`  fatti ${titolo}: ${e.message}`); }
  };
  const tempo = () => ora() - t0 < budgetMs;
  const impara = async (pag, fonte, job, { tante = 120, scoperta = true } = {}) => {
    const { fr, tradotto } = fonte === "wikizionario" ? { fr: dizionario(pag.testo, pag.titolo), tradotto: false } : await inItaliano(pag.testo, tante); if (!fr.length) return 0;
    letture.push(...fr);
    // una parola cercata sul dizionario: la definizione diventa sua (S.defs), e la riusa
    if (fonte === "wikizionario" && job.tipo === "parola" && job.q){ const d0 = fr.find(f => f.startsWith(job.q.toLowerCase() + " significa ")); if (d0) imparate.push({ w: job.q.toLowerCase(), def: d0.replace(/^\S+ significa /, "").replace(/\.$/, ""), fonte: "Wikizionario" }); }
    if (job.tipo === "materia") gruppo("materie", job.materia, fr); else if (job.tipo === "classico") gruppo("libri", job.libro, fr); else if (job.tipo !== "parola") gruppo("temi", pag.titolo, fr);
    if (scoperta){ const d = definizione(fr, pag.titolo); if (d){ const sc = { t: ora(), argomento: pag.titolo, x: d.length > 260 ? d.slice(0, 257).replace(/\s\S*$/, "") + "…" : d, fonte: (FONTI[fonte] ? FONTI[fonte].nome : fonte) + (tradotto && fonte !== "inglese" ? " (tradotto dall'inglese)" : tradotto ? " (tradotta)" : ""), url: pag.url, perche: job.perche, frasi: fr.filter(f => f !== d && f.length < 220).slice(0, 12) };
      scoperte.push(sc); if (fonte === "wikipedia" || fonte === "inglese") await conFatti(pag.titolo, fonte, sc); } }
    // i collegamenti diventano curiosità per le notti dopo (quelli sui tuoi argomenti passano avanti)
    if (fonte === "wikipedia") for (const t of arr(pag.link).slice(0, 40)) if (!st.visti[chiave("wikipedia", t)] && !st.coda.some(c => c.t === t)) st.coda.push({ f: "wikipedia", t, da: pag.titolo });
    if (st.coda.length > 400) st.coda.splice(0, st.coda.length - 400);
    st.pagine++; st.frasi += fr.length; return fr.length;
  };
  const leggi = async (fonte, titolo, job, o) => { const p = await L.pagina(fonte, titolo); if (!p) return 0; st.visti[chiave(fonte, p.titolo)] = ora(); return await impara(p, fonte, job, o); };
  let pagine = 0;
  for (const job of scegli(S, st)){
    if (!tempo() || pagine >= maxPagine) break;
    let n = 0;
    try {
      if (job.tipo === "web"){
        const p = await L.web(job.url); n = await impara(p, new URL(job.url).hostname, job);
      } else if (job.tipo === "argomento" || job.tipo === "parola"){
        const [t] = await L.cerca(job.fonte, job.q, 1);
        if (t) n = await leggi(job.fonte, t, job, { tante: job.tipo === "parola" ? 20 : 120 });
        // niente in italiano? Wikipedia in inglese, tradotta
        if (!n && job.tipo === "argomento" && traduci){ const [te] = await L.cerca("inglese", job.q, 1); if (te) n = await leggi("inglese", te, { ...job, perche: job.perche + " · c'era solo in inglese" }); }
        if (job.materia) st.materia = MATERIE.indexOf(job.materia);   // se chiedi una materia, il programma passa a quella
      } else if (job.tipo === "pagina"){
        n = await leggi(job.fonte, job.titolo, job); st.coda = st.coda.filter(c => c.t !== job.titolo);
      } else if (job.tipo === "materia"){
        const m = job.materia, M = st.materie[m] = st.materie[m] || { i: 0, capitoli: null, fonte: null, radice: null };
        if (!M.capitoli){   // trova un manuale: Wikibooks, poi Wikiversità; altrimenti la voce di Wikipedia e i suoi collegamenti
          for (const f of ["wikibooks", "wikiversita"]){
            const [r] = await L.cerca(f, m, 1).catch(() => []); if (!r) continue;
            const radice = r.split("/")[0], cap = await L.sottopagine(f, radice).catch(() => []);
            M.fonte = f; M.radice = radice; M.capitoli = [radice, ...cap]; break;
          }
          if (!M.capitoli){ const p = await L.pagina("wikipedia", m.charAt(0).toUpperCase() + m.slice(1)); M.fonte = "wikipedia"; M.radice = p ? p.titolo : m; M.capitoli = p ? [p.titolo, ...arr(p.link).slice(0, 40)] : []; }
        }
        const t = M.capitoli[M.i];
        if (t){ n = await leggi(M.fonte, t, { ...job, perche: `sto studiando ${m} (${M.i + 1}/${M.capitoli.length})` }, { scoperta: M.i > 0 || M.fonte === "wikipedia" }); }   // l'indice di un manuale non è una scoperta
        M.i++; if (M.i >= M.capitoli.length){ M.i = 0; M.capitoli = null; M.giri = (M.giri || 0) + 1; }
        st.materia = (st.materia + 1) % MATERIE.length;
      } else if (job.tipo === "notizie"){
        const feed = [...arr(S.mem && S.mem.feed).map(f => typeof f === "string" ? { nome: new URL(f).hostname, url: f } : f), ...FEED];
        for (const f of feed.slice(0, 6)){ if (!tempo()) break;
          try { const it = await L.rss(f.url);
            for (const x of it.slice(0, 6)){ const testo = `${x.titolo}. ${x.testo}`, { fr } = await inItaliano(testo, 6);
              notizie.push({ t: ora(), titolo: x.titolo, testo: x.testo.slice(0, 280), fonte: f.nome, url: x.link }); letture.push(...fr); n += fr.length; }
          } catch (e){ log(`  feed ${f.nome}: ${e.message}`); } }
      } else if (job.tipo === "citazione"){
        const cs = await L.citazioni(job.q); citazioni.push(...cs.slice(0, 3).map(c => ({ ...c, t: ora(), argomento: job.q }))); letture.push(...cs.map(c => c.x)); n = cs.length;
      } else if (job.tipo === "gutenberg"){
        if (!st.gut){ const b = await L.gutenberg(st.gutN || 0); st.gutN = (st.gutN || 0) + 1; if (b) st.gut = { ...b, pos: 0 }; }
        if (st.gut){
          let t = await L.testo(st.gut.url); t = t.replace(/\r/g, "");
          const a = t.search(/\*\*\* ?START OF[^\n]*\n/), z = t.search(/\*\*\* ?END OF/);
          t = t.slice(a >= 0 ? t.indexOf("\n", a) + 1 : 0, z > 0 ? z : undefined).replace(/([^\n])\n(?!\n)/g, "$1 ");
          const pezzo = t.slice(st.gut.pos, st.gut.pos + 30000); st.gut.pos += 30000;
          const fr = frasi(pezzo, 250); letture.push(...fr); n = fr.length; gruppo("libri", st.gut.titolo, fr); gruppo("autori", st.gut.autore, fr);
          if (st.gut.pos >= t.length) st.gut = null;
        }
      } else if (job.tipo === "classico"){
        if (!st.libro){
          // prima i libri che gli hai chiesto tu (S.mem.leggi), poi i classici in ordine
          st.letti = st.letti || []; const chiesto = arr(S.mem && S.mem.leggi).map(x => x && x.titolo).find(t => t && !st.letti.includes(t));
          const titolo = chiesto || CLASSICI[st.classico % CLASSICI.length]; if (chiesto) st.letti.push(chiesto); else st.classico++;
          const [r] = await L.cerca("wikisource", titolo, 1);
          const radice = r ? r.split("/")[0] : titolo, cap = await L.sottopagine("wikisource", radice).catch(() => []);
          st.libro = { titolo: radice, capitoli: cap.length ? cap : [radice], i: 0 };
        }
        const B = st.libro, t = B.capitoli[B.i];
        if (t) n = await leggi("wikisource", t, { ...job, libro: B.titolo, perche: `sto leggendo «${B.titolo}»` }, { tante: 200, scoperta: false });
        B.i++; if (B.i >= B.capitoli.length) st.libro = null;
      }
    } catch (e){ log(`  ${job.tipo} ${job.q || job.titolo || job.url || job.materia || ""}: ${e.message}`); }
    st.visti[job.k] = ora(); pagine++;
    fatte.push({ ...job, frasi: n });
    if (job.richiesta != null) fatte[fatte.length - 1].fatto = 1;
    log(`  ${job.tipo.padEnd(9)} ${String(job.q || job.titolo || job.url || job.materia || "").slice(0, 40).padEnd(40)} +${n} frasi · ${job.perche}`);
  }
  st.storia.push({ t: ora(), pagine, frasi: letture.length }); if (st.storia.length > 60) st.storia.shift();
  // i "visti" più vecchi di 60 giorni si possono ristudiare (le pagine cambiano, e ripassare fa bene)
  for (const [k, t] of Object.entries(st.visti)) if (ora() - t > 60*86400e3) delete st.visti[k];
  return { stato: st, letture, scoperte, fatte, notizie, citazioni, gruppi: Object.values(gruppi), imparate };
}

/* riassunto piccolo da mettere nello stato dell'app (trasparenza: cosa studia e dove è arrivato) */
export function riassunto(st, ora = Date.now()){
  const materie = {};
  for (const [m, M] of Object.entries(st.materie || {})) materie[m] = M.capitoli ? `${M.i}/${M.capitoli.length}${M.giri ? ` · ${M.giri}° giro` : ""}` : M.giri ? `${M.giri} giri` : "da iniziare";
  return { t: ora, pagine: st.pagine || 0, frasi: st.frasi || 0, materie, prossima: MATERIE[(st.materia || 0) % MATERIE.length],
    libro: st.libro ? `${st.libro.titolo} (${st.libro.i}/${st.libro.capitoli.length})` : null, curiosita: arr(st.coda).slice(-5).map(c => c.t),
    gutenberg: st.gut ? `${st.gut.titolo}${st.gut.autore ? " · " + st.gut.autore : ""}` : null };
}
