# Piano: allenare la rete mentre l'app è chiusa (GitHub Actions, gratis)

**Stato**: IMPLEMENTATO (codice, workflow e test). Per attivarlo servono i 4 passi dell'utente in fondo
(chiave di servizio, secret, regole, prima prova). Differenze dal piano iniziale:
- `impronta_nets/<ID>/net` è una **stringa JSON** (non un oggetto): Firebase toglie array vuoti/null e
  rinumera gli array, così la rete torna identica.
- il server salta chi ha `updatedAt` negli ultimi 3 minuti (app aperta: allena il telefono).
- il telefono importa solo reti con `meta.by === "srv"`; `S.netUp` = passi già caricati (non ricarica se uguali).
- se la rete ripete a memoria le frasi, il sogno del diario si cerca con temperatura più alta (`parla(..., temp)`).
- Node 22 nel workflow (gli import ESM di `nucleo/*.js` senza package.json lo richiedono).

## Perché
Un telefono sospende tutto il JavaScript quando l'app è chiusa o lo schermo è spento: la rete non
può allenarsi lì. Soluzione: un workflow programmato di GitHub Actions allena su un server i compagni
che dormono, con lo **stesso codice** di `nucleo/` (gira già in Node, vedi `test/maestro.mjs`).

## Flusso
1. **Il telefono, quando si addormenta** (`sleepNow` in app.js) e quando l'app va in background mentre
   dorme, carica la rete su Firebase: `impronta_nets/<ID>` = `{ meta: { at, steps, H }, net: <Maestro.save()> }`.
2. **Ogni ora** il workflow `.github/workflows/sogni.yml` esegue `node tools/sogna.mjs`:
   - legge `impronta/` (stati) e sceglie i compagni che dormono (`energy.sleepUntil > ora`) oppure
     hanno dormito ma `energy.dreamMs < energy.need`;
   - salta quelli senza `impronta_nets/<ID>` (il telefono non ha mai caricato la rete);
   - per ciascuno: `new Maestro().init({ saved: net, corpus: S.mem.corpus, labels: S.mem.labels, seed })`,
     poi `impara(ms)` in un ciclo per al massimo ~60-90 s (budget totale del job ~8 min);
   - se `phase >= 3`: `parla([], 30)[0]` → aggiunge al diario `{ t, x: "ho sognato: «…»", srv: 1 }` e `diaryUnread++`;
   - aggiorna con `update()` (NON `set()` dell'intero stato) solo: `energy/dreamMs` (+ms allenati × 6, come il
     recupero), `energy/dreamt`, `energy/srv = { t, steps, loss, H }`, `diary`, `diaryUnread`, `updatedAt`;
   - scrive `impronta_nets/<ID>` con la rete allenata e `meta.at = Date.now()`.
3. **Al ritorno** (accoglienza e avvio, dopo `initFB`), il telefono legge `impronta_nets/<ID>/meta`;
   se `meta.at > S.netSync` e `meta.steps > nucleo.info.steps`, scarica `net` e la importa
   (nuovo metodo `Nucleo.importa(saved)` = `call("init", { saved, corpus, labels, seed })` + `salva()`),
   imposta `S.netSync = meta.at` e mostra un hint tipo "ha sognato mentre l'app era chiusa · +N frasi".
   Il resto dello stato arriva già con la logica esistente (si ricarica se `updatedAt` remoto è più nuovo).

## File da creare/modificare
- `tools/package.json` → dipendenza `firebase-admin` (versione esatta, es. `12.7.0`), `"type": "module"`.
- `tools/sogna.mjs` → separare la logica in `sognaTutti(adapter, { budgetMs, now })` con un adapter
  `{ stati(), rete(id), aggiorna(id, patch), salvaRete(id, dati) }`. Il `main` crea l'adapter con
  firebase-admin (`credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))`,
  `databaseURL` = `https://easygo-f5046-default-rtdb.europe-west1.firebasedatabase.app`).
  Se il secret manca: messaggio chiaro ed exit 0.
- `test/sogni-server.mjs` → test con adapter in memoria (Firebase non è raggiungibile dall'ambiente cloud).
- `.github/workflows/sogni.yml`:
  ```yaml
  name: sogni
  on:
    schedule: [{ cron: "23 * * * *" }]
    workflow_dispatch: {}
  permissions: { contents: read }
  concurrency: { group: sogni, cancel-in-progress: false }
  jobs:
    sogna:
      runs-on: ubuntu-latest
      timeout-minutes: 15
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: 20 }
        - run: npm install --prefix tools --no-audit --no-fund
        - run: node tools/sogna.mjs
          env:
            FIREBASE_SERVICE_ACCOUNT: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
  ```
- `nucleo/index.js` → `esporta()` (= `call("save")`) e `importa(saved)`.
- `app.js` → `syncNetUp()` in `sleepNow` e su `visibilitychange` nascosto se dorme; `syncNetDown()` in
  `welcome` e all'avvio. Aggiungere `netSync` allo stato.

## Attenzioni
- Firebase RTDB elimina array/oggetti vuoti e `null`: `Rete.load`/`Maestro.init` già tollerano `growth`/`hist` mancanti.
- La rete pesa da qualche centinaio di KB ad alcuni MB (base64): va bene per il piano gratuito (1 GB),
  ma caricarla solo quando dorme, non a ogni messaggio.
- Conflitti: vince la rete con più `steps`; il server allena solo chi dorme, quindi il telefono di solito non sta allenando.
- Minuti di Actions: repo pubblico = illimitati; privato = 2000/mese. Con un job orario che esce subito se
  nessuno dorme si resta sotto ~1000 min/mese.
- Lo stato usa `Date.now()` reale sul server; ignora `devOffset` del laboratorio.

## Cosa deve fare l'utente (guidarlo passo passo)
1. Console Firebase → ⚙️ Impostazioni progetto → **Account di servizio** → **Genera nuova chiave privata** (scarica un JSON).
2. GitHub → repository → **Settings → Secrets and variables → Actions → New repository secret**:
   nome `FIREBASE_SERVICE_ACCOUNT`, valore = tutto il contenuto del JSON.
3. Regole Realtime Database: oltre a `impronta`, aggiungere
   ```json
   "impronta_nets": { "$id": { ".read": "$id.length === 16", ".write": "$id.length === 16" } }
   ```
   (l'Admin SDK del workflow ignora le regole; servono al telefono).
4. GitHub → **Actions → sogni → Run workflow** per la prima prova (i workflow programmati partono solo da `main`).
5. **Sveglia esterna ogni ora** (il `cron` di GitHub salta quasi tutti i giri: in 4 ore ne è partito uno).
   - GitHub → foto profilo → **Settings → Developer settings → Personal access tokens → Fine-grained tokens →
     Generate new token**. Nome `impronta-sveglia`, scadenza la più lunga consentita,
     **Repository access: Only select repositories → Impronta**, **Permissions → Repository → Actions: Read and write**
     (nient'altro). Copiare il token (`github_pat_…`): si vede una volta sola. Non scriverlo in chat né nel codice.
   - [cron-job.org](https://cron-job.org) (gratis) → **Create cronjob**:
     URL `https://api.github.com/repos/AgonyLecter/Impronta/actions/workflows/sogni.yml/dispatches`,
     orario **ogni ora al minuto 53** (Custom: minuti `53`, ogni ora/giorno/mese).
     Scheda **Advanced**: metodo **POST**; intestazioni
     `Authorization: Bearer github_pat_…`, `Accept: application/vnd.github+json`,
     `X-GitHub-Api-Version: 2022-11-28`, `User-Agent: impronta-sveglia`; corpo `{"ref":"main"}`.
   - **Test run**: deve rispondere **204** e su GitHub compare un giro `sogni` con evento `workflow_dispatch`.
     401 = token sbagliato o scaduto; 403/404 = permesso Actions mancante o repository non selezionato.
   - Il `cron` di GitHub resta come riserva al minuto 23; se partono entrambi, il secondo trova poco da fare
     (la coda `concurrency` evita giri sovrapposti).
   - Alla scadenza del token: generarne uno nuovo e sostituirlo nell'intestazione su cron-job.org.
