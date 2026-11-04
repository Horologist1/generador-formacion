# Training Video Builder

Write a plain-text script and get:

- an **animated video** (motion graphics timed to the narration),
- an **interactive SCORM lesson** with scored questions for your LMS,
- or a **narrated video from a PowerPoint deck**.

**Web editor (nothing to install):** https://horologist1.github.io/generador-formacion/
Everything runs in your browser: the script is never sent to any server. Export an animated HTML video, a SCORM package or the script itself. The interface is available in English and Spanish.

**Scene types:** title, list, steps, do / don't, timeline, bar chart, big number, quote, myth vs fact, email, quiz question and summary, each with its own animation.

**Generate with AI:** paste your material (notes, a document, slide text), or just a summary or learning objective, and DeepSeek writes the script in the right format. It picks the scene types itself, or you choose which ones to use. The editor checks the script and asks the AI to fix any format errors. Use your own DeepSeek key (kept only in your browser) or a team password: the site owner encrypts their key in [Prepare access](https://horologist1.github.io/generador-formacion/acceso.html) and publishes the encrypted block as `docs/acceso.json`. The material you paste is sent to DeepSeek. "Copy instructions for another AI" works with any assistant, no key needed.

**Voiced version (local):** the scripts in `generador/` add narration with open-source neural voices (Qwen3-TTS, Chatterbox, Piper) and render MP4 files. Setup and usage (in Spanish): [LEEME.md](LEEME.md).

The sample courses in `curso/` and `docs/ejemplos/` are fictional (made-up company “Grupo Alvento”).
