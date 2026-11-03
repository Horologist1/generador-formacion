# Generador de formación (prototipo)

A partir de un guion de texto o de un PowerPoint genera tres tipos de resultado:

| Resultado | Comando | Para qué |
|---|---|---|
| **Vídeo animado** | `python generador/video.py curso/curso_en.md` | Motion graphics sincronizados con la voz. Para Teams, intranet, YouTube o el LMS. |
| **Lección interactiva + SCORM** | `python generador/generar.py curso/curso.md` | Preguntas puntuables y seguimiento en el LMS. |
| **Vídeo de una presentación** | `python generador/pptx_a_video.py presentacion.pptx` | PowerPoint con la narración en las notas del orador. Pase de diapositivas narrado. |

Todo se genera en `salida/`.

## Voces

Se elige con `--motor` y `--voz`, o con las líneas `motor:` y `voz:` en la cabecera del guion.

| Motor | Calidad | Requisitos | Licencia |
|---|---|---|---|
| `qwen` | Muy buena en inglés. En español tiene acento inglés. | GPU NVIDIA | Apache 2.0 |
| `chatterbox` | Buena | GPU NVIDIA | MIT |
| `azure` | Voces nativas de España | Clave en `.env` (plan gratuito: 500.000 caracteres/mes) | Servicio de Microsoft |
| `piper` | Robótica, pero rápida | Ninguno | MIT |

Con `qwen`, la voz se **describe con palabras**. Por ejemplo: `--voz "Female corporate trainer, British, warm and clear"`. La primera vez se diseña la voz y después se reutiliza siempre la misma.

La voz se guarda en caché frase a frase. Si se cambia una frase del guion, solo se vuelve a generar esa.

## Cómo escribir el guion

Las instrucciones están al principio de `curso/curso.md`. En resumen:

- `## Título` empieza una diapositiva o escena nueva.
- `tipo:` puede ser `portada`, `contenido`, `cifra`, `correo`, `pregunta` o `cierre`. En el vídeo, cada tipo tiene su propia animación.
- `> texto` es lo que dice la voz.
- `{1}`, `{2}`… marcan el momento en que aparece cada elemento. En el vídeo, también indican cuándo hace zoom la cámara.
- `[hackeó](jaqueó)` hace que en pantalla aparezca «hackeó» y que la voz diga «jaqueó».

## Opciones del vídeo animado

- `--sin-subtitulos`: no dibuja los subtítulos en la imagen. Los archivos `.srt` y `.vtt` se generan siempre.
- `--fotos 5,22.5`: en lugar del vídeo, guarda fotogramas sueltos para revisar el diseño rápido.
- `--fps 25`: menos fotogramas por segundo, para renderizar más rápido.

## Requisitos

- Python 3, ffmpeg y LibreOffice (este último solo para PowerPoint).
- `pip install piper-tts python-pptx pymupdf playwright` y después `python -m playwright install chromium`.
- Los motores `qwen` y `chatterbox` usan sus propios entornos (`.venv-qwen` y `.venv-chatterbox`).
