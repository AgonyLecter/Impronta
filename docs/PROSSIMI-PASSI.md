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

### 1. Traduttore libero: Argos non si scarica → passare a OPUS-MT (Hugging Face)
Il sito di Argos e la sua copia IPFS rispondono **403** ai download automatici. NON aggirare il rifiuto
(niente user agent finti: è stato bloccato ed è giusto). Piano concordato con l'utente (da confermare):
- Nel workflow, una sola volta (poi cache in `~/.impronta/opus`):
  `pip install ctranslate2 sentencepiece transformers` + `torch` CPU
  (`pip install torch --index-url https://download.pytorch.org/whl/cpu`), poi
  `ct2-transformers-converter --model Helsinki-NLP/opus-mt-en-it --output_dir ~/.impronta/opus --copy_files source.spm target.spm`.
- In `tools/traduci.py`: se c'è `~/.impronta/opus`, tradurre con CTranslate2:
  codificare con `source.spm` (sentencepiece), aggiungere `"</s>"` in coda ai token,
  `translate_batch`, decodificare l'ipotesi con `target.spm`. (Vedi la guida OPUS-MT di CTranslate2.)
- Il resto (`sogna.mjs`) non cambia: `traduciLibero` chiama `tools/traduci.py` e accetta null.
- Hugging Face e Argos NON sono raggiungibili dall'ambiente cloud di Claude: si prova solo nel workflow.
- Finché manca il traduttore libero, l'inglese si salta, finché il suo traduttore non supera il 60%.

### 2. Il giro orario di GitHub non parte
Da quando è stato pubblicato il workflow (`cron: "23 * * * *"`) è partito una sola volta in automatico;
gli altri giri sono stati lanciati a mano. Controllare con `actions_list` (list_workflow_runs su `sogni.yml`).
Se continua: proporre all'utente un servizio esterno gratuito (es. cron-job.org) che chiama l'API
`workflow_dispatch` con un token GitHub dedicato e minimo (serve il suo consenso: è una credenziale).

### 3. Da verificare al primo giro con il compagno addormentato
Mai visti dal vivo (bloccati nell'ambiente cloud, provati solo con dati simulati):
feed RSS (Il Post, ANSA), Gutendex/Gutenberg, Wikidata sul server, Wikiquote, Wikipedia inglese,
allenamento notturno del suo traduttore (riga `traduttore suo · … parole giuste …` nel registro).
Per farlo dormire: laboratorio (tocca 5 volte «impronta.») → «dormi», chiudere l'app, aspettare
3-4 minuti (il server salta chi ha salvato da meno di 3 minuti), poi lanciare il workflow.

### 4. Idee già discusse, non fatte
- Un modulo di calcolo scritto a mano (la rete non sa fare i conti).
- Allargare `nucleo/istinto.js` (comprensione emotiva ~20-35%).
- Far usare alla rete gli appunti/scoperte per rispondere (oggi risponde con le scoperte salvate).

## Come controllare il server (strumenti GitHub MCP)
1. `actions_run_trigger` run_workflow su `sogni.yml`, ref `main`.
2. Aspettare ~3 minuti (in background), poi `actions_list` list_workflow_runs → list_workflow_jobs.
3. `get_job_logs` con `return_content` e ~100 righe di coda: cercare `compagni:`, `da far sognare:`,
   le righe di studio (`argomento`, `materia`, `notizie`, `gutenberg`…), `sogno … passi`, `traduttore suo`.

## Test (tutti devono passare prima di pubblicare)
`node test/{gradienti,insegnamenti,crescita,studio,fonti,sogni-server,traduttore}.mjs`,
`node test/maestro.mjs` (~30 s), e nel browser `node test/{browser,browser-studio,browser-nascita,browser-mondo}.cjs`
(Playwright già installato; niente server locali; `browser-mondo` usa `https://impronta.local` per la posizione).
