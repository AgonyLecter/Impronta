# impronta.

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
- **Capisce l'inglese ma parla solo italiano**: sul server traduce con il traduttore libero (Argos, `tools/traduci.py`) e in parallelo il SUO traduttore (`nucleo/traduttore.js`) impara da Tatoeba e si misura accanto a quello libero.
- Quando una modifica è pronta l'utente di solito chiede di pubblicarla: PR verso `main` e merge.

## Mappa dei file
| file | cosa fa |
|---|---|
| `index.html` | markup + tutto il CSS (token in `:root`), schermata di accensione `#boot` |
| `app.js` | app: stato, Firebase, volto a punti (canvas), voce, flussi (nascita, fasi, sonno, risveglio, accoglienza), input, schede (parole, diario, mente, come ti vede, menu, laboratorio) |
| `brain.js` | cervello a regole: analisi dell'italiano, memoria, insegnamenti (nome, fatti, gusti), domande, riflessione io↔tu, curiosità ("cos'è X?"), rinforzo (impara quando usare "bravissimo"), ironia (stima, domande, vocabolario personale). `reply()` genera candidati e li valuta |
| `hud.js` | grafica custom (canvas, nessuna dipendenza): `cervello()` rete 3D vera che rivive l'ultima frase, `galassia()` parole nello spazio dei significati, `puntini()`, `tile()`, `segmenti()`, `titolo()` |
| `mondo.js` | il mondo fuori dal telefono: `intento()` riconosce meteo/luoghi/fatti/sinonimi/inglese/notizie/citazioni/«segui»; Open-Meteo, Nominatim, Wikidata, WordNet |
| `dati/` | `parole-it.json` (sinonimi, "è un tipo di") e `en-it.json` dal WordNet (CC BY 3.0), rifatti con `tools/prepara-wordnet.mjs` |
| `senso.js` | ritmo di scrittura, lettura dal vivo mentre scrivi, profezia in glifi |
| `nucleo/rete.js` | rete GRU scritta a mano: BPTT + Adam, testa affettiva (8 emozioni), trigrammi di lettere, crescita in larghezza (`widen`, `widenD`) e profondità (`deepen`, strati residui), softmax campionata, salvataggio base64 (anche 16 bit) |
| `nucleo/maestro.js` | autoapprendimento: curriculum (frasi utente + istinto), autovalutazione su esempi tenuti da parte, politica di crescita, `senti`, `parla` |
| `nucleo/istinto.js` | ~200 frasi etichettate per le emozioni (servono a capire, MAI a parlare) |
| `nucleo/etichette.js` | etichette automatiche da emoji/segnali, `conferma`, `valenza` |
| `nucleo/carattere.js` | modello dell'utente: tratti, collegamenti argomenti/orari/umore |
| `nucleo/studio.js` | studio da solo: lettore Wikimedia + link, fatti Wikidata (`fatti`, `frasiDaFatti`), Wikiquote, RSS, Gutenberg, Wikipedia inglese con `traduci()`; curiosità, scoperte |
| `nucleo/traduttore.js` | il suo traduttore inglese→italiano: encoder-decoder GRU scritto a mano, allenato su Tatoeba, `valuta`/`somiglianza` |
| `nucleo/pacco.js` | rete in pezzi per Firebase |
| `nucleo/worker.js` | la rete gira in un Web Worker (fallback nel thread principale) |
| `nucleo/index.js` | API `Nucleo`: avvia, osserva, senti, parla, sogna, pilota automatico, salvataggio su IndexedDB |
| `tools/sogna.mjs` | sogni sul server: ogni ora (GitHub Actions `sogni.yml`) studia, allena la rete (+1500 frasi Tatoeba a notte) e il traduttore; `sognaTutti(adapter, { tatoeba, traduciLibero })` |
| `tools/traduci.py` | traduttore libero Argos en→it con CTranslate2 (scarica il modello con `--scarica`; il workflow lo tiene in cache con Tatoeba) |
| `test/` | test (vedi sotto) |

## Concetti chiave
- **Fasi**: seme → eco → parola → frase → voce (`NEED` in brain.js). Per scelta dell'utente **nasce già in fase «frase»** (`START = 3`: parla, rete attiva, studia); «voce» a 80 parole + 3 giorni. Le prime tre restano solo per compagni vecchi. Laboratorio nascosto: tocca 5 volte il logo (fase +1, +giorni, sveglia, sogna, dormi).
- **Studio dal vivo**: «cosa sai di X?» / «studia X» → `liveStudy()` in app.js legge Wikipedia dal telefono (`nucleo/studio.js`, `Nucleo.leggi`), risponde con la fonte; di notte il server approfondisce.
- **Mondo** (app.js `rispondiMondo`): «che tempo fa?» (posizione arrotondata a ~1 km in `S.mem.luogo`), «dove si trova X?», «quanti abitanti ha X?» e altri fatti Wikidata, «sinonimi di X», «come si dice window?», «che notizie ci sono?», «dimmi una citazione su X», «segui <feed>». Stato: `S.mem.notizie/citazioni/feed/traduttore` (scritti anche dal server).
- **Articoli**: `S.mem.art` ricorda l'articolo che l'utente usa con ogni parola (`withArt`).
- **Vincolo del vocabolario**: le frasi di tipo `tpl/refl/rete` devono usare parole insegnate (+ grammatica innata per fase, `innate()`, + dalla fase 3 le parole studiate, `B.setStudiate`); le fonti `ans/def/mem/senso/praise/chiede/sonno/studio` sono esenti.
- **Stato** `S` in localStorage `impronta_state`, sincronizzato su Firebase RTDB `impronta/<ID>` (ID 16 caratteri = "codice di legame"). La rete NON è nello stato: sta in IndexedDB `impronta` / chiave `impronta_nucleo`.
- **Sonno** (app.js, sezione SONNO): energia per fase, pisolino `NAP[p]` minuti, `S.energy = {sleepStart, sleepUntil, need, dreamMs, dreamt, wakes, rt}`. `dream()` allena finché `dreamMs >= need`; `sleepResume()` recupera i sogni al ritorno; `wakeForced()` = risveglio con umore.
- **Sogni ad app chiusa**: `syncNetUp()` (si addormenta / va in background mentre dorme) carica la rete in `impronta_nets/<ID>` = `{meta:{at,steps,H,by}, net:"<json>"}`; `syncNetDown()` (inizio di `welcome` e al ritorno) importa quella del server con `Nucleo.importa`. Il server aggiorna solo `energy/dreamMs`, `energy/srv`, `energy/dreamt`, `diary`, `diaryUnread`, `updatedAt`.
- **Ironia**: `B.ironyEstimate` (rete + regole + `S.mem.ironyLex`); nel dubbio chiede (`S.mem.confirm`), statistiche in `S.mem.ironyStats`.

## Come testare
- Logica pura (Node): `node test/insegnamenti.mjs`, `node test/gradienti.mjs` e `node test/sogni-server.mjs`, `node test/crescita.mjs`, `node test/studio.mjs` (tutte le righe devono dire `ok`), `node test/maestro.mjs` (crescita + emozioni su frasi nuove, ~30 s).
- Fonti e traduzione: `node test/fonti.mjs`, `node test/traduttore.mjs` (gradienti dell'encoder-decoder, impara, notte sul server).
- Browser: `node test/browser.cjs`, `node test/browser-studio.cjs`, `node test/browser-nascita.cjs` e `node test/browser-mondo.cjs` (servizi esterni simulati con `route`; quest'ultimo usa `https://impronta.local` perché la posizione vuole una pagina sicura) usa Playwright (già installato nell'ambiente cloud) e serve i file con `page.route` su `http://impronta.local/` — **non avviare server locali** (in questo ambiente il comando viene bloccato). `window.__impronta.idle` dice quando l'app ha finito di rispondere.
- Firebase, gstatic e Wikipedia sono bloccati dal proxy nell'ambiente cloud: sincronizzazione e studio vero non sono testabili lì (lo studio sì, con fonti finte).

## Problemi noti
- Comprensione emotiva misurata ~20-35% su frasi mai viste: l'istinto è piccolo. Allargare `nucleo/istinto.js` (soprattutto ironia, tristezza, rabbia) è il miglioramento più efficace.
- Le frasi inventate dalla rete con pochi dati sono a volte sconnesse: sono filtrate e hanno peso basso in fase 3.
- La rete in fase 3-4 è pesata da `brain.js` (sezione 8 "voce"): attenzione a non farla vincere sulle risposte dirette.

## Regole di lavoro
- Branch di sviluppo indicato dalla sessione; PR verso `main`, merge solo se l'utente lo chiede.
- Messaggi di commit in italiano. Non scrivere identificativi di modelli in commit/codice/PR.
- Prima di pubblicare: i test sopra senza errori.
