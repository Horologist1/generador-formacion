"""Sintetiza un lote de frases con Qwen3-TTS. Lo llama generar.py con el Python de .venv-qwen.
Entrada: JSON {"idioma": "en", "voz": "<descripción de la voz>", "referencia": ruta_wav, "trabajos": [{"texto", "salida"}]}

Para que la voz sea la MISMA en todo el curso:
  1) la primera vez se diseña la voz a partir de la descripción y se guarda una grabación de referencia;
  2) todas las frases se generan clonando esa referencia (modelo Base).
"""
import json
import sys
from pathlib import Path

import soundfile as sf
import torch
from qwen_tts import Qwen3TTSModel

IDIOMAS = {"en": "English", "es": "Spanish", "fr": "French", "de": "German", "it": "Italian", "pt": "Portuguese"}
pedido = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
idioma = IDIOMAS.get(pedido["idioma"], "English")
ref = Path(pedido["referencia"])
TEXTO_REF = {
    "English": "Hello, and welcome. Today we are going to learn something useful, step by step, and without any rush.",
    "Spanish": "Hola, y bienvenido. Hoy vamos a aprender algo útil, paso a paso, y sin ninguna prisa.",
}.get(idioma, "Hello, and welcome. Today we are going to learn something useful, step by step.")

if not ref.exists():
    print("    qwen: diseñando la voz de referencia…", flush=True)
    diseno = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign", device_map="cuda:0", dtype=torch.bfloat16)
    torch.manual_seed(7)
    wavs, sr = diseno.generate_voice_design(text=TEXTO_REF, language=idioma, instruct=pedido["voz"])
    ref.parent.mkdir(parents=True, exist_ok=True)
    sf.write(ref, wavs[0], sr)
    del diseno
    torch.cuda.empty_cache()

base = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-Base", device_map="cuda:0", dtype=torch.bfloat16)
prompt = base.create_voice_clone_prompt(ref_audio=str(ref), ref_text=TEXTO_REF)
for k, trabajo in enumerate(pedido["trabajos"], 1):
    torch.manual_seed(1)
    wavs, sr = base.generate_voice_clone(text=trabajo["texto"], language=idioma, voice_clone_prompt=prompt)
    sf.write(trabajo["salida"], wavs[0], sr)
    print(f"    qwen {k}/{len(pedido['trabajos'])}", flush=True)
