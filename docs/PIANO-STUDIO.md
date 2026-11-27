# Piano: impronta studia da solo (prossimo lavoro)

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
