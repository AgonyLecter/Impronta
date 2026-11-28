/* nucleo · studio
   impronta studia da solo mentre dorme (sul server dei sogni, tools/sogna.mjs).
   Cosa sceglie di studiare, in quest'ordine:
     1. quello che gli chiedi tu ("studia la geometria", un link)
     2. gli argomenti di cui parli di più (Wikipedia)
     3. le parole che usi e che non sa spiegare (Wikizionario)
     4. un programma di materie, un capitolo per notte (Wikibooks, Wikiversità, poi Wikipedia)
     5. un classico di pubblico dominio, un capitolo per notte (Wikisource)
     6. i collegamenti delle pagine già lette che toccano i tuoi argomenti
   Da ogni lettura tiene: frasi per allenare la rete (letture) e "scoperte" da raccontarti, sempre con la fonte.
   Tutte le fonti Wikimedia hanno la stessa interfaccia: un solo lettore per tutte.
   fetch è passato da fuori (Node 18+ o browser), così il modulo si prova anche senza rete. */

export const FONTI = {
  wikipedia:    { host: "it.wikipedia.org",   nome: "Wikipedia" },
  wikizionario: { host: "it.wiktionary.org",  nome: "Wikizionario" },
  wikibooks:    { host: "it.wikibooks.org",   nome: "Wikibooks" },
  wikiversita:  { host: "it.wikiversity.org", nome: "Wikiversità" },
  wikisource:   { host: "it.wikisource.org",  nome: "Wikisource" }
};
export const MATERIE = ["matematica","geometria","algebra","fisica","chimica","biologia","astronomia","storia","geografia",
  "filosofia","letteratura italiana","informatica","latino","musica","storia dell'arte","economia","psicologia","scienze della terra"];
export const CLASSICI = ["Le avventure di Pinocchio","I promessi sposi","Divina Commedia","Il principe","Operette morali",
  "Dialogo sopra i due massimi sistemi del mondo","Cuore (De Amicis)","I Malavoglia","Il fu Mattia Pascal","Canti (Leopardi)"];

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
/* la prima frase che definisce l'argomento ("L'Etna è un vulcano…") */
export function definizione(fr, titolo){
  const t = tok(titolo)[0] || "";
  return fr.find(f => / (è|sono|era|erano|indica|si intende|si chiama|consiste) /.test(f) && (!t || tok(f).slice(0, 8).some(w => w.startsWith(t.slice(0, 5))))) || fr[0] || null;
}
export function testoDaHtml(html){
  return String(html || "").replace(/<(script|style|noscript|nav|header|footer|aside)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|li|h\d|br|tr|section|article)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/[ \t]+/g, " ");
}

/* capitoli nell'ordine giusto: "Capitolo II" prima di "Capitolo X", "Lezione 2" prima di "Lezione 10" */
const ROM = { i:1, v:5, x:10, l:50, c:100, d:500, m:1000 };
function numero(t){
  const last = String(t).split("/").pop(), a = last.match(/\d+/); if (a) return +a[0];
  const r = last.match(/\b([ivxlcdm]+)\b/i); if (!r) return null;
  const s = r[1].toLowerCase(); let n = 0; for (let i=0;i<s.length;i++){ const v = ROM[s[i]], w = ROM[s[i+1]] || 0; n += v < w ? -v : v; } return n;
}
export function ordina(titoli){ return [...titoli].sort((a, b) => { const x = numero(a), y = numero(b); return x != null && y != null && x !== y ? x - y : a.localeCompare(b, "it"); }); }

/* ---------- il lettore (API MediaWiki, uguale per tutte le fonti Wikimedia) ---------- */
export function lettore(fetch, { timeout = 15000 } = {}){
  async function get(url){
    const ac = typeof AbortController !== "undefined" ? new AbortController() : null, tm = ac ? setTimeout(() => ac.abort(), timeout) : 0;
    try { const r = await fetch(url, { headers: { "User-Agent": UA, "Api-User-Agent": UA }, signal: ac && ac.signal }); if (!r.ok) throw new Error("HTTP " + r.status); return r; }
    finally { clearTimeout(tm); }
  }
  async function api(fonte, q){
    const u = new URL(`https://${FONTI[fonte].host}/w/api.php`);
    for (const [k, v] of Object.entries({ format: "json", formatversion: "2", origin: "*", ...q })) u.searchParams.set(k, v);
    return (await get(u.toString())).json();
  }
  return {
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
export function nuovoStato(){ return { visti: {}, coda: [], materie: {}, materia: 0, libro: null, classico: 0, pagine: 0, frasi: 0, storia: [] }; }
export const VAGHE = new Set(["qualcosa","qualcosina","tutto","cose","roba","altro","niente","nulla","quello","questo","ciò","di più"]);
function paroleTue(S){
  const nomi = new Set([S.name, S.userName].filter(Boolean).map(x => String(x).toLowerCase()));
  return Object.entries(S.words || {}).filter(([w, v]) => w.length > 3 && !STOP.has(w) && !nomi.has(w) && !/^(https?|www|com)$/.test(w) && v && v.c >= 2).sort((a, b) => b[1].c - a[1].c).map(([w]) => w);
}
export function scegli(S, st, { max = 6 } = {}){
  const jobs = [], visto = k => !!st.visti[k], add = j => { if (jobs.length < max && !jobs.some(x => x.k === j.k) && !visto(j.k)) jobs.push(j); };
  // 1. le tue richieste
  for (const r of arr(S.mem && S.mem.studia)) if (r && !r.fatto && !VAGHE.has(String(r.x).toLowerCase().trim())){
    if (r.k === "link") add({ k: "web:" + r.x, tipo: "web", url: r.x, perche: "me l'hai chiesto tu", richiesta: r.x });
    else add({ k: chiave("wikipedia", r.x), tipo: "argomento", fonte: "wikipedia", q: r.x, perche: "me l'hai chiesto tu", richiesta: r.x, materia: MATERIE.includes(String(r.x).toLowerCase()) ? String(r.x).toLowerCase() : null });
  }
  // 2. di cosa parli
  const tue = paroleTue(S);
  for (const w of tue.slice(0, 30)){ if (jobs.length >= Math.ceil(max/2)) break; add({ k: chiave("wikipedia", w), tipo: "argomento", fonte: "wikipedia", q: w, perche: "ne parli spesso" }); }
  // 3. parole che usi e non sa spiegare
  const defs = (S.defs) || {};
  for (const w of tue.filter(w => !defs[w]).slice(0, 40)){ if (jobs.filter(j => j.fonte === "wikizionario").length >= 1) break; add({ k: chiave("wikizionario", w), tipo: "parola", fonte: "wikizionario", q: w, perche: "la usi e non sapevo cosa vuol dire" }); }
  // 4. una materia, un capitolo
  const m = MATERIE[st.materia % MATERIE.length]; add({ k: "materia:" + m + ":" + ((st.materie[m] && st.materie[m].i) || 0), tipo: "materia", materia: m, perche: "sto studiando " + m });
  // 5. un classico
  add({ k: "classico:" + (st.libro ? st.libro.titolo + ":" + st.libro.i : st.classico), tipo: "classico", perche: "leggo un libro" });
  // 6. collegamenti che toccano i tuoi argomenti
  const mie = new Set(tue.slice(0, 60));
  for (const c of st.coda){ if (jobs.length >= max) break; if (tok(c.t).some(w => mie.has(w))) add({ k: chiave(c.f, c.t), tipo: "pagina", fonte: c.f, titolo: c.t, perche: `l'ho trovato leggendo «${c.da}»` }); }
  return jobs;
}

/* ---------- studiare ---------- */
export async function studia({ fetch, S, stato, budgetMs = 45000, maxPagine = 8, ora = Date.now, log = () => {} }){
  const st = Object.assign(nuovoStato(), stato || {}); st.visti = st.visti || {}; st.coda = arr(st.coda); st.storia = arr(st.storia);
  const L = lettore(fetch), t0 = ora(), letture = [], scoperte = [], fatte = [];
  const tempo = () => ora() - t0 < budgetMs;
  const impara = (pag, fonte, job, { tante = 120, scoperta = true } = {}) => {
    const fr = frasi(pag.testo, tante); if (!fr.length) return 0;
    letture.push(...fr);
    if (scoperta){ const d = definizione(fr, pag.titolo); if (d) scoperte.push({ t: ora(), argomento: pag.titolo, x: d.length > 260 ? d.slice(0, 257).replace(/\s\S*$/, "") + "…" : d, fonte: FONTI[fonte] ? FONTI[fonte].nome : fonte, url: pag.url, perche: job.perche }); }
    // i collegamenti diventano curiosità per le notti dopo (quelli sui tuoi argomenti passano avanti)
    if (fonte === "wikipedia") for (const t of arr(pag.link).slice(0, 40)) if (!st.visti[chiave("wikipedia", t)] && !st.coda.some(c => c.t === t)) st.coda.push({ f: "wikipedia", t, da: pag.titolo });
    if (st.coda.length > 400) st.coda.splice(0, st.coda.length - 400);
    st.pagine++; st.frasi += fr.length; return fr.length;
  };
  const leggi = async (fonte, titolo, job, o) => { const p = await L.pagina(fonte, titolo); if (!p) return 0; st.visti[chiave(fonte, p.titolo)] = ora(); return impara(p, fonte, job, o); };
  let pagine = 0;
  for (const job of scegli(S, st)){
    if (!tempo() || pagine >= maxPagine) break;
    let n = 0;
    try {
      if (job.tipo === "web"){
        const p = await L.web(job.url); n = impara(p, new URL(job.url).hostname, job);
      } else if (job.tipo === "argomento" || job.tipo === "parola"){
        const [t] = await L.cerca(job.fonte, job.q, 1);
        if (t) n = await leggi(job.fonte, t, job, { tante: job.tipo === "parola" ? 20 : 120 });
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
      } else if (job.tipo === "classico"){
        if (!st.libro){
          const titolo = CLASSICI[st.classico % CLASSICI.length]; st.classico++;
          const [r] = await L.cerca("wikisource", titolo, 1);
          const radice = r ? r.split("/")[0] : titolo, cap = await L.sottopagine("wikisource", radice).catch(() => []);
          st.libro = { titolo: radice, capitoli: cap.length ? cap : [radice], i: 0 };
        }
        const B = st.libro, t = B.capitoli[B.i];
        if (t) n = await leggi("wikisource", t, { ...job, perche: `sto leggendo «${B.titolo}»` }, { tante: 200, scoperta: false });
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
  return { stato: st, letture, scoperte, fatte };
}

/* riassunto piccolo da mettere nello stato dell'app (trasparenza: cosa studia e dove è arrivato) */
export function riassunto(st, ora = Date.now()){
  const materie = {};
  for (const [m, M] of Object.entries(st.materie || {})) materie[m] = M.capitoli ? `${M.i}/${M.capitoli.length}${M.giri ? ` · ${M.giri}° giro` : ""}` : M.giri ? `${M.giri} giri` : "da iniziare";
  return { t: ora, pagine: st.pagine || 0, frasi: st.frasi || 0, materie, prossima: MATERIE[(st.materia || 0) % MATERIE.length],
    libro: st.libro ? `${st.libro.titolo} (${st.libro.i}/${st.libro.capitoli.length})` : null, curiosita: arr(st.coda).slice(-5).map(c => c.t) };
}
