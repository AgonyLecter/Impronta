# impronta.

Compagno digitale che nasce vuoto e impara a parlare **solo con le parole dell'utente**.
Web app statica (GitHub Pages da `main`), tutta in italiano, nessuna API di IA a pagamento: ogni
"intelligenza" è scritta a mano e gira nel telefono. L'utente parla italiano: rispondigli in italiano.

## Richieste dell'utente (da rispettare)
- Niente API di IA a pagamento o limitate. Tutto deve girare in locale/gratis.
- Deve stupire chi lo usa e lasciare di stucco un programmatore: libreria propria, nessuna dipendenza.
- Interfaccia: niente chat da scorrere; solo l'ultima frase sotto il volto a punti.
- Dorme per allenarsi; si può svegliare (umore variabile). Vuole che si alleni anche ad app chiusa
  → piano pronto in `docs/PIANO-SOGNI-GITHUB.md` (prossimo lavoro da fare).
- Quando una modifica è pronta l'utente di solito chiede di pubblicarla: PR verso `main` e merge.

## Mappa dei file
| file | cosa fa |
|---|---|
| `index.html` | markup + tutto il CSS (token in `:root`), schermata di accensione `#boot` |
| `app.js` | app: stato, Firebase, volto a punti (canvas), voce, flussi (nascita, fasi, sonno, risveglio, accoglienza), input, schede (parole, diario, mente, come ti vede, menu, laboratorio) |
| `brain.js` | cervello a regole: analisi dell'italiano, memoria, insegnamenti (nome, fatti, gusti), domande, riflessione io↔tu, curiosità ("cos'è X?"), rinforzo (impara quando usare "bravissimo"), ironia (stima, domande, vocabolario personale). `reply()` genera candidati e li valuta |
| `senso.js` | ritmo di scrittura, lettura dal vivo mentre scrivi, profezia in glifi |
| `nucleo/rete.js` | rete GRU scritta a mano: BPTT + Adam, testa affettiva (8 emozioni), trigrammi di lettere, crescita Net2Wider (`widen`), generazione, salvataggio base64 |
| `nucleo/maestro.js` | autoapprendimento: curriculum (frasi utente + istinto), autovalutazione su esempi tenuti da parte, politica di crescita, `senti`, `parla` |
| `nucleo/istinto.js` | ~200 frasi etichettate per le emozioni (servono a capire, MAI a parlare) |
| `nucleo/etichette.js` | etichette automatiche da emoji/segnali, `conferma`, `valenza` |
| `nucleo/carattere.js` | modello dell'utente: tratti, collegamenti argomenti/orari/umore |
| `nucleo/worker.js` | la rete gira in un Web Worker (fallback nel thread principale) |
| `nucleo/index.js` | API `Nucleo`: avvia, osserva, senti, parla, sogna, pilota automatico, salvataggio su IndexedDB |
| `test/` | test (vedi sotto) |

## Concetti chiave
- **Fasi**: seme → eco → parola → frase → voce (`NEED` in brain.js: parole + giorni). Laboratorio nascosto: tocca 5 volte il logo (fase +1, +giorni, sveglia, sogna, dormi).
- **Vincolo del vocabolario**: le frasi di tipo `tpl/refl/rete` devono usare parole insegnate (+ grammatica innata per fase, `innate()`); le fonti `ans/def/mem/senso/praise/chiede/sonno` sono esenti.
- **Stato** `S` in localStorage `impronta_state`, sincronizzato su Firebase RTDB `impronta/<ID>` (ID 16 caratteri = "codice di legame"). La rete NON è nello stato: sta in IndexedDB `impronta` / chiave `impronta_nucleo`.
- **Sonno** (app.js, sezione SONNO): energia per fase, pisolino `NAP[p]` minuti, `S.energy = {sleepStart, sleepUntil, need, dreamMs, dreamt, wakes, rt}`. `dream()` allena finché `dreamMs >= need`; `sleepResume()` recupera i sogni al ritorno; `wakeForced()` = risveglio con umore.
- **Ironia**: `B.ironyEstimate` (rete + regole + `S.mem.ironyLex`); nel dubbio chiede (`S.mem.confirm`), statistiche in `S.mem.ironyStats`.

## Come testare
- Logica pura (Node): `node test/insegnamenti.mjs`, `node test/gradienti.mjs` (tutte le righe devono dire `ok`), `node test/maestro.mjs` (crescita + emozioni su frasi nuove, ~30 s).
- Browser: `node test/browser.cjs` usa Playwright (già installato nell'ambiente cloud) e serve i file con `page.route` su `http://impronta.local/` — **non avviare server locali** (in questo ambiente il comando viene bloccato). `window.__impronta.idle` dice quando l'app ha finito di rispondere.
- Firebase e gstatic sono bloccati dal proxy nell'ambiente cloud: la sincronizzazione non è testabile lì.

## Problemi noti
- Comprensione emotiva misurata ~20-35% su frasi mai viste: l'istinto è piccolo. Allargare `nucleo/istinto.js` (soprattutto ironia, tristezza, rabbia) è il miglioramento più efficace.
- Le frasi inventate dalla rete con pochi dati sono a volte sconnesse: sono filtrate e hanno peso basso in fase 3.
- La rete in fase 3-4 è pesata da `brain.js` (sezione 8 "voce"): attenzione a non farla vincere sulle risposte dirette.

## Regole di lavoro
- Branch di sviluppo indicato dalla sessione; PR verso `main`, merge solo se l'utente lo chiede.
- Messaggi di commit in italiano. Non scrivere identificativi di modelli in commit/codice/PR.
- Prima di pubblicare: i test sopra senza errori.
