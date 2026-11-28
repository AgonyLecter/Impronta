/* nucleo · calcolo
   La rete non sa fare i conti (nessuna rete piccola li sa fare davvero): questo modulo sì, scritto a mano.
   Capisce i conti detti in italiano — «quanto fa tre più quattro per due», «il 20% di 50», «radice quadrata di 81»,
   «2 alla decima», «la metà di 37», «7,5 diviso 3» — con un parser a discesa ricorsiva e le precedenze giuste.
   calcola(testo) → { x, valore, conto } oppure null (non è un conto). */

/* ---------- numeri scritti in lettere (fino ai miliardi) ---------- */
const UNITA = { zero:0, un:1, uno:1, una:1, due:2, tre:3, "tré":3, quattro:4, cinque:5, sei:6, sette:7, otto:8, nove:9, dieci:10, undici:11, dodici:12,
  tredici:13, quattordici:14, quindici:15, sedici:16, diciassette:17, diciotto:18, diciannove:19 };
const DECINE = { venti:20, vent:20, trenta:30, trent:30, quaranta:40, quarant:40, cinquanta:50, cinquant:50, sessanta:60, sessant:60, settanta:70, settant:70, ottanta:80, ottant:80, novanta:90, novant:90 };
function sotto1000(s){
  if (!s) return 0;
  let m;
  if ((m = s.match(/^(.*?)cento(.*)$/))) { const c = m[1] ? sotto100(m[1]) : 1; if (c == null) return null; const r = sotto100(m[2]); return r == null ? null : c*100 + r; }
  return sotto100(s);
}
function sotto100(s){
  if (!s) return 0;
  if (s in UNITA) return UNITA[s];
  for (const [k, v] of Object.entries(DECINE)) if (s.startsWith(k)){ const r = s.slice(k.length); if (!r) return v; if (r === "a") return v; const u = UNITA[r] ?? UNITA[r.replace(/^[aeo]/, "")]; return u != null && u < 10 ? v + u : null; }
  return null;
}
export function numeroDaParole(w){
  const s = String(w).toLowerCase().replace(/[’']/g, "").replace(/é/g, "é").trim();
  if (!s || !/^[a-zàèéìòù]+$/.test(s)) return null;
  let m;
  if ((m = s.match(/^(.*?)(miliardi|miliardo)(.*)$/))){ const a = m[1] ? numeroDaParole(m[1]) : 1, b = m[3] ? numeroDaParole(m[3]) : 0; return a == null || b == null ? null : a*1e9 + b; }
  if ((m = s.match(/^(.*?)(milioni|milione)(.*)$/))){ const a = m[1] ? numeroDaParole(m[1]) : 1, b = m[3] ? numeroDaParole(m[3]) : 0; return a == null || b == null ? null : a*1e6 + b; }
  if ((m = s.match(/^(.*?)(mila|mille)(.*)$/))){ const a = m[2] === "mille" && !m[1] ? 1 : m[1] ? sotto1000(m[1]) : null, b = m[3] ? sotto1000(m[3]) : 0; return a == null || b == null ? null : a*1000 + b; }
  return sotto1000(s);
}
/* e al contrario, per dire il risultato a parole */
const U2 = ["zero","uno","due","tre","quattro","cinque","sei","sette","otto","nove","dieci","undici","dodici","tredici","quattordici","quindici","sedici","diciassette","diciotto","diciannove"];
const D2 = ["","","venti","trenta","quaranta","cinquanta","sessanta","settanta","ottanta","novanta"];
function parole100(n){ if (n < 20) return U2[n]; const d = D2[Math.floor(n/10)], u = n % 10; if (!u) return d; return (u === 1 || u === 8 ? d.slice(0, -1) : d) + (u === 3 ? "tré" : U2[u]); }
function parole1000(n){ const c = Math.floor(n/100), r = n % 100; let s = c ? (c === 1 ? "cento" : U2[c] + "cento") : ""; if (r){ const t = parole100(r); s += c && /^(otto|ottanta)/.test(t) ? t : t; s = s.replace(/centootto/, "centotto").replace(/centoottanta/, "centottanta"); } return s || "zero"; }
export function inParole(n){
  if (!Number.isInteger(n) || Math.abs(n) >= 1e9) return null;
  if (n < 0) return "meno " + inParole(-n);
  if (n < 1000) return parole1000(n);
  const mil = Math.floor(n/1e6), mi = Math.floor((n % 1e6)/1000), r = n % 1000;
  let s = "";
  if (mil) s += mil === 1 ? "un milione" : inParole(mil) + " milioni";
  if (mi) s += (s ? " " : "") + (mi === 1 ? "mille" : parole1000(mi) + "mila");
  if (r) s += (s ? (mil && !mi ? " " : "") : "") + parole1000(r);
  return s.trim();
}

/* ---------- dal testo ai simboli ---------- */
const ORDINALI = { seconda:2, secondo:2, terza:3, terzo:3, quarta:4, quinta:5, sesta:6, settima:7, ottava:8, nona:9, decima:10, centesima:100 };
// in JavaScript \b non vede le lettere accentate (più, è, metà): qui il confine di parola è scritto a mano
function simboli(t){
  let s = " " + String(t).toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, " ") + " ";
  s = s.replace(/[?!=]+/g, " ").replace(/(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))(quanto|quant'è|quanto è|quanto fa|quanto vale|calcola|calcolami|mi calcoli|mi fai|fammi|dimmi|il risultato di|fa|fanno|fa'|risultato|per favore|per piacere|scusa|ehi|allora)(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))/g, " ");
  s = s.replace(/radice quadrata di|radice quadra di|radice di/g, " √ ").replace(/radice cubica di/g, " ∛ ");
  s = s.replace(/(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))la metà di(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))|(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))metà di(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))/g, " 0.5 * ").replace(/(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))il doppio di(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))|(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))doppio di(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))/g, " 2 * ").replace(/(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))il triplo di(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))|(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))triplo di(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))/g, " 3 * ").replace(/(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))un terzo di(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))/g, " (1/3) * ").replace(/(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))un quarto di(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))/g, " 0.25 * ");
  s = s.replace(/(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))al quadrato(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))/g, " ^ 2 ").replace(/(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))al cubo(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))/g, " ^ 3 ");
  s = s.replace(/(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))(?:elevato|elevata) (?:alla|a) /g, " ^ ").replace(/(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))alla\s+([a-z]+|\d+)/g, (_, w) => ` ^ ${ORDINALI[w] ?? numeroDaParole(w) ?? w} `);
  s = s.replace(/(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))per ?cento(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))|%/g, " % ").replace(/(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))del(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))|(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))di(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))|(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))della(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))|(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))dei(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))/g, " di ");
  s = s.replace(/(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))più(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))|(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))piu(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))|\+/g, " + ").replace(/(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))meno(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))|−|–/g, " - ").replace(/(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))per(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))|(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))moltiplicato(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))|(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))moltiplicato per(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))|×|\*|(?<=\d)\s*x\s*(?=\d)|(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))x(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))/g, " * ")
       .replace(/(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))diviso(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))|(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))diviso per(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))|(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))fratto(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))|÷|:/g, " / ").replace(/(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))aperta parentesi(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))/g, " ( ").replace(/(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))chiusa parentesi(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))/g, " ) ");
  s = s.replace(/\*\s*per(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))/g, "*").replace(/\/\s*per(?:(?<![a-zà-ù'0-9])(?=[a-zà-ù'0-9])|(?<=[a-zà-ù'0-9])(?![a-zà-ù'0-9]))/g, "/");
  // numeri: 1.000.000 (migliaia), 3,5 (decimali)
  s = s.replace(/\d{1,3}(?:\.\d{3})+(?!\d)/g, m => m.replace(/\./g, "")).replace(/(\d),(\d)/g, "$1.$2");
  const out = [];
  for (const w of s.trim().split(/\s+/).filter(Boolean)){
    for (const p of w.match(/\d+(?:\.\d+)?|[-+*/^%()√∛]|[a-zàèéìòù']+/g) || []){
      if (/^\d/.test(p)) out.push({ n: +p });
      else if (/^[-+*/^%()√∛]$/.test(p)) out.push({ o: p });
      else if (p === "di") out.push({ o: "di" });
      else { const v = numeroDaParole(p); if (v != null) out.push({ n: v }); else if (!/^(e|è|il|lo|la|l'|i|gli|le|un|una|uno|che|mi|ti|a|ad|con|tanto|quanto)$/.test(p)) return null; }
    }
  }
  return out;
}

/* ---------- parser: espressione → somma; somma → prodotto (+ -) …; prodotto → potenza (* /); potenza → unario (^) ---------- */
function analizza(T){
  let i = 0; const vedi = () => T[i], prendi = () => T[i++];
  const conto = [];
  function primario(){
    const t = prendi(); if (!t) throw new Error("manca un numero");
    if (t.n != null){
      // «il 20% di 50», «20 per cento di 50»
      if (vedi() && vedi().o === "%"){ prendi(); if (vedi() && vedi().o === "di"){ prendi(); const b = unario(); return t.n/100*b; } return t.n/100; }
      return t.n;
    }
    if (t.o === "("){ const v = somma(); if (!vedi() || vedi().o !== ")") throw new Error("parentesi aperta"); prendi(); return v; }
    if (t.o === "√"){ const v = unario(); if (v < 0) throw new Error("la radice di un numero negativo non è un numero reale"); return Math.sqrt(v); }
    if (t.o === "∛"){ return Math.cbrt(unario()); }
    if (t.o === "-") return -unario();
    if (t.o === "+") return unario();
    throw new Error("non capisco «" + (t.o || t.n) + "»");
  }
  function unario(){ const b = primario(); if (vedi() && vedi().o === "^"){ prendi(); return Math.pow(b, unario()); } return b; }
  function prodotto(){
    let v = unario();
    while (vedi() && (vedi().o === "*" || vedi().o === "/" || vedi().o === "di")){ const o = prendi().o, b = unario();
      if (o === "/"){ if (b === 0) throw new Error("non si può dividere per zero"); v /= b; } else v *= b; }
    return v;
  }
  function somma(){ let v = prodotto(); while (vedi() && (vedi().o === "+" || vedi().o === "-")){ const o = prendi().o, b = prodotto(); v = o === "+" ? v + b : v - b; } return v; }
  const v = somma(); if (i < T.length) throw new Error("avanza qualcosa");
  return v;
}
const scrivi = T => T.map(t => t.n != null ? fmt(t.n) : ({ "*": "×", "/": "÷", "^": "^", di: "di" })[t.o] || t.o).join(" ").replace(/\( /g, "(").replace(/ \)/g, ")").replace(/ %/g, "%");
export function fmt(v){
  if (!Number.isFinite(v)) return String(v);
  const r = Math.round(v*1e9)/1e9;
  if (Math.abs(r) >= 1e15) return r.toExponential(4).replace(".", ",");
  return r.toLocaleString("it-IT", { maximumFractionDigits: 6 });
}

/* è un conto? quanti operatori/numeri ci sono e niente parole estranee */
export function calcola(testo){
  const low = String(testo || "").toLowerCase().trim();
  const domanda = /^(quanto (fa|è|vale|fanno)|quant'è|calcola|calcolami|mi calcoli|fammi il conto|dimmi quanto fa)\b/.test(low);
  const nudo = /^[\d\s.,+\-*/x×÷:^%()=?]+$/.test(low) && /\d\s*[-+*/x×÷:^%]\s*\d|√/.test(low);
  const parlato = /\d\s*(più|meno|per|diviso|fratto|x)\s*\d/.test(low) || /(radice|metà di|doppio di|triplo di|per ?cento|%| alla | al quadrato| al cubo|elevat)/.test(low) && /\d|uno|due|tre|quattro|cinque|sei|sette|otto|nove|dieci|cento|mille/.test(low);
  if (!domanda && !nudo && !parlato) return null;
  const T = simboli(low); if (!T || !T.length) return null;
  if (!T.some(t => t.o) && T.length === 1) return null;            // «quanto fa 5?» non è un conto
  if (!T.some(t => t.n != null)) return null;
  try {
    const v = analizza(T); if (!Number.isFinite(v)) return { x: "è un numero troppo grande anche per me", conto: scrivi(T), valore: v };
    const parole = Number.isInteger(Math.round(v*1e9)/1e9) && Math.abs(v) < 1e6 ? inParole(Math.round(v)) : null;
    return { x: `fa ${fmt(v)}${parole && Math.abs(v) > 10 ? ` (${parole})` : ""}`, conto: `${scrivi(T)} = ${fmt(v)}`, valore: v };
  } catch (e){
    if (/zero|negativo/.test(e.message)) return { x: e.message, conto: scrivi(T), valore: null };
    return domanda ? { x: "non ho capito il conto. scrivimelo con i numeri, tipo 12 × 7", conto: "", valore: null } : null;
  }
}
