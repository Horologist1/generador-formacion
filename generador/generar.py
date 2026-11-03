"""
Generador de lecciones: guion Markdown  ->  lección interactiva (HTML + voz + subtítulos + SCORM 1.2)

Uso:
    python generador/generar.py curso/curso.md

Resultado en salida/<nombre>/ (se abre con index.html) y salida/<nombre>_scorm.zip (para el LMS).
El audio se cachea por frase: si cambias una frase del guion, solo se regenera esa frase.
"""
import hashlib
import html
import json
import re
import shutil
import subprocess
import sys
import wave
import zipfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
VOCES = RAIZ / "voces"
CACHE = RAIZ / ".cache" / "tts"
PLANTILLA = RAIZ / "docs" / "leccion"

PAUSA_INICIO = 0.4   # segundos de silencio al empezar cada diapositiva
PAUSA_FRASE = 0.35   # silencio entre frases


# --------------------------------------------------------------------------- lectura del guion

def leer_guion(ruta: Path):
    texto = ruta.read_text(encoding="utf-8")
    texto = re.sub(r"<!--.*?-->", "", texto, flags=re.S)

    meta = {}
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", texto, flags=re.S)
    if m:
        for linea in m.group(1).splitlines():
            if ":" in linea:
                k, v = linea.split(":", 1)
                meta[k.strip()] = v.strip().strip('"').strip("'")
        texto = texto[m.end():]

    bloques = re.split(r"^## +", texto, flags=re.M)[1:]
    diapositivas = [leer_diapositiva(b, i + 1) for i, b in enumerate(bloques)]
    return meta, diapositivas


def leer_diapositiva(bloque: str, num: int):
    lineas = bloque.splitlines()
    d = {"num": num, "titulo": lineas[0].strip(), "tipo": "contenido",
         "vinetas": [], "narracion": [], "opciones": []}
    cuerpo = lineas[1:]

    # bloque ```correo
    i = 0
    resto = []
    while i < len(cuerpo):
        l = cuerpo[i]
        if l.strip().startswith("```correo"):
            j = i + 1
            contenido = []
            while j < len(cuerpo) and not cuerpo[j].strip().startswith("```"):
                contenido.append(cuerpo[j])
                j += 1
            d["correo"] = "\n".join(contenido)
            i = j + 1
            continue
        resto.append(l)
        i += 1

    for l in resto:
        s = l.strip()
        if not s:
            continue
        if s.startswith(">"):
            d["narracion"].append(s[1:].strip())
        elif re.match(r"^- \[( |x|X)\] ", s):
            d["opciones"].append({"texto": s[6:].strip(), "correcta": s[3].lower() == "x"})
        elif s.startswith("- "):
            d["vinetas"].append(s[2:].strip())
        elif re.match(r"^(tipo|cifra|texto|pregunta|explicacion|repasar):", s):
            k, v = s.split(":", 1)
            d[k] = v.strip()
    return d


# --------------------------------------------------------------------------- texto -> HTML

def inline(t: str) -> str:
    t = html.escape(t, quote=False)
    return re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)


def correo_a_html(src: str):
    """Devuelve (html, notas). Cada [[texto|nota]] es un elemento numerado (paso)."""
    notas = []

    def marca(m):
        cont, _, nota = m.group(1).partition("|")
        notas.append(nota.strip())
        n = len(notas)
        if cont.startswith("btn:"):
            dentro = f'<span class="correo-btn">{html.escape(cont[4:].strip())}</span>'
        else:
            dentro = html.escape(cont)
        return f'<mark class="paso" data-paso="{n}">{dentro}<sup>{n}</sup></mark>'

    cabecera, _, cuerpo = src.partition("\n\n")

    def proc(t):  # escapa y sustituye marcas
        partes = re.split(r"(\[\[.+?\]\])", t)
        out = []
        for p in partes:
            if p.startswith("[[") and p.endswith("]]"):
                out.append(marca(re.match(r"\[\[(.+)\]\]", p)))
            else:
                out.append(html.escape(p))
        return "".join(out)

    cab_html = "".join(
        f'<div class="correo-fila"><span class="correo-k">{html.escape(l.partition(":")[0].strip())}:</span> '
        f'<span class="correo-v">{proc(l.partition(":")[2].strip())}</span></div>'
        for l in cabecera.splitlines()
    )
    parrafos = [p.strip() for p in cuerpo.split("\n\n") if p.strip()]
    cuerpo_html = "".join(f"<p>{proc(p).replace(chr(10), '<br>')}</p>" for p in parrafos)
    return f'<div class="correo"><div class="correo-cab">{cab_html}</div><div class="correo-cuerpo">{cuerpo_html}</div></div>', notas


# --------------------------------------------------------------------------- voz

def dividir_frases(parrafos):
    frases = []
    for p in parrafos:
        for f in re.split(r"(?<=[.!?…])\s+", p):
            f = f.strip()
            if not f:
                continue
            pasos = [int(x) for x in re.findall(r"\{(\d+)\}", f)]
            limpio = re.sub(r"\s*\{\d+\}\s*", " ", f).strip()
            # [texto en pantalla](cómo se pronuncia): el subtítulo muestra lo primero, la voz dice lo segundo
            visible = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1", limpio)
            dicho = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\2", limpio)
            frases.append({"texto": visible, "dicho": dicho, "paso": max(pasos) if pasos else 0})
    return frases


def crear_voz(meta):
    motor = meta.get("motor", "piper").lower()
    velocidad = meta.get("velocidad", 1.0)
    if motor == "azure":
        from voz_azure import VozAzure
        return VozAzure(meta.get("voz", "es-ES-ElviraNeural"), velocidad, CACHE)
    if motor in ("chatterbox", "qwen"):
        return VozExterna(motor, meta.get("voz", "default"), meta.get("idioma", "es"))
    return Voz(meta.get("voz", "es_ES-davefx-medium"), velocidad)


class VozExterna:
    """Motores con GPU (Chatterbox, Qwen3-TTS) que viven en su propio entorno de Python.
    Se generan por lotes: el modelo se carga una sola vez para todas las frases que falten."""

    ENTORNOS = {"chatterbox": ".venv-chatterbox", "qwen": ".venv-qwen"}

    def __init__(self, motor, voz, idioma):
        self.motor, self.nombre, self.idioma = motor, voz, idioma
        self.generadas = 0
        self.cacheadas = 0

    def _ruta(self, texto):
        clave = hashlib.sha1(f"{self.motor}|{self.nombre}|{self.idioma}|{texto}".encode()).hexdigest()[:16]
        return CACHE / f"{clave}.wav"

    def preparar(self, textos):
        faltan = [t for t in dict.fromkeys(textos) if not self._ruta(t).exists()]
        self.cacheadas += len(set(textos)) - len(faltan)
        if not faltan:
            return
        CACHE.mkdir(parents=True, exist_ok=True)
        python = RAIZ / self.ENTORNOS[self.motor] / "Scripts" / "python.exe"
        if not python.exists():
            python = RAIZ / self.ENTORNOS[self.motor] / "bin" / "python"
        clave_voz = hashlib.sha1(f"{self.nombre}|{self.idioma}".encode()).hexdigest()[:10]
        pedido = {
            "idioma": self.idioma, "voz": self.nombre,
            "referencia": str(CACHE.parent / "referencias" / f"{self.motor}_{clave_voz}.wav"),
            "trabajos": [{"texto": t, "salida": str(self._ruta(t))} for t in faltan],
        }
        ruta_pedido = CACHE.parent / f"pedido_{self.motor}.json"
        ruta_pedido.write_text(json.dumps(pedido, ensure_ascii=False), encoding="utf-8")
        print(f"  Generando {len(faltan)} frases con {self.motor} (GPU)…", flush=True)
        script = Path(__file__).resolve().parent / "motores" / f"lote_{self.motor}.py"
        subprocess.run([str(python), str(script), str(ruta_pedido)], check=True)
        self.generadas += len(faltan)

    def wav(self, texto) -> Path:
        ruta = self._ruta(texto)
        if not ruta.exists():
            sys.exit(f"Falta el audio de: {texto}")
        return ruta


class Voz:
    """Piper: local, gratis, sin GPU."""

    def __init__(self, nombre, velocidad):
        self.nombre = nombre
        self.velocidad = float(velocidad)
        self._voz = None
        self.generadas = 0
        self.cacheadas = 0

    def _cargar(self):
        if self._voz is None:
            from piper import PiperVoice
            modelo = VOCES / f"{self.nombre}.onnx"
            if not modelo.exists():
                sys.exit(f"Falta la voz {modelo}. Descárgala con: python -m piper.download_voices {self.nombre}")
            self._voz = PiperVoice.load(str(modelo))
        return self._voz

    def wav(self, texto) -> Path:
        clave = hashlib.sha1(f"{self.nombre}|{self.velocidad}|{texto}".encode()).hexdigest()[:16]
        ruta = CACHE / f"{clave}.wav"
        if ruta.exists():
            self.cacheadas += 1
            return ruta
        from piper import SynthesisConfig
        CACHE.mkdir(parents=True, exist_ok=True)
        cfg = SynthesisConfig(length_scale=1.0 / self.velocidad)
        tmp = ruta.with_suffix(".tmp")
        with wave.open(str(tmp), "wb") as w:
            self._cargar().synthesize_wav(texto, w, syn_config=cfg)
        tmp.replace(ruta)
        self.generadas += 1
        return ruta


def duracion(ruta: Path) -> float:
    with wave.open(str(ruta), "rb") as w:
        return w.getnframes() / w.getframerate()


def montar_audio(wavs, destino: Path):
    """Concatena frases con silencios y codifica a MP3. Devuelve (inicio, fin) de cada frase."""
    with wave.open(str(wavs[0]), "rb") as w:
        params = w.getparams()
    rate, ancho, canales = params.framerate, params.sampwidth, params.nchannels
    silencio = lambda s: b"\x00" * int(rate * s) * ancho * canales

    tiempos, t = [], PAUSA_INICIO
    tmp = destino.with_suffix(".wav")
    with wave.open(str(tmp), "wb") as out:
        out.setparams(params)
        out.writeframes(silencio(PAUSA_INICIO))
        for k, ruta in enumerate(wavs):
            with wave.open(str(ruta), "rb") as w:
                frames = w.readframes(w.getnframes())
            dur = len(frames) / (rate * ancho * canales)
            tiempos.append((round(t, 2), round(t + dur, 2)))
            out.writeframes(frames)
            t += dur
            if k < len(wavs) - 1:
                out.writeframes(silencio(PAUSA_FRASE))
                t += PAUSA_FRASE
        out.writeframes(silencio(0.5))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(tmp),
                    "-codec:a", "libmp3lame", "-b:a", "64k", "-ac", "1", str(destino)], check=True)
    tmp.unlink()
    return tiempos


# --------------------------------------------------------------------------- construcción

def construir(ruta_guion: Path, cambios=None, nombre=None):
    meta, diapositivas = leer_guion(ruta_guion)
    meta.update({k: v for k, v in (cambios or {}).items() if v})
    nombre = nombre or ruta_guion.stem
    salida = RAIZ / "salida" / nombre
    if salida.exists():
        shutil.rmtree(salida)
    (salida / "audio").mkdir(parents=True)

    voz = crear_voz(meta)
    print(f"Motor de voz: {meta.get('motor', 'piper')} · {voz.nombre}")
    if hasattr(voz, "preparar"):
        voz.preparar([f["dicho"] for d in diapositivas for f in dividir_frases(d["narracion"])])
    titulos = {d["titulo"]: d["num"] for d in diapositivas}
    curso = {"meta": meta, "diapositivas": []}
    duracion_total = 0.0

    for d in diapositivas:
        item = {"num": d["num"], "titulo": d["titulo"], "tipo": d.get("tipo", "contenido")}

        if item["tipo"] == "correo" and "correo" in d:
            item["correo_html"], item["notas"] = correo_a_html(d["correo"])
        if d["vinetas"]:
            item["vinetas"] = [inline(v) for v in d["vinetas"]]
        for k in ("cifra", "texto"):
            if k in d:
                item[k] = inline(d[k])
        if item["tipo"] == "pregunta":
            item["pregunta"] = inline(d.get("pregunta", ""))
            item["opciones"] = [{"texto": inline(o["texto"]), "correcta": o["correcta"]} for o in d["opciones"]]
            item["explicacion"] = inline(d.get("explicacion", ""))
            if d.get("repasar"):
                if d["repasar"] not in titulos:
                    sys.exit(f"Diapositiva {d['num']}: 'repasar' apunta a «{d['repasar']}», que no existe.")
                item["repasar"] = titulos[d["repasar"]]

        frases = dividir_frases(d["narracion"])
        if frases:
            wavs = [voz.wav(f["dicho"]) for f in frases]
            fichero = f"audio/d{d['num']:02d}.mp3"
            tiempos = montar_audio(wavs, salida / fichero)
            item["audio"] = fichero
            item["frases"] = [{"ini": a, "fin": b, "texto": f["texto"], "paso": f["paso"]}
                              for f, (a, b) in zip(frases, tiempos)]
            item["duracion"] = tiempos[-1][1] + 0.5
            duracion_total += item["duracion"]
        curso["diapositivas"].append(item)
        print(f"  [{d['num']:02d}] {item['tipo']:<9} {d['titulo']}  ({len(frases)} frases)")

    curso["meta"]["duracion_total"] = round(duracion_total)

    # plantilla del reproductor
    for f in PLANTILLA.iterdir():
        shutil.copy(f, salida / f.name)
    (salida / "curso.js").write_text(
        "window.CURSO = " + json.dumps(curso, ensure_ascii=False, indent=1) + ";", encoding="utf-8")
    idx = salida / "index.html"
    idx.write_text(idx.read_text(encoding="utf-8")
                   .replace("{{TITULO}}", html.escape(meta.get("titulo", "Curso")))
                   .replace("{{IDIOMA}}", meta.get("idioma", "es")), encoding="utf-8")
    escribir_manifest(salida, meta, nombre)
    zip_ruta = RAIZ / "salida" / f"{nombre}_scorm.zip"
    with zipfile.ZipFile(zip_ruta, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(salida.rglob("*")):
            if f.is_file():
                z.write(f, f.relative_to(salida).as_posix())

    print(f"\nVoz: {voz.generadas} frases generadas, {voz.cacheadas} reutilizadas de la caché")
    if hasattr(voz, "caracteres"):
        print(f"Caracteres enviados a Azure en esta ejecución: {voz.caracteres:,} (plan gratuito: 500.000/mes)")
    print(f"Duración de la narración: {int(duracion_total // 60)} min {int(duracion_total % 60)} s")
    print(f"Lección:  {idx}")
    print(f"SCORM:    {zip_ruta}")


def escribir_manifest(salida: Path, meta, nombre):
    ficheros = "\n".join(f'      <file href="{f.relative_to(salida).as_posix()}"/>'
                         for f in sorted(salida.rglob("*")) if f.is_file())
    titulo = html.escape(meta.get("titulo", nombre))
    org = html.escape(meta.get("empresa", "Organización"))
    (salida / "imsmanifest.xml").write_text(f"""<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="{nombre}_manifest" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="org1">
    <organization identifier="org1">
      <title>{org}</title>
      <item identifier="item1" identifierref="res1">
        <title>{titulo}</title>
        <adlcp:masteryscore>{int(meta.get("nota_aprobado", 50))}</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res1" type="webcontent" adlcp:scormtype="sco" href="index.html">
{ficheros}
    </resource>
  </resources>
</manifest>
""", encoding="utf-8")


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser(description="Convierte un guion en una lección interactiva.")
    ap.add_argument("guion")
    ap.add_argument("--motor", help="piper | azure | chatterbox | qwen (por defecto, el del guion)")
    ap.add_argument("--voz", help="voz a usar (por defecto, la del guion)")
    ap.add_argument("--nombre", help="nombre de la carpeta de salida (por defecto, el del archivo)")
    a = ap.parse_args()
    construir(Path(a.guion).resolve(), {"motor": a.motor, "voz": a.voz}, a.nombre)
