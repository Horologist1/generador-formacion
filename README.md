# Training Video Builder

Write a plain-text script and get:

- an **animated video** (motion graphics timed to the narration),
- an **interactive SCORM lesson** with scored questions for your LMS,
- or a **narrated video from a PowerPoint deck**.

**Web editor (nothing to install):** https://horologist1.github.io/generador-formacion/
Everything runs in your browser: the script is never sent to any server. Export an animated HTML video, a SCORM package or the script itself. The interface is available in English and Spanish.

**Generate with AI:** paste your material (notes, a document, slide text) and DeepSeek writes the script in the right format; the editor checks it and asks the AI to fix any format errors. Use your own DeepSeek key (kept only in your browser) or a team password: the site owner encrypts their key in [Prepare access](https://horologist1.github.io/generador-formacion/acceso.html) and publishes the encrypted block as `docs/acceso.json`. The material you paste is sent to DeepSeek. "Copy instructions for another AI" works with any assistant, no key needed.

**Voiced version (local):** the scripts in `generador/` add narration with open-source neural voices (Qwen3-TTS, Chatterbox, Piper) and render MP4 files. Setup and usage (in Spanish): [LEEME.md](LEEME.md).

The sample courses in `curso/` and `docs/ejemplos/` are fictional (made-up company “Grupo Alvento”).
