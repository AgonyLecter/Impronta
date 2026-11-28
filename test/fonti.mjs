/* nuove fonti (simulate): Wikidata, Wikiquote, RSS, Gutenberg, Wikipedia inglese tradotta */
import { lettore, studia, inglese, frasiDaFatti, nuovoStato, dizionario, testoDaHtml, scegli } from "../nucleo/studio.js";
const ok = (c, m) => { console.log((c ? "ok   " : "NO   ") + m); if (!c) process.exitCode = 1; };
const J = o => ({ ok: true, json: async () => o, text: async () => JSON.stringify(o), headers: { get: () => "application/json" } });
const T = (t, ct = "text/xml") => ({ ok: true, text: async () => t, json: async () => JSON.parse(t), headers: { get: () => ct } });
const ENT = { Q220: { labels: { it: { value: "Roma" } }, descriptions: { it: { value: "capitale d'Italia" } }, claims: {
  P17: [{ rank: "normal", mainsnak: { datavalue: { type: "wikibase-entityid", value: { id: "Q38" } } } }],
  P1082: [{ rank: "normal", mainsnak: { datavalue: { type: "quantity", value: { amount: "+2000000" } } } }, { rank: "preferred", mainsnak: { datavalue: { type: "quantity", value: { amount: "+2761632" } } } }],
  P571: [{ rank: "normal", mainsnak: { datavalue: { type: "time", value: { time: "-0753-04-21T00:00:00Z", precision: 11 } } } }] } },
  Q38: { labels: { it: { value: "Italia" } } } };
const RSS = `<?xml version="1.0"?><rss><channel><item><title><![CDATA[Scoperto un nuovo pianeta simile alla Terra]]></title><description><![CDATA[<p>Gli astronomi hanno trovato un pianeta roccioso a quaranta anni luce da noi.</p>]]></description><link>https://esempio.it/pianeta</link></item><item><title>Piove su tutta la Sicilia</title><description>Allerta gialla per la pioggia in tutta la regione fino a domani sera.</description><link>https://esempio.it/pioggia</link></item></channel></rss>`;
const LIBRO = "Intestazione del progetto.\n*** START OF THE PROJECT GUTENBERG EBOOK CUORE ***\nOggi primo giorno di scuola. Passarono come un sogno\nquei tre mesi di vacanza in campagna.\n\nMia madre mi condusse questa mattina alla Sezione Baretti\na farmi inscrivere per la terza elementare.\n*** END OF THE PROJECT GUTENBERG EBOOK CUORE ***\nLicenza.";
const chiamate = [];
async function finto(url){
  const u = new URL(url), q = Object.fromEntries(u.searchParams); chiamate.push(u.hostname);
  if (u.hostname === "www.wikidata.org"){ const ids = q.ids.split("|"); return J({ entities: Object.fromEntries(ids.map(i => [i, ENT[i]])) }); }
  if (u.hostname === "it.wikipedia.org"){
    if (q.list === "search") return J({ query: { search: /roma/i.test(q.srsearch) ? [{ title: "Roma" }] : [] } });
    if (q.prop === "pageprops") return J({ query: { pages: [{ title: q.titles, pageprops: q.titles === "Roma" ? { wikibase_item: "Q220" } : {} }] } });
    return J({ query: { pages: [{ title: q.titles, extract: "Roma è la capitale d'Italia e la città più popolosa del paese. Fu fondata secondo la leggenda da Romolo nel 753 avanti Cristo. Il suo centro storico è patrimonio dell'umanità.", links: [] }] } });
  }
  if (u.hostname === "en.wikipedia.org"){
    if (q.list === "search") return J({ query: { search: /quokka/i.test(q.srsearch) ? [{ title: "Quokka" }] : [] } });
    if (q.prop === "pageprops") return J({ query: { pages: [{ title: q.titles }] } });
    return J({ query: { pages: [{ title: q.titles, extract: "The quokka is a small macropod about the size of a domestic cat. It is the only member of the genus Setonix. The quokka is found on some smaller islands off the coast of Western Australia. It is known as the happiest animal in the world because of its smile.", links: [] }] } });
  }
  if (u.hostname === "it.wikiquote.org"){
    if (q.list === "search") return J({ query: { search: [{ title: "Mare" }] } });
    return J({ query: { pages: [{ title: "Mare", extract: "Citazioni sul mare.\n«Il mare è tutto azzurro. Il mare è tutto calmo.»\n«Chi ama il mare non ha paura della tempesta.»\nCitato in qualche libro.", links: [] }] } });
  }
  if (u.hostname === "gutendex.com") return J({ results: [{ id: 28243, title: "Cuore", authors: [{ name: "De Amicis, Edmondo" }], formats: { "text/plain; charset=utf-8": "https://www.gutenberg.org/cache/epub/28243/pg28243.txt" } }] });
  if (u.hostname === "www.gutenberg.org") return T(LIBRO, "text/plain");
  if (/ilpost|ansa/.test(u.hostname)) return T(RSS);
  return { ok: false, status: 404, headers: { get: () => null } };
}
const L = lettore(finto, { pausa: 0 });
const F = await L.fatti("Roma");
ok(F && F.descrizione === "capitale d'Italia", "Wikidata: descrizione");
const fx = Object.fromEntries(F.fatti.map(f => [f.k, f.v]));
ok(fx.paese === "Italia" && fx.abitanti === "2.761.632" && fx.fondazione === "21 aprile 753 a.C.", "Wikidata: fatti certi " + JSON.stringify(fx));
const ff = frasiDaFatti("Roma", F); ok(ff.includes("Roma ha 2.761.632 abitanti.") && ff.includes("Roma si trova in Italia."), "i fatti diventano frasi: " + ff.join(" "));
const cit = await L.citazioni("mare"); ok(cit.length === 2 && cit[0].x === "Il mare è tutto azzurro. Il mare è tutto calmo.", "Wikiquote: " + cit.map(c => c.x).join(" | "));
const news = await L.rss("https://www.ilpost.it/feed/"); ok(news.length === 2 && news[0].titolo.startsWith("Scoperto") && /quaranta anni luce/.test(news[0].testo) && news[0].link === "https://esempio.it/pianeta", "RSS: titoli, testo, link");
ok(inglese("The quokka is a small macropod about the size of a cat and it is found in Australia.") && !inglese("Il quokka è un piccolo marsupiale che vive in Australia ed è famoso per il sorriso."), "riconosce l'inglese");
// una notte intera, con un traduttore finto (parola per parola, solo per il test)
const DIZ = { "the quokka is a small macropod about the size of a domestic cat.": "Il quokka è un piccolo macropode grande come un gatto domestico.", "it is the only member of the genus setonix.": "È l'unico membro del genere Setonix.", "the quokka is found on some smaller islands off the coast of western australia.": "Il quokka si trova su alcune isole al largo dell'Australia occidentale.", "it is known as the happiest animal in the world because of its smile.": "È noto come l'animale più felice del mondo per il suo sorriso." };
let tradotte = 0; const traduci = async xs => xs.map(x => { tradotte++; return DIZ[x.toLowerCase()] || null; });
const S = { words: { roma: { c: 5 }, quokka: { c: 3 } }, mem: { gutenberg: true, studia: [{ k: "argomento", x: "quokka" }], feed: ["https://www.ansa.it/sito/notizie/topnews/topnews_rss.xml"] } };
let st = nuovoStato(); st.notti = 0;
const r = await studia({ fetch: finto, S, stato: st, budgetMs: 20000, pausa: 0, traduci });
const qk = r.scoperte.find(s => s.argomento === "Quokka");
ok(qk && /Il quokka è un piccolo macropode/.test(qk.x) && /inglese/.test(qk.fonte) && tradotte >= 4, "c'era solo in inglese: la traduce e la racconta in italiano · " + (qk && qk.fonte));
ok(!r.letture.some(x => inglese(x)), "nelle letture niente inglese");
const rm = r.scoperte.find(s => s.argomento === "Roma"); ok(rm && rm.fatti && rm.fatti.length === 3 && r.letture.includes("Roma ha 2.761.632 abitanti."), "per ogni argomento anche i fatti di Wikidata");
ok(r.notizie.length >= 2 && r.notizie[0].fonte, `notizie della notte: ${r.notizie.length} (${[...new Set(r.notizie.map(n => n.fonte))].join(", ")})`);
ok(r.letture.some(x => /primo giorno di scuola/.test(x)) && r.stato.gut && r.stato.gut.titolo === "Cuore" || r.letture.some(x => /Sezione Baretti/.test(x)), "legge un libro da Gutenberg (Cuore), righe ricomposte");
const r2 = await studia({ fetch: finto, S: { ...S, mem: { ...S.mem, studia: [] } }, stato: r.stato, budgetMs: 20000, pausa: 0, traduci });
const cc = [...r.citazioni, ...r2.citazioni]; ok(cc.length >= 1 && /mare/i.test(cc[0].x), "ogni tanto una citazione da Wikiquote: «" + (cc[0] || {}).x + "»");
const r3 = await studia({ fetch: finto, S, stato: nuovoStato(), budgetMs: 20000, pausa: 0 });
ok(!r3.scoperte.some(s => s.argomento === "Quokka") && !r3.letture.some(x => inglese(x)), "senza traduttore l'inglese non entra");

// Wikizionario: dalle righe di definizione a frasi vere (formato preso da una pagina vera)
{ const pg = "\nItaliano\n\n\nSostantivo\nmalinconia ( approfondimento) f sing (pl.: malinconie)\n\n(psicologia) (medicina) stato di costante malumore\n(per estensione) momento vissuto con profonda compassione per sé e per altri\n\n\nSillabazione\nma | lin | co | nì | a\n\n\nPronuncia\nAFI: /maliŋkoˈnia/\n\n\nEtimologia / Derivazione\ndal latino tardo melancholia; significa bile nera\n\n\nSinonimi\nabbattimento, avvilimento, mestizia, tristezza,\n";
  const fr = dizionario(pg, "malinconia");
  ok(fr[0] === "malinconia significa stato di costante malumore." && fr.some(f => f === "malinconia viene dal latino tardo melancholia.") && fr.some(f => /è come abbattimento, avvilimento, mestizia e tristezza\./.test(f)) && !fr.some(f => /\|/.test(f)), "Wikizionario: definizioni, etimologia e sinonimi diventano frasi: «" + fr[0] + "»"); }
ok(testoDaHtml("Il paese pi&amp;#xF9; felice") === "Il paese più felice", "titoli con entità esadecimali (&#xF9; → ù)");
ok(!scegli({ words: {}, mem: {} }, nuovoStato()).some(j => j.tipo === "gutenberg") && scegli({ words: {}, mem: { gutenberg: true } }, nuovoStato()).some(j => j.tipo === "gutenberg"), "Gutenberg spento (rifiuta i server cloud), riaccendibile con mem.gutenberg");
