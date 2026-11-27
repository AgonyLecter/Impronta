/* nucleo · pacco: la rete come testo per Firebase.
   Firebase accetta stringhe fino a 10 MB: una rete grande viaggia in più pezzi (parts/0, parts/1, …). */
const MAXS = 8e6;
const arr = v => Array.isArray(v) ? v : v ? Object.values(v) : [];
export function impacchetta(saved, meta = {}){
  const s = JSON.stringify(saved), base = { ...meta, size: s.length };
  if (s.length <= MAXS) return { meta: { ...base, parts: 0 }, net: s };
  const parts = {}; for (let i=0;i*MAXS<s.length;i++) parts[i] = s.slice(i*MAXS, (i+1)*MAXS);
  return { meta: { ...base, parts: Object.keys(parts).length }, parts };
}
export function spacchetta(nodo){
  if (!nodo) return null;
  if (typeof nodo.net === "string") return JSON.parse(nodo.net);
  if (nodo.net && typeof nodo.net === "object") return nodo.net;
  const ps = arr(nodo.parts); return ps.length ? JSON.parse(ps.join("")) : null;
}
