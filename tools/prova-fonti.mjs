/* impronta · prova delle fonti dal vivo (si lancia a mano dal workflow sogni con «prova_fonti»)
   Non tocca nessun compagno: chiede a ogni fonte vera un esempio e scrive nel registro cosa è arrivato.
   Serve a vedere dal vivo ciò che nell'ambiente di sviluppo è bloccato. */
import { execFileSync } from "child_process";
import { lettore, frasi, FEED, inglese, frasiDaFatti } from "../nucleo/studio.js";

const L = lettore(globalThis.fetch, { pausa: 400 });
let ok = 0, no = 0;
const prova = async (nome, fn) => {
  const t0 = Date.now();
  try { const r = await fn(); console.log(`ok   ${nome.padEnd(22)} ${((Date.now()-t0)/1000).toFixed(1)} s · ${r}`); ok++; }
  catch (e){ console.log(`NO   ${nome.padEnd(22)} ${((Date.now()-t0)/1000).toFixed(1)} s · ${e.message}`); no++; }
};
const corto = (s, n = 110) => { s = String(s).replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
const traduci = xs => { try { return JSON.parse(String(execFileSync("python3", [new URL("./traduci.py", import.meta.url).pathname], { input: JSON.stringify(xs), timeout: 240000, stdio: ["pipe", "pipe", "ignore"] }))); } catch (e){ return null; } };

// giornali candidati: si tengono quelli che accettano i programmi automatici
const CANDIDATI = [...FEED,
  { nome: "Rai News", url: "https://www.rainews.it/rss/tutti" }, { nome: "Internazionale", url: "https://www.internazionale.it/sitemaps/rss.xml" },
  { nome: "AGI", url: "https://www.agi.it/cronaca/rss" }, { nome: "Wired Italia", url: "https://www.wired.it/feed/rss" },
  { nome: "Focus", url: "https://www.focus.it/rss" }, { nome: "Il Fatto Quotidiano", url: "https://www.ilfattoquotidiano.it/feed/" },
  { nome: "Repubblica", url: "https://www.repubblica.it/rss/homepage/rss2.0.xml" }, { nome: "Corriere", url: "https://xml2.corriereobjects.it/rss/homepage.xml" },
  { nome: "Il Sole 24 Ore", url: "https://www.ilsole24ore.com/rss/italia.xml" }, { nome: "Le Scienze", url: "https://www.lescienze.it/rss/all/rss2.0.xml" }];
for (const f of CANDIDATI) await prova(`notizie ${f.nome}`, async () => {
  const it = await L.rss(f.url); if (!it.length) throw new Error("feed vuoto");
  return `${it.length} notizie · «${corto(it[0].titolo, 80)}» · ${frasi(`${it[0].titolo}. ${it[0].testo}`, 6).length} frasi`;
});
await prova("Wikipedia", async () => { const [t] = await L.cerca("wikipedia", "vulcano", 1); const p = await L.pagina("wikipedia", t); return `«${p.titolo}» · ${frasi(p.testo).length} frasi · ${(p.link || []).length} collegamenti`; });
await prova("Wikidata", async () => { const F = await L.fatti("Roma"); if (!F || !F.fatti.length) throw new Error("nessun fatto"); return `${F.fatti.length} fatti · ${F.fatti.slice(0, 3).map(x => x.k + ": " + x.v).join(" · ")} · «${corto(frasiDaFatti("Roma", F)[0] || "", 60)}»`; });
await prova("Wikiquote", async () => { const c = await L.citazioni("amicizia"); if (!c.length) throw new Error("nessuna citazione"); return `${c.length} citazioni · «${corto(c[0].x, 70)}» ${c[0].autore ? "— " + c[0].autore : ""}`; });
await prova("Wikizionario", async () => { const [t] = await L.cerca("wikizionario", "malinconia", 1); const p = await L.pagina("wikizionario", t); console.log("   testo:", JSON.stringify(p.testo.slice(0, 700))); return `«${p.titolo}» · ${frasi(p.testo, 20).length} frasi`; });
const conta = async fn => { const c0 = { ...L.conti }, r = await fn(); return `${r} · ${L.conti.richieste - c0.richieste} richieste, ${L.conti.attese - c0.attese} attese «troppe richieste» (${((L.conti.msAttesa - c0.msAttesa)/1000).toFixed(0)} s)`; };
await prova("Wikibooks", () => conta(async () => { const [r] = await L.cerca("wikibooks", "matematica", 1); const cap = await L.sottopagine("wikibooks", r.split("/")[0]); return `manuale «${r.split("/")[0]}» · ${cap.length} capitoli`; }));
await prova("Wikisource", async () => { const [r] = await L.cerca("wikisource", "Le avventure di Pinocchio", 1); const cap = await L.sottopagine("wikisource", r.split("/")[0]); return `«${r.split("/")[0]}» · ${cap.length} capitoli`; });
await prova("Gutenberg (Gutendex)", async () => {
  const b = await L.gutenberg(0); if (!b) throw new Error("nessun libro");
  const t = await L.testo(b.url); return `«${corto(b.titolo, 50)}» di ${b.autore || "?"} · ${Math.round(t.length/1000)} mila caratteri · ${frasi(t.slice(5000, 35000), 250).length} frasi da un pezzo`;
});
// Gutenberg dal sito ufficiale: il catalogo OPDS (fatto per le app di lettura) e il testo del libro
let libro = null;
await prova("Gutenberg OPDS", async () => {
  const x = await (await globalThis.fetch("https://www.gutenberg.org/ebooks/search.opds/?query=l.it&sort_order=downloads", { headers: { "User-Agent": "impronta (compagno digitale; github.com/AgonyLecter/Impronta)" } }).then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r; })).text();
  const voci = [...x.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => m[1]).map(e => ({ id: (e.match(/<id>[^<]*?ebooks\/(\d+)/) || [])[1], titolo: (e.match(/<title>([^<]*)/) || [])[1], autore: (e.match(/<content[^>]*>([^<]*)/) || [])[1] })).filter(v => v.id);
  if (!voci.length) throw new Error("nessun libro nel catalogo"); libro = voci[0];
  return `${voci.length} libri · primo «${corto(libro.titolo, 40)}» (${libro.id}) ${libro.autore ? "· " + corto(libro.autore, 30) : ""}`;
});
await prova("Gutenberg testo", async () => {
  if (!libro) throw new Error("niente catalogo");
  const r = await globalThis.fetch(`https://www.gutenberg.org/ebooks/${libro.id}.txt.utf-8`, { headers: { "User-Agent": "impronta (compagno digitale; github.com/AgonyLecter/Impronta)" } }); if (!r.ok) throw new Error("HTTP " + r.status);
  const t = await r.text(); return `${Math.round(t.length/1000)} mila caratteri · ${frasi(t.slice(8000, 38000).replace(/([^\n])\n(?!\n)/g, "$1 "), 250).length} frasi da un pezzo`;
});
await prova("Wikipedia inglese", async () => {
  const [t] = await L.cerca("inglese", "volcano", 1); const p = await L.pagina("inglese", t);
  const en = frasi(p.testo, 4); if (!inglese(p.testo)) throw new Error("non riconosciuto come inglese");
  const it = traduci(en); if (!it || !it.some(Boolean)) return `«${p.titolo}» letto, ma il traduttore libero non ha risposto`;
  return `«${p.titolo}» · «${corto(en[0], 60)}» → «${corto(it[0], 70)}»`;
});
console.log(`fonti: ${ok} ok · ${no} no`);
