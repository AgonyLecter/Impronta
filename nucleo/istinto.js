/* nucleo · istinto
   Esempi innati per la testa affettiva: servono a CAPIRE le emozioni, mai a parlare.
   Codici: G gioia · T tristezza · R rabbia · P paura · A affetto · I ironia · S stanchezza · O sorpresa · N nessuna
   L'ironia è il caso difficile: parole positive in un contesto negativo, esagerazione, "certo, come no". */
const RAW = `
G|sono felicissimo oggi
G|che bella giornata
G|ho preso un bel voto
G|evviva sono stato promosso
G|oggi è andato tutto bene
G|mi sono divertito tantissimo
G|ahah che ridere
G|sono contento di vederti
G|finalmente è venerdì
G|ho vinto la partita
G|che bello il mare d'estate
G|sono di ottimo umore
G|oggi mi sento leggero
G|abbiamo festeggiato tutta la sera
G|non vedo l'ora di partire
G|è stata una serata fantastica
G|mi hanno fatto una sorpresa bellissima
G|ce l'ho fatta finalmente
G|sto benissimo grazie
G|oggi rido per tutto
GA|ti voglio bene sei il mio amico
A|ti voglio tanto bene
A|sei dolcissimo
A|mi manchi
A|grazie di esserci
A|sei speciale per me
A|ti abbraccio forte
A|mi fai compagnia
A|sei la cosa più bella della giornata
A|ti adoro
A|voglio bene alla mia famiglia
A|mia nonna è la persona più buona del mondo
A|il mio cane mi aspetta sempre alla porta
A|sono fortunato ad averti
GA|oggi ho visto i miei amici ed è stato bellissimo
T|sono triste
T|oggi mi sento giù
T|mi sento solo
T|nessuno mi capisce
T|ho voglia di piangere
T|è stata una giornata orribile
T|mi manca tanto mio nonno
T|mi hanno lasciato
T|non ho più amici
T|mi sento vuoto
T|non ho voglia di fare niente
T|sono deluso
T|è finita
T|ho perso il mio cane
T|mi sento inutile
T|piove e sono giù
T|stasera mi sento malinconico
T|nessuno si è ricordato del mio compleanno
T|ho litigato con la mia migliore amica
T|non sto bene
T|mi sento un fallimento
T|è tutto grigio
TS|sono stanco di tutto
TP|ho paura di restare solo
TR|mi hanno trattato male e ci sono rimasto male
R|sono arrabbiatissimo
R|mi ha fatto incazzare
R|non lo sopporto più
R|che nervi
R|basta non ne posso più
R|odio quando fanno così
R|mi hanno rubato la bici
R|è un'ingiustizia
R|mi ha mentito di nuovo
R|che rabbia
R|sono furioso
R|non mi ascolta mai nessuno
R|ma stai zitto
R|fai schifo
R|sei stupido
R|ti odio
P|ho paura
P|domani ho l'esame e sono terrorizzato
P|sono in ansia
P|ho paura del buio
P|mi tremano le mani
P|e se va tutto male
P|ho un brutto presentimento
P|non riesco a dormire per l'ansia
P|ho paura di sbagliare
P|sono agitato per domani
P|ho il cuore che batte forte
P|temo di non farcela
PS|sono preoccupato e non dormo
S|sono stanco morto
S|che sonno
S|ho dormito pochissimo
S|non ce la faccio più
S|vado a dormire
S|giornata lunghissima
S|sono distrutto
S|ho bisogno di riposare
S|mi si chiudono gli occhi
S|sono esausto
S|ho lavorato tutto il giorno
S|uff che fatica
O|non ci posso credere
O|davvero
O|ma dai
O|wow
O|incredibile
O|non me lo aspettavo
O|che cosa
O|seriamente
O|sul serio
O|oddio
GO|non ci credo ho vinto
TO|non me lo aspettavo da lui
I|che bello piove di nuovo
I|evviva un altro lunedì
I|certo come no
I|sì e io sono il papa
I|grazie eh gentilissimo
I|proprio quello che mi serviva un'altra verifica
I|fantastico il treno è in ritardo anche oggi
I|che fortuna ho perso le chiavi
I|wow che sorpresa ha vinto di nuovo lui
I|bravissimo complimenti hai rotto tutto
I|adoro aspettare due ore dal dottore
I|ma certo perché no
I|che novità è in ritardo
I|ottimo lavoro davvero
I|come se mi importasse
I|sono felicissimo di andare a scuola di sabato
I|che gioia fare i compiti
I|bellissimo il traffico stamattina
I|eh già sono proprio un genio
I|ma pensa un po'
I|ah beh allora
I|ma che strano
I|incredibile per una volta ha ragione
I|perfetto mancava solo questa
I|che divertimento pulire casa
I|amo quando il telefono si scarica
I|sì sì come dici tu
I|che sorpresa si è dimenticato
I|ma va
I|mi sto divertendo un sacco a fare la fila
I|meraviglioso piove proprio oggi che vado al mare
I|non vedo l'ora di fare il compito di matematica
I|che bello essere ignorati
I|gentile come sempre
I|ma guarda che caso
IR|bravo continua così che vai benissimo
IT|evviva un'altra giornata uguale a ieri
IS|che bello svegliarsi alle sei
GI|ahah che scemo sei
GI|lol certo
N|ho mangiato la pasta
N|domani vado a scuola
N|oggi piove
N|sono a casa
N|cosa fai
N|il treno parte alle otto
N|ho comprato il pane
N|sto guardando un film
N|come ti chiami
N|mi chiamo luca
N|ho un cane
N|abito a milano
N|il cielo è nuvoloso
N|ho finito i compiti
N|sto andando al lavoro
N|che ore sono
N|stasera c'è la partita
N|ho letto un libro
N|mia sorella ha dieci anni
N|devo andare dal dentista
N|ho preso il bus
N|sto mangiando
N|il mio colore preferito è il blu
N|ok
N|va bene
`;
const CODE = { G:"gioia", T:"tristezza", R:"rabbia", P:"paura", A:"affetto", I:"ironia", S:"stanchezza", O:"sorpresa" };
export function istinto(AFFETTI){
  return RAW.trim().split("\n").map(l => {
    const [c, t] = l.split("|"); const lab = AFFETTI.map(k => 0);
    for (const ch of c) if (CODE[ch]) lab[AFFETTI.indexOf(CODE[ch])] = 1;
    return { text: t, lab };
  });
}
