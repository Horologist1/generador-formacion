"""
Genera una muestra con cada voz de España disponible en Azure y una página para compararlas.

    python generador/probar_voces_azure.py

Resultado: muestras_voz/azure/comparar_azure.html
Gasta unos 250 caracteres por voz del plan gratuito (500.000/mes).
"""
import html
import subprocess
import sys
from pathlib import Path

from voz_azure import listar_voces, sintetizar

RAIZ = Path(__file__).resolve().parent.parent
OUT = RAIZ / "muestras_voz" / "azure"
OUT.mkdir(parents=True, exist_ok=True)

TEXTO = ("El año pasado, siete de cada diez incidentes de seguridad en Grupo Alvento empezaron exactamente igual: "
         "con un correo. Nadie [hackeó](jaqueó) nuestros servidores. Alguien, con prisa, hizo clic donde no debía. "
         "Y eso nos puede pasar a cualquiera.")
VISIBLE = TEXTO.replace("[hackeó](jaqueó)", "hackeó")
DICHO = TEXTO.replace("[hackeó](jaqueó)", "jaqueó")

voces = listar_voces("es-ES")
# Primero las de alta calidad (HD / multilingües), luego el resto por nombre
voces.sort(key=lambda v: ("HD" not in v["ShortName"] and "Multilingual" not in v["ShortName"], v["ShortName"]))
print(f"{len(voces)} voces de España disponibles en tu región")

tarjetas = []
for v in voces:
    nombre = v["ShortName"]
    archivo = OUT / (nombre.replace(":", "_") + ".mp3")
    if not archivo.exists():
        print(f"  {nombre} …", flush=True)
        try:
            wav = sintetizar(DICHO, nombre)
        except SystemExit as e:  # p. ej. voces HD no incluidas en el plan gratuito
            print(f"    no disponible: {e}")
            continue
        tmp = archivo.with_suffix(".wav")
        tmp.write_bytes(wav)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(tmp), "-b:a", "128k", str(archivo)], check=True)
        tmp.unlink()
    genero = {"Female": "Mujer", "Male": "Hombre"}.get(v.get("Gender"), "")
    tipo = v.get("VoiceType", "")
    estilos = ", ".join(v.get("StyleList", []) or [])
    extra = f" · estilos: {html.escape(estilos)}" if estilos else ""
    tarjetas.append(
        f'<div class="voz"><h2>{html.escape(v.get("DisplayName", nombre))} <small>{genero}</small></h2>'
        f'<p><code>{html.escape(nombre)}</code> · {html.escape(tipo)}{extra}</p>'
        f'<audio controls preload="none" src="{archivo.name}"></audio></div>')

(OUT / "comparar_azure.html").write_text(f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Voces de Azure</title>
<style>
body{{font-family:"Segoe UI",system-ui,sans-serif;font-size:18px;color:#1b2430;background:#eef1f4;margin:0;padding:32px 16px}}
main{{max-width:760px;margin:0 auto}}h1{{font-size:34px;margin:0 0 8px}}.intro{{line-height:1.5;color:#4a5565}}
.texto{{background:#fff;border-left:6px solid #0f5f73;padding:16px 20px;border-radius:10px;line-height:1.55;margin:20px 0 28px}}
.voz{{background:#fff;border-radius:14px;padding:18px 22px;margin-bottom:14px;box-shadow:0 1px 2px rgba(0,0,0,.06),0 6px 20px rgba(0,0,0,.06)}}
.voz h2{{font-size:22px;margin:0 0 4px}}.voz small{{font-size:15px;color:#4a5565;font-weight:400}}
.voz p{{margin:0 0 10px;font-size:15px;color:#4a5565}}code{{font-size:15px}}audio{{width:100%}}
</style></head><body><main>
<h1>Voces de España en Azure</h1>
<p class="intro">Todas leen el mismo texto. Para elegir una, copia su código (lo que aparece en <code>gris</code>) en la línea <code>voz:</code> del guion.</p>
<div class="texto">«{html.escape(VISIBLE)}»</div>
{''.join(tarjetas)}
</main></body></html>""", encoding="utf-8")
print(f"\nAbre: {OUT / 'comparar_azure.html'}")
