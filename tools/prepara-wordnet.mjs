/* Costruisce i dizionari di impronta dal WordNet (si esegue una volta, a mano):
     node tools/prepara-wordnet.mjs <cartella>   con dentro wn-data-ita.tab (OMW/MultiWordNet, CC BY 3.0)
                                                 e wordnet/{data,index}.{noun,verb,adj,adv} (Princeton WordNet 3.0)
   Produce:
     dati/parole-it.json  parola italiana → [sinonimi, "è un tipo di", definizione]
     dati/en-it.json      parola inglese  → parole italiane (per capire le fonti in inglese) */
import fs from "fs";
const dir = process.argv[2]; if (!dir){ console.log("uso: node tools/prepara-wordnet.mjs <cartella>"); process.exit(1); }
const POS = { noun: "n", verb: "v", adj: "a", adv: "r" };
const semplice = w => /^[a-zàèéìíòóùú']{2,24}$/.test(w);
// 1. italiano: synset → lemmi, definizioni
const ita = new Map(), defs = new Map();
for (const r of fs.readFileSync(dir + "/wn-data-ita.tab", "utf8").split("\n")){
  const [id, k, v] = r.split("\t"); if (!v || r.startsWith("#")) continue;
  const syn = id.replace(/-s$/, "-a");
  if (k === "ita:lemma"){ const w = v.trim().toLowerCase().replace(/_/g, " "); if (!ita.has(syn)) ita.set(syn, []); if (!ita.get(syn).includes(w)) ita.get(syn).push(w); }
  if (k === "ita:def" && !defs.has(syn) && v.trim().length > 8) defs.set(syn, v.trim());
}
// 2. inglese: iperonimi ("è un") e ordine di frequenza dei sensi
const hyper = new Map(), enWords = new Map(), rank = new Map(), enIndex = new Map();
for (const [file, p] of Object.entries(POS)){
  for (const line of fs.readFileSync(`${dir}/wordnet/data.${file}`, "utf8").split("\n")){
    if (!line || line.startsWith(" ")) continue;
    const t = line.split(" "), off = t[0], id = `${off}-${p}`, wc = parseInt(t[3], 16), words = [];
    for (let i=0;i<wc;i++) words.push(t[4 + i*2].toLowerCase().replace(/\(.*\)$/, "").replace(/_/g, " "));
    enWords.set(id, words);
    let j = 4 + wc*2; const pc = +t[j]; j++;
    const hs = []; for (let q=0;q<pc;q++){ const sym = t[j], o = t[j+1], pp = t[j+2]; if (sym === "@" || sym === "@i") hs.push(`${o}-${pp === "s" ? "a" : pp}`); j += 4; }
    if (hs.length) hyper.set(id, hs);
  }
  for (const line of fs.readFileSync(`${dir}/wordnet/index.${file}`, "utf8").split("\n")){
    if (!line || line.startsWith(" ")) continue;
    const t = line.trim().split(" "), lemma = t[0].replace(/_/g, " "), sc = +t[2], pc = +t[3], offs = t.slice(4 + pc + 2, 4 + pc + 2 + sc).map(o => `${o}-${p}`);
    offs.forEach((id, r) => rank.set(id, Math.min(rank.get(id) ?? 99, r)));
    enIndex.set(lemma + "|" + p, offs);
  }
}
// quanto è usato ogni senso nei testi (conteggi di WordNet): il senso giusto di "pizza" è il cibo, non "noia"
const uso = new Map(), PP = { 1: "n", 2: "v", 3: "a", 4: "r", 5: "a" };
for (const line of fs.readFileSync(`${dir}/wordnet/index.sense`, "utf8").split("\n")){
  const t = line.split(" "); if (t.length < 4) continue;
  const id = `${t[1]}-${PP[t[0].split("%")[1].split(":")[0]]}`; uso.set(id, (uso.get(id) || 0) + (+t[3] || 0));
}
const bello = x => /^[a-zàèéìíòóùú' ]{2,30}$/.test(x);
// 3. parola italiana → sensi più comuni
const perParola = new Map();
for (const [syn, ws] of ita) for (const w of ws) if (semplice(w)){ if (!perParola.has(w)) perParola.set(w, []); perParola.get(w).push(syn); }
const it = Object.create(null);
for (const [w, syns] of perParola){
  const score = s => (uso.get(s) || 0) + 3 - (ita.get(s) || []).indexOf(w) - .5*(rank.get(s) ?? 5);
  const ord = syns.sort((a, b) => score(b) - score(a)).slice(0, 3);
  // "è un tipo di": risale la catena finché trova un nome italiano (al massimo 3 passi)
  const sopra = (s, n = 0) => { const out = []; for (const h of hyper.get(s) || []){ const l = (ita.get(h) || []).filter(bello)[0]; if (l) out.push(l); else if (n < 2) out.push(...sopra(h, n + 1)); } return out; };
  const sinDi = s => (ita.get(s) || []).filter(x => x !== w && semplice(x));
  const sin = (sinDi(ord[0]).length || !ord[0].endsWith("-a") ? sinDi(ord[0]) : (ord.slice(1).map(sinDi).find(x => x.length) || [])).slice(0, 6);   // solo il senso principale (gli aggettivi possono cercare oltre)
  const e = [...new Set((ord.map(s => sopra(s)).find(x => x.length) || []))].filter(x => x !== w).slice(0, 2);
  const top = ord;
  const d = top.map(s => defs.get(s)).find(Boolean);
  if (sin.length || e.length || d) it[w] = d ? [sin, e, d] : e.length ? [sin, e] : [sin];
}
// 4. inglese → italiano (i due sensi più comuni di ogni parola inglese)
const en = Object.create(null);
for (const [key, offs] of enIndex){
  const lemma = key.split("|")[0]; if (!/^[a-z]{2,20}$/.test(lemma)) continue;
  const its = [...new Set(offs.slice(0, 2).flatMap(s => (ita.get(s) || []).filter(semplice).slice(0, 2)))].slice(0, 3);
  if (its.length) en[lemma] = [...new Set([...(en[lemma] || []), ...its])].slice(0, 3);
}
fs.mkdirSync("dati", { recursive: true });
fs.writeFileSync("dati/parole-it.json", JSON.stringify(it));
fs.writeFileSync("dati/en-it.json", JSON.stringify(en));
console.log("parole italiane", Object.keys(it).length, "· inglese→italiano", Object.keys(en).length);
console.log("cane", it.cane, "· gatto", it.gatto, "· felice", it.felice, "· dog", en.dog, "· happy", en.happy, "· volcano", en.volcano);
