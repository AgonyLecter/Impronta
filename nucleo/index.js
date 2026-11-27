/* nucleo · libreria di autoapprendimento per impronta
   Uso:
     const n = new Nucleo({ onCresce, onStato });
     await n.avvia({ corpus, labels, seed });   // carica o fa nascere la rete
     n.osserva(testo, etichetta);               // ogni tuo messaggio
     await n.senti(testo);                      // emozioni stimate
     await n.parla(argomenti);                  // frasi nuove con le tue parole
     await n.sogna(ms, onTick);                 // allenamento intenso (quando dorme)
     await n.esporta() / n.importa(saved, …);   // la rete come dato (sogni sul server)
   Il pilota automatico allena la rete a piccoli sorsi mentre l'app è aperta,
   salva da solo, si valuta e fa crescere i neuroni quando serve. */
import { AFFETTI } from "./rete.js";
export { AFFETTI };
export { etichetta, conferma, valenza } from "./etichette.js";
export { registra, analizza } from "./carattere.js";

const wait = ms => new Promise(r => setTimeout(r, ms));

/* deposito su IndexedDB (la rete può pesare qualche MB) con ripiego su localStorage */
const store = {
  db: null,
  open(){ if (this.db) return this.db; this.db = new Promise((res, rej) => { try { const q = indexedDB.open("impronta", 1); q.onupgradeneeded = () => q.result.createObjectStore("kv"); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); } catch (e){ rej(e); } }); return this.db; },
  async get(k){ try { const db = await this.open(); return await new Promise((res, rej) => { const r = db.transaction("kv").objectStore("kv").get(k); r.onsuccess = () => res(r.result ?? null); r.onerror = () => rej(r.error); }); } catch (e){ try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (_){ return null; } } },
  async set(k, v){ try { const db = await this.open(); await new Promise((res, rej) => { const tx = db.transaction("kv", "readwrite"); tx.objectStore("kv").put(v, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); } catch (e){ try { localStorage.setItem(k, JSON.stringify(v)); } catch (_){} } },
  async del(k){ try { const db = await this.open(); await new Promise(res => { const tx = db.transaction("kv", "readwrite"); tx.objectStore("kv").delete(k); tx.oncomplete = res; tx.onerror = res; }); } catch (e){} try { localStorage.removeItem(k); } catch (_){} }
};
export const deposito = store;

export class Nucleo {
  constructor({ key = "impronta_nucleo", onCresce = null, onStato = null } = {}){
    this.key = key; this.onCresce = onCresce; this.onStato = onStato;
    this.ready = false; this.info = null; this.w = null; this.local = null; this.seq = 0; this.pend = new Map();
    this.timer = 0; this.rounds = 0; this.paused = false; this.dreaming = false; this.lastSave = 0; this.mode = "—";
  }
  call(op, d = {}){
    if (this.local){ try { return Promise.resolve(this.local(op, d)); } catch (e){ return Promise.reject(e); } }
    if (!this.w) return Promise.reject(new Error("nucleo spento"));
    const id = ++this.seq; return new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.w.postMessage({ id, op, ...d }); });
  }
  async avvia({ corpus = [], labels = [], seed = 7 } = {}){
    const saved = await store.get(this.key);
    try {
      this.w = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
      this.w.onmessage = e => { const p = this.pend.get(e.data.id); if (!p) return; this.pend.delete(e.data.id); e.data.err ? p.rej(new Error(e.data.err)) : p.res(e.data.res); };
      this.info = await Promise.race([this.call("init", { saved, corpus, labels, seed }), wait(8000).then(() => { throw new Error("timeout"); })]);
      this.mode = "thread separato";
    } catch (e){
      try { this.w && this.w.terminate(); } catch (_){} this.w = null;
      const m = await import("./worker.js"); this.local = m.handle;
      this.info = this.local("init", { saved, corpus, labels, seed }); this.mode = "thread principale";
    }
    this.ready = true; this.emit();
    if (!saved && (corpus.length || true)){ for (let i=0;i<6;i++){ await this.impara(250); } this.salva(); } // istinto alla nascita
    this.autopilota();
    return this.info;
  }
  emit(){ if (this.onStato) try { this.onStato(this.info); } catch (_){} }
  async impara(ms = 150){
    if (!this.ready) return null;
    const r = await this.call("impara", { ms });
    this.info = { ...this.info, ...r };
    if (r && r.grew && this.onCresce) try { this.onCresce(r.grew, this.info); } catch (_){}
    this.emit(); return r;
  }
  /* pilota automatico: piccoli sorsi di allenamento quando l'app è visibile e tranquilla */
  autopilota(){
    clearInterval(this.timer);
    this.timer = setInterval(async () => {
      if (!this.ready || this.paused || this.dreaming || (typeof document !== "undefined" && document.hidden)) return;
      await this.impara(this.local ? 60 : 180);
      if (Date.now() - this.lastSave > 45000) this.salva();
    }, this.local ? 6000 : 3500);
  }
  pausa(v = true){ this.paused = v; }
  async salva(){ if (!this.ready) return; this.lastSave = Date.now(); try { await store.set(this.key, await this.call("save")); } catch (e){} }
  async osserva(text, label = null){ if (!this.ready) return; await this.call("osserva", { x: text, lab: label ? label.lab : null, mask: label ? label.mask : null, w: label ? label.w : 1 }); }
  async corpus(corpus, labels){ if (!this.ready) return; this.info = { ...this.info, ...(await this.call("corpus", { corpus, labels })) }; }
  async senti(text){ if (!this.ready) return null; try { return await this.call("senti", { text }); } catch (e){ return null; } }
  async parla(seeds = [], n = 36, temp = .8){ if (!this.ready) return []; try { return await this.call("parla", { seeds, n, temp }); } catch (e){ return []; } }
  async mappa(words){ if (!this.ready) return []; try { return await this.call("map", { words }); } catch (e){ return []; } }
  async vicine(w, among){ if (!this.ready) return []; try { return await this.call("near", { w, n: 3, among }); } catch (e){ return []; } }
  /* sogno: allenamento intenso per un tempo dato, con aggiornamenti */
  async sogna(ms = 12000, onTick = null, stop = () => false){
    if (!this.ready || this.dreaming) return null;
    this.dreaming = true; const t0 = Date.now(); let r = null;
    while (Date.now() - t0 < ms && !stop()){ r = await this.impara(this.local ? 150 : 600); if (onTick) onTick(r, this.info); await wait(this.local ? 120 : 40); }
    this.dreaming = false; await this.salva(); return r;
  }
  /* la rete come dato (per caricarla sul server che la fa sognare ad app chiusa) */
  async esporta(){ if (!this.ready) return null; return await this.call("save"); }
  /* sostituisce la rete con una allenata altrove (il server dei sogni) */
  async importa(saved, { corpus = [], labels = [], seed = 7 } = {}){
    if (!this.ready || !saved) return null;
    this.info = await this.call("init", { saved, corpus, labels, seed });
    await this.salva(); this.emit(); return this.info;
  }
  async dimentica(){ clearInterval(this.timer); await store.del(this.key); }
}
