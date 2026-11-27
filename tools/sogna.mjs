/* impronta · sogni sul server
   Ogni ora GitHub Actions esegue questo script: allena le reti dei compagni che dormono
   (o che si sono addormentati senza finire di sognare) con lo STESSO codice di nucleo/,
   così la mente cresce anche ad app chiusa. Il telefono ritrova la rete allenata al ritorno.

   Dati su Firebase RTDB:
     impronta/<ID>       stato dell'app (leggiamo; aggiorniamo solo pochi campi con update)
     impronta_nets/<ID>  { meta: { at, steps, H, by }, net: "<JSON di Maestro.save()>" }
   La rete è salvata come stringa JSON: Firebase cancella array vuoti e null e
   rinumera gli array, così invece torna identica byte per byte. */
import { Maestro } from "../nucleo/maestro.js";
import { AFFETTI } from "../nucleo/rete.js";
import { NEED, STOP, DAY } from "../brain.js";

const arr = v => Array.isArray(v) ? v : v ? Object.values(v) : [];
const strSeed = s => { let h = 2166136261; for (const c of s){ h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const COMPRESS = 6;          // come il recupero sul telefono: il tempo di sogno sul server vale 6 volte
const ACTIVE = 3*60e3;       // se il telefono ha salvato da poco è aperto: allena lui, non noi

export function fase(S, now){
  let k = 0; for (const w in S.words || {}) if (!STOP.has(w) && w.length > 2) k++;
  const d = S.born ? Math.floor((now - S.born)/DAY) : 0; let p = 0;
  for (let i=1;i<5;i++) if (k >= NEED[i][0] && d >= NEED[i][1]) p = i;
  return Math.max(p, S.forcePhase || 0);
}
/* chi deve sognare: dorme adesso, oppure si è addormentato e non ha finito i sogni */
export function deveSognare(S, now){
  const E = S && S.energy; if (!S || !S.born || !E) return false;
  if (now - Math.min(S.updatedAt || 0, now) < ACTIVE) return false;
  const dorme = (E.sleepUntil || 0) > now;
  const debito = !!E.sleepStart && (E.dreamMs || 0) < (E.need || 0);
  return dorme || debito;
}
/* Firebase restituisce gli array come oggetti {0:…,3:…}: li ricompongo lunghi quanto le emozioni */
const vettore = (v, d) => AFFETTI.map((_, i) => { const x = v && v[i]; return Number.isFinite(+x) && x !== null && x !== undefined ? +x : d; });
const labelsDi = S => arr(S.mem && S.mem.labels).filter(l => l && l.x).map(l => ({ ...l, l: vettore(l.l, 0), m: vettore(l.m, 0) }));

/* il cuore, indipendente da Firebase: adapter = { stati(), rete(id), aggiorna(id, patch), salvaRete(id, dati) } */
export async function sognaTutti(ad, { budgetMs = 8*60e3, perMs = 75e3, now = Date.now, log = console.log } = {}){
  const t0 = now(), stati = await ad.stati() || {}, fatti = [];
  const coda = Object.entries(stati).filter(([id, S]) => id.length === 16 && deveSognare(S, now()))
    .sort((a, b) => (b[1].energy.need - (b[1].energy.dreamMs||0)) - (a[1].energy.need - (a[1].energy.dreamMs||0)));
  log(`compagni: ${Object.keys(stati).length} · da far sognare: ${coda.length}`);
  for (const [id, S] of coda){
    const resta = budgetMs - (now() - t0); if (resta < 5000) { log("tempo finito, gli altri al prossimo giro"); break; }
    const R = await ad.rete(id);
    if (!R || !R.net){ log(`${id.slice(0,4)}…: nessuna rete caricata dal telefono, salto`); continue; }
    let saved; try { saved = typeof R.net === "string" ? JSON.parse(R.net) : R.net; } catch (e){ log(`${id.slice(0,4)}…: rete illeggibile`); continue; }
    const E = S.energy, debito = Math.max(0, (E.need || 30000) - (E.dreamMs || 0));
    const ms = Math.min(perMs, resta - 3000, Math.max(8000, debito / COMPRESS));
    const M = new Maestro(), c = arr(S.mem && S.mem.corpus);
    M.init({ saved, corpus: c, labels: labelsDi(S), seed: strSeed(id) });
    const s0 = M.net.steps, h0 = M.net.H, ta = now(); let r = null, loss0 = null;
    while (now() - ta < ms){ r = M.impara(Math.min(1500, ms - (now() - ta) + 1)); if (loss0 == null && r.loss != null) loss0 = r.loss; }
    const fatto = now() - ta, info = M.info(), at = now();
    if (!(r && Number.isFinite(r.loss))){ log(`${id.slice(0,4)}…: l'allenamento è andato storto (perdita non valida), non salvo`); continue; }
    const patch = {
      "energy/dreamMs": (E.dreamMs || 0) + fatto * COMPRESS,
      "energy/srv": { t: at, steps: info.steps - s0, loss: r && r.loss != null ? +r.loss.toFixed(3) : 0, H: info.H },
      updatedAt: at
    };
    let sogno = null;
    if (fase(S, at) >= 3 && !E.dreamt){
      // con poche frasi e tanto allenamento la rete le ripete a memoria: allora sogna "più caldo"
      for (const temp of [.8, 1.1, 1.4]){ sogno = (M.parla({ seeds: [], n: 40, temp })[0] || {}).x || null; if (sogno) break; }
      if (sogno){
        const diary = arr(S.diary); diary.push({ t: at, x: `ho sognato: «${sogno}»`, srv: 1 });
        patch.diary = diary.slice(-40); patch.diaryUnread = (S.diaryUnread || 0) + 1; patch["energy/dreamt"] = 1;
      }
    }
    await ad.salvaRete(id, { meta: { at, steps: info.steps, H: info.H, by: "srv" }, net: JSON.stringify(M.save()) });
    await ad.aggiorna(id, patch);
    const riga = { id, ms: fatto, steps: info.steps - s0, H: info.H, crescita: info.H > h0 ? `${h0}→${info.H}` : null, loss: [loss0, r && r.loss], sogno };
    fatti.push(riga);
    log(`${id.slice(0,4)}…: ${(fatto/1000).toFixed(0)} s · +${riga.steps} passi · neuroni ${info.H}${riga.crescita ? " (cresciuto " + riga.crescita + ")" : ""} · confusione ${loss0?.toFixed(2)} → ${r?.loss?.toFixed(2)}${sogno ? ` · «${sogno}»` : ""}`);
  }
  return fatti;
}

/* adapter Firebase (Admin SDK: ignora le regole del database) */
async function firebase(){
  const { default: admin } = await import("firebase-admin");
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    databaseURL: process.env.FIREBASE_DB_URL || "https://easygo-f5046-default-rtdb.europe-west1.firebasedatabase.app"
  });
  const db = admin.database();
  return {
    adapter: {
      async stati(){ return (await db.ref("impronta").get()).val(); },
      async rete(id){ return (await db.ref("impronta_nets/" + id).get()).val(); },
      aggiorna(id, patch){ return db.ref("impronta/" + id).update(patch); },
      salvaRete(id, dati){ return db.ref("impronta_nets/" + id).set(dati); }
    },
    chiudi: () => admin.app().delete()
  };
}

const main = import.meta.url === `file://${process.argv[1]}`;
if (main){
  if (!process.env.FIREBASE_SERVICE_ACCOUNT){
    console.log("manca il secret FIREBASE_SERVICE_ACCOUNT: niente sogni sul server (vedi docs/PIANO-SOGNI-GITHUB.md).");
    process.exit(0);
  }
  const { adapter, chiudi } = await firebase();
  try { await sognaTutti(adapter, { budgetMs: +(process.env.BUDGET_MS || 8*60e3) }); }
  finally { await chiudi(); }
  process.exit(0);
}
