/* il traduttore nostro: gradienti giusti, impara davvero su frasi semplici, si salva */
import { Traduttore, valuta, somiglianza } from "../nucleo/traduttore.js";
const ok = (c, m) => { console.log((c ? "ok   " : "NO   ") + m); if (!c) process.exitCode = 1; };
// gradienti (numerici contro backprop) su una rete piccola
{ const T = new Traduttore({ D: 6, H: 5, seed: 3 }); T.vocabolario([["the dog is happy", "il cane è felice"], ["the cat sleeps", "il gatto dorme"]]);
  for (const k of Object.keys(T.p)) if (/W|U/.test(k) && !/^Wo/.test(k)) T.p[k].d.forEach((v, i, a) => a[i] = v*3);
  const src = T.ids("the dog is happy"), tgt = T.idt("il cane è felice"), zero = () => { for (const q of Object.values(T.p)) q.g.fill(0); };
  let bad = 0, tot = 0;
  for (const k of ["eWz","eUn","ebr","dWn","dUz","dbz","Es","Et","Wo","bo"]){
    const q = T.p[k]; zero(); T.grad(src, tgt, true); const g = Array.from(q.g.subarray(0, q.size)); zero();
    for (const [, i] of g.map((v, i) => [Math.abs(v), i]).sort((a, b) => b[0] - a[0]).slice(0, 2)){
      const o = q.d[i], e = 1e-2; q.d[i] = o + e; const l1 = T.grad(src, tgt, true); zero(); q.d[i] = o - e; const l2 = T.grad(src, tgt, true); zero(); q.d[i] = o;
      const num = (l1 - l2)/(2*e), rel = Math.abs(num - g[i])/(Math.abs(num) + Math.abs(g[i]) + 1e-9); tot++; if (rel > 3e-2){ bad++; console.log("   ", k, num, g[i]); } } }
  ok(!bad, `gradienti dell'encoder e del decoder giusti (${tot - bad}/${tot})`); }
// impara: poche coppie simili, deve generalizzare un po'
const S = ["dog","cat","bird","horse"], I = { dog: "il cane", cat: "il gatto", bird: "l'uccello", horse: "il cavallo" }, A = ["happy","sad","tired","hungry"], AI = { happy: "felice", sad: "triste", tired: "stanco", hungry: "affamato" };
const coppie = []; for (const s of S) for (const a of A) coppie.push([`the ${s} is ${a}`, `${I[s]} è ${AI[a]}`]);
coppie.push(...["i love you|ti voglio bene","good morning|buongiorno","thank you|grazie","i am happy|sono felice","i am tired|sono stanco"].map(x => x.split("|")));
const prova = [["the horse is sad", "il cavallo è triste"], ["the bird is tired", "l'uccello è stanco"]];
const train = coppie.filter(c => !prova.some(p => p[0] === c[0]));
const T = new Traduttore({ D: 24, H: 48, seed: 5 }); T.vocabolario(coppie);
const prima = valuta(T, train);
const t0 = Date.now(); while (Date.now() - t0 < 12000) T.allena(train, 1000, .01);
const dopo = valuta(T, train), nuove = valuta(T, prova);
ok(dopo > .9 && dopo > prima + .5, `impara le frasi che ha visto: ${Math.round(prima*100)}% → ${Math.round(dopo*100)}%`);
ok(nuove > .6, `traduce anche frasi mai viste: «${prova[0][0]}» → «${T.traduci(prova[0][0])}» (${Math.round(nuove*100)}%)`);
ok(somiglianza("il cane è felice", "il cane è felice") === 1 && somiglianza("il gatto", "il cane è felice") > 0, "misura delle parole giuste");
const T2 = Traduttore.load(JSON.parse(JSON.stringify(T.save())));
ok(T2.traduci("the cat is hungry") === T.traduci("the cat is hungry"), "si salva e si ricarica: «" + T2.traduci("the cat is hungry") + "»");
// sul server: si allena di notte e si misura accanto al traduttore libero
{ const { sognaTutti } = await import("../tools/sogna.mjs"); const { Maestro } = await import("../nucleo/maestro.js"); const { impacchetta, spacchetta } = await import("../nucleo/pacco.js");
  const tat = []; for (let k=0;k<1000;k++) tat.push(...coppie);
  const M0 = new Maestro(); M0.init({ corpus: ["oggi sono felice al mare", "il mio cane è stanco"], seed: 2 }); M0.impara(300);
  const now = Date.now(), S = { born: now - 9*864e5, forcePhase: 3, words: {}, mem: { corpus: ["oggi sono felice al mare"] }, energy: { sleepStart: now - 6e4, sleepUntil: now + 36e5, need: 3e4, dreamMs: 0 }, updatedAt: now - 36e5 };
  const db = { s: { ABCDEFGHABCDEFGH: S }, n: { ABCDEFGHABCDEFGH: impacchetta(M0.save(), { by: "tel" }) }, st: {} };
  const ad = { stati: async () => db.s, rete: async id => db.n[id], salvaRete: async (id, x) => { db.n[id] = x; }, studio: async id => db.st[id], salvaStudio: async (id, d) => { db.st[id] = JSON.parse(JSON.stringify(d)); },
    aggiorna: async (id, patch) => { for (const [k, v] of Object.entries(patch)){ const p = k.split("/"); let o = db.s[id]; while (p.length > 1) o = o[p.shift()] ||= {}; o[p[0]] = v; } } };
  const libero = async xs => xs.map(x => x.replace("the ", "il ").replace(" is ", " è "));
  for (let notte = 0; notte < 3; notte++){ db.s.ABCDEFGHABCDEFGH.updatedAt = Date.now() - 36e5; await sognaTutti(ad, { budgetMs: 30000, perMs: 3000, tradMs: 6000, tatoeba: tat, traduciLibero: libero, log: () => {} }); }
  const tr = db.s.ABCDEFGHABCDEFGH.mem.traduttore;
  ok(tr && tr.passi > 0 && tr.libero != null && tr.storia.length === 3, `di notte il suo traduttore si allena: ${tr.passi} coppie · parole giuste ${Math.round(tr.nostro*100)}% (libero ${Math.round(tr.libero*100)}%) · «${tr.esempio.en}» → «${tr.esempio.nostro}»`);
  const T = spacchetta(db.st.ABCDEFGHABCDEFGH.trad); ok(T && T.steps === tr.passi, "il traduttore si conserva tra una notte e l'altra"); }
