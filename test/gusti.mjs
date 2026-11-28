/* gusti: deterministici, dipendono dal carattere, stabili (isteresi), spiegabili, e rispondono alle domande */
import { Maestro } from "../nucleo/maestro.js";
import { misura, aggiorna, classifica, perche, rispondi, scegliParole, SOGLIA } from "../nucleo/gusti.js";

let fail = 0; const ok = (c, m) => { console.log((c ? "ok   " : "NO   ") + m); if (!c) fail++; };

const testi = {
  malinconia: ["sono solo e piango la sera", "mi manca la mia casa lontana", "la sera è triste e vuota", "ho perso tutto e sono triste", "piango perché mi manca", "mi sento solo e triste stasera"],
  allegria: ["che bello oggi sono felice", "abbiamo riso tutta la sera", "sono contento di vederti", "che bella giornata di sole", "evviva ce l'abbiamo fatta", "mi sono divertito tantissimo"],
  ironia: ["che bello un altro lunedì", "grazie eh gentilissimo", "fantastico è finito il caffè", "certo come no", "evviva un'altra riunione", "che fortuna piove proprio oggi"],
  rabbia: ["sono furioso con lui", "basta non ne posso più", "che rabbia mi hanno fregato", "odio questa situazione", "sono arrabbiatissimo", "non sopporto le bugie"]
};
const m = new Maestro(); m.init({ corpus: Object.values(testi).flat(), seed: 4 });
for (let i = 0; i < 25; i++) m.impara(500);
const net = m.net;

const misure = Object.entries(testi).map(([nome, fr]) => ({ tipo: "temi", nome, ...misura(net, fr) }));
ok(misure.every(x => Number.isFinite(x.sorpresa) && x.sente.length === 8), `misura: sorpresa e 8 emozioni per tema (${misure.map(x => x.nome + " " + x.sorpresa).join(", ")})`);
const misure2 = Object.entries(testi).map(([nome, fr]) => ({ tipo: "temi", nome, ...misura(net, fr) }));
ok(JSON.stringify(misure) === JSON.stringify(misure2), "stessi testi e stessa rete → stesse misure (niente caso)");

const malinconico = { malinconia: 1, calore: -.3, ironia: -.5, calma: .5 }, ironico = { ironia: 1, malinconia: -.8, calore: .2, calma: 0 };
const notte = (G, tr, k = 1) => { for (let i = 0; i < k; i++) G = aggiorna(G, misure, tr, 1000 + i); return G; };
const Gm = notte(null, malinconico, 3), Gi = notte(null, ironico, 3);
console.log("   malinconico:", classifica(Gm, "temi").map(x => `${x.nome} ${x.p}`).join(" · "));
console.log("   ironico:    ", classifica(Gi, "temi").map(x => `${x.nome} ${x.p}`).join(" · "));
ok(Gm.preferiti.temi !== Gi.preferiti.temi, `carattere diverso → preferito diverso (${Gm.preferiti.temi} / ${Gi.preferiti.temi})`);
const pm = classifica(Gm, "temi"), pi = classifica(Gi, "temi");
ok(pm.findIndex(x => x.nome === "malinconia") < pi.findIndex(x => x.nome === "malinconia"), "il malinconico mette i testi tristi più in alto dell'ironico");
ok(JSON.stringify(notte(null, malinconico, 3)) === JSON.stringify(Gm), "deterministico: stesse notti → stessi gusti");

// isteresi: una sola notte in cui un altro tema sembra migliore non ribalta il preferito
const fav = Gm.preferiti.temi, altro = Object.keys(Gm.temi).find(n => n !== fav);
const finta = misure.map(x => x.nome === altro ? { ...x, sente: x.sente.map((v, i) => i === 1 ? 1 : 0) } : x);   // stanotte "altro" sembra tristissimo
const G1 = aggiorna(Gm, finta, malinconico, 5000);
ok(G1.preferiti.temi === fav, `una notte sola non gli fa cambiare idea (resta ${fav}; ${altro} ${Gm.temi[altro].p} → ${G1.temi[altro].p})`);
let Gk = Gm; for (let i = 0; i < 12; i++) Gk = aggiorna(Gk, finta, malinconico, 6000 + i);
ok(Gk.preferiti.temi === altro && Gk.storia.some(s => s.nuovo === altro && s.prima === fav), `tante notti sì: cambia idea piano (${fav} → ${Gk.preferiti.temi}), e lo ricorda`);

const pq = perche(Gm.temi[fav]);
ok(/\d/.test(pq) && pq.length > 10, `il perché ha numeri veri: «${pq}»`);

// domande
const r1 = rispondi(Gm, "qual è il tuo argomento preferito?");
ok(r1 && r1.x.startsWith(fav), `«qual è il tuo argomento preferito?» → «${r1 && r1.x}»`);
const r2 = rispondi(Gm, "perché?", r1.ultimo);
ok(r2 && /^perché /.test(r2.x), `«perché?» → «${r2 && r2.x}»`);
const r3 = rispondi(Gm, "chi preferisci tra allegria e rabbia?");
ok(r3 && /^(allegria|rabbia|quasi)/.test(r3.x), `«chi preferisci tra allegria e rabbia?» → «${r3 && r3.x}» (${r3 && r3.cap})`);
const r4 = rispondi(Gm, "qual è il tuo libro preferito?");
ok(r4 && /non ho ancora un libro/.test(r4.x), `senza libri letti non inventa: «${r4 && r4.x}»`);
ok(rispondi(Gm, "qual è il mio colore preferito?") === null, "«il mio … preferito» non è una domanda sui suoi gusti");
ok(rispondi(null, "qual è il tuo libro preferito?") === null, "nessun gusto ancora → lascia rispondere al resto");

// parole: sceglie tra sinonimi che conosce, con isteresi
const P = scegliParole(net, { felice: ["felice", "contento"], arrabbiato: ["furioso", "arrabbiatissimo"] }, new Map([["felice", 3], ["contento", 1]]));
ok(P.felice && ["felice", "contento"].includes(P.felice.w), `parola sua per «felice»: ${P.felice && P.felice.w}`);
const P2 = scegliParole(net, { felice: ["felice", "contento"] }, new Map(), P);
ok(P2.felice.w === P.felice.w, "la parola scelta non cambia senza un buon motivo");
const Gp = { ...Gm, parole: P };
const r5 = rispondi(Gp, "che parola preferisci per dire felice?");
ok(r5 && r5.x.startsWith(P.felice.w), `«che parola preferisci per dire felice?» → «${r5 && r5.x}»`);

console.log(fail ? `${fail} errori` : "tutto ok"); process.exit(fail ? 1 : 0);
