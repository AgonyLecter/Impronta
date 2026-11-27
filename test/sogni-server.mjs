/* sogni sul server con un Firebase finto in memoria (quello vero non è raggiungibile da qui) */
import { Maestro } from "../nucleo/maestro.js";
import { sognaTutti, deveSognare } from "../tools/sogna.mjs";
const ok = (c, m) => { console.log((c ? "ok   " : "NO   ") + m); if (!c) process.exitCode = 1; };
const DAY = 86400e3, now = Date.now();
const corpus = ["oggi sono stanco ma felice","ho mangiato la pizza con mia mamma","domani ho la verifica di storia","mi piace il calcio e la musica","il mare è bello d estate","voglio andare al mare con i miei amici","la scuola è noiosa ma ci sono i miei amici","oggi ho giocato a calcio con mio fratello","mia mamma fa la pizza più buona","sono felice quando vado al mare","stasera guardo la partita di calcio","il mio cane si chiama rex"];
const words = {}; for (const l of corpus) for (const w of l.split(" ")) words[w] = { c: 3 };
// la rete come la carica il telefono
const M = new Maestro(); M.init({ corpus, seed: 1 }); for (let i=0;i<6;i++) M.impara(300);
const net0 = JSON.stringify(M.save()), steps0 = M.net.steps;
const stato = (energy, extra = {}) => ({ born: now - 8*DAY, words, forcePhase: 3, mem: { corpus, labels: { 0: { x: corpus[0], l: { 0: 1 }, m: [1,1,1,1,1,1,1,1], w: 1 } } }, diary: { 0: { t: 1, x: "vecchio" } }, diaryUnread: 0, energy, updatedAt: now - 30*60e3, ...extra });
const db = {
  impronta: {
    AAAAAAAAAAAAAAA1: stato({ sleepStart: now - 10*60e3, sleepUntil: now + 20*60e3, need: 30000, dreamMs: 0 }),      // dorme
    AAAAAAAAAAAAAAA2: stato({ sleepStart: now - 90*60e3, sleepUntil: now - 30*60e3, need: 60000, dreamMs: 1000 }),   // ha dormito senza finire
    AAAAAAAAAAAAAAA3: stato({ sleepUntil: 0, used: 3 }),                                                            // sveglio
    AAAAAAAAAAAAAAA4: stato({ sleepStart: now - 60e3, sleepUntil: now + 20*60e3, need: 30000 }, { updatedAt: now - 30e3 }), // app aperta
    AAAAAAAAAAAAAAA5: stato({ sleepStart: now - 60e3, sleepUntil: now + 20*60e3, need: 30000 })                    // nessuna rete caricata
  },
  impronta_nets: {}
};
for (const id of ["AAAAAAAAAAAAAAA1","AAAAAAAAAAAAAAA2","AAAAAAAAAAAAAAA3","AAAAAAAAAAAAAAA4"]) db.impronta_nets[id] = { meta: { at: now - 3600e3, steps: steps0, by: "tel" }, net: net0 };
const scritti = [];
const ad = {
  stati: async () => db.impronta,
  rete: async id => db.impronta_nets[id] ?? null,
  aggiorna: async (id, patch) => { scritti.push(id); const S = db.impronta[id]; for (const [k, v] of Object.entries(patch)){ const p = k.split("/"); let o = S; while (p.length > 1) o = o[p.shift()]; o[p[0]] = v; } },
  salvaRete: async (id, d) => { db.impronta_nets[id] = JSON.parse(JSON.stringify(d)); }
};
ok(deveSognare(db.impronta.AAAAAAAAAAAAAAA1, now) && deveSognare(db.impronta.AAAAAAAAAAAAAAA2, now), "sceglie chi dorme e chi ha sogni arretrati");
ok(!deveSognare(db.impronta.AAAAAAAAAAAAAAA3, now) && !deveSognare(db.impronta.AAAAAAAAAAAAAAA4, now), "lascia stare chi è sveglio e chi ha l'app aperta");
const fatti = await sognaTutti(ad, { budgetMs: 20000, perMs: 6000, log: () => {} });
ok(fatti.length === 2 && !scritti.includes("AAAAAAAAAAAAAAA5"), "salta chi non ha caricato la rete");
const S1 = db.impronta.AAAAAAAAAAAAAAA1, N1 = db.impronta_nets.AAAAAAAAAAAAAAA1;
ok(N1.meta.by === "srv" && N1.meta.steps > steps0, `la rete si è allenata (+${N1.meta.steps - steps0} passi)`);
ok(S1.energy.dreamMs >= 6000*6*.9 && S1.energy.srv && S1.energy.srv.steps > 0, "aggiorna i sogni fatti (tempo compresso)");
ok(S1.updatedAt > now - 1000, "segna l'aggiornamento così il telefono ricarica");
ok(S1.energy.sleepUntil === now + 20*60e3 && S1.mem.corpus === corpus && S1.words === words, "non tocca il resto dello stato");
const d = S1.diary;
ok(Array.isArray(d) && d.length === 2 && d[0].x === "vecchio" && (!d[1] || d[1].srv === 1), "diario: tiene il vecchio" + (d[1] ? ` e aggiunge «${d[1].x}»` : ""));
// la rete salvata si ricarica identica sul telefono
const R = JSON.parse(N1.net), M2 = new Maestro(); M2.init({ saved: R, corpus, seed: 1 });
ok(M2.net.steps === N1.meta.steps && M2.net.H === N1.meta.H, "il telefono la ricarica (passi e neuroni coincidono)");
const a = M2.senti("sono felice al mare");
ok(a && typeof a._top === "string", "e la usa per sentire: " + a._top);
// un secondo giro non riscrive il sogno nel diario
db.impronta.AAAAAAAAAAAAAAA1.updatedAt = now - 30*60e3;
await sognaTutti(ad, { budgetMs: 8000, perMs: 3000, log: () => {} });
ok(db.impronta.AAAAAAAAAAAAAAA1.diary.length === d.length, "un sogno nel diario per ogni sonno");
