# impronta.

> **Passaggio di consegne:** leggi `docs/PROSSIMI-PASSI.md` (stato, cosa è verificato, cosa fare dopo).

Compagno digitale che nasce vuoto e impara a parlare **solo con le parole dell'utente**.
Web app statica (GitHub Pages da `main`), tutta in italiano, nessuna API di IA a pagamento: ogni
"intelligenza" è scritta a mano e gira nel telefono. L'utente parla italiano: rispondigli in italiano.

## Richieste dell'utente (da rispettare)
- Niente API di IA a pagamento o limitate. Tutto deve girare in locale/gratis.
- Deve stupire chi lo usa e lasciare di stucco un programmatore: libreria propria, nessuna dipendenza.
- Interfaccia: niente chat da scorrere; solo l'ultima frase sotto il volto a punti. Schede in stile Nothing/HUD (riquadri a punti, rosso solo come accento), tutto custom e "wow" dove serve.
- Dorme per allenarsi; si può svegliare (umore variabile). Vuole che si alleni anche ad app chiusa
  → fatto: `tools/sogna.mjs` + `.github/workflows/sogni.yml` (vedi `docs/PIANO-SOGNI-GITHUB.md`, serve il secret).
- NUOVA DIREZIONE: esperimento di rete neurale vera che studia da sola (Wikipedia, Wikizionario, libri liberi, link) e racconta cosa scopre; niente quiz, niente "mistero" → `docs/PIANO-STUDIO.md` (primo pezzo fatto).
- Fonti di conoscenza (tutte gratis, senza chiavi): Wikipedia/Wikizionario/Wikibooks/Wikiversità/Wikisource/Wikiquote, Wikidata (fatti certi), WordNet italiano (dati/), Tatoeba, Gutenberg, notizie RSS + feed dell'utente, Open-Meteo, OpenStreetMap.
- **Capisce l'inglese ma parla solo italiano**: sul server traduce con il traduttore libero (OPUS-MT, `tools/traduci.py`) e in parallelo il SUO traduttore (`nucleo/traduttore.js`) impara da Tatoeba e si misura accanto a quello libero.
- Quando una modifica è pronta l'utente di solito chiede di pubblicarla: PR verso `main` e merge.

## Mappa dei file
| file | cosa fa |
|---|---|
| `index.html` | markup + tutto il CSS (token in `:root`), schermata di accensione `#boot` |
| `app.js` | app: stato, Firebase, volto a punti (canvas), voce, flussi (nascita, fasi, sonno, risveglio, accoglienza), input, schede (parole, diario, mente, come ti vede, menu, laboratorio) |
| `brain.js` | cervello a regole: analisi dell'italiano, memoria, insegnamenti (nome, fatti, gusti), domande, riflessione io↔tu, curiosità ("cos'è X?"), rinforzo (impara quando usare "bravissimo"), ironia (stima, domande, vocabolario personale). `reply()` genera candidati e li valuta |
| `hud.js` | grafica custom (canvas, nessuna dipendenza): `cervello()` ologramma (sagoma di cervello a micro-punti, la rete vera dentro, sinapsi ad arco, piano di scansione, anello delle 8 emozioni, etichette sui neuroni) che rivive l'ultima frase, `cuore()` cuore di particelle che si forma man mano (notti di gusti + cose amate), batte col suo umore, con le cose amate in orbita, `galassia()` parole nello spazio dei significati, `puntini()`, `tile()`, `segmenti()`, `titolo()` |
| `mondo.js` | il mondo fuori dal telefono: `intento()` riconosce meteo/luoghi/fatti/sinonimi/inglese/notizie/citazioni/«segui»; Open-Meteo, Nominatim, Wikidata, WordNet |
| `dati/` | `parole-it.json` (sinonimi, "è un tipo di") e `en-it.json` dal WordNet (CC BY 3.0), rifatti con `tools/prepara-wordnet.mjs` |
| `senso.js` | ritmo di scrittura, lettura dal vivo mentre scrivi, profezia in glifi |
| `nucleo/rete.js` | rete GRU scritta a mano: BPTT + Adam, testa affettiva (8 emozioni), trigrammi di lettere, crescita in larghezza (`widen`, `widenD`) e profondità (`deepen`, strati residui), softmax campionata, salvataggio base64 (anche 16 bit) |
| `nucleo/maestro.js` | autoapprendimento: curriculum (frasi utente + istinto), autovalutazione su esempi tenuti da parte, politica di crescita, `senti`, `parla` |
| `nucleo/istinto.js` | ~600 frasi etichettate per le emozioni (servono a capire, MAI a parlare) |
| `nucleo/etichette.js` | etichette automatiche da emoji/segnali, `conferma`, `valenza` |
| `nucleo/carattere.js` | modello dell'utente: tratti, collegamenti argomenti/orari/umore |
| `nucleo/studio.js` | studio da solo: lettore Wikimedia + link, fatti Wikidata (`fatti`, `frasiDaFatti`), Wikiquote, RSS, Gutenberg, Wikipedia inglese con `traduci()`; curiosità, scoperte |
| `nucleo/gusti.js` | le SUE preferenze: per temi/materie/autori/libri misura con la sua rete sorpresa, progresso, emozioni (pesate dal suo carattere `S.traits`); media mobile + isteresi (`SOGLIA`); `perche()` con numeri veri; `scegliParole()` tra sinonimi; `rispondi()` a «qual è il tuo libro preferito?», «chi preferisci tra X e Y?», «perché?» |
| `nucleo/calcolo.js` | i conti scritti a mano: parser a discesa ricorsiva dell'italiano («quanto fa tre più quattro per due», «il 20% di 50», «radice di 81», «2 alla decima», «la metà di 37»), numeri in lettere ↔ cifre, `calcola()` → `{ x, conto, valore }` |
| `nucleo/appunti.js` | risponde da ciò che ha letto: `quaderno(S.mem)` (scoperte + `frasi`, fatti, notizie, citazioni), `cerca()` con radici, idf, tipo di domanda (perché/quando/quanto) e parole vicine della SUA rete (`nucleo.vicine`); `frase()` |
| `nucleo/interiore.js` | il SUO stato interiore: bisogni (compagnia, curiosità, sentirsi capito; il riposo viene dall'energia) che crescono col tempo, umore (valenza, attivazione) che torna piano al suo carattere; `scorri(I, t, traits)`, `evento(I, tipo, t)`, `comeStai()` con il perché vero |
| `nucleo/ricordi.js` | la sua memoria autobiografica: momenti con l'emozione (prime volte, emozioni forti, racconti, momenti suoi), forza che sbiadisce (le prime volte restano), `rievoca`, `richiama` (parlando), `anniversario`, `piuForte` (sogni), `racconta` |
| `nucleo/lezioni.js` | come gli insegni le parole: `lezione(testo, attesa)` riconosce «ti insegno una parola: X», «X vuol dire / significa / indica …», «impara: X = …», «si dice X quando …», correzioni «no, X …», sinonimi «X è come Y», contrari, «dimentica X», «cosa ti ho insegnato?»; `risposta()` |
| `nucleo/traduttore.js` | il suo traduttore inglese→italiano: encoder-decoder GRU scritto a mano, allenato su Tatoeba, `valuta`/`somiglianza` |
| `nucleo/pacco.js` | rete in pezzi per Firebase |
| `nucleo/worker.js` | la rete gira in un Web Worker (fallback nel thread principale) |
| `nucleo/index.js` | API `Nucleo`: avvia, osserva, senti, parla, sogna, pilota automatico, salvataggio su IndexedDB |
| `tools/sogna.mjs` | sogni sul server: ogni ora (GitHub Actions `sogni.yml`) studia, allena la rete (+1500 frasi Tatoeba a notte) e il traduttore; `sognaTutti(adapter, { tatoeba, traduciLibero })` |
| `tools/traduci.py` | traduttore libero OPUS-MT en→it (Helsinki-NLP) con CTranslate2 (scarica e converte il modello con `--scarica`; il workflow lo tiene in cache con Tatoeba) |
| `test/` | test (vedi sotto) |

## Concetti chiave
- **Fasi**: seme → eco → parola → frase → voce (`NEED` in brain.js). Per scelta dell'utente **nasce già in fase «frase»** (`START = 3`: parla, rete attiva, studia); «voce» a 80 parole + 3 giorni. Le prime tre restano solo per compagni vecchi. Laboratorio nascosto: tocca 5 volte il logo (fase +1, +giorni, sveglia, sogna, dormi).
- **Studio dal vivo**: «cosa sai di X?» / «studia X» → `liveStudy(q, perche, modo)` in app.js legge dal telefono e sceglie le fonti: «studia la parola X» → Wikizionario; «studia il libro X» / «leggi pinocchio» → Wikisource (+ Wikipedia; il libro va in `S.mem.leggi` e il server di notte continua proprio quello); una materia → manuale Wikibooks/Wikiversità; un argomento → Wikipedia + fatti Wikidata + citazione Wikiquote. Tutto entra nella rete (`Nucleo.leggi`) e nelle scoperte; di notte il server approfondisce.
- **Lezioni** (app.js `insegnami`, prima di ogni altra risposta): definizioni in `S.defs` (fonte «me l'hai insegnato tu»), `S.mem.insegnate`, `S.mem.sinonimi`, `S.mem.contrari`; la frase entra nella rete; la prima parola insegnata è un ricordo; scheda parole: «me le hai insegnate tu».
- **Mondo** (app.js `rispondiMondo`): «che tempo fa?» (posizione arrotondata a ~1 km in `S.mem.luogo`), «dove si trova X?», «quanti abitanti ha X?» e altri fatti Wikidata, «sinonimi di X», «come si dice window?», «che notizie ci sono?», «dimmi una citazione su X», «segui <feed>». Stato: `S.mem.notizie/citazioni/feed/traduttore` (scritti anche dal server).
- **Articoli**: `S.mem.art` ricorda l'articolo che l'utente usa con ogni parola (`withArt`).
- **Vincolo del vocabolario**: le frasi di tipo `tpl/refl/rete` devono usare parole insegnate (+ grammatica innata per fase, `innate()`, + dalla fase 3 le parole studiate, `B.setStudiate`); le fonti `ans/def/mem/senso/praise/chiede/sonno/studio` sono esenti.
- **Stato** `S` in localStorage `impronta_state`, sincronizzato su Firebase RTDB `impronta/<ID>` (ID 16 caratteri = "codice di legame"). La rete NON è nello stato: sta in IndexedDB `impronta` / chiave `impronta_nucleo`.
- **Sonno** (app.js, sezione SONNO): energia per fase, pisolino `NAP[p]` minuti, `S.energy = {sleepStart, sleepUntil, need, dreamMs, dreamt, wakes, rt}`. `dream()` allena finché `dreamMs >= need`; `sleepResume()` recupera i sogni al ritorno; `wakeForced()` = risveglio con umore.
- **Sogni ad app chiusa**: `syncNetUp()` (si addormenta / va in background mentre dorme) carica la rete in `impronta_nets/<ID>` = `{meta:{at,steps,H,by}, net:"<json>"}`; `syncNetDown()` (inizio di `welcome` e al ritorno) importa quella del server con `Nucleo.importa`. Il server aggiorna solo `energy/dreamMs`, `energy/srv`, `energy/dreamt`, `diary`, `diaryUnread`, `updatedAt`.
- **Stato interiore e ricordi** (`S.interno`, `S.ricordi`, scritti anche dal server): app.js `interno()` (fa scorrere il tempo), `evento(tipo)` (messaggio, affetto, lode, offesa, risposta, ignorato, parola, scoperta, ritorno…). Bentornato «mi sei mancato» se la compagnia è > 60%; «come stai?» vero; ricordi dai messaggi (`Ricordi.daMessaggio`), rievocati parlando (stesso limite degli appunti), negli anniversari, nei sogni (telefono e server), in `incalza()`. Scheda «dentro di lui» da «mente». Il server: `interno` + evento «studio», a volte sogna un ricordo.
- **Parole nuove** (app.js `capisciNuove`, `cercaParola`): una parola nuova (≥5 lettere, vista una volta) la prova a capire col suo dizionario (WordNet, `Mondo.parola`, anche forme singolari); se la capisce la salva in `S.defs` (fonte in `S.mem.defFonte`) e te lo dice («…, giusto? me lo segno»); se no la chiede. Se rispondi «non lo so / cercalo tu» la cerca subito sul Wikizionario (poi Wikipedia); se ignori la domanda la cerca in silenzio e te lo racconta dopo (`S.mem.imparate`). Di notte il server cerca le parole che usi e non sa (`defs/<w>`, `mem/imparate`).
- **Ti incalza** (`incalza()`): dalla fase 3, dopo 40 s di silenzio (al massimo 4 volte per sessione, ogni ~2 min) a rotazione: una parola cercata da solo, una parola tua che non sa, una scoperta non detta, il suo preferito («a te piace?»), l'ultimo argomento (appunti).
- **Parole sue e commenti**: `Gusti.applicaParole` nelle frasi `tpl/refl/rete/voce/mem`; `Gusti.commento` quando parli di qualcosa che ama o no (in alternativa agli appunti spontanei, stesso limite di frequenza).
- **Conti e appunti** (app.js, prima di gusti/mondo/studio): `calcola(msg)`; poi, se è una domanda di sapere senza altre risposte, `cercaAppunti()` (soglia 1.5). Dopo una risposta normale, se parli di un argomento studiato, ogni tanto (40%, non più di una volta ogni 4 messaggi, soglia 2.5, `diretto`) aggiunge «a proposito di X: ho letto che…». Frasi già dette in `S.mem.citati`.
- **Gusti** (`S.mem.gusti`, scritti dal server ogni notte): lo studio restituisce `gruppi` (da dove viene ogni frase), `sogna.mjs` li misura con la rete appena allenata e scrive nel diario quando cambia idea; lo studio segue un collegamento dell'argomento preferito. Scheda «i suoi gusti» da «mente». Le chiavi passano da `chiave()` (Firebase non accetta `. # $ / [ ]`).
- **Ironia**: `B.ironyEstimate` (rete + regole + `S.mem.ironyLex`); nel dubbio chiede (`S.mem.confirm`), statistiche in `S.mem.ironyStats`.

## Come testare
- Logica pura (Node): `node test/insegnamenti.mjs`, `node test/gradienti.mjs` e `node test/sogni-server.mjs`, `node test/crescita.mjs`, `node test/studio.mjs` (tutte le righe devono dire `ok`), `node test/maestro.mjs` (crescita + emozioni su frasi nuove, ~30 s), `node test/emozioni.mjs` (comprensione emotiva su due banchi di frasi mai viste, ~20 s), `node test/gusti.mjs` (gusti deterministici, legati al carattere, stabili), `node test/calcolo.mjs`, `node test/appunti.mjs`, `node test/interiore.mjs`, `node test/ricordi.mjs`, `node test/lezioni.mjs`.
- Browser parole e incalzare: `node test/browser-parole.cjs` (~1 min: aspetta il silenzio).
- Fonti dal vivo: workflow `sogni` lanciato a mano con `prova_fonti` = true (`tools/prova-fonti.mjs`, non tocca i compagni).
- Grafica: per fotografare `cervello()`/`cuore()` fuori dall'app basta una pagina che importa `hud.js` (servita con `page.route`); `browser-studio.cjs` salva `mente.png` e `gusti.png` nella cartella temporanea.
- Fonti e traduzione: `node test/fonti.mjs`, `node test/traduttore.mjs` (gradienti dell'encoder-decoder, impara, notte sul server).
- Browser: `node test/browser.cjs`, `node test/browser-studio.cjs`, `node test/browser-nascita.cjs`, `node test/browser-parole.cjs`, `node test/browser-dentro.cjs`, `node test/browser-insegna.cjs` (Wikimedia simulato con CORS) e `node test/browser-mondo.cjs` (servizi esterni simulati con `route`; quest'ultimo usa `https://impronta.local` perché la posizione vuole una pagina sicura) usa Playwright (già installato nell'ambiente cloud) e serve i file con `page.route` su `http://impronta.local/` — **non avviare server locali** (in questo ambiente il comando viene bloccato). `window.__impronta.idle` dice quando l'app ha finito di rispondere.
- Firebase, gstatic e Wikipedia sono bloccati dal proxy nell'ambiente cloud: sincronizzazione e studio vero non sono testabili lì (lo studio sì, con fonti finte).

## Problemi noti
- Comprensione emotiva su frasi mai viste (`node test/emozioni.mjs`, 40 giri): banco 1 ~68%, banco 2 scritto alla cieca ~43% (prima dell'allargamento dell'istinto: ~49% e ~35%). Le frasi lunghe e piene di parole nuove restano difficili. Non ritoccare l'istinto guardando il banco 2: è la misura onesta.
- Le frasi inventate dalla rete con pochi dati sono a volte sconnesse: sono filtrate e hanno peso basso in fase 3.
- La rete in fase 3-4 è pesata da `brain.js` (sezione 8 "voce"): attenzione a non farla vincere sulle risposte dirette.

## Regole di lavoro
- Branch di sviluppo indicato dalla sessione; PR verso `main`, merge solo se l'utente lo chiede.
- Messaggi di commit in italiano. Non scrivere identificativi di modelli in commit/codice/PR.
- Prima di pubblicare: i test sopra senza errori.
