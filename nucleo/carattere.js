/* nucleo · carattere
   Dai tuoi messaggi nel tempo costruisce un'idea di chi sei:
   tratti (ispirati ai Big Five), umore per giorno, e collegamenti tra argomenti, orari e stati d'animo. */
import { valenza } from "./etichette.js";

const FASCE = [["notte",0,5],["mattina",6,11],["pomeriggio",12,17],["sera",18,23]];
const GIORNI = ["domenica","lunedì","martedì","mercoledì","giovedì","venerdì","sabato"];
const SOCIAL = /\b(amic|festa|uscit|uscire|insieme|ragazz|gente|gruppo|serata|compagni)/;
const avg = a => a.length ? a.reduce((s,x)=>s+x,0)/a.length : 0;
const clamp = (v,a=0,b=1) => Math.max(a, Math.min(b, v));

/* un ricordo d'umore per ogni messaggio */
export function registra(S, msg, a, f, t){
  const v = f ? valenza(f) : (a.s || 0)/2;
  const rec = { t, v: +v.toFixed(2), l: msg.length, q: a.q ? 1 : 0, x: msg.includes("!") ? 1 : 0, e: a.emojis.length ? 1 : 0,
    i: f ? +(f.ironia||0).toFixed(2) : (a.humor ? .5 : 0), w: a.content.slice(0, 5) };
  if (f){ rec.tr = +(f.tristezza||0).toFixed(2); rec.pa = +(f.paura||0).toFixed(2); rec.ra = +(f.rabbia||0).toFixed(2); rec.af = +(f.affetto||0).toFixed(2); }
  S.mem.mood.push(rec); if (S.mem.mood.length > 600) S.mem.mood.splice(0, S.mem.mood.length - 600);
  return rec;
}

export function analizza(S){
  const M = S.mem.mood, n = M.length;
  if (n < 5) return { n, traits: [], insights: [], days: [] };
  const conf = clamp(n/60);
  const V = M.map(r => r.v), mv = avg(V), sd = Math.sqrt(avg(V.map(v => (v-mv)**2)));
  const neg = avg(M.map(r => (r.tr||0) + (r.pa||0) + (r.ra||0)));
  const social = avg(M.map(r => (r.w||[]).some(w => SOCIAL.test(w)) ? 1 : 0));
  const words = M.flatMap(r => r.w || []), uniq = new Set(words).size;
  const traits = [
    { k:"estroversione", v: clamp(.25 + avg(M.map(r=>Math.min(r.l,80)))/160 + avg(M.map(r=>r.x))*.25 + avg(M.map(r=>r.e))*.2 + social*.6),
      why: "messaggi lunghi, punti esclamativi, emoji, parli di altre persone" },
    { k:"stabilità emotiva", v: clamp(.75 - neg*.6 - sd*.35 + mv*.15), why: "quanto il tuo umore resta calmo e sereno nel tempo" },
    { k:"calore", v: clamp(.35 + avg(M.map(r=>r.af||0))*1.2 + mv*.15), why: "affetto e gentilezza nelle tue parole" },
    { k:"apertura", v: clamp(.2 + (uniq/Math.max(1,words.length))*.6 + avg(M.map(r=>r.q))*.5), why: "varietà di parole, domande, curiosità" },
    { k:"ironia", v: clamp(avg(M.map(r=>r.i))*1.6 + .05), why: "quante volte dici una cosa intendendone un'altra" }
  ].map(t => ({ ...t, v: +t.v.toFixed(2), conf: +conf.toFixed(2) }));

  const insights = [];
  // argomenti e umore
  const byW = {};
  for (const r of M) for (const w of new Set(r.w || [])) (byW[w] ||= []).push(r.v);
  const topics = Object.entries(byW).filter(([,vs]) => vs.length >= 3).map(([w,vs]) => ({ w, d: avg(vs) - mv, n: vs.length }));
  topics.sort((a,b) => a.d - b.d);
  if (topics[0] && topics[0].d < -.25) insights.push({ k:"giu", w: topics[0].w, x:`quando parli di ${topics[0].w} sei più giù` });
  const up = topics[topics.length-1]; if (up && up.d > .25 && up !== topics[0]) insights.push({ k:"su", w: up.w, x:`quando parli di ${up.w} sei più felice` });
  // orari
  const fasce = FASCE.map(([nome,a,b]) => { const vs = M.filter(r => { const h = new Date(r.t).getHours(); return h>=a && h<=b; }).map(r=>r.v); return { nome, d: avg(vs)-mv, n: vs.length }; }).filter(f => f.n >= 4);
  fasce.sort((a,b) => a.d - b.d);
  if (fasce[0] && fasce[0].d < -.2) insights.push({ k:"ora", x:`di ${fasce[0].nome} sei più triste` });
  // giorni della settimana
  const gg = GIORNI.map((g,i) => { const vs = M.filter(r => new Date(r.t).getDay() === i).map(r=>r.v); return { g, d: avg(vs)-mv, n: vs.length }; }).filter(x => x.n >= 4);
  gg.sort((a,b) => a.d - b.d);
  if (gg[0] && gg[0].d < -.25) insights.push({ k:"giorno", x:`il ${gg[0].g} sei più giù` });
  // andamento
  const recent = M.filter(r => r.t > Date.now() - 3*864e5).map(r=>r.v), before = M.filter(r => r.t <= Date.now() - 3*864e5).map(r=>r.v);
  if (recent.length >= 4 && before.length >= 8){ const d = avg(recent) - avg(before); if (d > .25) insights.push({ k:"meglio", x:"negli ultimi giorni stai meglio" }); if (d < -.25) insights.push({ k:"peggio", x:"negli ultimi giorni sei più giù del solito" }); }

  // umore per giorno (ultimi 21)
  const days = {}; for (const r of M){ const d = new Date(r.t); const k = d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate(); (days[k] ||= { t: r.t, vs: [] }).vs.push(r.v); }
  const dl = Object.values(days).sort((a,b)=>a.t-b.t).slice(-21).map(d => ({ t: d.t, v: +avg(d.vs).toFixed(2), n: d.vs.length }));
  return { n, mv: +mv.toFixed(2), traits, insights, days: dl };
}
