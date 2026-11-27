# impronta studia da solo

**Stato**: primo pezzo IMPLEMENTATO (studio sul server, rete che cresce senza tetto fisso, racconto delle scoperte).
Prossimi passi possibili: Wikidata per fatti certi, un modulo di calcolo scritto a mano, la rete che usa gli appunti per rispondere.

**Direzione decisa dall'utente**: non è un gioco e non serve mistero. È un esperimento: una rete neurale
vera che capisce grazie all'utente, cresce, e **studia da sola** per imparare cose nuove e dirtele.
Un amico intelligente su tanti aspetti, NON un'app che insegna all'utente: **niente quiz per l'utente**.

## Decisioni
- Fonti di studio: Wikipedia italiana, Wikizionario, libri di pubblico dominio (Wikisource / Liber Liber),
  link che l'utente gli dà.
- Vocabolario: libero ma distinto. Può usare parole studiate; sa e mostra quali vengono dall'utente e quali dai libri.
- Interfaccia: resta il volto a punti; tutto ciò che sa e come cresce deve essere consultabile (trasparenza), senza quiz.
- Niente API di IA, niente dipendenze nel codice dell'app; il server è GitHub Actions (già attivo con `sogni.yml`).

## Idea tecnica
1. Curiosità: coda di argomenti da studiare = argomenti frequenti dell'utente + parole sconosciute + link dati.
2. Studio sul server (Actions): legge le fonti, segue i collegamenti, salva appunti (frase + fonte),
   estrae fatti semplici con il parser di brain.js, allena la rete sul testo letto.
3. Rete più grande allenata sul server (milioni di parametri), il telefono la usa soltanto.
4. Al ritorno racconta cosa ha scoperto, con la fonte; le correzioni dell'utente diventano allenamento.
5. Autovalutazione INTERNA della rete (non quiz per l'utente): misura cosa ricorda degli appunti.

Limite onesto: i fatti non stanno in modo affidabile nei neuroni di una rete piccola: servono appunti
espliciti che la rete impara a usare e a raccontare.

## Com'è fatto (implementato)
- `nucleo/studio.js`: lettore unico per le fonti Wikimedia (API MediaWiki: `list=search`, `prop=extracts|links`,
  `list=allpages` per i capitoli) + pagine web dei link. `scegli()` = curiosità (richieste → tuoi argomenti →
  parole senza definizione → una materia → un classico → collegamenti che toccano le tue parole).
  `studia()` restituisce `letture` (frasi per allenare), `scoperte` (frase che definisce + fonte + url) e lo stato.
- Stato dello studio in `impronta_study/<ID>` = `{ stato: "<json>", letture: "<json>" }` (solo il server, Admin SDK: nessuna regola).
  Nello stato dell'app: `mem.scoperte` (ultime 60, `detta`), `mem.studia` (richieste, `fatto`), `mem.studio` (riassunto).
- Lo studio parte dalla fase 3 e solo mentre dorme. Budget: ~45 s di studio + allenamento per compagno.
- `nucleo/rete.js`: strati residui (`deepen`, R = 0 alla nascita), `widenD`, Net2Wider su tutti gli strati,
  softmax campionata oltre 700 parole, gradienti/Adam allocati solo se si allena, salvataggio a 16 bit (`save(true)`).
- `nucleo/maestro.js`: limiti `TELEFONO` (192 neuroni, 1 strato) e `SERVER` (512 neuroni, 4 strati, embedding 128,
  12000 parole); spazio di crescita = 16 + 6·√(tue frasi + istinto/6 + letture/4). Parole `tue` vs `studiate`
  (salvate in `maestro.studiate`), `lessico()`.
- `nucleo/pacco.js`: rete in pezzi da 8 MB su Firebase (`meta.parts`).
- Telefono: oltre 1,5 M parametri non allena (la usa). Parole studiate → `B.setStudiate` (ammesse dalla fase 3,
  mostrate a parte nella scheda parole). Chat: «studia X», link, «cosa sai di X?», «cosa hai studiato?».
  Al ritorno racconta una scoperta; scheda «studio».
- Test: `test/crescita.mjs`, `test/studio.mjs` (fonti finte), `test/browser-studio.cjs`.
