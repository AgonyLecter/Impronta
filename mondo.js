/* impronta · mondo
   Quello che sa del mondo fuori, dal telefono, senza chiavi e senza IA esterne:
   - meteo (Open-Meteo) e luoghi (OpenStreetMap / Nominatim, geocodifica di Open-Meteo)
   - fatti certi (Wikidata): abitanti, capitali, date di nascita, autori, altezze…
   - parole (WordNet italiano): sinonimi, "è un tipo di"; parole inglesi → italiano
   - notizie, citazioni e feed arrivano dal server dei sogni (mem.notizie, mem.citazioni, mem.feed)
   intento() riconosce la domanda; le altre funzioni rispondono sempre in italiano. */
import { lettore, frasiDaFatti } from "./nucleo/studio.js";

const pulito = s => String(s || "").replace(/[?!.]+$/g, "").replace(/^(il|lo|la|i|gli|le|l'|un|una|uno)\s+/i, "").replace(/^l'/i, "").trim();
const ART = "(?:il |lo |la |i |gli |le |l'|del |dello |della |dei |degli |delle |di |d'|a |ad |in |al |alla |allo |ai |agli |alle )?";

/* ---------- che cosa mi stai chiedendo? ---------- */
export function intento(testo){
  const low = String(testo || "").toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, " ").trim();
  let m;
  // meteo
  if ((m = low.match(/^(?:che |com'è il |come è il )?(?:tempo|meteo)(?: fa| c'è| ci sarà| farà)?(?: (oggi|domani|stasera|adesso|ora))?(?: (?:a|ad|in|da) ([a-zà-ù' ]{2,40}))?(?: (oggi|domani))?\??$/)) || (m = low.match(/^(?:che tempo|com'è il tempo|come è il tempo|che tempo farà|che tempo fa)\b(?: (oggi|domani|adesso))?(?: (?:a|ad|in) ([a-zà-ù' ]{2,40}))?/)))
    return { tipo: "meteo", quando: (m[1] || m[3] || "oggi").replace(/adesso|ora|stasera/, "oggi"), luogo: m[2] ? pulito(m[2]) : null };
  if ((m = low.match(/^(?:domani )?(piove|pioverà|nevica|nevicherà|fa freddo|fa caldo|c'è il sole|ci sarà il sole)(?: domani)?(?: (?:a|ad|in) ([a-zà-ù' ]{2,40}))?\??$/)))
    return { tipo: "meteo", quando: /domani|pioverà|nevicherà|ci sarà/.test(low) ? "domani" : "oggi", luogo: m[2] ? pulito(m[2]) : null };
  if (/^(?:dove sono|dove mi trovo|sai dove sono)\??$/.test(low)) return { tipo: "qui" };
  // luoghi
  if ((m = low.match(/^(?:dove si trova|dov'è|dove è|dove sta|dove si trovano|dove sono) ([a-zà-ù0-9' ]{2,50})\??$/))) return { tipo: "dove", q: pulito(m[1]) };
  if ((m = low.match(/^quanto (?:è lontan[ao]|dista) ([a-zà-ù' ]{2,40}?)(?: da qui| da me)?\??$/))) return { tipo: "dove", q: pulito(m[1]) };
  // fatti certi (Wikidata)
  const F = [
    [/^quanti abitanti (?:ha|ci sono a|ci sono in|conta) (.+)$/, "P1082"], [/^qual è la capitale (?:del |della |dello |dei |degli |delle |di |dell')?(.+)$/, "P36"],
    [/^(?:quando|in che anno|che giorno) è nat[oa] (.+)$/, "P569"], [/^dove è nat[oa] (.+)$/, "P19"], [/^(?:quando|in che anno) è mort[oa] (.+)$/, "P570"],
    [/^quanto è alt[oa] (?:il |la |lo |l')?(.+)$/, "P2044"], [/^chi ha scritto (.+)$/, "P50"], [/^chi ha (?:inventato|scoperto) (.+)$/, "P61"],
    [/^(?:quando|in che anno) è stat[oa] fondat[oa] (.+)$/, "P571"], [/^che lingua si parla (?:in |a |nel |nella )?(.+)$/, "P37"], [/^qual è la (?:moneta|valuta) (?:del |della |di |dell')?(.+)$/, "P38"],
    [/^quanto è grande (.+)$/, "P2046"], [/^che lavoro fa(?:ceva)? (.+)$/, "P106"]
  ];
  for (const [re, P] of F) if ((m = low.replace(/\?$/, "").match(re))) return { tipo: "fatto", P, q: pulito(m[1]) };
  // parole
  if ((m = low.match(/^(?:dammi (?:un |dei |qualche )?)?sinonim[oi] (?:di |per )?([a-zà-ù']{2,30})\??$/)) || (m = low.match(/^(?:un )?altro modo per dire ([a-zà-ù']{2,30})\??$/))) return { tipo: "sinonimi", q: m[1] };
  if ((m = low.match(/^(?:che (?:cosa|tipo di cosa) è|cosa è|cos'è) (?:un |una |uno |un')?([a-zà-ù']{2,30}) per te\??$/))) return { tipo: "parola", q: m[1] };
  if ((m = low.match(/^(?:come si dice|cosa vuol dire|che significa|cosa significa|traduci) [«"']?([a-z' ]{2,40}?)[»"']?( in italiano)?\??$/)) && (m[2] || /^(traduci|come si dice)/.test(low) || /th|w|k|y|sh|ing\b|tion\b|ness\b|ee|oo/.test(m[1])))
    return { tipo: "inglese", q: m[1].trim() };
  // dal server: notizie, citazioni, feed
  if (/^(?:che |quali )?(?:notizie|novità)(?: ci sono| hai| oggi)?\??$|^cosa (?:è successo|succede) (?:oggi|nel mondo)\??$|^hai letto (?:qualche notizia|le notizie)\??$/.test(low)) return { tipo: "notizie" };
  if ((m = low.match(/^(?:dimmi|dammi|hai) (?:una |qualche )?(?:citazione|frase famosa)(?: sull'| sulla| sullo| sugli| sulle| sul| sui| su| della| dello| delle| degli| del| dei| di)? ?([a-zà-ù' ]{0,40})\??$/))) return { tipo: "citazione", q: pulito(m[1]) || null };
  if ((m = String(testo).match(/^(?:segui|leggi ogni giorno|iscriviti a)\s+(https?:\/\/\S+)/i))) return { tipo: "segui", url: m[1] };
  return null;
}

/* ---------- meteo ---------- */
const CODICI = { 0: "cielo sereno", 1: "quasi sereno", 2: "poco nuvoloso", 3: "nuvoloso", 45: "nebbia", 48: "nebbia gelata", 51: "pioggerella", 53: "pioggerella", 55: "pioggerella fitta", 56: "pioggerella gelata", 57: "pioggerella gelata",
  61: "pioggia debole", 63: "pioggia", 65: "pioggia forte", 66: "pioggia gelata", 67: "pioggia gelata", 71: "neve debole", 73: "neve", 75: "neve forte", 77: "nevischio", 80: "rovesci", 81: "rovesci", 82: "rovesci forti",
  85: "rovesci di neve", 86: "rovesci di neve", 95: "temporale", 96: "temporale con grandine", 99: "temporale con grandine" };
export const descrivi = c => CODICI[c] || "tempo variabile";
export async function geocodifica(fetch, nome){
  const j = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nome)}&count=1&language=it&format=json`)).json();
  const r = j && j.results && j.results[0]; return r ? { lat: r.latitude, lon: r.longitude, nome: r.name, zona: [r.admin1, r.country].filter(Boolean).join(", ") } : null;
}
export async function meteo(fetch, { lat, lon }){
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=2`;
  const j = await (await fetch(u)).json();
  const c = j.current || {}, d = j.daily || {};
  return { ora: { t: Math.round(c.temperature_2m), cielo: descrivi(c.weather_code), vento: Math.round(c.wind_speed_10m || 0), codice: c.weather_code },
    giorni: (d.time || []).map((_, i) => ({ min: Math.round(d.temperature_2m_min[i]), max: Math.round(d.temperature_2m_max[i]), cielo: descrivi(d.weather_code[i]), pioggia: d.precipitation_probability_max ? d.precipitation_probability_max[i] : null, codice: d.weather_code[i] })) };
}
export function fraseMeteo(M, nome, quando = "oggi"){
  const dove = nome ? `a ${nome}` : "da te";
  if (quando === "domani" && M.giorni[1]){ const g = M.giorni[1]; return `domani ${dove}: ${g.cielo}, tra ${g.min} e ${g.max} gradi${g.pioggia != null ? `, pioggia al ${g.pioggia}%` : ""}`; }
  const g = M.giorni[0], o = M.ora;
  let x = `${dove} ora ci sono ${o.t} gradi, ${o.cielo}`;
  if (g) x += `. oggi tra ${g.min} e ${g.max}${g.pioggia >= 40 ? `, pioggia al ${g.pioggia}%` : ""}`;
  if (o.vento >= 30) x += `. c'è vento forte`;
  return x;
}
/* un consiglio da amico, se il tempo lo merita */
export function consiglio(M){
  const o = M.ora, g = M.giorni[0] || {};
  if ([95, 96, 99].includes(o.codice)) return "c'è un temporale. resta dentro";
  if (o.codice >= 61 && o.codice <= 82 || g.pioggia >= 70) return "prendi l'ombrello";
  if (o.codice >= 71 && o.codice <= 86) return "nevica! copriti bene";
  if (o.t <= 3) return "fa freddo, copriti";
  if (o.t >= 32) return "fa caldissimo. bevi tanta acqua";
  return null;
}

/* ---------- luoghi ---------- */
export async function luogo(fetch, q){
  const j = await (await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&accept-language=it&limit=1&addressdetails=1`)).json();
  const r = j && j[0]; if (!r) return null;
  const a = r.address || {}, nome = r.name || q;
  const parti = [a.city || a.town || a.village, a.state, a.country].filter(x => x && x !== nome);
  return { nome, lat: +r.lat, lon: +r.lon, dove: [...new Set(parti)].join(", "), tipo: r.type };
}
export async function doveSono(fetch, lat, lon){
  const j = await (await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&accept-language=it&zoom=10`)).json();
  const a = (j && j.address) || {}; return a.city || a.town || a.village || a.municipality || a.county || null;
}
export function distanza(a, b){ const R = 6371, r = x => x*Math.PI/180, dl = r(b.lat - a.lat), dn = r(b.lon - a.lon);
  const h = Math.sin(dl/2)**2 + Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dn/2)**2; return 2*R*Math.asin(Math.sqrt(h)); }

/* ---------- fatti certi (Wikidata, passando dalla voce di Wikipedia) ---------- */
export async function fatto(fetch, P, q){
  const L = lettore((u, o) => fetch(u, { signal: o && o.signal }), { pausa: 100, timeout: 12000 });
  const [t] = await L.cerca("wikipedia", q, 1); if (!t) return null;
  const F = await L.fatti(t); if (!F) return null;
  const alt = P === "P2044" ? ["P2044", "P2048"] : [P];
  const f = F.fatti.find(x => alt.includes(x.P)); if (!f) return { titolo: t, manca: true, descrizione: F.descrizione };
  const fr = frasiDaFatti(F.nome || t, { fatti: [f] })[0];
  return { titolo: t, x: fr ? fr.charAt(0).toLowerCase() + fr.slice(1).replace(/\.$/, "") : `${f.k}: ${f.v}`, descrizione: F.descrizione };
}

/* ---------- parole (WordNet) ---------- */
const cache = {};
async function dati(fetch, nome){ if (!cache[nome]) cache[nome] = fetch(`dati/${nome}.json`).then(r => r.json()).catch(() => ({})); return cache[nome]; }
export async function parola(fetch, w){ const d = await dati(fetch, "parole-it"), x = d[String(w).toLowerCase()]; return x ? { sinonimi: x[0] || [], tipo: x[1] || [], def: x[2] || null } : null; }
export async function daInglese(fetch, frase){
  const d = await dati(fetch, "en-it"), ws = String(frase).toLowerCase().match(/[a-z]+/g) || [];
  return ws.map(w => ({ en: w, it: d[w] || (w.endsWith("s") && d[w.slice(0, -1)]) || null }));
}
