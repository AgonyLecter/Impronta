/* studio da solo: lettore Wikimedia, curiosità, scoperte, crescita sul server (fonti finte in memoria) */
import { studia, scegli, frasi, definizione, nuovoStato, riassunto, MATERIE } from "../nucleo/studio.js";
import { Maestro, SERVER, TELEFONO } from "../nucleo/maestro.js";
import { sognaTutti } from "../tools/sogna.mjs";
import { impacchetta, spacchetta } from "../nucleo/pacco.js";
const ok = (c, m) => { console.log((c ? "ok   " : "NO   ") + m); if (!c) process.exitCode = 1; };

const lungo = (s, n) => Array.from({ length: n }, (_, i) => s.replace("#", i + 1)).join(" ");
const WIKI = {
  "it.wikipedia.org": {
    "Mare": { x: "Il mare è una grande distesa di acqua salata che copre gran parte della Terra. Nel mare vivono pesci, alghe e molti altri organismi. Le onde del mare sono prodotte soprattutto dal vento.\n== Storia ==\n" + lungo("Gli antichi navigavano il mare per commerciare con altri popoli lontani numero #.", 20), l: ["Oceano", "Calcio", "Pesce", "Spiaggia del mare"] },
    "Calcio (sport)": { x: "Il calcio è uno sport di squadra giocato da due squadre di undici giocatori. Si gioca con un pallone su un campo rettangolare di erba.", l: ["Pallone"] },
    "Geometria": { x: "La geometria è la parte della matematica che studia le figure nello spazio. La parola geometria viene dal greco e significa misura della terra.", l: ["Triangolo", "Cerchio"] },
    "Oceano": { x: "Un oceano è una vasta massa di acqua salata più grande di un mare. Sulla Terra ci sono cinque oceani principali.", l: [] }
  },
  "it.wiktionary.org": { "pizza": { x: "pizza\nSostantivo\npizza f sing\nalimento tondo e schiacciato di pasta lievitata cotto al forno con pomodoro e mozzarella.", l: [] } },
  "it.wikibooks.org": {
    "Matematica per le superiori": { x: "Questo libro spiega la matematica per le scuole superiori in modo semplice e chiaro.", l: [] },
    "Matematica per le superiori/Capitolo 2": { x: "Un numero primo è un numero naturale maggiore di uno divisibile solo per uno e per se stesso. I numeri primi sono infiniti, come dimostrò Euclide.", l: [] },
    "Matematica per le superiori/Capitolo 1": { x: "I numeri naturali sono quelli che usiamo per contare gli oggetti. Lo zero è considerato un numero naturale da molti matematici.", l: [] }
  },
  "it.wikisource.org": {
    "Le avventure di Pinocchio": { x: "Indice del libro.", l: [] },
    "Le avventure di Pinocchio/Capitolo I": { x: "C'era una volta un pezzo di legno. Non era un legno di lusso, ma un semplice pezzo da catasta. Maestro Ciliegia trovò il legno nella sua bottega.", l: [] }
  },
  "it.wikiversity.org": {}
};
const chiamate = [];
async function fintoFetch(url, opt){
  chiamate.push(url);
  const u = new URL(url), W = WIKI[u.hostname];
  if (!W) return { ok: true, headers: { get: () => "text/html" }, text: async () => `<html><title>Il mio blog sui vulcani</title><body><p>L'Etna è il vulcano attivo più alto d'Europa e si trova in Sicilia.</p><script>x()</script><p>Le sue eruzioni sono studiate da molti scienziati ogni anno.</p></body></html>` };
  const q = Object.fromEntries(u.searchParams), json = o => ({ ok: true, json: async () => o });
  if (q.list === "search"){ const t = Object.keys(W).filter(k => !k.includes("/") && (k.toLowerCase().includes(q.srsearch.toLowerCase()) || (q.srsearch === "matematica" && k.startsWith("Matematica")))); return json({ query: { search: t.slice(0, +q.srlimit).map(title => ({ title })) } }); }
  if (q.list === "allpages") return json({ query: { allpages: Object.keys(W).filter(k => k.startsWith(q.apprefix)).map(title => ({ title })) } });
  const P = W[q.titles]; return json({ query: { pages: [P ? { title: q.titles, extract: P.x, links: P.l.map(title => ({ title })) } : { title: q.titles, missing: true }] } });
}

// --- pezzi piccoli
const fr = frasi(WIKI["it.wikipedia.org"].Mare.x);
ok(fr.length >= 3 && fr.every(f => !f.includes("==")), `estrae frasi pulite (${fr.length})`);
ok(/^Il mare è/.test(definizione(fr, "Mare")), "trova la frase che definisce");

const now = Date.now(), DAY = 86400e3;
const corpus = ["oggi sono andato al mare con mio fratello","mi piace il calcio più di ogni cosa","la pizza di mia mamma è la più buona","domani gioco a calcio e poi vado al mare","il mare d estate è bellissimo","ho mangiato la pizza dopo la partita di calcio","voglio imparare la geometria per la scuola"];
const words = {}; for (const l of corpus) for (const w of l.split(" ")) words[w] = { c: (words[w]?.c || 0) + 1 };
const S = { born: now - 9*DAY, words, defs: {}, forcePhase: 3, mem: { corpus, studia: [{ k: "argomento", x: "geometria", t: now }, { k: "link", x: "https://esempio.it/vulcani", t: now }], scoperte: [] }, diary: [], diaryUnread: 0,
  energy: { sleepStart: now - 5*60e3, sleepUntil: now + 30*60e3, need: 40000, dreamMs: 0 }, updatedAt: now - 20*60e3 };
const jobs = scegli(S, nuovoStato());
ok(jobs[0].perche === "me l'hai chiesto tu" && jobs[1].tipo === "web", "prima studia quello che gli chiedi tu");
ok(jobs.some(j => j.q === "mare" || j.q === "calcio") && jobs.some(j => j.tipo === "parola") && jobs.some(j => j.tipo === "materia") && jobs.some(j => j.tipo === "classico"), "poi i tuoi argomenti, le parole, una materia, un classico");

// --- una notte di studio
const r = await studia({ fetch: fintoFetch, S, stato: null, budgetMs: 20000, maxPagine: 8, pausa: 0 });
ok(r.letture.length >= 15, `ha letto ${r.letture.length} frasi`);
const arg = r.scoperte.map(s => s.argomento);
ok(arg.includes("Geometria") && r.scoperte.every(s => s.fonte && s.x), "scoperte con la fonte: " + arg.join(", "));
ok(r.scoperte.some(s => /Etna/.test(s.x) && s.fonte === "esempio.it"), "studia anche i tuoi link");
ok(r.fatte.filter(f => f.fatto).length === 2, "segna come fatte le tue richieste");
ok(r.letture.some(x => /pezzo di legno/.test(x)), "legge un classico (Pinocchio, capitolo I)");
const MM = r.stato.materie.matematica; ok(MM && MM.fonte === "wikibooks" && MM.capitoli[1].endsWith("Capitolo 1") && MM.capitoli[2].endsWith("Capitolo 2") && MM.i === 1, "trova un manuale di matematica (Wikibooks) e mette i capitoli in ordine");
ok(!arg.includes("Matematica per le superiori"), "l'indice di un manuale non è una scoperta");
ok(chiamate.every(u => !/wikipedia|wiktionary|wikibooks|wikisource|wikiversity/.test(u) || /origin=\*/.test(u)), "chiamate API corrette");
ok(r.stato.coda.some(c => c.t === "Oceano"), "si segna i collegamenti per le notti dopo");
const r2 = await studia({ fetch: fintoFetch, S: { ...S, mem: { ...S.mem, studia: [] } }, stato: r.stato, budgetMs: 20000, pausa: 0 });
ok(r2.fatte.some(f => f.tipo === "pagina" && f.titolo === "Spiaggia del mare") && !r2.fatte.some(f => f.q === "mare"), "la notte dopo non ristudia le stesse cose e segue un collegamento che tocca i tuoi argomenti");
ok(r2.letture.some(x => /numero primo/.test(x)) || r2.stato.materie.matematica, "il programma va avanti");
{ const tipi = new Set(r.gruppi.map(g => g.tipo)); ok(r.gruppi.length >= 3 && tipi.has("temi") && tipi.has("materie") && r.gruppi.every(g => g.frasi.length && g.nome), `ricorda da dove viene ogni frase (per i gusti): ${r.gruppi.map(g => g.tipo + ":" + g.nome).slice(0, 5).join(", ")}`); }
{ const st2 = { ...r.stato, coda: [...r.stato.coda, { f: "wikipedia", t: "Onde del mare", da: "Mare" }] };
  const js = scegli({ ...S, mem: { ...S.mem, studia: [], gusti: { preferiti: { temi: "Mare" } } } }, st2);
  ok(js.some(j => j.tipo === "pagina" && /mi piace «Mare»/.test(j.perche) && st2.coda.some(c => c.t === j.titolo && c.da === "Mare")), "i suoi gusti scelgono cosa leggere: segue un collegamento dell'argomento preferito"); }
const R = riassunto(r2.stato); ok(R.pagine > 5 && R.frasi > 15, `riassunto: ${R.pagine} pagine, ${R.frasi} frasi, prossima materia ${R.prossima}`);

// --- crescita: sul telefono resta piccola, sul server cresce oltre 192 neuroni e in profondità
const lett = []; for (let i=0;i<6000;i++) lett.push(`la frase numero ${["uno","due","tre","quattro","cinque"][i%5]} parla di ${["mare","calcio","scuola","geometria","storia","musica"][i%6]} e di ${["acqua","sole","libri","numeri"][i%4]}.`);
const cresci = (lim) => { const M = new Maestro(); M.init({ corpus, seed: 2, letture: lett, limiti: lim }); for (let i=0;i<14;i++){ M.stall = 3; M.best = -Infinity; M.valuta(true); } return M.net; };
const tel = cresci(TELEFONO), srv = cresci(SERVER);
ok(tel.H <= 192 && tel.L === 1, `telefono: ${tel.H} neuroni, ${tel.L} strato`);
ok(srv.H > 192 && srv.L > 1 && srv.D > 40, `server: ${srv.H} neuroni, ${srv.L} strati, parole da ${srv.D} dimensioni, ${srv.params} parametri`);
const pk = impacchetta({ a: "x".repeat(9e6) }, { at: 1 }); ok(pk.meta.parts === 2 && spacchetta(JSON.parse(JSON.stringify(pk))).a.length === 9e6, "rete grande: viaggia in pezzi");

// --- il server: studia, sogna, racconta
const M0 = new Maestro(); M0.init({ corpus, seed: 3 }); for (let i=0;i<4;i++) M0.impara(300);
const db = { stati: { AAAABBBBCCCCDDDD: S }, nets: { AAAABBBBCCCCDDDD: impacchetta(M0.save(), { at: 1, steps: M0.net.steps, by: "tel" }) }, studio: {} };
const ad = { stati: async () => db.stati, rete: async id => db.nets[id], studio: async id => db.studio[id], salvaStudio: async (id, d) => { db.studio[id] = d; }, salvaRete: async (id, n) => { db.nets[id] = n; },
  aggiorna: async (id, patch) => { for (const [k, v] of Object.entries(patch)){ const p = k.split("/"); let o = db.stati[id]; while (p.length > 1) o = o[p.shift()]; o[p[0]] = v; } } };
const fatti = await sognaTutti(ad, { budgetMs: 40000, perMs: 8000, studioMs: 15000, fetch: fintoFetch, log: () => {} });
const S2 = db.stati.AAAABBBBCCCCDDDD;
ok(fatti.length === 1 && S2.mem.scoperte.length >= 3 && S2.mem.scoperte.every(s => s.detta === 0), `lascia ${S2.mem.scoperte.length} scoperte da raccontare`);
ok(S2.mem.studia.every(q => q.fatto), "le tue richieste risultano fatte");
ok(S2.mem.studio && S2.mem.studio.pagine > 0, "lascia il riassunto dello studio nello stato");
const N = spacchetta(db.nets.AAAABBBBCCCCDDDD), M2 = new Maestro(); M2.init({ saved: N, corpus });
ok(db.nets.AAAABBBBCCCCDDDD.meta.by === "srv" && M2.lessico().length > 10, `il telefono riceve la rete con ${M2.lessico().length} parole studiate (es. ${M2.lessico().slice(0, 5).join(", ")})`);
ok(JSON.parse(db.studio.AAAABBBBCCCCDDDD.letture).length === fatti[0].letture, "tiene le letture per le notti dopo");
{ const G = S2.mem.gusti; ok(G && G.preferiti && G.preferiti.temi && Object.values(G.temi).every(o => Number.isFinite(o.p) && Number.isFinite(o.s)), `nascono i suoi gusti: argomento preferito «${G && G.preferiti && G.preferiti.temi}» tra ${G ? Object.keys(G.temi).length : 0}`);
  ok(Object.keys(G.temi).every(k => !/[.#$/\[\]]/.test(k)), "nomi adatti a Firebase (niente . # $ / [ ])"); }
// --- pulizia: link di Google, richieste vaghe, spazzatura, Wikisource senza estratto
{ const { spazzatura, lettore, VAGHE } = await import("../nucleo/studio.js");
  ok(spazzatura("Prima di continuare su Google utilizziamo cookie e dati.") && !spazzatura("Il mare è una grande distesa di acqua salata."), "riconosce il testo di servizio delle pagine web");
  const g = lettore(async () => ({ ok: true, url: "https://www.google.com/search?q=x", headers: { get: () => "text/html" }, text: async () => "<p>Prima di continuare su Google</p>" }));
  let err = null; try { await g.web("https://share.google/abc"); } catch (e){ err = e.message; } ok(/Google/.test(err || ""), "non studia le pagine di Google: " + err);
  ok(scegli({ ...S, mem: { ...S.mem, studia: [{ k: "argomento", x: "qualcosa" }] } }, nuovoStato()).every(j => j.q !== "qualcosa"), "ignora «studia qualcosa»");
  ok(scegli({ ...S, name: "Agony", words: { ...S.words, agony: { c: 9 } } }, nuovoStato()).every(j => j.q !== "agony"), "non cerca il suo nome sul dizionario");
  const ws = lettore(async u => { const q = Object.fromEntries(new URL(u).searchParams);
    if (q.action === "parse") return { ok: true, json: async () => ({ parse: { text: "<div><p>C'era una volta un pezzo di legno che parlava come un bambino vero.</p><p>Maestro Ciliegia lo trovò nella sua bottega una mattina.</p></div>", links: [] } }) };
    return { ok: true, json: async () => ({ query: { pages: [{ title: "Pinocchio/Capitolo I", extract: "" }] } }) }; });
  const pg = await ws.pagina("wikisource", "Pinocchio/Capitolo I"); ok(pg && frasi(pg.testo).length === 2, "Wikisource: legge il capitolo anche senza estratto"); }

// --- educazione con Wikipedia e argomenti veri
{ const { lettore } = await import("../nucleo/studio.js");
  let n = 0; const L = lettore(async () => { n++; return n < 3 ? { ok: false, status: 429, headers: { get: () => null } } : { ok: true, json: async () => ({ query: { search: [{ title: "Vulcano" }] } }) }; }, { pausa: 0, attesa: async () => {} });
  const t = await L.cerca("wikipedia", "vulcani"); ok(t[0] === "Vulcano" && n === 3, "se Wikipedia dice «troppe richieste» aspetta e riprova");
  const jobs = scegli({ ...S, words: { studia: { c: 20 }, bravissimo: { c: 15 }, vulcani: { c: 3 } } }, nuovoStato());
  ok(!jobs.some(j => j.q === "studia" || j.q === "bravissimo") && jobs.some(j => j.q === "vulcani"), "argomenti veri, non «studia» o «bravissimo»"); }
