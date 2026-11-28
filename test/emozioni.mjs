/* Comprensione emotiva su frasi MAI viste (nessuna di queste è in nucleo/istinto.js).
   Allena un Maestro come alla nascita e misura: l'emozione più forte è una di quelle giuste?
   (N = nessuna emozione: giusto se nessuna supera 0.5). Uso: node test/emozioni.mjs [giri] [seme] */
import { Maestro } from "../nucleo/maestro.js";
import { istinto } from "../nucleo/istinto.js";
import { AFFETTI } from "../nucleo/rete.js";

export const PROVA = `
G|oggi è il giorno più bello della mia vita
G|ho superato l'esame di guida
G|siamo andati al luna park ed è stato stupendo
G|mi hanno regalato una bicicletta nuova
G|che gioia rivedere il sole
G|sono proprio soddisfatta di come è andata
G|abbiamo vinto il campionato
G|sto ridendo da mezz'ora
G|che serata meravigliosa
G|sono al settimo cielo
T|oggi mi sento triste e non so perché
T|sento tanto la mancanza di mio nonno
T|al mio compleanno non è venuto nessuno
T|ho pianto tutto il pomeriggio
T|il mio gatto è morto ieri
T|mi sento sola anche in mezzo agli altri
T|sono giù di morale da giorni
T|la mia migliore amica si è trasferita lontano
T|è finita male con lui e sto malissimo
T|ho il cuore spezzato
R|sono arrabbiatissimo con il mio capo
R|basta non ne posso più di questa gente
R|mi ha mentito di nuovo e sono furibondo
R|che rabbia mi hanno rubato la bici
R|odio quando mi interrompono
R|mi fa impazzire quando fa così
R|sono incavolata nera
R|non lo sopporto più quel tizio
R|mi hanno trattato malissimo al negozio
R|ma come si permette
P|ho tanta paura del buio
P|domani ho l'operazione e sono terrorizzata
P|ho sentito un rumore strano in casa
P|sono in ansia per i risultati
P|tremo all'idea di parlare in pubblico
P|ho paura di perdere il lavoro
P|mi agito sempre prima degli esami
P|e se poi va tutto storto
P|ho il terrore dei ragni
P|sono preoccupato per mia madre
A|ti voglio un mondo di bene
A|sei il mio migliore amico
A|mi piace tanto parlare con te
A|grazie per avermi ascoltato
A|abbraccio forte la mia mamma
A|sei sempre gentile con me
A|ti penso spesso
A|mi sei mancato tantissimo
A|voglio bene ai miei fratelli
A|sei unico
I|che bello un'altra coda alle poste
I|evviva il lunedì mattina
I|bravo complimenti hai rotto anche questo
I|certo come no ci credo proprio
I|fantastico ho perso il treno di nuovo
I|che fortuna piove proprio oggi che sono uscito senza ombrello
I|grazie mille per avermi avvisato all'ultimo minuto
I|adoro aspettare due ore dal medico
I|meraviglioso il wifi non va
I|ottimo lavoro davvero hai cancellato tutto
S|non ce la faccio più sono sfinito
S|ho dormito solo tre ore
S|che stanchezza oggi
S|sono a pezzi dopo la palestra
S|ho bisogno di dormire
S|faccio fatica a tenere gli occhi aperti
S|giornata pesantissima non vedo l'ora di andare a letto
S|sono cotta
S|non ho più energie
S|vado a dormire sono esausta
O|non ci posso credere ha vinto lui
O|ma davvero ti sposi
O|wow non me lo aspettavo
O|incredibile è nevicato a maggio
O|ma che sorpresa vederti qui
O|davvero sono già le dieci
O|ma dai non lo sapevo
O|ma sul serio è successo questo
O|caspita che notizia
O|sono rimasto a bocca aperta
N|domani vado al supermercato
N|il treno per milano parte alle otto e dieci
N|ho cucinato la pasta
N|stasera guardo un documentario
N|la riunione è alle tre
N|ho comprato il latte e le uova
N|devo fare la lavatrice
N|il libro ha trecento pagine
N|stasera ceno a casa
N|sono in macchina
`;
const CODE = { G:"gioia", T:"tristezza", R:"rabbia", P:"paura", A:"affetto", I:"ironia", S:"stanchezza", O:"sorpresa" };
export function prova(){ return PROVA.trim().split("\n").map(l => { const [c, t] = l.split("|"); return { t, want: [...c].map(ch => CODE[ch]).filter(Boolean) }; }); }

/* secondo banco, scritto alla cieca DOPO aver allargato l'istinto: è la misura onesta */
export const PROVA2 = `
G|stamattina mi hanno chiamato per dirmi che il lavoro è mio
G|io e giulia siamo andati al concerto e ci siamo divertiti un sacco
G|ho finalmente finito di montare il mobile e funziona tutto
G|oggi il mister mi ha fatto giocare titolare
G|la mia squadra ha segnato all'ultimo minuto che emozione
G|è arrivata la primavera e sono di ottimo umore
G|ho ricevuto la lettera di ammissione all'università
G|mamma ha detto sì per la gita
G|oggi ho imparato ad andare in bici senza rotelle
G|che spasso ieri sera con i cugini
T|da quando se n'è andato la casa è silenziosa e vuota
T|stasera nessuno mi ha scritto
T|non riesco a dimenticarla e mi fa male
T|mio padre è in ospedale e sono a pezzi dentro
T|ho rotto con marco dopo tre anni
T|ogni volta che passo davanti alla sua casa mi viene il magone
T|mi sento invisibile a scuola
T|il mio migliore amico non mi parla più
T|oggi è l'anniversario della morte di mia madre
T|mi sento così solo la sera
R|il vicino ha di nuovo parcheggiato davanti al mio cancello
R|mi hanno fatto aspettare un'ora e poi mi hanno mandato via
R|sono fuori di me per come mi ha risposto
R|ma possibile che nessuno ascolti mai
R|mi ha preso in giro davanti a tutta la classe e sono nero
R|che nervoso questi che ti superano in coda
R|giuro che se lo rifà non rispondo di me
R|il tecnico non è venuto per la terza volta
R|non sopporto chi parla al cinema
R|ce l'ho con mio fratello mi ha rotto il telefono
P|domani devo fare le analisi e ho una paura tremenda
P|stanotte c'era un temporale fortissimo e non riuscivo a respirare dalla paura
P|ho un nodo allo stomaco per il colloquio
P|non trovo più mio figlio al parco
P|ho paura che mi lasci
P|il medico vuole rivedermi e sono preoccupatissima
P|ogni volta che prendo l'aereo sudo freddo
P|ho paura di non passare l'anno
P|sento dei rumori in cantina e non ho il coraggio di scendere
P|sono nel panico per la presentazione di domani
A|nonna sei la mia stella
A|grazie per esserci stato quando avevo bisogno
A|voglio un bene immenso al mio cane
A|sei la persona che mi capisce di più
A|un abbraccio fortissimo a te
A|quanto ti voglio bene sorellina
A|mi rendi felice ogni giorno
A|sei sempre stato al mio fianco
A|ti tengo nel cuore
A|che bello averti come amico
I|ah perfetto la macchina non parte proprio stamattina
I|che meraviglia ho macchiato la camicia bianca prima del colloquio
I|bravissimo hai perso di nuovo le chiavi
I|certo perché io non ho niente da fare tutto il giorno
I|grazie mille per avermi lasciato i piatti da lavare
I|evviva un'altra settimana di pioggia
I|che bello svegliarsi con il trapano del vicino
I|ottimo il treno è soppresso un'altra volta
I|ma che gentile a ricordarti di me dopo un mese
I|fantastico ho preso la multa
S|ho studiato tutta la notte e sono distrutta
S|non ho più la forza di alzarmi dal divano
S|oggi mi trascino
S|ho fatto tre turni di fila
S|sono spossato
S|mi sono addormentata in metro
S|ho bisogno di staccare la spina
S|che pesantezza oggi non ce la faccio
S|dopo il trasloco sono sfinito
S|stasera crollo presto
O|ma come hai fatto a saperlo
O|non avrei mai immaginato che fosse lui
O|ma è già finita la partita
O|sei incinta davvero
O|mi hai fatto prendere un colpo non ti avevo visto
O|ha nevicato a luglio non è possibile
O|ma quindi si sono lasciati
O|cosa mi dici mai
O|chi se lo aspettava un risultato così
O|ho vinto alla lotteria non ci credo
N|ho appena finito di lavare la macchina
N|domani mattina ho lezione alle nove
N|la farmacia è aperta fino alle venti
N|mio cugino abita a napoli
N|sto leggendo un romanzo giallo
N|ho spostato l'appuntamento a venerdì
N|stasera vado a correre
N|la partita è alle quattro
N|ho comprato un quaderno nuovo
N|il pullman passa ogni mezz'ora
`;
export function prova2(){ return PROVA2.trim().split("\n").map(l => { const [c, t] = l.split("|"); return { t, want: [...c].map(ch => CODE[ch]).filter(Boolean) }; }); }

const corpus = ["oggi sono stanco ma felice","ho mangiato la pizza con mia mamma","domani ho la verifica di storia","mi piace il calcio e la musica","il mare è bello d estate","voglio andare al mare con i miei amici","la scuola è noiosa ma ci sono i miei amici","oggi ho giocato a calcio con mio fratello","mia mamma fa la pizza più buona","sono felice quando vado al mare","non mi piace la matematica","stasera guardo la partita di calcio"];

if (import.meta.url === `file://${process.argv[1]}`){
  const giri = +(process.argv[2] || 40), seme = +(process.argv[3] || 3);
  // nessuna frase di prova deve stare nell'istinto
  const norm = s => s.toLowerCase().replace(/[^\p{L}\s']/gu, "").trim();
  const ist = new Set(istinto(AFFETTI).map(e => norm(e.text)));
  const P = prova(), P2 = prova2(), doppie = [...P, ...P2].filter(p => ist.has(norm(p.t)));
  console.log(doppie.length ? "NO frasi di prova già nell'istinto: " + doppie.map(p => p.t).join(" · ") : "ok nessuna frase di prova è nell'istinto");
  const m = new Maestro(); m.init({ corpus, seed: seme });
  const t0 = Date.now();
  for (let i = 0; i < giri; i++) m.impara(500);
  console.log(`istinto ${istinto(AFFETTI).length} frasi · ${giri} giri · ${((Date.now()-t0)/1000).toFixed(0)} s · neuroni ${m.net.H}`);
  for (const [nome, B] of [["banco 1", P], ["banco 2 (alla cieca)", P2]]){
    const per = {}; let ok = 0;
    for (const p of B){
      const a = m.senti(p.t), top = a._top, conf = a._conf;
      const giusto = p.want.length ? p.want.includes(top) && conf > .3 : conf < .5;
      const k = p.want[0] || "nessuna"; per[k] = per[k] || [0, 0]; per[k][1]++; if (giusto){ per[k][0]++; ok++; }
    }
    console.log(`${nome}: comprensione su frasi nuove ${(ok/B.length*100).toFixed(0)}% (${ok}/${B.length}) · ` + Object.entries(per).map(([k, [g, n]]) => `${k} ${g}/${n}`).join(" "));
  }
}
