"""
Guion -> VÍDEO ANIMADO (motion graphics sincronizados con la voz).

    python generador/video.py curso/curso_en.md --motor qwen --voz "descripción de la voz"

Cada tipo de diapositiva del guion se convierte en una escena animada:
  portada   título que entra palabra a palabra sobre un fondo en movimiento
  cifra     el número cuenta hasta su valor y se rellena un pictograma
  contenido las viñetas entran justo cuando la voz las nombra ({1}, {2}…)
  correo    la cámara hace zoom a cada señal, la resalta y explica con un globo
  pregunta  la voz lee la pregunta, cuenta atrás para pensar y revela la respuesta
  cierre    lista con checks animados y tarjeta final

Opciones:
  --sin-subtitulos   no dibuja subtítulos en la imagen (siempre se generan .srt/.vtt)
  --fps 30           fotogramas por segundo
  --fotos 5,22.5     en vez del vídeo, guarda fotogramas sueltos (para revisar)
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
import time
import wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generar import RAIZ, correo_a_html, crear_voz, dividir_frases, inline, leer_guion  # noqa: E402
from pptx_a_video import tiempo_srt, trocear  # noqa: E402

PLANTILLA = RAIZ / "docs" / "motor"
LEAD, PAUSA, COLA = 0.9, 0.4, 1.1
CUENTA = 5.0   # segundos para pensar en las preguntas

FRASES_PREGUNTA = {
    "en": {"respuesta": "The correct answer is {l}."},
    "es": {"respuesta": "La respuesta correcta es la {l}."},
}


def limpio(t):
    return re.sub(r"\*\*(.+?)\*\*", r"\1", t or "").strip()


def plan_de_escenas(meta, diapositivas):
    """Para cada escena: lista de segmentos de audio (voz o silencio) con su función."""
    idioma = meta.get("idioma", "es")[:2]
    textos = FRASES_PREGUNTA.get(idioma, FRASES_PREGUNTA["en"])
    total_preg = sum(1 for d in diapositivas if d.get("tipo") == "pregunta")
    planes, n_preg = [], 0
    for d in diapositivas:
        segs = [{"silencio": LEAD}]
        for f in dividir_frases(d["narracion"]):
            segs += [{"voz": f["dicho"], "texto": f["texto"], "paso": f["paso"], "rol": "narracion"}, {"silencio": PAUSA}]
        if d.get("tipo") == "pregunta":
            n_preg += 1
            for f in dividir_frases([limpio(d.get("pregunta"))]):
                segs += [{"voz": f["dicho"], "texto": f["texto"], "paso": 0, "rol": "pregunta"}, {"silencio": PAUSA}]
            segs += [{"silencio": CUENTA, "rol": "cuenta"}]
            correcta = next((i for i, o in enumerate(d["opciones"]) if o["correcta"]), 0)
            r = textos["respuesta"].format(l="ABCDEF"[correcta])
            segs += [{"voz": r, "texto": r, "paso": 0, "rol": "respuesta"}, {"silencio": PAUSA}]
            for f in dividir_frases([limpio(d.get("explicacion"))]):
                segs += [{"voz": f["dicho"], "texto": f["texto"], "paso": 0, "rol": "explicacion"}, {"silencio": PAUSA}]
            d["_n"], d["_total"] = n_preg, total_preg
        segs.append({"silencio": COLA})
        planes.append(segs)
    return planes


def construir(a):
    ruta = Path(a.guion).resolve()
    meta, diapositivas = leer_guion(ruta)
    for k in ("motor", "voz", "idioma"):
        if getattr(a, k):
            meta[k] = getattr(a, k)
    nombre = a.nombre or f"{ruta.stem}_video"
    salida = RAIZ / "salida"
    salida.mkdir(exist_ok=True)

    print(f"1/4  Voz ({meta.get('motor', 'piper')})…")
    planes = plan_de_escenas(meta, diapositivas)
    voz = crear_voz(meta)
    textos = [s["voz"] for p in planes for s in p if "voz" in s]
    if hasattr(voz, "preparar"):
        voz.preparar(textos)

    print("2/4  Línea de tiempo y audio…")
    tmp = Path(tempfile.mkdtemp(prefix="video_"))
    wav_total = tmp / "narracion.wav"
    with wave.open(str(voz.wav(textos[0])), "rb") as w:
        params = w.getparams()
    bytes_por_s = params.framerate * params.sampwidth * params.nchannels
    escenas, subs, t = [], [], 0.0
    with wave.open(str(wav_total), "wb") as out:
        out.setparams(params)
        for d, segs in zip(diapositivas, planes):
            ini = t
            frases, roles = [], {}
            for s in segs:
                if "silencio" in s:
                    dur = s["silencio"]
                    out.writeframes(b"\x00" * (int(bytes_por_s * dur) // params.sampwidth * params.sampwidth))
                    if s.get("rol") == "cuenta":
                        roles["cuenta"] = [round(t - ini, 3), round(t - ini + dur, 3)]
                    t += dur
                    continue
                with wave.open(str(voz.wav(s["voz"])), "rb") as w:
                    datos = w.readframes(w.getnframes())
                    dur = w.getnframes() / w.getframerate()
                out.writeframes(datos)
                f = {"ini": round(t - ini, 3), "fin": round(t - ini + dur, 3), "texto": s["texto"], "paso": s["paso"]}
                frases.append(f)
                roles.setdefault(s["rol"], f["ini"])
                trozos = trocear(s["texto"], 70)
                total = sum(len(x) for x in trozos)
                t0 = t
                for x in trozos:
                    t1 = t0 + dur * len(x) / total
                    subs.append({"ini": round(t0, 3), "fin": round(t1 + .15, 3), "texto": x})
                    t0 = t1
                t += dur
            escenas.append(datos_escena(d, frases, roles, ini, t))
            print(f"     [{d['num']:02d}] {d.get('tipo', 'contenido'):<9} {ini:6.1f}s → {t:6.1f}s  {d['titulo']}")
    duracion = t

    (salida / f"{nombre}.srt").write_text("\n".join(
        f"{k}\n{tiempo_srt(s['ini'])} --> {tiempo_srt(s['fin'])}\n{s['texto']}\n" for k, s in enumerate(subs, 1)), encoding="utf-8")
    (salida / f"{nombre}.vtt").write_text("WEBVTT\n\n" + "\n".join(
        f"{tiempo_srt(s['ini'], '.')} --> {tiempo_srt(s['fin'], '.')}\n{s['texto']}\n" for s in subs), encoding="utf-8")

    datos = {"meta": {k: meta.get(k) for k in ("titulo", "subtitulo", "empresa", "idioma", "color")},
             "duracion": duracion, "subs": subs, "subtitulos": not a.sin_subtitulos, "escenas": escenas}
    for f in ("video.css", "video.js"):
        shutil.copy(PLANTILLA / f, tmp / f)
    (tmp / "datos.js").write_text("window.VIDEO = " + json.dumps(datos, ensure_ascii=False) + ";", encoding="utf-8")
    (tmp / "index.html").write_text('<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="video.css">'
                                    '<style>html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#000}</style>'
                                    '</head><body><div id="stage"></div><script src="datos.js"></script>'
                                    '<script src="video.js"></script></body></html>', encoding="utf-8")

    print("3/4  Dibujando fotogramas…")
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        nav = p.chromium.launch()
        pag = nav.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
        pag.goto((tmp / "index.html").as_uri())
        pag.wait_for_function("window.LISTO === true")
        pag.evaluate("document.fonts.ready")

        if a.fotos:
            carpeta = salida / f"{nombre}_fotos"
            carpeta.mkdir(exist_ok=True)
            for ts in a.fotos.split(","):
                pag.evaluate("t => dibujar(t)", float(ts))
                pag.screenshot(path=str(carpeta / f"t{float(ts):07.2f}.png"))
            print(f"Fotogramas en {carpeta}")
            nav.close()
            return

        mp4 = salida / f"{nombre}.mp4"
        n = int(duracion * a.fps)
        ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(a.fps),
                               "-c:v", "mjpeg", "-i", "-", "-i", str(wav_total),
                               "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
                               "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-shortest", str(mp4)],
                              stdin=subprocess.PIPE)
        inicio = time.time()
        for i in range(n):
            pag.evaluate("t => dibujar(t)", i / a.fps)
            ff.stdin.write(pag.screenshot(type="jpeg", quality=94))
            if i % (a.fps * 10) == 0 and i:
                v = i / (time.time() - inicio)
                print(f"     {i / a.fps:5.0f}s de {duracion:.0f}s  ({v:.1f} fps, quedan ~{(n - i) / v / 60:.1f} min)", flush=True)
        ff.stdin.close()
        ff.wait()
        nav.close()

    print("4/4  Listo.")
    shutil.rmtree(tmp, ignore_errors=True)
    print(f"\nVoz: {voz.generadas} frases generadas, {voz.cacheadas} reutilizadas de la caché")
    print(f"Vídeo: {mp4}  ({int(duracion // 60)} min {int(duracion % 60)} s, {mp4.stat().st_size / 1e6:.1f} MB)")


def datos_escena(d, frases, roles, ini, fin):
    tipo = d.get("tipo", "contenido")
    e = {"tipo": tipo, "titulo": html_seguro(d["titulo"]), "ini": round(ini, 3), "fin": round(fin, 3), "frases": frases}
    habla = [f for f in frases]
    t_habla0 = habla[0]["ini"] if habla else LEAD
    t_habla1 = habla[-1]["fin"] if habla else (fin - ini - COLA)

    # momento en que aparece cada elemento: marcas {n} o, si no hay, repartidos a lo largo de la narración
    pasos = {}
    for f in frases:
        if f["paso"] and f["paso"] not in pasos:
            pasos[f["paso"]] = f["ini"]
    elementos = len(d.get("vinetas", [])) or len(re.findall(r"\[\[", d.get("correo", "")))
    for k in range(1, elementos + 1):
        if k not in pasos:
            hueco = (t_habla1 - t_habla0) * .75
            pasos[k] = round(t_habla0 + .3 + hueco * (k - 1) / max(1, elementos), 3)
    e["pasos"] = pasos

    if d.get("vinetas"):
        e["vinetas"] = [inline(v) for v in d["vinetas"]]
    if tipo == "cifra":
        e["cifra"], e["texto"] = html_seguro(d.get("cifra", "")), inline(d.get("texto", ""))
    if tipo == "correo":
        e["correo_html"], e["notas"] = correo_a_html(d.get("correo", ""))
        foco, mostrado = [], False
        for f in frases:   # la cámara sigue a la narración; tras el último elemento vuelve a la vista general
            if f["paso"]:
                foco.append({"t": f["ini"], "paso": f["paso"]})
                mostrado = True
            elif mostrado and foco and foco[-1]["paso"] != 0:
                foco.append({"t": f["ini"], "paso": 0})
        e["foco"] = foco
    if tipo == "pregunta":
        e.update({"pregunta": inline(d.get("pregunta", "")), "explicacion": inline(d.get("explicacion", "")),
                  "opciones": [{"texto": inline(o["texto"]), "correcta": o["correcta"]} for o in d["opciones"]],
                  "tPregunta": roles.get("pregunta", 1), "cuenta": roles.get("cuenta", [3, 8]),
                  "tRevelar": roles.get("respuesta", 9), "tExpl": roles.get("explicacion", 10),
                  "n": d.get("_n", 1), "total": d.get("_total", 1)})
    if tipo == "cierre":
        e["tFin"] = frases[-1]["ini"] if len(frases) > 1 else round(fin - ini - 2.5, 3)
        # las viñetas se reparten antes de la tarjeta final
        n = len(d.get("vinetas", []))
        hasta = e["tFin"] - .6
        for k in range(1, n + 1):
            if not any(f["paso"] == k for f in frases):
                pasos[k] = round(t_habla0 + .4 + (hasta - t_habla0 - .4) * (k - 1) / max(1, n), 3)
    return e


def html_seguro(t):
    import html
    return html.escape(t, quote=False)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Convierte un guion en un vídeo animado.")
    ap.add_argument("guion")
    ap.add_argument("--motor")
    ap.add_argument("--voz")
    ap.add_argument("--idioma")
    ap.add_argument("--nombre")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--sin-subtitulos", action="store_true")
    ap.add_argument("--fotos", help="tiempos separados por comas: guarda fotogramas en vez del vídeo")
    construir(ap.parse_args())
