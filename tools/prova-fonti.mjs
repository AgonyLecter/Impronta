/* impronta · prova delle fonti dal vivo (si lancia a mano dal workflow sogni con «prova_fonti»)
   Non tocca nessun compagno: chiede a ogni fonte vera un esempio e scrive nel registro cosa è arrivato.
   Serve a vedere dal vivo ciò che nell'ambiente di sviluppo è bloccato. */
import { execFileSync } from "child_process";
import { lettore, frasi, FEED, inglese, frasiDaFatti, dizionario } from "../nucleo/studio.js";

const L = lettore(globalThis.fetch, { pausa: 400 });
let ok = 0, no = 0;
const prova = async (nome, fn) => {
  const t0 = Date.now();
  try { const r = await fn(); console.log(`ok   ${nome.padEnd(22)} ${((Date.now()-t0)/1000).toFixed(1)} s · ${r}`); ok++; }
  catch (e){ console.log(`NO   ${nome.padEnd(22)} ${((Date.now()-t0)/1000).toFixed(1)} s · ${e.message}`); no++; }
};
const corto = (s, n = 110) => { s = String(s).replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
const traduci = xs => { try { return JSON.parse(String(execFileSync("python3", [new URL("./traduci.py", import.meta.url).pathname], { input: JSON.stringify(xs), timeout: 240000, stdio: ["pipe", "pipe", "ignore"] }))); } catch (e){ return null; } };

// i giornali che legge di notte
const CANDIDATI = FEED;
for (const f of CANDIDATI) await prova(`notizie ${f.nome}`, async () => {
  const it = await L.rss(f.url); if (!it.length) throw new Error("feed vuoto");
  return `${it.length} notizie · «${corto(it[0].titolo, 80)}» · ${frasi(`${it[0].titolo}. ${it[0].testo}`, 6).length} frasi`;
});
await prova("Wikipedia", async () => { const [t] = await L.cerca("wikipedia", "vulcano", 1); const p = await L.pagina("wikipedia", t); return `«${p.titolo}» · ${frasi(p.testo).length} frasi · ${(p.link || []).length} collegamenti`; });
await prova("Wikidata", async () => { const F = await L.fatti("Roma"); if (!F || !F.fatti.length) throw new Error("nessun fatto"); return `${F.fatti.length} fatti · ${F.fatti.slice(0, 3).map(x => x.k + ": " + x.v).join(" · ")} · «${corto(frasiDaFatti("Roma", F)[0] || "", 60)}»`; });
await prova("Wikiquote", async () => { const c = await L.citazioni("amicizia"); if (!c.length) throw new Error("nessuna citazione"); return `${c.length} citazioni · «${corto(c[0].x, 70)}» ${c[0].autore ? "— " + c[0].autore : ""}`; });
await prova("Wikizionario", async () => { const [t] = await L.cerca("wikizionario", "malinconia", 1); const p = await L.pagina("wikizionario", t); const fr = dizionario(p.testo, p.titolo); if (!fr.length) throw new Error("nessuna definizione"); return `«${p.titolo}» · ${fr.length} frasi · «${corto(fr[0], 70)}»`; });
const conta = async fn => { const c0 = { ...L.conti }, r = await fn(); return `${r} · ${L.conti.richieste - c0.richieste} richieste, ${L.conti.attese - c0.attese} attese «troppe richieste» (${((L.conti.msAttesa - c0.msAttesa)/1000).toFixed(0)} s)`; };
await prova("Wikibooks", () => conta(async () => { const [r] = await L.cerca("wikibooks", "matematica", 1); const cap = await L.sottopagine("wikibooks", r.split("/")[0]); return `manuale «${r.split("/")[0]}» · ${cap.length} capitoli`; }));
await prova("Wikisource", async () => { const [r] = await L.cerca("wikisource", "Le avventure di Pinocchio", 1); const cap = await L.sottopagine("wikisource", r.split("/")[0]); return `«${r.split("/")[0]}» · ${cap.length} capitoli`; });
// Gutenberg: Gutendex (403) e il sito ufficiale (503) rifiutano i server cloud; i libri arrivano da Wikisource
await prova("Wikipedia inglese", async () => {
  const [t] = await L.cerca("inglese", "volcano", 1); const p = await L.pagina("inglese", t);
  const en = frasi(p.testo, 4); if (!inglese(p.testo)) throw new Error("non riconosciuto come inglese");
  const it = traduci(en); if (!it || !it.some(Boolean)) return `«${p.titolo}» letto, ma il traduttore libero non ha risposto`;
  return `«${p.titolo}» · «${corto(en[0], 60)}» → «${corto(it[0], 70)}»`;
});
console.log(`fonti: ${ok} ok · ${no} no`);
