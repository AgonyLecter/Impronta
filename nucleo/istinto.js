/* nucleo · istinto
   Esempi innati (~550) per la testa affettiva: servono a CAPIRE le emozioni, mai a parlare.
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
G|sono troppo felice
G|oggi è una giornata perfetta
G|mi sento benissimo
G|sono contentissima
G|che bello ce l'abbiamo fatta
G|ho passato l'interrogazione
G|mi hanno preso al lavoro nuovo
G|stasera si festeggia
G|sono così felice che potrei urlare
G|evvai è arrivato il pacco
G|oggi ho riso tantissimo con i miei amici
G|che spettacolo questo tramonto
G|sono di buon umore
G|tutto procede alla grande
G|mi sono goduto la giornata
G|sono entusiasta del viaggio
G|che soddisfazione finire il progetto
G|sono fiera di me
G|sono fiero di quello che ho fatto
G|finalmente in vacanza
G|è nato mio nipote che emozione bellissima
G|abbiamo ballato tutta la notte
G|che divertimento la festa
G|oggi va tutto per il verso giusto
G|che felicità
G|mi sento pieno di energia e allegro
G|sono allegra oggi
G|ho trovato i biglietti per il concerto
G|ho ricevuto un complimento bellissimo
G|la torta è venuta buonissima
G|sorrido da stamattina
G|che bella notizia sono felice
G|non sono mai stato così bene
G|evviva ho finito la scuola
G|il mio sogno si è avverato
G|mi sento rinato
G|ahahah troppo divertente
G|siamo usciti ed è stato fantastico
G|sono felice per te
G|che giornata splendida
T|oggi è una brutta giornata
T|mi sento giù
T|sono tristissima
T|mi sento vuoto dentro
T|mi ha lasciato la mia ragazza
T|mi ha lasciata il mio ragazzo
T|sono deluso da tutti
T|sono delusa da me stessa
T|ho litigato con la mia amica e ora sto male
T|mi manca casa
T|è morto mio zio
T|sto soffrendo tanto
T|mi sento abbandonato
T|che malinconia stasera
T|non mi vuole bene nessuno
T|ho preso un brutto voto e mi sento uno schifo
T|sono a terra
T|piango da ieri
T|mi viene da piangere
T|non riesco a smettere di pensarci e sto male
T|è stata una settimana orribile
T|i miei genitori si separano
T|non ho amici
T|tutto va storto e sono triste
T|mi hanno escluso dal gruppo
T|che tristezza
T|ho il morale sotto i piedi
T|sono amareggiato
T|mi sento perso
T|mi manca da morire
T|mi sono sentita sola tutto il giorno
T|ho nostalgia dei vecchi tempi
T|ho perso una persona cara
R|sono arrabbiato
R|sono arrabbiatissima
R|mi fa arrabbiare
R|non sopporto le bugie
R|basta mi hai stufato
R|sono stufo di tutto questo
R|sono stufa di essere presa in giro
R|mi ha urlato contro senza motivo
R|odio questa situazione
R|è una vergogna
R|sono nervosissimo
R|mi girano le scatole
R|lasciami in pace
R|non mi rompere
R|ma ti sembra il modo
R|che schifo di trattamento
R|mi hanno fregato
R|sono livido di rabbia
R|smettila subito
R|mi ha insultato davanti a tutti
R|sono indignato
R|non è giusto per niente
R|mi hanno fatto un torto
R|ho voglia di spaccare tutto
R|sei insopportabile
R|vaffanculo
R|che idiota
R|mi dà fastidio quando fa così
R|sono irritato
R|mi ha tradito e sono furioso
R|non ne posso più di lui
R|mi fa salire il sangue alla testa
R|ce l'ho a morte con lei
R|sono incazzata
R|mi stanno facendo perdere la pazienza
R|quanto mi irrita
R|ho perso la pazienza
P|ho tanta paura
P|sono terrorizzato
P|sono spaventata
P|ho l'ansia
P|mi sale l'ansia
P|ho paura che succeda qualcosa
P|sono preoccupata per l'esame
P|mi tremano le gambe
P|ho il cuore in gola
P|ho avuto un attacco di panico
P|temo il peggio
P|ho paura del dentista
P|ho paura di volare
P|e se mi bocciano
P|e se non torna più
P|che spavento
P|mi sono spaventato tantissimo
P|sono nel panico
P|sono in pensiero per te
P|ho paura del futuro
P|mi fa paura stare al buio
P|ho paura dei cani grandi
P|sono angosciato
P|ho paura di non farcela
P|che ansia la verifica
P|sono preoccupato da giorni
P|ho paura di deluderli
P|mi agita l'idea del colloquio
P|ho paura delle altezze
P|ho una paura matta
P|sono inquieto
P|mi fa paura quello che può succedere
P|tremo di paura
P|ho paura di ammalarmi
A|ti voglio bene
A|ti voglio bene davvero
A|sei importante per me
A|sei la mia persona preferita
A|ti amo
A|mi fai stare bene
A|grazie di tutto
A|grazie amico mio
A|sei un tesoro
A|sei bellissimo
A|ti stimo tanto
A|mi piaci tanto
A|ti penso
A|ti ringrazio di cuore
A|sei sempre nei miei pensieri
A|abbracciami
A|un bacio grande
A|sei fantastico amico mio
A|ti voglio tanto tanto bene
A|sono grato di averti
A|sono grata per la mia famiglia
A|voglio bene a mia sorella
A|adoro mio fratello
A|mio padre è il mio eroe
A|la mia mamma è la migliore
A|sei sempre gentile
A|sei carinissimo
A|mi sei mancata
A|che bello parlare con te
A|ti voglio con me
A|sei il mio amico del cuore
A|tengo tanto a te
A|non so cosa farei senza di te
A|sei dolce
A|ti mando un abbraccio
A|mi fido di te
A|ti voglio bene anche se non te lo dico mai
A|grazie che ci sei sempre
A|sei proprio un amico
A|baci
I|che bello piove
I|che bello anche oggi traffico
I|evviva un'altra riunione
I|wow che sorpresa un altro compito
I|perfetto ci mancava solo questa
I|bravo davvero un genio
I|ma certo tranquillo fai pure con calma
I|sì sì come no
I|certo e io sono la regina d'inghilterra
I|ma che fortuna si è rotta la lavatrice
I|adoro alzarmi alle sei
I|che meraviglia lo sciopero dei treni
I|fantastico è finito il caffè
I|bellissimo il mio telefono è morto
I|ottimo anche oggi in ritardo
I|stupendo un'altra bolletta
I|che gioia fare la fila
I|ah certo è sempre colpa mia
I|ma bravo complimenti davvero
I|che onore mi hai risposto dopo tre giorni
I|benissimo ho dimenticato le chiavi
I|meraviglioso piove sul bucato
I|evviva il traffico delle otto
I|grazie tante per l'aiuto eh
I|che culo proprio oggi
I|perfetto il computer si è bloccato
I|che divertimento fare i compiti di domenica
I|adoro quando mi ignorano
I|wow che originalità
I|eh certo perché no
I|che bello lavorare di sabato
I|fantastico mi hanno cancellato il volo
I|sì certo come se fosse facile
I|incredibile hai fatto una cosa giusta
I|che simpatico proprio
I|ma dai che novità sei in ritardo
I|grandioso si è bucata la gomma
I|non vedo l'ora di fare la dichiarazione dei redditi
I|bello il freddo quando non c'è il riscaldamento
S|sono stanco
S|sono stanchissima
S|ho sonno
S|ho tanto sonno
S|non ho dormito
S|sono sfinita
S|che fatica
S|sono morto di stanchezza
S|vado a letto
S|che giornata lunga
S|ho lavorato dodici ore
S|non mi reggo in piedi
S|sono a pezzi
S|mi addormento sul divano
S|crollo dal sonno
S|sono senza forze
S|ho la testa che scoppia dalla stanchezza
S|ho bisogno di una vacanza
S|stanotte non ho chiuso occhio
S|sono stanca di correre tutto il giorno
S|che sonno stamattina
S|sbadiglio da ore
S|ho le pile scariche
S|sono spompato
S|non riesco a tenere gli occhi aperti
S|ho fatto le ore piccole
S|oggi sono stravolto
S|mi butto a letto
S|dormirei per due giorni
S|sono stanco di studiare
S|sono cotto
S|che sfacchinata
S|sono fuso
S|mi serve un caffè sono stanchissimo
S|buonanotte sono distrutta
O|non ci credo
O|ma davvero
O|ma no
O|che sorpresa
O|non me l'aspettavo
O|mamma mia che notizia
O|ma stai scherzando
O|non posso crederci
O|accidenti non lo sapevo
O|ma sei serio
O|oddio davvero
O|chi l'avrebbe mai detto
O|sono senza parole
O|ma come è possibile
O|e questo da dove esce
O|accipicchia
O|ma che dici
O|non l'avrei mai detto
O|ma veramente
O|oh mio dio
O|wow incredibile
O|sono sbalordito
O|sono stupita
O|è successo all'improvviso
O|che colpo di scena
O|mi hai lasciato di stucco
O|ma dici sul serio
O|è arrivato senza avvisare
O|ma tu guarda
O|non ci avrei mai pensato
O|ma che bello vederti qui all'improvviso
O|non me lo sarei mai immaginato
O|ma è vero
O|ma quando è successo
N|domani lavoro
N|sto studiando
N|oggi ho fatto la spesa
N|devo chiamare mia madre
N|ho finito di mangiare
N|stasera esco con gli amici
N|il negozio chiude alle sette
N|ho un appuntamento alle cinque
N|sto cucinando
N|vado in palestra
N|domani piove
N|sono in ufficio
N|ho parcheggiato la macchina
N|la scuola inizia a settembre
N|mio fratello gioca a calcio
N|ho letto il giornale
N|devo pagare l'affitto
N|sto ascoltando la radio
N|ho preso un caffè
N|il cane dorme
N|oggi è martedì
N|sono uscito a fare due passi
N|ho lavato i piatti
N|domani vado dal medico
N|abito vicino alla stazione
N|ho cambiato telefono
N|sto aspettando l'autobus
N|il film dura due ore
N|ho messo in ordine la camera
N|sì
N|no
N|ciao
N|buongiorno
N|a dopo
N|capito
N|forse
N|vediamo
N|dimmi
N|niente di speciale
TR|mi ha tradito e sto male ma sono anche arrabbiato
TP|ho paura di restare sola per sempre
TS|sono stanco e triste
GO|wow che bella sorpresa
GA|grazie che bello sono felice di averti
IR|grazie davvero eh sei proprio di grande aiuto
IS|che bello un'altra notte in bianco
PO|oddio che spavento
N|la lavatrice è in bagno
N|prendo il treno delle nove
N|il treno arriva alle undici
N|ho fatto la coda alla cassa
N|oggi piove a milano
N|lunedì ricomincia la scuola
N|il traffico in centro è normale a quest'ora
N|ho una riunione domani mattina
N|il computer è sulla scrivania
N|devo ricaricare il telefono
N|ho prenotato il medico per giovedì
N|il caffè è sul tavolo
N|stasera mangiamo il pesce
N|vado a fare la spesa al mercato
N|il libro è sul comodino
N|ho pagato la bolletta della luce
N|la posta arriva di mattina
N|oggi faccio le pulizie
N|domani compro le scarpe
N|stasera c'è il film in televisione
N|ho la verifica giovedì
N|il negozio è in fondo alla strada
N|sto tornando a casa
N|ho apparecchiato la tavola
N|il gatto mangia le crocchette
N|la macchina è dal meccanico
N|la cena è alle otto
N|ho scritto una mail al professore
N|il compito è per lunedì
G|sono soddisfatto del risultato
G|ho passato l'esame
G|mi hanno fatto un regalo bellissimo
G|non smetto di ridere
G|sono pieno di gioia
G|è il momento più bello
G|sono emozionato e felice
G|oggi sono raggiante
G|abbiamo vinto
G|ho vinto un premio
G|sono stato bravissimo all'esame
G|è andata benissimo
G|che fortuna sono felicissimo
T|il mio criceto è morto
T|ho perso mia nonna
T|al funerale ho pianto tanto
T|sto male per lei
T|nessuno mi ha fatto gli auguri
T|mi hanno dimenticato
T|sono rimasta sola
T|mi sento triste quando ci penso
T|ho le lacrime agli occhi
T|che dolore
T|sono addolorato
T|è stato un giorno triste
R|sono incavolato
R|ma come si fa a essere così
R|mi hanno fatto arrabbiare tantissimo
R|sono infuriata
R|sono furibonda
R|mi ha mancato di rispetto
R|che maleducato
R|non tollero queste cose
P|mi terrorizza
P|ho il terrore di sbagliare
P|mi agito per niente
P|sono agitatissima
P|c'è qualcuno in casa ho paura
P|tremo come una foglia
P|ho una brutta sensazione
P|ho paura di parlare davanti a tutti
I|grazie per avermelo detto subito proprio
I|che bello ancora la lavatrice rotta
I|che bello aspettare il treno al freddo
S|che giornata pesante sono stanco
S|vorrei solo il mio letto
S|ho gli occhi pesanti
S|sono stanco morto dopo il lavoro
S|che stanchezza addosso
O|incredibile non è possibile
O|ma è vero quello che dici
O|guarda chi si vede
`;
const CODE = { G:"gioia", T:"tristezza", R:"rabbia", P:"paura", A:"affetto", I:"ironia", S:"stanchezza", O:"sorpresa" };
export function istinto(AFFETTI){
  return RAW.trim().split("\n").map(l => {
    const [c, t] = l.split("|"); const lab = AFFETTI.map(k => 0);
    for (const ch of c) if (CODE[ch]) lab[AFFETTI.indexOf(CODE[ch])] = 1;
    return { text: t, lab };
  });
}
