/* impronta · sogni e studio sul server
   Ogni ora GitHub Actions esegue questo script per i compagni che dormono (o che si sono addormentati
   senza finire di sognare):
     1. STUDIA (dalla fase "frase"): Wikipedia, Wikizionario, Wikibooks, Wikiversità, Wikisource, i tuoi link
     2. SOGNA: allena la rete con lo stesso codice di nucleo/, sulle tue frasi e sulle letture;
        qui la rete può crescere molto più che sul telefono (più neuroni, più strati)
     3. lascia le scoperte da raccontarti e un sogno nel diario
   Dati su Firebase RTDB:
     impronta/<ID>        stato dell'app (leggiamo; aggiorniamo solo pochi campi con update)
     impronta_nets/<ID>   { meta: { at, steps, H, L, by, parts }, net: "<json>" | parts: { 0: "…", 1: "…" } }
     impronta_study/<ID>  { stato: "<json>", letture: "<json>" }   (solo il server lo usa)
   Tutto come stringhe JSON: Firebase toglie array vuoti e null e rinumera gli array. */
import { Maestro, SERVER } from "../nucleo/maestro.js";
import { AFFETTI } from "../nucleo/rete.js";
import { studia, riassunto, spazzatura } from "../nucleo/studio.js";
import { impacchetta, spacchetta } from "../nucleo/pacco.js";
import { Traduttore, valuta, somiglianza } from "../nucleo/traduttore.js";
import { NEED, STOP, DAY, START } from "../brain.js";

const arr = v => Array.isArray(v) ? v : v ? Object.values(v) : [];
const strSeed = s => { let h = 2166136261; for (const c of s){ h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const COMPRESS = 6;          // come il recupero sul telefono: il tempo di sogno sul server vale 6 volte
const ACTIVE = 3*60e3;       // se il telefono ha salvato da poco è aperto: allena lui, non noi
const MAXL = 20000;          // frasi studiate tenute per allenarsi (le più recenti)
const parse = (s, d) => { try { return typeof s === "string" ? JSON.parse(s) : s ?? d; } catch (e){ return d; } };

export function fase(S, now){
  let k = 0; for (const w in S.words || {}) if (!STOP.has(w) && w.length > 2) k++;
  const d = S.born ? Math.floor((now - S.born)/DAY) : 0; let p = 0;
  for (let i=1;i<5;i++) if (k >= NEED[i][0] && d >= NEED[i][1]) p = i;
  return Math.max(p, START, S.forcePhase || 0);
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
const vettore = (v, d) => AFFETTI.map((_, i) => { const x = v && v[i]; return x !== null && x !== undefined && Number.isFinite(+x) ? +x : d; });
const labelsDi = S => arr(S.mem && S.mem.labels).filter(l => l && l.x).map(l => ({ ...l, l: vettore(l.l, 0), m: vettore(l.m, 0) }));

/* un campione casuale (senza ripetizioni) */
function campione(xs, n, r = Math.random){ if (xs.length <= n) return xs.slice(); const out = [], vist = new Set(); while (out.length < n){ const i = Math.floor(r()*xs.length); if (!vist.has(i)){ vist.add(i); out.push(xs[i]); } } return out; }

/* il cuore, indipendente da Firebase:
   adapter = { stati(), rete(id), aggiorna(id, patch), salvaRete(id, nodo), studio?(id), salvaStudio?(id, dati) }
   fetch = per studiare (null = niente studio)
   tatoeba = coppie [inglese, italiano] di Tatoeba (frasi naturali per parlare meglio + per imparare a tradurre)
   traduciLibero = traduttore libero già allenato (Argos), async frasi → frasi | null */
export async function sognaTutti(ad, { budgetMs = 8*60e3, perMs = 75e3, studioMs = 45e3, tradMs = 20e3, fetch = null, tatoeba = null, traduciLibero = null, now = Date.now, log = console.log } = {}){
  const t0 = now(), stati = await ad.stati() || {}, fatti = [];
  const coda = Object.entries(stati).filter(([id, S]) => id.length === 16 && deveSognare(S, now()))
    .sort((a, b) => (b[1].energy.need - (b[1].energy.dreamMs||0)) - (a[1].energy.need - (a[1].energy.dreamMs||0)));
  log(`compagni: ${Object.keys(stati).length} · da far sognare: ${coda.length}`);
  for (const [id, S] of coda){
    let resta = budgetMs - (now() - t0); if (resta < 5000) { log("tempo finito, gli altri al prossimo giro"); break; }
    const R = await ad.rete(id);
    let saved = null; try { saved = spacchetta(R); } catch (e){ log(`${id.slice(0,4)}…: rete illeggibile`); continue; }
    if (!saved){ log(`${id.slice(0,4)}…: nessuna rete caricata dal telefono, salto`); continue; }
    const E = S.energy, p = fase(S, now()), tag = id.slice(0,4) + "…";

    // 0) il suo traduttore (impara da Tatoeba); e la traduzione da usare stanotte:
    //    quella libera se c'è, altrimenti la sua quando è abbastanza brava
    const prev = p >= 3 && ad.studio ? ((await ad.studio(id)) || {}) : {};
    let T = null; try { const tsv = spacchetta(prev.trad); if (tsv) T = Traduttore.load(tsv); } catch (e){ log(`${tag}: traduttore illeggibile, ne nasce uno nuovo`); }
    if (!T && tatoeba && tatoeba.length){ T = new Traduttore({ D: 64, H: 128, seed: strSeed(id) }); T.vocabolario(campione(tatoeba, 40000), 6000); }
    const prova = tatoeba ? tatoeba.filter((_, i) => i % 997 === 0).slice(0, 40) : [];
    const suo = () => T && T.hist.length && T.hist[T.hist.length-1].nostro >= .6;
    const traduci = async xs => {
      let out = null; if (traduciLibero){ try { out = await traduciLibero(xs); } catch (e){ out = null; } }
      if (!out || out.every(x => !x)) out = suo() ? xs.map(x => T.traduci(x)) : xs.map(() => null);
      return out;
    };
    const puoTradurre = !!traduciLibero || suo();

    // 1) studio
    let letture = [], st = null, scoperte = [], fatte = [], notizie = [], citazioni = [];
    if (p >= 3 && ad.studio){
      letture = arr(parse(prev.letture, [])).filter(x => typeof x === "string" && !spazzatura(x));   // pulisce anche le letture vecchie
      if (fetch){
        log(`${tag}: studia`);
        const r = await studia({ fetch, S, stato: parse(prev.stato, null), budgetMs: Math.min(studioMs, resta/3), ora: now, log, traduci: puoTradurre ? traduci : null });
        st = r.stato; scoperte = r.scoperte; fatte = r.fatte; notizie = r.notizie || []; citazioni = r.citazioni || [];
        letture = [...letture, ...r.letture]; if (letture.length > MAXL) letture = letture.slice(-MAXL);
      }
    }
    // frasi naturali di Tatoeba per stanotte (non si accumulano: ogni notte altre)
    const naturali = tatoeba ? campione(tatoeba, 1500).map(c => c[1]) : [];
    resta = budgetMs - (now() - t0);

    // 2) sogno: allenamento
    const debito = Math.max(0, (E.need || 30000) - (E.dreamMs || 0));
    const ms = Math.max(2000, Math.min(perMs, resta - 3000, letture.length ? perMs : Math.max(8000, debito / COMPRESS)));
    const M = new Maestro(), c = arr(S.mem && S.mem.corpus).filter(l => !/\b(https?|www)\b/.test(l));
    M.init({ saved, corpus: c, labels: labelsDi(S), seed: strSeed(id), letture: [...letture, ...naturali], limiti: SERVER });
    const s0 = M.net.steps, h0 = M.net.H, l0 = M.net.L, ta = now(); let r = null, loss0 = null;
    while (now() - ta < ms){ r = M.impara(Math.min(1500, ms - (now() - ta) + 1)); if (loss0 == null && r.loss != null) loss0 = r.loss; }
    const fatto = now() - ta, info = M.info(), at = now();
    if (!(r && Number.isFinite(r.loss))){ log(`${tag}: l'allenamento è andato storto (perdita non valida), non salvo`); continue; }
    const patch = {
      "energy/dreamMs": (E.dreamMs || 0) + fatto * COMPRESS,
      "energy/srv": { t: at, steps: info.steps - s0, loss: +r.loss.toFixed(3), H: info.H, L: info.L, params: info.params, studiate: info.studiate },
      updatedAt: at
    };
    // 3) cosa raccontare: scoperte, richieste esaudite, a che punto è lo studio, un sogno
    const vecchie = arr(S.mem && S.mem.scoperte), pulite = vecchie.filter(x => x && !spazzatura(x.x || "") && !/google/.test(x.fonte || ""));
    const gia = new Set(pulite.map(x => String(x.argomento).toLowerCase())), nuove = scoperte.filter(x => !gia.has(String(x.argomento).toLowerCase()));   // già letta dal telefono: niente doppioni
    if (nuove.length || pulite.length !== vecchie.length) patch["mem/scoperte"] = [...pulite, ...nuove.map(x => ({ ...x, detta: 0 }))].slice(-60);
    if (fatte.some(f => f.fatto)){
      const ok = new Set(fatte.filter(f => f.fatto).map(f => f.richiesta));
      patch["mem/studia"] = arr(S.mem && S.mem.studia).map(q => ok.has(q.x) ? { ...q, fatto: at } : q);
    }
    if (st) patch["mem/studio"] = riassunto(st, at);
    if (notizie.length){ const vecchie = arr(S.mem && S.mem.notizie), tit = new Set(vecchie.map(n => n.titolo)); patch["mem/notizie"] = [...vecchie, ...notizie.filter(n => !tit.has(n.titolo)).map(n => ({ ...n, detta: 0 }))].slice(-20); }
    if (citazioni.length) patch["mem/citazioni"] = [...arr(S.mem && S.mem.citazioni), ...citazioni].slice(-20);
    // 4) il suo traduttore si allena e si misura, accanto a quello libero
    if (T && tatoeba && tatoeba.length){
      const tr = T.allena(campione(tatoeba.filter((_, i) => i % 997 !== 0), 20000), Math.min(tradMs, Math.max(2000, budgetMs - (now() - t0) - 4000)));
      const nostro = valuta(T, prova);
      let libero = null, es = prova[0] ? { en: prova[0][0], umano: prova[0][1], nostro: T.traduci(prova[0][0]) } : null;
      if (traduciLibero && prova.length){ try { const lt = await traduciLibero(prova.map(c => c[0])); if (lt && lt.some(Boolean)){ libero = prova.reduce((s, c, i) => s + somiglianza(lt[i] || "", c[1]), 0)/prova.length; if (es) es.libero = lt[0]; } } catch (e){} }
      T.hist.push({ t: at, nostro: +nostro.toFixed(3), libero: libero != null ? +libero.toFixed(3) : null, passi: T.steps }); if (T.hist.length > 60) T.hist.shift();
      patch["mem/traduttore"] = { t: at, nostro: +nostro.toFixed(3), libero: libero != null ? +libero.toFixed(3) : null, passi: T.steps, parametri: T.params, esempio: es, storia: T.hist.slice(-20).map(h => h.nostro) };
      log(`${tag}: traduttore suo · ${tr ? tr.lotti*8 : 0} coppie · parole giuste ${Math.round(nostro*100)}%${libero != null ? ` (quello libero ${Math.round(libero*100)}%)` : ""}${es ? ` · «${es.en}» → «${es.nostro}»` : ""}`);
    }
    if (ad.salvaStudio && (st || T)) await ad.salvaStudio(id, { stato: JSON.stringify(st || parse(prev.stato, null) || {}), letture: JSON.stringify(letture), ...(T ? { trad: impacchetta(T.save(), { at, passi: T.steps }) } : {}) });
    let sogno = null;
    if (p >= 3 && !E.dreamt){
      // con poche frasi e tanto allenamento la rete le ripete a memoria: allora sogna "più caldo"
      for (const temp of [.8, 1.1, 1.4]){ sogno = (M.parla({ seeds: [], n: 40, temp })[0] || {}).x || null; if (sogno) break; }
      if (sogno){
        const diary = arr(S.diary); diary.push({ t: at, x: `ho sognato: «${sogno}»`, srv: 1 });
        patch.diary = diary.slice(-40); patch.diaryUnread = (S.diaryUnread || 0) + 1; patch["energy/dreamt"] = 1;
      }
    }
    await ad.salvaRete(id, impacchetta(M.save(true), { at, steps: info.steps, H: info.H, L: info.L, params: info.params, by: "srv" }));
    await ad.aggiorna(id, patch);
    const riga = { id, ms: fatto, steps: info.steps - s0, H: info.H, L: info.L, crescita: info.H > h0 || info.L > l0 ? `${h0}×${l0} → ${info.H}×${info.L}` : null,
      loss: [loss0, r.loss], sogno, letture: letture.length, scoperte: scoperte.map(s => s.argomento) };
    fatti.push(riga);
    log(`${tag}: sogno ${(fatto/1000).toFixed(0)} s · +${riga.steps} passi · neuroni ${info.H} · strati ${info.L} · ${info.params} parametri${riga.crescita ? " (cresciuto " + riga.crescita + ")" : ""} · confusione ${loss0?.toFixed(2)} → ${r.loss.toFixed(2)} · letture ${letture.length}${sogno ? ` · «${sogno}»` : ""}`);
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
      salvaRete(id, nodo){ return db.ref("impronta_nets/" + id).set(nodo); },
      async studio(id){ return (await db.ref("impronta_study/" + id).get()).val(); },
      salvaStudio(id, dati){ return db.ref("impronta_study/" + id).set(dati); }
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
  // Tatoeba: coppie inglese→italiano (file scaricato dal workflow, se c'è)
  let tatoeba = null;
  try { const fs = await import("fs"), f = process.env.TATOEBA;
    if (f && fs.existsSync(f)){ tatoeba = fs.readFileSync(f, "utf8").split("\n").map(r => r.split("\t")).filter(c => c.length >= 2 && c[0] && c[1] && c[1].split(" ").length <= 14).map(c => [c[0].trim(), c[1].trim()]); console.log(`Tatoeba: ${tatoeba.length} coppie`); }
    else console.log("Tatoeba: file assente, salto"); } catch (e){ console.log("Tatoeba:", e.message); }
  // traduttore libero (Argos, in Python): se manca, risponde null e il server usa il suo o salta l'inglese
  const { execFileSync } = await import("child_process");
  const traduciLibero = async xs => { try { const out = execFileSync("python3", [new URL("./traduci.py", import.meta.url).pathname], { input: JSON.stringify(xs), maxBuffer: 64e6, timeout: 240000, stdio: ["pipe", "pipe", "ignore"] }); return JSON.parse(String(out)); } catch (e){ return null; } };
  const libero = (await traduciLibero(["The sea is blue."]))?.[0]; console.log("traduttore libero:", libero ? `pronto («The sea is blue.» → «${libero}»)` : "non disponibile");
  try { await sognaTutti(adapter, { budgetMs: +(process.env.BUDGET_MS || 9*60e3), fetch: globalThis.fetch, tatoeba, traduciLibero: libero ? traduciLibero : null }); }
  finally { await chiudi(); }
  process.exit(0);
}
