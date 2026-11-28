"""impronta · traduttore libero (inglese → italiano) per il server dei sogni.
Usa il modello Argos Translate en→it (OpenNMT, licenza libera) con CTranslate2 e SentencePiece,
senza le dipendenze pesanti di argostranslate. Legge una lista JSON di frasi da stdin, scrive la lista tradotta.
Il modello si scarica una volta (tools/traduci.py --scarica) e GitHub Actions lo tiene in cache.
Se manca qualcosa, risponde con una lista di null: il server salta l'inglese e va avanti."""
import json, os, sys, io, zipfile, urllib.request

CARTELLA = os.environ.get("ARGOS_DIR", os.path.expanduser("~/.impronta/argos"))
INDICE = "https://raw.githubusercontent.com/argosopentech/argospm-index/main/index.json"

def trova_modello():
    for radice, cartelle, file in os.walk(CARTELLA):
        if "sentencepiece.model" in file and "model" in cartelle:
            return radice
    return None

def scarica():
    if trova_modello():
        print("modello già presente", file=sys.stderr); return
    indice = json.load(urllib.request.urlopen(INDICE, timeout=60))
    pacchetto = next(p for p in indice if p.get("from_code") == "en" and p.get("to_code") == "it")
    # l'indice ufficiale elenca più indirizzi per lo stesso modello: il sito di Argos e una copia su IPFS
    # (rete di distribuzione pubblica). Se il primo rifiuta i download automatici, si usa il secondo.
    dati = None
    for link in pacchetto["links"]:
        url = "https://ipfs.io/ipfs/" + link[len("ipfs://"):] if link.startswith("ipfs://") else link
        try:
            dati = urllib.request.urlopen(url, timeout=300).read(); print("scaricato da", url, file=sys.stderr); break
        except Exception as e:
            print("non disponibile:", url, "·", e, file=sys.stderr)
    if dati is None:
        raise RuntimeError("nessun indirizzo del modello disponibile")
    os.makedirs(CARTELLA, exist_ok=True)
    zipfile.ZipFile(io.BytesIO(dati)).extractall(CARTELLA)
    print("modello scaricato:", trova_modello(), file=sys.stderr)

def traduci(frasi):
    cartella = trova_modello()
    if not cartella:
        print("traduttore libero: modello assente", file=sys.stderr); return [None] * len(frasi)
    import ctranslate2, sentencepiece
    sp = sentencepiece.SentencePieceProcessor(model_file=os.path.join(cartella, "sentencepiece.model"))
    tr = ctranslate2.Translator(os.path.join(cartella, "model"), device="cpu", inter_threads=2)
    pezzi = sp.encode([f[:600] for f in frasi], out_type=str)
    ris = tr.translate_batch(pezzi, beam_size=2, max_batch_size=32)
    return [sp.decode(r.hypotheses[0]) for r in ris]

if __name__ == "__main__":
    if "--scarica" in sys.argv:
        scarica()
    else:
        frasi = json.load(sys.stdin)
        try:
            out = traduci(frasi)
        except Exception as e:
            print("traduttore libero:", e, file=sys.stderr); out = [None] * len(frasi)
        json.dump(out, sys.stdout, ensure_ascii=False)
