# Prossimi passi (passaggio di consegne, 28 novembre 2026)

Leggi prima `CLAUDE.md`. L'utente parla italiano, vuole risposte in italiano, e di solito chiede
di **pubblicare** (PR verso `main` + merge) quando una modifica è pronta. Per controllare il server
scrive «controlla»: si lancia il workflow `sogni` a mano e si legge il registro (vedi sotto).

## Com'è oggi (tutto su `main`)
- Nasce già in fase «frase»: si presenta e chiede il suo nome e quello dell'utente (nessun glifo).
- Avvio animato (~4 s): punto rosso → onda sulla griglia → cervello che si forma → volto.
- Studio dal vivo dal telefono (Wikipedia) e di notte sul server (Wikipedia, Wikizionario, Wikibooks,
  Wikiversità, Wikisource, Wikiquote, Wikidata, notizie RSS, Gutenberg, Tatoeba).
- Telefono (`mondo.js`): meteo, luoghi, fatti Wikidata, sinonimi (WordNet in `dati/`), parole inglesi,
  notizie, citazioni, «segui» un feed.
- Rete che cresce in larghezza e profondità; HUD in stile Nothing (`hud.js`).
- Il suo traduttore inglese→italiano (`nucleo/traduttore.js`) impara da Tatoeba sul server.
- Service worker (`sw.js`): file sempre aggiornati online, ultima copia offline.

## Verificato nei giri veri del server
- Firebase, secret e regole: ok. Il server trova il compagno (`compagni: 1`).
- Studio vero su Wikipedia: ok (letti argomenti, una materia; risolti 429 e pagine di Google).
- Tatoeba: **ok**, 402.198 coppie scaricate da manythings.org e tenute in cache (`~/.impronta/ita.txt`).

## DA FARE, in ordine

### 1. Traduttore libero OPUS-MT — FATTO e verificato (giro del 28/11, 04:09)
Modello convertito in ~50 s e in cache (`~/.impronta/opus`); registro:
`traduttore libero: pronto («The sea is blue.» → «Il mare è blu.»)`, suo traduttore 15% contro 56% del libero.
Dettagli in `tools/traduci.py` e nel workflow.

### 2. Il giro orario di GitHub non parte → sveglia esterna (cron-job.org), FATTO
Il `cron: "23 * * * *"` è partito in automatico una sola volta (00:06 del 28/11), poi più niente.
Soluzione scelta con l'utente: cron-job.org chiama ogni ora l'API `workflow_dispatch` con un token
fine-grained dedicato (solo Impronta, solo Actions). Passi in `docs/PIANO-SOGNI-GITHUB.md`, punto 5.
Configurata dall'utente il 28/11: Test run → 204, giro n. 9 partito (04:36 UTC).
Il token lo crea e lo tiene l'utente: non chiederlo in chat. Verifica che continui: `actions_list` list_workflow_runs su
`sogni.yml` → giri `workflow_dispatch` ogni ora verso il minuto 53 senza che nessuno li lanci.

### 3. Fonti dal vivo — prova pronta
Nei giri veri lo studio spende il tempo prima sulle richieste dell'utente, quindi notizie/Gutenberg possono non arrivare.
Per vederle subito: `actions_run_trigger` run_workflow su `sogni.yml` con `inputs: {"prova_fonti": true}`
→ `tools/prova-fonti.mjs` prova Il Post, ANSA, Wikipedia, Wikidata, Wikiquote, Wikizionario, Wikibooks, Wikisource,
Gutendex e Wikipedia inglese + traduzione (righe `ok`/`NO`, ultima riga `fonti: N ok · M no`).

### 4. Idee già discusse, non fatte
- Un modulo di calcolo scritto a mano (la rete non sa fare i conti).
- ~~Allargare `nucleo/istinto.js`~~ FATTO: ~600 frasi; `test/emozioni.mjs` misura su frasi mai viste (banco alla cieca ~35% → ~43%). Le parole sconosciute ora si leggono dai trigrammi (`Rete.idsLeggi`).
- Far usare alla rete gli appunti/scoperte per rispondere (oggi risponde con le scoperte salvate).

### 5. Preferenze SUE — FATTO (prima versione), da vedere nei giri veri
`nucleo/gusti.js` + `test/gusti.mjs`. Ogni notte il server misura con la rete appena allenata ciò che ha letto,
raggruppato per tema/materia/libro/autore (`studia()` → `gruppi`): sorpresa (perdita per parola), progresso
(quanto scende notte dopo notte), emozioni lette dalla sua testa affettiva pesate dal SUO carattere (`gradite(S.traits)`),
familiarità. Punteggio con media mobile, preferito con isteresi (`SOGLIA` 0.08): una notte sola non lo ribalta.
Parole: tra sinonimi (WordNet) sceglie quella che la sua rete prevede meglio ed è frequente nelle sue letture.
Effetti: risponde a «qual è il tuo libro/autore/argomento/materia preferito?», «chi preferisci tra X e Y?», «perché?»,
«che parola preferisci per dire X?»; scrive nel diario quando nasce un gusto o cambia idea; lo studio segue un
collegamento dell'argomento preferito; scheda «i suoi gusti» (da «mente»).
Da fare dopo: usare davvero le parole preferite nelle sue frasi (`brain.js`, attenzione al vincolo del vocabolario);
commenti spontanei sui gusti; grafico di come cambiano nel tempo.
Nel registro del server cercare la riga `gusti · N cose misurate · argomento: …`.

## Come controllare il server (strumenti GitHub MCP)
1. `actions_run_trigger` run_workflow su `sogni.yml`, ref `main`.
2. Aspettare ~3 minuti (in background), poi `actions_list` list_workflow_runs → list_workflow_jobs.
3. `get_job_logs` con `return_content` e ~100 righe di coda: cercare `compagni:`, `da far sognare:`,
   le righe di studio (`argomento`, `materia`, `notizie`, `gutenberg`…), `sogno … passi`, `traduttore suo`.

## Test (tutti devono passare prima di pubblicare)
`node test/{gradienti,insegnamenti,crescita,studio,fonti,sogni-server,traduttore}.mjs`,
`node test/maestro.mjs` (~30 s), e nel browser `node test/{browser,browser-studio,browser-nascita,browser-mondo}.cjs`
(Playwright già installato; niente server locali; `browser-mondo` usa `https://impronta.local` per la posizione).
