"""
PowerPoint -> vídeo narrado (MP4 + subtítulos).

La narración de cada diapositiva se escribe en sus NOTAS DEL ORADOR.

    python generador/pptx_a_video.py curso/presentacion.pptx --motor qwen --idioma en --voz "descripción de la voz"

Opciones:
    --motor        piper | qwen | chatterbox | azure   (por defecto: qwen)
    --voz          voz o descripción de la voz
    --idioma       es | en | ...                       (por defecto: es)
    --quemar       incrusta los subtítulos en la imagen (si no, van como pista activable + archivos .srt/.vtt)
    --transicion   segundos del fundido entre diapositivas (por defecto 0.5; 0 = corte)

Resultado en salida/<nombre>.mp4, .srt y .vtt
"""
import argparse
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generar import RAIZ, crear_voz, dividir_frases, montar_audio  # noqa: E402

SOFFICE = [r"C:\Program Files\LibreOffice\program\soffice.exe", "soffice", "libreoffice"]
SIN_NOTAS = 4.0   # segundos que se muestra una diapositiva sin narración
ANCHO = 1920


def leer_notas(pptx: Path):
    from pptx import Presentation
    notas = []
    for s in Presentation(str(pptx)).slides:
        t = s.notes_slide.notes_text_frame.text if s.has_notes_slide else ""
        notas.append(re.sub(r"\s+", " ", t).strip())
    return notas


def a_imagenes(pptx: Path, carpeta: Path):
    soffice = next((s for s in SOFFICE if shutil.which(s) or Path(s).exists()), None)
    if not soffice:
        sys.exit("No encuentro LibreOffice (soffice). Instálalo desde libreoffice.org.")
    perfil = carpeta / "perfil_lo"   # perfil propio: funciona aunque LibreOffice esté abierto
    subprocess.run([soffice, f"-env:UserInstallation=file:///{perfil.as_posix()}", "--headless",
                    "--convert-to", "pdf", "--outdir", str(carpeta), str(pptx)],
                   check=True, capture_output=True)
    pdf = carpeta / (pptx.stem + ".pdf")
    if not pdf.exists():
        sys.exit("LibreOffice no ha podido convertir la presentación.")
    import pymupdf
    imagenes = []
    with pymupdf.open(pdf) as doc:
        for i, pagina in enumerate(doc):
            zoom = ANCHO / pagina.rect.width
            pix = pagina.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False)
            ruta = carpeta / f"d{i + 1:02d}.png"
            pix.save(ruta)
            imagenes.append(ruta)
    return imagenes


def tiempo_srt(s, sep=","):
    h, s = divmod(s, 3600)
    m, s = divmod(s, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d}{sep}{int(round((s % 1) * 1000)) % 1000:03d}"


def trocear(texto, maximo=84):
    """Parte frases largas en subtítulos legibles (por comas o por palabras)."""
    if len(texto) <= maximo:
        return [texto]
    partes, actual = [], ""
    for trozo in re.split(r"(?<=[,;:])\s+", texto):
        if actual and len(actual) + len(trozo) + 1 > maximo:
            partes.append(actual)
            actual = trozo
        else:
            actual = f"{actual} {trozo}".strip()
    partes.append(actual)
    salida = []
    for p in partes:   # si una parte sigue siendo larga, se corta por palabras
        while len(p) > maximo:
            corte = p.rfind(" ", 0, maximo)
            salida.append(p[:corte])
            p = p[corte + 1:]
        salida.append(p)
    return salida


def main():
    ap = argparse.ArgumentParser(description="Convierte un PowerPoint con notas en un vídeo narrado.")
    ap.add_argument("pptx")
    ap.add_argument("--motor", default="qwen")
    ap.add_argument("--voz", default=None)
    ap.add_argument("--idioma", default="es")
    ap.add_argument("--nombre", default=None)
    ap.add_argument("--quemar", action="store_true")
    ap.add_argument("--transicion", type=float, default=0.5)
    a = ap.parse_args()

    pptx = Path(a.pptx).resolve()
    nombre = a.nombre or pptx.stem
    salida = RAIZ / "salida"
    salida.mkdir(exist_ok=True)
    tmp = Path(tempfile.mkdtemp(prefix="pptx_video_"))
    T = max(0.0, a.transicion)

    print("1/4  Leyendo notas y convirtiendo diapositivas en imágenes…")
    notas = leer_notas(pptx)
    imagenes = a_imagenes(pptx, tmp)
    if len(imagenes) != len(notas):
        sys.exit(f"El PDF tiene {len(imagenes)} páginas y la presentación {len(notas)} diapositivas.")

    print(f"2/4  Generando la voz ({a.motor})…")
    meta = {"motor": a.motor, "idioma": a.idioma}
    if a.voz:
        meta["voz"] = a.voz
    voz = crear_voz(meta)
    frases_por_diap = [dividir_frases([n]) if n else [] for n in notas]
    if hasattr(voz, "preparar"):
        voz.preparar([f["dicho"] for fs in frases_por_diap for f in fs])

    duraciones, audios, subtitulos, inicio = [], [], [], 0.0
    for i, frases in enumerate(frases_por_diap):
        if frases:
            mp3 = tmp / f"d{i + 1:02d}.mp3"
            tiempos = montar_audio([voz.wav(f["dicho"]) for f in frases], mp3)
            dur = tiempos[-1][1] + 0.5
            for f, (ini, fin) in zip(frases, tiempos):
                trozos = trocear(f["texto"])
                total = sum(len(t) for t in trozos)
                t0 = ini
                for t in trozos:   # reparte el tiempo de la frase según la longitud de cada trozo
                    t1 = t0 + (fin - ini) * len(t) / total
                    subtitulos.append((inicio + t0, inicio + t1, t))
                    t0 = t1
        else:
            mp3, dur = None, SIN_NOTAS
        duraciones.append(dur)
        audios.append(mp3)
        print(f"     [{i + 1:02d}] {dur:5.1f}s  {notas[i][:70]}")
        inicio += dur

    print("3/4  Subtítulos…")
    srt = salida / f"{nombre}.srt"
    srt.write_text("\n".join(f"{k}\n{tiempo_srt(a_)} --> {tiempo_srt(b)}\n{t}\n"
                             for k, (a_, b, t) in enumerate(subtitulos, 1)), encoding="utf-8")
    (salida / f"{nombre}.vtt").write_text("WEBVTT\n\n" + "\n".join(
        f"{tiempo_srt(a_, '.')} --> {tiempo_srt(b, '.')}\n{t}\n" for a_, b, t in subtitulos), encoding="utf-8")

    print("4/4  Montando el vídeo…")
    # audio completo (silencio en las diapositivas sin notas)
    lista = tmp / "audios.txt"
    trozos_audio = []
    for i, (mp3, dur) in enumerate(zip(audios, duraciones)):
        if mp3 is None:
            mp3 = tmp / f"silencio{i}.mp3"
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
                            "-t", f"{dur:.3f}", "-b:a", "64k", str(mp3)], check=True)
        trozos_audio.append(f"file '{mp3.as_posix()}'")
    lista.write_text("\n".join(trozos_audio), encoding="utf-8")
    audio_total = tmp / "narracion.m4a"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lista),
                    "-c:a", "aac", "-b:a", "160k", str(audio_total)], check=True)

    # vídeo: cada imagen dura lo que su audio (+ el fundido), encadenadas con xfade
    entradas, n = [], len(imagenes)
    for i, (img, dur) in enumerate(zip(imagenes, duraciones)):
        largo = dur + (T if i < n - 1 else 0)
        entradas += ["-loop", "1", "-framerate", "30", "-t", f"{largo:.3f}", "-i", str(img)]
    filtros, previo, acumulado = [], "[0:v]", 0.0
    for i in range(1, n):
        acumulado += duraciones[i - 1]
        etiqueta = f"[v{i}]"
        if T > 0:
            filtros.append(f"{previo}[{i}:v]xfade=transition=fade:duration={T}:offset={acumulado:.3f}{etiqueta}")
        else:
            filtros.append(f"{previo}[{i}:v]concat=n=2:v=1:a=0{etiqueta}")
        previo = etiqueta
    final = previo
    if a.quemar:
        estilo = ("FontName=Segoe UI,FontSize=15,PrimaryColour=&H00FFFFFF,BackColour=&H99141C26,"
                  "BorderStyle=3,Outline=6,Shadow=0,MarginV=10")
        shutil.copy(srt, tmp / "subs.srt")
        filtros.append(f"{previo}subtitles=subs.srt:force_style='{estilo}'[vs]")
        final = "[vs]"
    filtros.append(f"{final}scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p[vout]")

    mp4 = salida / f"{nombre}.mp4"
    cmd = ["ffmpeg", "-y", "-loglevel", "error", *entradas, "-i", str(audio_total)]
    if not a.quemar:
        cmd += ["-i", str(srt)]
    cmd += ["-filter_complex", ";".join(filtros), "-map", "[vout]", "-map", f"{n}:a"]
    if not a.quemar:
        idioma3 = {"es": "spa", "en": "eng", "fr": "fra", "de": "deu", "it": "ita", "pt": "por"}.get(a.idioma, "und")
        cmd += ["-map", f"{n + 1}:s", "-c:s", "mov_text", f"-metadata:s:s:0", f"language={idioma3}"]
    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "20", "-tune", "stillimage", "-r", "30",
            "-c:a", "copy", "-movflags", "+faststart", "-shortest", str(mp4)]
    subprocess.run(cmd, check=True, cwd=tmp)

    shutil.rmtree(tmp, ignore_errors=True)
    total = sum(duraciones)
    print(f"\nVoz: {voz.generadas} frases generadas, {voz.cacheadas} reutilizadas de la caché")
    print(f"Vídeo: {mp4}  ({int(total // 60)} min {int(total % 60)} s, {mp4.stat().st_size / 1e6:.1f} MB)")
    print(f"Subtítulos: {srt.name}, {nombre}.vtt")


if __name__ == "__main__":
    main()
