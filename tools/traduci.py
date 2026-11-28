"""impronta · traduttore libero (inglese → italiano) per il server dei sogni.
Usa il modello OPUS-MT en→it (Helsinki-NLP, licenza CC BY 4.0, da Hugging Face) convertito per CTranslate2,
con SentencePiece. Legge una lista JSON di frasi da stdin, scrive la lista tradotta.
Il modello si scarica e si converte una volta (tools/traduci.py --scarica, serve transformers + torch CPU)
e GitHub Actions lo tiene in cache: dopo bastano ctranslate2 e sentencepiece.
Se c'è ancora un vecchio modello Argos in cache lo usa come riserva (non lo scarica più: il sito rifiuta).
Se manca qualcosa, risponde con una lista di null: il server salta l'inglese e va avanti."""
import json, os, sys, shutil, subprocess

OPUS = os.environ.get("OPUS_DIR", os.path.expanduser("~/.impronta/opus"))
ARGOS = os.environ.get("ARGOS_DIR", os.path.expanduser("~/.impronta/argos"))
MODELLO_HF = "Helsinki-NLP/opus-mt-en-it"

def opus_pronto():
    return all(os.path.exists(os.path.join(OPUS, f)) for f in ("model.bin", "source.spm", "target.spm"))

def trova_argos():
    for radice, cartelle, file in os.walk(ARGOS):
        if "sentencepiece.model" in file and "model" in cartelle:
            return radice
    return None

def scarica():
    if opus_pronto():
        print("modello già presente:", OPUS, file=sys.stderr); return
    conv = shutil.which("ct2-transformers-converter")
    if not conv:
        raise RuntimeError("manca ct2-transformers-converter (pip install ctranslate2 transformers torch)")
    temp = OPUS + ".tmp"
    shutil.rmtree(temp, ignore_errors=True)
    os.makedirs(os.path.dirname(OPUS), exist_ok=True)
    # int8: modello più piccolo (~80 MB) e più veloce sulla CPU del server, qualità quasi identica
    subprocess.run([conv, "--model", MODELLO_HF, "--output_dir", temp, "--quantization", "int8",
                    "--copy_files", "source.spm", "target.spm"], check=True)
    shutil.rmtree(OPUS, ignore_errors=True)
    os.rename(temp, OPUS)
    print("modello pronto:", OPUS, file=sys.stderr)

def traduci_opus(frasi):
    import ctranslate2, sentencepiece
    src = sentencepiece.SentencePieceProcessor(model_file=os.path.join(OPUS, "source.spm"))
    tgt = sentencepiece.SentencePieceProcessor(model_file=os.path.join(OPUS, "target.spm"))
    tr = ctranslate2.Translator(OPUS, device="cpu", inter_threads=2)
    # come nella guida OPUS-MT di CTranslate2: pezzi SentencePiece + "</s>" in coda
    pezzi = [p + ["</s>"] for p in src.encode([f[:600] for f in frasi], out_type=str)]
    ris = tr.translate_batch(pezzi, beam_size=2, max_batch_size=32, max_decoding_length=256)
    return [tgt.decode([t for t in r.hypotheses[0] if t != "</s>"]) for r in ris]

def traduci_argos(frasi, cartella):
    import ctranslate2, sentencepiece
    sp = sentencepiece.SentencePieceProcessor(model_file=os.path.join(cartella, "sentencepiece.model"))
    tr = ctranslate2.Translator(os.path.join(cartella, "model"), device="cpu", inter_threads=2)
    pezzi = sp.encode([f[:600] for f in frasi], out_type=str)
    ris = tr.translate_batch(pezzi, beam_size=2, max_batch_size=32)
    return [sp.decode(r.hypotheses[0]) for r in ris]

def traduci(frasi):
    if not frasi:
        return []
    if opus_pronto():
        return traduci_opus(frasi)
    argos = trova_argos()
    if argos:
        return traduci_argos(frasi, argos)
    print("traduttore libero: modello assente", file=sys.stderr)
    return [None] * len(frasi)

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
