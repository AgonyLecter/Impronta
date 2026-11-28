/* appunti: risponde da ciò che ha letto, con la fonte; usa le parole vicine della sua rete; non inventa */
import { quaderno, cerca, domandaDiSapere, frase, radice } from "../nucleo/appunti.js";
import { Maestro } from "../nucleo/maestro.js";
let fail = 0; const ok = (c, m) => { console.log((c ? "ok   " : "NO   ") + m); if (!c) fail++; };
const mem = { scoperte: [
  { argomento: "Vulcano", x: "Un vulcano è una struttura geologica da cui fuoriesce il magma.", frasi: ["La lava è il magma che arriva in superficie.", "L'Etna è il vulcano attivo più alto d'Europa."], fonte: "Wikipedia", fatti: [{ k: "altitudine", v: "3.357 m" }] },
  { argomento: "Mare", x: "Il mare è una grande distesa di acqua salata.", frasi: ["Il mare è salato perché i fiumi portano sali minerali dalle rocce."], fonte: "Wikipedia" },
  { argomento: "Rivoluzione francese", x: "La Rivoluzione francese fu un periodo di sconvolgimento politico in Francia.", frasi: ["La presa della Bastiglia avvenne nel 1789."], fonte: "Wikipedia" },
  { argomento: "Geometria", x: "La geometria è la parte della matematica che studia le figure nello spazio.", fonte: "Wikibooks" } ],
  notizie: [{ titolo: "Morbillo, l'Italia è prima in Europa per contagi", testo: "Il virus fa ancora paura.", fonte: "Rai News" }],
  citazioni: [{ x: "All'amico si deve dire la verità.", autore: "Cicerone", argomento: "amicizia" }] };
const Q = quaderno(mem);
ok(Q.length === 11, `quaderno: scoperte, frasi studiate, fatti, notizie e citazioni (${Q.length} voci)`);
const h1 = cerca(Q, "perché il mare è salato?"); ok(h1 && /perché i fiumi/.test(h1.x), "«perché il mare è salato?» → la frase con la causa: «" + (h1 && h1.x) + "»");
const h2 = cerca(Q, "quando c'è stata la presa della bastiglia?"); ok(h2 && /1789/.test(h2.x), "«quando…?» → la frase con la data");
const h3 = cerca(Q, "cos'è la lava?"); ok(h3 && /lava è il magma/.test(h3.x) && h3.fonte === "Wikipedia", "cos'è la lava? → dalle frasi studiate, con la fonte");
const h4 = cerca(Q, "che notizie sul morbillo?"); ok(h4 && h4.tipo === "notizia" && frase(h4).startsWith("ho letto nelle notizie"), "notizie: «" + (h4 && frase(h4)) + "»");
const h5 = cerca(Q, "oggi sono andato al mare"); ok(h5 && h5.diretto && frase(h5, { spontanea: true }).startsWith("a proposito di mare: ho letto che"), "parli del mare → «" + (h5 && frase(h5, { spontanea: true })) + "»");
ok(cerca(Q, "mi piace la pizza") === null && cerca(Q, "come stai?") === null, "se non ha letto niente non inventa");
const h6 = cerca(Q, "cos'è il fuoco?", { vicine: { fuoco: [["lava", .7]] } }); ok(h6 && /lava/.test(h6.x) && h6.parole.includes("lava≈fuoco"), "con la sua rete: «fuoco» trova la lava (parole vicine di significato)");
ok(!cerca(Q, "cos'è il fuoco?", { vicine: { fuoco: [["lava", .2]] } }), "le vicine troppo lontane non contano");
ok(cerca(Q, "perché il mare è salato?", { escludi: new Set([h1.x]) }).x !== h1.x, "non ripete una frase appena detta");
ok(radice("vulcani") === radice("vulcano") && radice("geometria") === radice("geometriche") && radice("salato") === radice("salata"), "radici: vulcani ≈ vulcano, geometria ≈ geometriche");
ok(domandaDiSapere("perché il mare è salato?") && domandaDiSapere("sai cos'è un vulcano?") && !domandaDiSapere("come stai?") && !domandaDiSapere("ti piace il mare?") && !domandaDiSapere("qual è il tuo libro preferito?") && !domandaDiSapere("oggi sono stanco"), "riconosce le domande di sapere");
ok(quaderno({ scoperte: { 0: { argomento: "Mare", x: "Il mare è salato.", frasi: { 0: "Il mare è blu." } } } }).length === 2, "regge gli array che Firebase restituisce come oggetti");
// con una rete vera: le parole vicine vengono dai suoi pesi
const M = new Maestro(); M.init({ corpus: ["il vulcano sputa lava e fuoco", "la lava del vulcano è fuoco", "il fuoco brucia come la lava", "il mare è pieno di acqua", "l'acqua del mare è salata"], seed: 5 });
for (let i = 0; i < 20; i++) M.impara(400);
const nn = M.net.near("fuoco", 5, ["lava", "mare", "acqua", "vulcano", "salata"]); ok(nn.length && Number.isFinite(nn[0][1]), `la sua rete dà le vicine di «fuoco»: ${nn.map(([w, s]) => w + " " + s.toFixed(2)).join(", ")}`);
{ const Q2 = quaderno({ ...mem, defFonte: { zibaldone: "Wikizionario" } }, { zibaldone: "quaderno di appunti senza ordine" }), h = cerca(Q2, "cos'è uno zibaldone?");
  ok(h && h.tipo === "parola" && h.fonte === "Wikizionario" && frase(h) === "zibaldone vuol dire quaderno di appunti senza ordine.", "riusa le parole che ha imparato (anche cercate da solo): «" + (h && frase(h)) + "»"); }
console.log(fail ? `${fail} errori` : "tutto ok"); process.exit(fail ? 1 : 0);
