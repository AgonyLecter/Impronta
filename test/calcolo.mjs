/* calcolo: i conti detti in italiano, con le precedenze giuste; e cosa NON è un conto */
import { calcola, numeroDaParole, inParole } from "../nucleo/calcolo.js";
let fail = 0; const ok = (c, m) => { console.log((c ? "ok   " : "NO   ") + m); if (!c) fail++; };
const v = t => { const r = calcola(t); return r ? r.valore : undefined; };
const casi = [
  ["quanto fa tre più quattro per due?", 11], ["quanto fa 12 per 7", 84], ["il 20% di 50", 10], ["radice quadrata di 81", 9],
  ["quanto fa 2 alla decima", 1024], ["la metà di 37", 18.5], ["7,5 diviso 3", 2.5], ["3+4*2", 11], ["quanto fa (3+4)*2", 14],
  ["quanto fa ventitré più centoventi", 143], ["calcola 1.250 per 4", 5000], ["quanto fa 2 al cubo", 8], ["quanto è il 15 per cento di 200", 30],
  ["quanto fa duemilaventisei meno 1990", 36], ["12 x 7", 84], ["quanto fa meno 5 più 2", -3], ["quanto fa due alla terza", 8], ["quanto fa 2^3^2", 512],
  ["quanto fa 10 - 4 - 3", 3], ["quanto fa 100 / 10 / 2", 5], ["il doppio di 21", 42]
];
for (const [t, atteso] of casi){ const r = v(t); ok(r != null && Math.abs(r - atteso) < 1e-9, `«${t}» → ${r} (atteso ${atteso})`); }
const z = calcola("quanto fa 10 diviso 0"); ok(z && /zero/.test(z.x) && z.valore === null, "dividere per zero: «" + (z && z.x) + "»");
for (const t of ["quanto fa 5?", "ho 3 gatti e 2 cani", "oggi ho fatto 3 più cose", "quanto è alta la torre di pisa?", "quanto fa freddo oggi", "come stai?", "ti voglio bene"]) ok(calcola(t) === null, `non è un conto: «${t}»`);
ok(calcola("quanto fa 12 per 7").x === "fa 84 (ottantaquattro)" && calcola("quanto fa 12 per 7").conto === "12 × 7 = 84", "risponde con il numero, a parole, e mostra il conto");
ok(numeroDaParole("centoventitré") === 123 && numeroDaParole("duemilaventisei") === 2026 && numeroDaParole("trentotto") === 38 && numeroDaParole("un milione") === null, "numeri in lettere");
ok(inParole(2026) === "duemilaventisei" && inParole(128) === "centoventotto" && inParole(21) === "ventuno" && inParole(108) === "centotto", "numeri a parole");
console.log(fail ? `${fail} errori` : "tutto ok"); process.exit(fail ? 1 : 0);
