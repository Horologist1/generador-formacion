/* Generar el guion con IA (DeepSeek) desde el navegador.
   - Acceso de equipo: la clave de API está CIFRADA (AES-GCM, clave derivada con PBKDF2) en acceso.json;
     solo se descifra en el navegador con la contraseña. Se prepara en acceso.html.
   - O clave propia: se guarda, si se pide, solo en este navegador (localStorage).
   - El material pegado se envía únicamente a la API de DeepSeek. */
(function () {
  "use strict";

  var API = "https://api.deepseek.com/chat/completions";
  var MODELO = "deepseek-chat";
  var CLAVE_PROPIA = "generador-formacion:clave-ia";
  var E = window.EDITOR;
  var $ = function (id) { return document.getElementById(id); };

  E.textos({
    en: {
      ia_btn: "Generate with AI", ia_tit: "Generate a script with AI",
      ia_intro: "Paste your material: notes, a document, the text of some slides… The AI writes a complete script that you can then edit.",
      ia_material: "Your material", ia_ph: "Paste the content of the course here…",
      ia_idioma: "Course language", ia_largo: "Length", ia_corto: "Short (~3 min)", ia_medio: "Medium (~5 min)", ia_largo_l: "Long (~8 min)",
      ia_extra: "Extra instructions (optional)", ia_extra_ph: "E.g. audience: warehouse staff; include an email example",
      ia_acceso: "Access", ia_equipo: "Team password", ia_propia: "My own DeepSeek key",
      ia_pass: "Password", ia_clave: "DeepSeek API key", ia_recordar: "Remember the key in this browser",
      ia_sin_equipo: "No team password has been set up yet. Use your own key, or set one up in <a href=\"acceso.html\">Prepare access</a>.",
      ia_privacidad: "Your material is sent to DeepSeek to write the script. Don't paste confidential or personal data.",
      ia_copiar: "Copy instructions for another AI", ia_copiado: "Copied. Paste it into any AI assistant, then paste its answer into the editor.",
      ia_generar: "Generate", ia_cancelar: "Cancel", ia_cerrar: "Close",
      ia_falta_material: "Paste some material first.", ia_falta_pass: "Enter the team password.", ia_falta_clave: "Enter your DeepSeek API key.",
      ia_pass_mal: "Wrong password.", ia_descifrando: "Checking the password…",
      ia_escribiendo: "Writing the script… {n} characters", ia_revisando: "Fixing {n} format problem(s)…",
      ia_listo: "Done: the script is in the editor. Review it and adjust whatever you need.",
      ia_listo_avisos: "The script is in the editor, but it still has problems (shown in red below the editor).",
      ia_e401: "DeepSeek rejected the key (it may have been revoked).", ia_e402: "The DeepSeek account has no balance left.",
      ia_e429: "Too many requests right now. Try again in a minute.", ia_ered: "Could not reach DeepSeek: {e}", ia_eotro: "DeepSeek error {c}: {e}",
      ia_cancelado: "Cancelled.", ia_vacio: "The AI returned an empty answer. Try again.",
      ia_origen: "Start from", ia_de_material: "My material", ia_de_brief: "A summary or learning objective",
      ia_intro_brief: "Describe what the course should achieve: the objective, the audience and the key points. The AI writes the content and the script; check it before using it.",
      ia_brief: "Your summary or learning objective",
      ia_brief_ph: "E.g. Objective: by the end, warehouse staff can report a near miss correctly before the end of their shift. Audience: warehouse operators, including new starters. Key points: what counts as a near miss, why reporting matters, how to report it in the app, what happens next.",
      ia_falta_brief: "Write a summary or learning objective first.",
      ia_tipos: "Animations", ia_tipos_auto: "Let the AI choose (recommended)", ia_tipos_elegir: "Let me choose",
      ia_falta_tipos: "Tick at least one type of scene, or let the AI choose."
    },
    es: {
      ia_btn: "Generar con IA", ia_tit: "Generar el guion con IA",
      ia_intro: "Pega tu material: apuntes, un documento, el texto de unas diapositivas… La IA escribe un guion completo que luego puedes editar.",
      ia_material: "Tu material", ia_ph: "Pega aquí el contenido del curso…",
      ia_idioma: "Idioma del curso", ia_largo: "Duración", ia_corto: "Corto (~3 min)", ia_medio: "Medio (~5 min)", ia_largo_l: "Largo (~8 min)",
      ia_extra: "Indicaciones extra (opcional)", ia_extra_ph: "P. ej.: público, personal de almacén; incluye un correo de ejemplo",
      ia_acceso: "Acceso", ia_equipo: "Contraseña del equipo", ia_propia: "Mi clave de DeepSeek",
      ia_pass: "Contraseña", ia_clave: "Clave de API de DeepSeek", ia_recordar: "Recordar la clave en este navegador",
      ia_sin_equipo: "Aún no hay contraseña de equipo. Usa tu propia clave o prepárala en <a href=\"acceso.html\">Preparar acceso</a>.",
      ia_privacidad: "Tu material se envía a DeepSeek para escribir el guion. No pegues datos confidenciales ni personales.",
      ia_copiar: "Copiar instrucciones para otra IA", ia_copiado: "Copiado. Pégalo en cualquier asistente de IA y luego pega su respuesta en el editor.",
      ia_generar: "Generar", ia_cancelar: "Cancelar", ia_cerrar: "Cerrar",
      ia_falta_material: "Pega primero algo de material.", ia_falta_pass: "Escribe la contraseña del equipo.", ia_falta_clave: "Escribe tu clave de API de DeepSeek.",
      ia_pass_mal: "Contraseña incorrecta.", ia_descifrando: "Comprobando la contraseña…",
      ia_escribiendo: "Escribiendo el guion… {n} caracteres", ia_revisando: "Corrigiendo {n} problema(s) de formato…",
      ia_listo: "Listo: el guion está en el editor. Revísalo y ajusta lo que quieras.",
      ia_listo_avisos: "El guion está en el editor, pero aún tiene problemas (en rojo, bajo el editor).",
      ia_e401: "DeepSeek ha rechazado la clave (puede que se haya revocado).", ia_e402: "La cuenta de DeepSeek no tiene saldo.",
      ia_e429: "Demasiadas peticiones ahora mismo. Prueba en un minuto.", ia_ered: "No se ha podido conectar con DeepSeek: {e}", ia_eotro: "Error {c} de DeepSeek: {e}",
      ia_cancelado: "Cancelado.", ia_vacio: "La IA ha devuelto una respuesta vacía. Prueba otra vez.",
      ia_origen: "Partir de", ia_de_material: "Mi material", ia_de_brief: "Un resumen u objetivo de formación",
      ia_intro_brief: "Describe qué debe conseguir el curso: el objetivo, el público y los puntos clave. La IA redacta el contenido y el guion; revísalo antes de usarlo.",
      ia_brief: "Tu resumen u objetivo de formación",
      ia_brief_ph: "P. ej.: Objetivo: al terminar, el personal de almacén sabe comunicar un casi-accidente correctamente antes de acabar el turno. Público: operarios de almacén, incluidos los recién llegados. Puntos clave: qué es un casi-accidente, por qué hay que comunicarlo, cómo hacerlo en la app y qué pasa después.",
      ia_falta_brief: "Escribe primero un resumen u objetivo.",
      ia_tipos: "Animaciones", ia_tipos_auto: "Que elija la IA (recomendado)", ia_tipos_elegir: "Elegirlas yo",
      ia_falta_tipos: "Marca al menos un tipo de escena, o deja que elija la IA."
    }
  });
  var T = E.T;

  // ================================================================ instrucciones para la IA
  var LARGOS = {
    corto: { escenas: "5 to 6", preguntas: 1, variedad: 2 },
    medio: { escenas: "7 to 9", preguntas: 2, variedad: 4 },
    largo: { escenas: "10 to 13", preguntas: 3, variedad: 5 }
  };
  var IDIOMAS = { en: "English", es: "Spanish (Spain)" };
  var ejemplos = null;
  function cargarEjemplo() {
    if (ejemplos) return Promise.resolve(ejemplos);
    return Promise.all(["ejemplos/tipos_en.md", "ejemplos/datos_en.md"].map(function (u) {
      return fetch(u).then(function (r) { return r.text(); }).then(function (t) { return t.trim(); });
    })).then(function (r) { return (ejemplos = "EXAMPLE 1:\n\n" + r[0] + "\n\nEXAMPLE 2:\n\n" + r[1]); });
  }

  // tipos de escena que se pueden elegir (portada, pregunta y cierre van siempre)
  var TIPOS_ELEGIBLES = ["contenido", "proceso", "comparar", "linea", "grafico", "cifra", "cita", "mito", "correo"];

  function instrucciones(ej) {
    return [
      "You are an instructional designer. You write the script of a short animated training video.",
      "The script uses a strict plain-text format that a program parses and animates. Output ONLY the script: no comments before or after it, and do not wrap it in a code fence.",
      "",
      "FORMAT",
      "1. Header between two --- lines:",
      "---",
      "titulo: <course title, max 7 words>",
      "subtitulo: <short subtitle, e.g. \"Topic · 5 minutes\">",
      "empresa: <organisation name if the author gives one; otherwise leave this line out>",
      "idioma: <en or es>",
      "color: \"<brand colour as hex; use #0f5f73 unless the author suggests another>\"",
      "nota_aprobado: 50",
      "---",
      "2. Each scene starts with a line \"## <Scene title>\" (max 6 words, every title different) and the next line is \"tipo: <type>\".",
      "   The keywords (tipo, cifra, texto, pregunta, explicacion, repasar, correo, cita, autor, mito, realidad, unidad, si, no) and the type names are ALWAYS written exactly like this (in Spanish), whatever the course language.",
      "3. Narration lines start with \"> \". They are what the narrator says: 2 to 5 short, conversational sentences per scene, speaking to the learner as \"you\", max 25 words per sentence. On-screen text stays short; details go in the narration.",
      "4. Markers {1}, {2}, {3}… at the start of a narration sentence make on-screen item 1, 2, 3… appear (or get highlighted) at that moment. Use them, in order, in every scene type that has items.",
      "5. Scene types:",
      "- portada: the title scene. Narration only. Always the first scene; its title is the course title.",
      "- contenido: a general list. 2 to 4 lines \"- **Key phrase**: short explanation.\" (max 12 words each). Narration: an intro sentence, then one sentence per item starting with {1}, {2}…",
      "- proceso: a procedure or sequence of steps, shown as numbered circles joined by arrows. 2 to 5 lines \"- **Short step name**: what to do.\" (max 10 words each). Narration: one sentence per step starting with {1}, {2}…",
      "- comparar: two columns, what to do and what to avoid (good vs bad practice). 2 or 3 lines \"- [si] <what to do>\" and 2 or 3 lines \"- [no] <what to avoid>\" (max 10 words each), alternating [si] and [no]. Optional column titles: \"si: <title>\" and \"no: <title>\" (default \"Do\" and \"Don't\"). Narration: one sentence per line, starting with {1}, {2}… in the order of the lines.",
      "- linea: a timeline (history, deadlines, phases, what happens over time). 3 to 6 lines \"- **When**: what happens.\" where When is short (a year, a date, a time, \"Day 1\", \"Within 1 hour\") and the text has max 8 words. Narration: one sentence per milestone starting with {1}, {2}…",
      "- grafico: a bar chart comparing 2 to 6 quantities. Lines \"- Label: 45\" (the number goes last, without unit). Optional line \"unidad: %\". You may write ONE label in **bold** to highlight its bar. Narration: one sentence per bar starting with {1}, {2}… Only with real figures.",
      "- cifra: one big figure. Lines \"cifra: <figure, e.g. 4 in 5, 73%, 2.5 million>\" and \"texto: <caption that completes the figure, max 15 words>\". Only with a real figure.",
      "- cita: a memorable statement. Lines \"cita: <the quote, max 30 words>\" and \"autor: <Name, role>\". Narration introduces it and says it.",
      "- mito: a common misconception and the truth; the card flips. Lines \"mito: <the false belief, as people would say it, max 15 words>\" and \"realidad: <the truth, max 20 words>\". Narration: first the myth, then a sentence starting with {1} that reveals the truth.",
      "- correo: a sample email or message with warning signs or mistakes highlighted. Put the email inside a block that starts with ```correo and ends with ```: first the header lines (From:, To:, Subject: in English; De:, Para:, Asunto: in Spanish), then a blank line, then the body with paragraphs separated by blank lines. Wrap 2 to 4 important parts as [[exact text|short note that explains it]], or [[btn:Label|note]] for a button, link or attachment. Narration: one sentence per highlight, starting with {1}, {2}… in the order they appear in the email.",
      "- pregunta: a quiz question. Lines:",
      "  pregunta: <the question, max 25 words>",
      "  - [ ] <wrong option>",
      "  - [x] <correct option>",
      "  - [ ] <wrong option>",
      "  explicacion: <why the correct option is right, 1 or 2 sentences>",
      "  repasar: <exact title of the earlier scene that teaches this>",
      "  Exactly 3 options, exactly one marked [x], the correct one in a different position in each question, plausible wrong options of similar length (max 15 words each). Test how to apply the content in a realistic situation, not memorised wording. Narration: one short line inviting the learner to answer.",
      "- cierre: the summary. 2 to 4 lines starting with \"- \" with the key words in **bold**. The narration sums up and thanks the learner. Always the last scene.",
      "6. Use **bold** sparingly, only inside items. No other markdown: no other headings, numbered lists, tables, links or emojis.",
      "",
      "CHOOSING SCENE TYPES",
      "- For each idea pick the type whose shape matches it: steps → proceso; good vs bad → comparar; chronology or deadlines → linea; several quantities → grafico; one striking figure → cifra; a misconception → mito; a memorable statement → cita; an email or message → correo; anything else → contenido.",
      "- Use a variety of types. Never use the same type in two consecutive scenes. Place each question after the content it checks; never put two pregunta scenes in a row.",
      "",
      "The examples below show the FORMAT only. Do not reuse their content.",
      "",
      ej
    ].join("\n");
  }

  function peticion(o) {
    var L = LARGOS[o.largo] || LARGOS.medio;
    var lineas = [
      "Course language: " + IDIOMAS[o.idioma] + " (idioma: " + o.idioma + "). Write all titles, on-screen text and narration in this language.",
      "Length: " + L.escenas + " scenes in total, including portada and cierre, with " + L.preguntas + " pregunta scene(s)."
    ];
    if (o.tipos && o.tipos.length) {
      lineas.push("Scene types: besides portada, pregunta and cierre, use ONLY these types: " + o.tipos.join(", ") + ". Use each of them at least once if the content allows it.");
    } else {
      lineas.push("Scene types: choose them yourself following CHOOSING SCENE TYPES, with at least " + L.variedad + " different types besides portada, pregunta and cierre.");
    }
    if (o.modo === "brief") {
      lineas.push(
        "",
        "MODE: BRIEF. What follows is a summary or a learning objective, not the full material. Write the course content yourself, based on widely accepted good practice for this topic and audience.",
        "- Do not invent organisation-specific facts: internal tool names, phone numbers, email addresses, internal figures or policies, names of real people. Where the course needs one, write a placeholder in square brackets, e.g. [IT Service Desk phone number].",
        "- Do not invent statistics: use cifra or grafico only with figures given in the brief.",
        "- For cita, use a short line from a fictional colleague (first name and role only).",
        "- Right after the header, add ONE comment line listing what the author must check or complete, like: <!-- REVIEW: replace [IT Service Desk phone number]; confirm the reporting deadline -->"
      );
    } else {
      lineas.push(
        "",
        "MODE: MATERIAL. Base everything on the source material. Do not add facts, figures, names or rules that are not in it. You may rephrase, simplify and invent realistic examples (like a sample email) that are consistent with it."
      );
    }
    if (o.extra) lineas.push("", "Extra instructions from the author: " + o.extra);
    lineas.push("", o.modo === "brief" ? "BRIEF / LEARNING OBJECTIVE:" : "SOURCE MATERIAL:", "<<<", o.material, ">>>");
    return lineas.join("\n");
  }

  function limpiarRespuesta(txt) {
    txt = String(txt || "").trim();
    var f = /^```[a-zA-Z]*\n([\s\S]*?)\n```\s*$/.exec(txt);
    if (f) txt = f[1].trim();
    var i = txt.indexOf("---");
    if (i > 0) txt = txt.slice(i);
    return txt + "\n";
  }

  // ================================================================ acceso
  var acceso = null;    // contenido de acceso.json (cifrado), si existe
  var claveEquipo = null;  // clave descifrada, solo en memoria durante la sesión

  function b64(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }
  function descifrar(a, pass) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]).then(function (base) {
      return crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(a.salt), iterations: a.iter, hash: "SHA-256" },
        base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    }).then(function (k) {
      return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(a.iv) }, k, b64(a.ct));
    }).then(function (buf) { return new TextDecoder().decode(buf); });
  }

  function obtenerClave() {
    if ($("ia-modo-equipo").checked) {
      if (claveEquipo) return Promise.resolve(claveEquipo);
      var pass = $("ia-pass").value;
      if (!pass) return Promise.reject(new Error(T("ia_falta_pass")));
      estado(T("ia_descifrando"));
      return descifrar(acceso, pass).then(function (k) { claveEquipo = k; return k; },
        function () { throw new Error(T("ia_pass_mal")); });
    }
    var k = $("ia-clave").value.trim();
    if (!k) return Promise.reject(new Error(T("ia_falta_clave")));
    try {
      if ($("ia-recordar").checked) localStorage.setItem(CLAVE_PROPIA, k);
      else localStorage.removeItem(CLAVE_PROPIA);
    } catch (e) {}
    return Promise.resolve(k);
  }

  // ================================================================ llamada a DeepSeek (con streaming)
  function llamar(clave, mensajes, alAvanzar, senal) {
    return fetch(API, {
      method: "POST",
      signal: senal,
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + clave },
      body: JSON.stringify({ model: (acceso && acceso.modelo) || MODELO, messages: mensajes, temperature: 0.7, max_tokens: 8000, stream: true })
    }).catch(function (e) {
      if (e.name === "AbortError") throw e;
      throw new Error(T("ia_ered", { e: e.message }));
    }).then(function (r) {
      if (!r.ok) {
        return r.text().then(function (cuerpo) {
          var msg = cuerpo;
          try { msg = JSON.parse(cuerpo).error.message; } catch (e) {}
          if (r.status === 401) throw new Error(T("ia_e401"));
          if (r.status === 402) throw new Error(T("ia_e402"));
          if (r.status === 429) throw new Error(T("ia_e429"));
          throw new Error(T("ia_eotro", { c: r.status, e: msg }));
        });
      }
      var lector = r.body.getReader(), dec = new TextDecoder(), resto = "", texto = "";
      function leer() {
        return lector.read().then(function (p) {
          if (p.done) return texto;
          resto += dec.decode(p.value, { stream: true });
          var lineas = resto.split("\n");
          resto = lineas.pop();
          lineas.forEach(function (l) {
            l = l.trim();
            if (l.indexOf("data:") !== 0) return;
            var d = l.slice(5).trim();
            if (d === "[DONE]") return;
            try {
              var trozo = JSON.parse(d).choices[0].delta.content;
              if (trozo) { texto += trozo; alAvanzar(texto); }
            } catch (e) {}
          });
          return leer();
        });
      }
      return leer();
    });
  }

  // ================================================================ interfaz
  var dlg = $("dlg-ia"), control = null;
  function estado(msg, tipo) {
    $("ia-estado").textContent = msg || "";
    $("ia-estado").className = "ia-estado" + (tipo ? " " + tipo : "");
  }
  function ocupado(si) {
    $("ia-generar").disabled = si;
    $("ia-form").classList.toggle("ocupado", si);
    $("ia-cancelar").textContent = T(si ? "ia_cancelar" : "ia_cerrar");
  }
  function modoAcceso() {
    var equipo = $("ia-modo-equipo").checked;
    $("ia-fila-pass").hidden = !equipo;
    $("ia-fila-clave").hidden = equipo;
  }

  // origen: material completo o resumen/objetivo
  function modoOrigen() {
    var brief = $("ia-origen-brief").checked;
    $("ia-lbl-material").textContent = T(brief ? "ia_brief" : "ia_material");
    $("ia-material").placeholder = T(brief ? "ia_brief_ph" : "ia_ph");
    $("ia-intro").textContent = T(brief ? "ia_intro_brief" : "ia_intro");
  }
  $("ia-origen-material").onchange = $("ia-origen-brief").onchange = modoOrigen;
  // tipos de escena: la IA elige, o se marcan
  $("ia-tipos-lista").innerHTML = TIPOS_ELEGIBLES.map(function (k) {
    return '<label class="ed-check"><input type="checkbox" value="' + k + '" checked> <span data-t="p_' + k + '">' + T("p_" + k) + "</span></label>";
  }).join("");
  function modoTipos() { $("ia-tipos-lista").hidden = !$("ia-tipos-elegir").checked; }
  $("ia-tipos-auto").onchange = $("ia-tipos-elegir").onchange = modoTipos;
  function opciones() {
    var tipos = null;
    if ($("ia-tipos-elegir").checked) {
      tipos = Array.prototype.slice.call($("ia-tipos-lista").querySelectorAll("input:checked")).map(function (i) { return i.value; });
    }
    return {
      modo: $("ia-origen-brief").checked ? "brief" : "material",
      material: $("ia-material").value.trim(),
      idioma: $("ia-idioma").value, largo: $("ia-largo").value, extra: $("ia-extra").value.trim(), tipos: tipos
    };
  }
  document.addEventListener("click", function (e) {   // al cambiar el idioma se rehacen los textos que dependen del modo
    if (e.target.closest && e.target.closest("[data-idioma]")) setTimeout(modoOrigen, 0);
  });
  modoOrigen();

  $("btn-ia").onclick = function () {
    $("ia-idioma").value = E.idioma();
    estado("");
    modoOrigen();
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    $("ia-material").focus();
  };
  $("ia-cancelar").onclick = function () {
    if (control) { control.abort(); return; }
    dlg.close();
  };
  dlg.addEventListener("cancel", function (e) { if (control) { e.preventDefault(); control.abort(); } });
  $("ia-modo-equipo").onchange = $("ia-modo-propia").onchange = modoAcceso;

  $("ia-copiar").onclick = function () {
    var o = opciones();
    if (!o.material) o.material = o.modo === "brief" ? "[WRITE YOUR SUMMARY OR LEARNING OBJECTIVE HERE]" : "[PASTE YOUR MATERIAL HERE]";
    cargarEjemplo().then(function (ej) {
      var txt = instrucciones(ej) + "\n\n" + peticion(o);
      return navigator.clipboard.writeText(txt);
    }).then(function () { estado(T("ia_copiado"), "ok"); }, function (e) { estado(e.message, "error"); });
  };

  $("ia-form").onsubmit = function (ev) {
    ev.preventDefault();
    var o = opciones();
    if (!o.material) { estado(T(o.modo === "brief" ? "ia_falta_brief" : "ia_falta_material"), "error"); $("ia-material").focus(); return; }
    if (o.tipos && !o.tipos.length) { estado(T("ia_falta_tipos"), "error"); return; }
    control = new AbortController();
    ocupado(true);
    var clave, mensajes;
    Promise.all([obtenerClave(), cargarEjemplo()]).then(function (r) {
      clave = r[0];
      mensajes = [
        { role: "system", content: instrucciones(r[1]) },
        { role: "user", content: peticion(o) }
      ];
      estado(T("ia_escribiendo", { n: 0 }));
      return llamar(clave, mensajes, function (t) { estado(T("ia_escribiendo", { n: t.length.toLocaleString() })); }, control.signal);
    }).then(function (txt) {
      if (!txt.trim()) throw new Error(T("ia_vacio"));
      txt = limpiarRespuesta(txt);
      var avisos = E.revisar(txt);
      if (!avisos.length) return txt;
      // una ronda de corrección: se le devuelven los errores que ha visto el editor
      estado(T("ia_revisando", { n: avisos.length }));
      mensajes.push({ role: "assistant", content: txt });
      mensajes.push({ role: "user", content: "The editor found these problems in your script:\n- " + avisos.join("\n- ") +
        "\nReturn the complete corrected script and nothing else." });
      return llamar(clave, mensajes, function () {}, control.signal).then(function (t2) {
        return t2.trim() ? limpiarRespuesta(t2) : txt;
      });
    }).then(function (txt) {
      E.cargar(txt);
      var quedan = E.revisar(txt).length;
      control = null;
      ocupado(false);
      if (quedan) estado(T("ia_listo_avisos"), "error");
      else { estado(T("ia_listo"), "ok"); setTimeout(function () { if (!control) dlg.close(); }, 1200); }
    }).catch(function (e) {
      control = null;
      ocupado(false);
      estado(e.name === "AbortError" ? T("ia_cancelado") : (e.message || String(e)), e.name === "AbortError" ? "" : "error");
    });
  };

  // estado inicial: ¿hay acceso de equipo? ¿hay clave propia guardada?
  try {
    var guardada = localStorage.getItem(CLAVE_PROPIA);
    if (guardada) { $("ia-clave").value = guardada; $("ia-recordar").checked = true; }
  } catch (e) {}
  fetch("acceso.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    .then(function (a) {
      acceso = a && a.ct ? a : null;
      $("ia-modo-equipo").disabled = !acceso;
      $("ia-sin-equipo").hidden = !!acceso;
      $("ia-modo-equipo").checked = !!acceso;
      $("ia-modo-propia").checked = !acceso;
      modoAcceso();
    });
})();
