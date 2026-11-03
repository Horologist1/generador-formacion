"""
Voz de Azure Speech (voces neuronales nativas de España). Plan gratuito F0: 500.000 caracteres/mes.

La clave NO va en el guion: se lee de las variables de entorno AZURE_SPEECH_KEY y AZURE_SPEECH_REGION,
o del archivo .env en la raíz del proyecto (ver .env.ejemplo).
"""
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from xml.sax.saxutils import escape

RAIZ = Path(__file__).resolve().parent.parent


def credenciales():
    env = RAIZ / ".env"
    if env.exists():
        for linea in env.read_text(encoding="utf-8").splitlines():
            if "=" in linea and not linea.strip().startswith("#"):
                k, v = linea.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"'))
    clave, region = os.environ.get("AZURE_SPEECH_KEY"), os.environ.get("AZURE_SPEECH_REGION")
    if not clave or not region:
        sys.exit("Faltan AZURE_SPEECH_KEY y AZURE_SPEECH_REGION. Cópialos en el archivo .env (ver .env.ejemplo).")
    return clave, region


def _peticion(url, clave, datos=None, cabeceras=None, intentos=6):
    cab = {"Ocp-Apim-Subscription-Key": clave, "User-Agent": "generador-lecciones"}
    cab.update(cabeceras or {})
    for i in range(intentos):
        req = urllib.request.Request(url, data=datos, headers=cab, method="POST" if datos else "GET")
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 429 and i < intentos - 1:  # el plan gratuito limita peticiones por minuto
                espera = int(e.headers.get("Retry-After") or 0) or (5 * (i + 1))
                print(f"    (límite del plan gratuito, espero {espera}s)", flush=True)
                time.sleep(espera)
                continue
            cuerpo = e.read().decode("utf-8", "replace")[:300]
            if e.code == 401:
                sys.exit("Azure rechaza la clave (401). Revisa AZURE_SPEECH_KEY y AZURE_SPEECH_REGION en .env.")
            sys.exit(f"Error de Azure {e.code}: {cuerpo}")


def listar_voces(locale_prefijo="es-ES"):
    clave, region = credenciales()
    url = f"https://{region}.tts.speech.microsoft.com/cognitiveservices/voices/list"
    voces = json.loads(_peticion(url, clave))
    return [v for v in voces if v["Locale"].startswith(locale_prefijo)]


def sintetizar(texto, voz, velocidad=1.0, estilo=None):
    """Devuelve bytes WAV (PCM 24 kHz, 16 bits, mono)."""
    clave, region = credenciales()
    locale = "-".join(voz.split("-")[:2])
    contenido = escape(texto)
    if abs(float(velocidad) - 1.0) > 0.001:
        contenido = f'<prosody rate="{float(velocidad):.2f}">{contenido}</prosody>'
    if estilo:
        contenido = f'<mstts:express-as style="{escape(estilo)}">{contenido}</mstts:express-as>'
    ssml = (f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" '
            f'xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="{locale}">'
            f'<voice name="{escape(voz)}">{contenido}</voice></speak>')
    url = f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1"
    return _peticion(url, clave, ssml.encode("utf-8"), {
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "riff-24khz-16bit-mono-pcm",
    })


class VozAzure:
    def __init__(self, nombre, velocidad, cache_dir: Path, estilo=None):
        self.nombre = nombre
        self.velocidad = float(velocidad)
        self.estilo = estilo
        self.cache = cache_dir
        self.generadas = 0
        self.cacheadas = 0
        self.caracteres = 0

    def wav(self, texto) -> Path:
        clave = hashlib.sha1(f"azure|{self.nombre}|{self.velocidad}|{self.estilo}|{texto}".encode()).hexdigest()[:16]
        ruta = self.cache / f"{clave}.wav"
        if ruta.exists():
            self.cacheadas += 1
            return ruta
        self.cache.mkdir(parents=True, exist_ok=True)
        tmp = ruta.with_suffix(".tmp")
        tmp.write_bytes(sintetizar(texto, self.nombre, self.velocidad, self.estilo))
        tmp.replace(ruta)
        self.generadas += 1
        self.caracteres += len(texto)
        return ruta
