"""Sintetiza un lote de frases con Chatterbox. Lo llama generar.py con el Python de .venv-chatterbox.
Entrada: ruta a un JSON {"idioma": "en", "voz": "default" | ruta_wav_referencia, "trabajos": [{"texto", "salida"}]}
"""
import json
import sys
from pathlib import Path

import torch
import torchaudio as ta

pedido = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
idioma, voz = pedido["idioma"], pedido.get("voz", "default")
ref = None if voz in ("", "default") else voz

if idioma == "en":
    from chatterbox.tts import ChatterboxTTS          # modelo original, entrenado en inglés
    modelo = ChatterboxTTS.from_pretrained(device="cuda")
    generar = lambda t: modelo.generate(t, audio_prompt_path=ref)
else:
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    modelo = ChatterboxMultilingualTTS.from_pretrained(device="cuda")
    generar = lambda t: modelo.generate(t, language_id=idioma, audio_prompt_path=ref)

if ref:
    modelo.prepare_conditionals(ref)
    generar = (lambda t: modelo.generate(t)) if idioma == "en" else (lambda t: modelo.generate(t, language_id=idioma))

for k, trabajo in enumerate(pedido["trabajos"], 1):
    torch.manual_seed(1)
    wav = generar(trabajo["texto"])
    ta.save(trabajo["salida"], wav, modelo.sr, encoding="PCM_S", bits_per_sample=16)
    print(f"    chatterbox {k}/{len(pedido['trabajos'])}", flush=True)
