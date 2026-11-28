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

### 3. Da verificare al primo giro con il compagno addormentato
Mai visti dal vivo (bloccati nell'ambiente cloud, provati solo con dati simulati):
feed RSS (Il Post, ANSA), Gutendex/Gutenberg, Wikidata sul server, Wikiquote, Wikipedia inglese,
allenamento notturno del suo traduttore (riga `traduttore suo · … parole giuste …` nel registro).
Per farlo dormire: laboratorio (tocca 5 volte «impronta.») → «dormi», chiudere l'app, aspettare
3-4 minuti (il server salta chi ha salvato da meno di 3 minuti), poi lanciare il workflow.

### 4. Idee già discusse, non fatte
- Un modulo di calcolo scritto a mano (la rete non sa fare i conti).
- ~~Allargare `nucleo/istinto.js`~~ FATTO: ~600 frasi; `test/emozioni.mjs` misura su frasi mai viste (banco alla cieca ~35% → ~43%). Le parole sconosciute ora si leggono dai trigrammi (`Rete.idsLeggi`).
- Far usare alla rete gli appunti/scoperte per rispondere (oggi risponde con le scoperte salvate).

### 5. Preferenze SUE (richiesta dell'utente, da progettare e fare)
Deve sviluppare gusti personali che nascono dai **suoi** parametri e dalla sua storia, non a caso e non
copiati dall'utente: preferire uno scrittore a un altro, un argomento, una materia, una parola invece di un
sinonimo. Devono essere **stabili** (cambiano piano, con isteresi), **spiegabili con numeri veri** e a volte
**diversi da quelli dell'utente** (può non essere d'accordo).

Segnali misurabili da cui ricavarli (tutti già disponibili o quasi):
- **Sorpresa giusta**: la perdita della sua rete su un testo. Gli piace ciò che non è né banale né
  incomprensibile (sorpresa media) — idea della "curiosità come progresso di compressione".
- **Progresso di apprendimento**: quanto scende la sua perdita su un autore/argomento notte dopo notte.
  Gli piace ciò da cui impara di più.
- **Come lo fa sentire**: la testa affettiva (8 emozioni) letta sulle frasi di quell'autore/argomento
  (es. Leopardi → malinconia), pesata dal suo carattere (`S.traits`: calore, ironia, malinconia…).
- **Familiarità**: quante volte l'ha incontrato (frequenza nelle letture), con un po' di gusto per il nuovo.
- **Parole**: tra i sinonimi (WordNet, `dati/parole-it.json`) sceglie la sua per ogni concetto in base
  alla frequenza nelle sue letture, alla vicinanza nel suo spazio delle parole (embedding) e a un "orecchio"
  (lunghezza, suoni/trigrammi che la sua rete predilige). Poi la usa davvero nelle sue frasi (`brain.js`).

Proposta di struttura:
- `nucleo/gusti.js` (puro, testabile): `valuta(oggetto, segnali, carattere)` → punteggio + motivazioni;
  aggiornamento lento (media mobile) e soglia per cambiare idea.
- Sul server (`tools/sogna.mjs`) ogni notte: misurare i segnali per autori (Gutenberg/Wikisource), materie,
  argomenti letti; scrivere `S.mem.gusti = { autori, temi, materie, parole: { concetto: parola } }`
  con il "perché" in numeri.
- Effetti: sceglie cosa studiare anche in base ai gusti (più spesso ciò che gli piace, ma non solo);
  risponde a «chi preferisci tra X e Y?», «qual è il tuo libro preferito?», «perché?»; commenti spontanei
  («questo autore mi piace: le sue frasi mi sorprendono ma le capisco»); usa le sue parole preferite.
- HUD: scheda «gusti» (classifiche a punti, motivazioni con i numeri, come sono cambiati nel tempo).
- Test: stessi testi → stessi gusti (deterministico); carattere diverso → gusti diversi; un gusto non
  si ribalta per una sola notte.

## Come controllare il server (strumenti GitHub MCP)
1. `actions_run_trigger` run_workflow su `sogni.yml`, ref `main`.
2. Aspettare ~3 minuti (in background), poi `actions_list` list_workflow_runs → list_workflow_jobs.
3. `get_job_logs` con `return_content` e ~100 righe di coda: cercare `compagni:`, `da far sognare:`,
   le righe di studio (`argomento`, `materia`, `notizie`, `gutenberg`…), `sogno … passi`, `traduttore suo`.

## Test (tutti devono passare prima di pubblicare)
`node test/{gradienti,insegnamenti,crescita,studio,fonti,sogni-server,traduttore}.mjs`,
`node test/maestro.mjs` (~30 s), e nel browser `node test/{browser,browser-studio,browser-nascita,browser-mondo}.cjs`
(Playwright già installato; niente server locali; `browser-mondo` usa `https://impronta.local` per la posizione).
