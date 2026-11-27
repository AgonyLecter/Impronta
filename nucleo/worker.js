/* nucleo · worker: la rete vive in un thread separato e non rallenta mai le animazioni */
import { Maestro } from "./maestro.js";
const M = new Maestro();
export function handle(op, d){
  switch (op){
    case "init": return M.init(d);
    case "corpus": M.setCorpus(d.corpus, d.labels); return M.info();
    case "osserva": M.osserva(d); return null;
    case "impara": return M.impara(d.ms || 200);
    case "valuta": return M.valuta(false);
    case "senti": return M.senti(d.text);
    case "parla": return M.parla(d);
    case "map": return M.net.map(d.words);
    case "near": return M.net.near(d.w, d.n || 3, d.among || null);
    case "save": return M.save(!!d.half);
    case "lessico": return M.lessico();
    case "connettoma": return M.net.connettoma(d.max || 420);
    case "attiva": return M.net.attiva((d.text || "").toLowerCase().replace(/[’`]/g,"'").match(/[a-zàáèéìíòóùú]+/g) || []);
    case "info": return M.info();
  }
  throw new Error("op sconosciuta " + op);
}
if (typeof self !== "undefined" && typeof window === "undefined"){
  self.onmessage = e => { const { id, op, ...d } = e.data;
    try { self.postMessage({ id, res: handle(op, d) }); } catch (err){ self.postMessage({ id, err: String(err && err.message || err) }); } };
}
