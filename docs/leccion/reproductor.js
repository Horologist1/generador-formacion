/* Reproductor de lecciones: diapositivas + voz sincronizada + subtítulos + preguntas. */
(function () {
  var C = window.CURSO, M = C.meta, D = C.diapositivas;
  var $ = function (id) { return document.getElementById(id); };
  var app = document.querySelector(".app"), escenario = $("escenario"), audio = $("audio");
  var subt = $("subtitulo").firstElementChild;

  // ------------------------------------------------------------- textos de la interfaz
  var TEXTOS = {
    es: {
      empezar: "Empezar", continuar: "Continuar en la diapositiva {n}", ayuda: "Con sonido. Puedes activar los subtítulos o leer el texto completo en cualquier momento.",
      duracion: "Duración aproximada: {d} · {p} preguntas", minuto: "minuto", minutos: "minutos",
      diapositiva: "Diapositiva {n} de {t} · {p}%", pregunta: "Pregunta {n} de {t}", textoLeccion: "Texto de la lección",
      texto: "Texto", velocidad: "Velocidad", anterior: "Diapositiva anterior", siguiente: "Diapositiva siguiente",
      reproducir: "Reproducir", pausa: "Pausa", cerrar: "Cerrar", correcto: "¡Correcto!", incorrecto: "No exactamente.",
      repasar: "Repasar «{t}»", completado: "Curso completado.", repetir: "Repetir el curso",
      aprobado: "<strong>¡Curso superado!</strong> Has acertado {ok} de {t} preguntas a la primera.",
      suspenso: "<strong>Casi.</strong> Has acertado {ok} de {t}. Repasa la lección e inténtalo de nuevo."
    },
    en: {
      empezar: "Start", continuar: "Continue from slide {n}", ayuda: "Sound on. You can turn on subtitles or read the full text at any time.",
      duracion: "Approximate length: {d} · {p} questions", minuto: "minute", minutos: "minutes",
      diapositiva: "Slide {n} of {t} · {p}%", pregunta: "Question {n} of {t}", textoLeccion: "Lesson text",
      texto: "Text", velocidad: "Speed", anterior: "Previous slide", siguiente: "Next slide",
      reproducir: "Play", pausa: "Pause", cerrar: "Close", correcto: "Correct!", incorrecto: "Not quite.",
      repasar: "Review “{t}”", completado: "Course completed.", repetir: "Retake the course",
      aprobado: "<strong>Course passed!</strong> You got {ok} of {t} questions right first time.",
      suspenso: "<strong>Almost.</strong> You got {ok} of {t}. Review the lesson and try again."
    }
  };
  var L = TEXTOS[(M.idioma || "es").slice(0, 2)] || TEXTOS.es;
  function t(clave, vars) {
    return L[clave].replace(/\{(\w+)\}/g, function (_, k) { return vars && vars[k] !== undefined ? vars[k] : ""; });
  }
  $("btn-empezar").textContent = t("empezar");
  document.querySelector(".ini-ayuda").textContent = t("ayuda");
  document.querySelector(".trans-cab h2").textContent = t("textoLeccion");
  $("btn-trans").textContent = t("texto");
  document.querySelector(".velocidad .sr").textContent = t("velocidad");
  $("btn-ant").setAttribute("aria-label", t("anterior"));
  $("btn-sig").setAttribute("aria-label", t("siguiente"));
  $("btn-play").setAttribute("aria-label", t("reproducir"));
  $("btn-cerrar-trans").setAttribute("aria-label", t("cerrar"));
  if (L === TEXTOS.en) document.querySelectorAll("#sel-vel option").forEach(function (o) { o.textContent = o.textContent.replace(",", "."); });

  var estado = { i: 0, respuestas: {}, vistos: {} };
  var datos = window.LMS.datos();
  if (datos.r) estado.respuestas = datos.r;
  if (datos.v) datos.v.forEach(function (n) { estado.vistos[n] = true; });

  if (M.color) document.documentElement.style.setProperty("--marca", M.color);
  $("marca").textContent = M.empresa || "";
  $("titulo-curso").textContent = M.titulo || "";

  // ------------------------------------------------------------- utilidades
  function minutos(s) { var m = Math.max(1, Math.round(s / 60)); return m + " " + (m === 1 ? t("minuto") : t("minutos")); }
  function preguntas() { return D.filter(function (d) { return d.tipo === "pregunta"; }); }
  function esCorrecta(d) { var r = estado.respuestas[d.num]; return r !== undefined && d.opciones[r].correcta; }
  function limite() {  // no se puede pasar de una pregunta sin responder
    for (var k = 0; k < D.length; k++) if (D[k].tipo === "pregunta" && estado.respuestas[D[k].num] === undefined) return k;
    return D.length - 1;
  }
  function guardar() {
    window.LMS.guardarPosicion(estado.i, {
      r: estado.respuestas,
      v: Object.keys(estado.vistos).map(Number)
    });
  }

  // ------------------------------------------------------------- dibujar diapositivas
  function vinetas(d) {
    return '<ul class="vinetas">' + d.vinetas.map(function (v, k) {
      return '<li class="paso" data-paso="' + (k + 1) + '" data-n="' + (k + 1) + '">' + v + "</li>";
    }).join("") + "</ul>";
  }

  var dibujar = {
    portada: function (d) {
      return '<div class="eyebrow">' + (M.empresa || "") + "</div><h2>" + d.titulo + '</h2><p class="sub">' + (M.subtitulo || "") + "</p>";
    },
    cifra: function (d) {
      return '<div class="eyebrow">' + d.titulo + '</div><div class="cifra">' + d.cifra + '</div><div class="cifra-txt">' + d.texto + "</div>";
    },
    contenido: function (d) { return "<h2>" + d.titulo + "</h2>" + (d.vinetas ? vinetas(d) : ""); },
    correo: function (d) {
      var notas = '<ol class="notas">' + d.notas.map(function (n, k) {
        return '<li class="paso" data-paso="' + (k + 1) + '"><span class="num">' + (k + 1) + "</span><span>" + n + "</span></li>";
      }).join("") + "</ol>";
      return "<h2>" + d.titulo + '</h2><div class="correo-grid">' + d.correo_html + notas + "</div>";
    },
    pregunta: function (d) {
      var r = estado.respuestas[d.num];
      var ops = d.opciones.map(function (o, k) {
        var cls = "opcion";
        if (r !== undefined && o.correcta) cls += " correcta";
        if (r === k && !o.correcta) cls += " incorrecta";
        return '<button class="' + cls + '" data-k="' + k + '" data-letra="' + "ABCDEFG"[k] + '"' +
          (r !== undefined ? " disabled" : "") + ">" + o.texto + "</button>";
      }).join("");
      return '<div class="eyebrow">' + t("pregunta", { n: preguntas().indexOf(d) + 1, t: preguntas().length }) + "</div>" +
        "<h2>" + d.titulo + '</h2><p class="pregunta-txt">' + d.pregunta + '</p><div class="opciones">' + ops + "</div>" +
        (r !== undefined ? feedback(d) : "");
    },
    cierre: function (d) {
      var ps = preguntas(), ok = ps.filter(esCorrecta).length;
      var html = "<h2>" + d.titulo + "</h2>" + (d.vinetas ? vinetas(d) : "");
      if (!ps.length) return html + '<div class="resultado"><p><strong>' + t("completado") + "</strong></p></div>";
      var nota = Math.round(ok / ps.length * 100), aprobado = nota >= Number(M.nota_aprobado || 50);
      html += '<div class="resultado' + (aprobado ? "" : " suspenso") + '"><div class="nota">' + ok + "/" + ps.length + "</div><p>" +
        t(aprobado ? "aprobado" : "suspenso", { ok: ok, t: ps.length }) +
        "</p>" + (aprobado ? "" : '<button class="btn-secundario" id="btn-repetir">' + t("repetir") + "</button>") + "</div>";
      return html;
    }
  };

  function feedback(d) {
    var ok = esCorrecta(d);
    var rep = (!ok && d.repasar) ? '<br><button class="btn-secundario" data-ir="' + (d.repasar - 1) + '">' + t("repasar", { t: D[d.repasar - 1].titulo }) + "</button>" : "";
    return '<div class="feedback ' + (ok ? "ok" : "mal") + '"><strong>' + t(ok ? "correcto" : "incorrecto") + "</strong>" + d.explicacion + rep + "</div>";
  }

  function tienePasos(d) { return (d.frases || []).some(function (f) { return f.paso > 0; }); }

  function mostrarPasos(n) {
    escenario.querySelectorAll(".paso").forEach(function (el) {
      el.classList.toggle("visible", Number(el.dataset.paso) <= n);
    });
  }

  // ------------------------------------------------------------- navegación
  function ir(i, reproducir) {
    if (i < 0 || i >= D.length || i > limite()) return;
    estado.i = i;
    var d = D[i];
    escenario.className = "escenario d-" + d.tipo;
    delete escenario.dataset.fin;
    escenario.innerHTML = (dibujar[d.tipo] || dibujar.contenido)(d);
    escenario.scrollTop = 0;

    var pasos = tienePasos(d) && !estado.vistos[d.num];
    escenario.classList.toggle("modo-pasos", pasos);
    mostrarPasos(pasos ? 0 : 99);
    subt.textContent = "";
    $("btn-sig").classList.remove("llamar");

    if (d.tipo === "cierre") {
      var ps = preguntas(), ok = ps.filter(esCorrecta).length;
      var nota = ps.length ? Math.round(ok / ps.length * 100) : null;
      window.LMS.finalizar(nota, nota === null || nota >= Number(M.nota_aprobado || 50));
    }

    if (d.audio) {
      audio.src = d.audio;
      audio.playbackRate = audio.defaultPlaybackRate = Number($("sel-vel").value);
      if (reproducir) audio.play().catch(function () {});
    } else {
      audio.removeAttribute("src"); audio.load();
      terminarDiapositiva();
    }
    actualizarUI();
    guardar();
  }

  function terminarDiapositiva() {
    var d = D[estado.i];
    estado.vistos[d.num] = true;
    escenario.dataset.fin = "1";
    escenario.classList.remove("modo-pasos");
    mostrarPasos(99);
    subt.textContent = "";
    var bloqueada = d.tipo === "pregunta" && estado.respuestas[d.num] === undefined;
    if (!bloqueada && estado.i < D.length - 1) $("btn-sig").classList.add("llamar");
    actualizarUI();
    guardar();
  }

  function actualizarUI() {
    var lim = limite();
    $("btn-ant").disabled = estado.i === 0;
    $("btn-sig").disabled = estado.i >= lim || estado.i === D.length - 1;
    $("btn-play").disabled = !D[estado.i].audio;
    var vistos = Object.keys(estado.vistos).length;
    $("progreso-txt").textContent = t("diapositiva", { n: estado.i + 1, t: D.length, p: Math.round(vistos / D.length * 100) });
    document.querySelectorAll(".seg").forEach(function (s, k) {
      s.classList.toggle("actual", k === estado.i);
      s.classList.toggle("visto", !!estado.vistos[D[k].num] && k !== estado.i);
      s.disabled = k > lim;
      if (k !== estado.i) s.firstChild.style.width = "";
    });
    document.querySelectorAll(".trans-bloque").forEach(function (b, k) { b.classList.toggle("actual", k === estado.i); });
  }

  // ------------------------------------------------------------- audio sincronizado
  audio.addEventListener("timeupdate", function () {
    var d = D[estado.i], t = audio.currentTime;
    if (!d.frases || (audio.paused && escenario.dataset.fin)) return;
    var paso = 0, texto = "";
    d.frases.forEach(function (f) {
      if (f.ini <= t + 0.05) paso = Math.max(paso, f.paso);
      if (f.ini <= t && t <= f.fin + 0.3) texto = f.texto;
    });
    if (escenario.classList.contains("modo-pasos")) mostrarPasos(paso);
    if (subt.textContent !== texto) subt.textContent = texto;
    var seg = document.querySelectorAll(".seg")[estado.i];
    if (seg) seg.firstChild.style.width = Math.min(100, t / d.duracion * 100) + "%";
  });
  audio.addEventListener("play", function () { app.classList.add("reproduciendo"); $("btn-play").setAttribute("aria-label", t("pausa")); });
  audio.addEventListener("pause", function () { app.classList.remove("reproduciendo"); $("btn-play").setAttribute("aria-label", t("reproducir")); });
  audio.addEventListener("ended", terminarDiapositiva);

  function alternar() {
    if (!D[estado.i].audio) return;
    if (audio.paused) {
      if (audio.ended) audio.currentTime = 0;
      audio.play().catch(function () {});
    } else audio.pause();
  }

  // ------------------------------------------------------------- eventos
  $("btn-play").onclick = alternar;
  $("btn-ant").onclick = function () { ir(estado.i - 1, true); };
  $("btn-sig").onclick = function () { ir(estado.i + 1, true); };
  $("sel-vel").onchange = function () { audio.playbackRate = audio.defaultPlaybackRate = Number(this.value); };
  $("btn-cc").onclick = function () {
    var on = app.classList.toggle("sin-cc") === false;
    this.classList.toggle("activo", on); this.setAttribute("aria-pressed", on);
  };
  function panelTexto(abrir) {
    $("transcripcion").hidden = !abrir;
    $("btn-trans").classList.toggle("activo", abrir);
    $("btn-trans").setAttribute("aria-pressed", abrir);
  }
  $("btn-trans").onclick = function () { panelTexto($("transcripcion").hidden); };
  $("btn-cerrar-trans").onclick = function () { panelTexto(false); };

  escenario.addEventListener("click", function (e) {
    var op = e.target.closest(".opcion");
    if (op && !op.disabled) {
      var d = D[estado.i];
      estado.respuestas[d.num] = Number(op.dataset.k);
      audio.pause();
      escenario.innerHTML = dibujar.pregunta(d);
      terminarDiapositiva();
      var fb = escenario.querySelector(".feedback");
      if (fb) fb.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    var irA = e.target.closest("[data-ir]");
    if (irA) { ir(Number(irA.dataset.ir), true); return; }
    if (e.target.id === "btn-repetir") {
      estado.respuestas = {}; estado.vistos = {};
      window.LMS.reiniciar();
      ir(0, true);
    }
  });

  document.addEventListener("keydown", function (e) {
    if (!$("inicio").hidden) return;
    var tag = e.target.tagName;
    if (e.key === "ArrowRight" && !$("btn-sig").disabled) ir(estado.i + 1, true);
    else if (e.key === "ArrowLeft") ir(estado.i - 1, true);
    else if (e.key === " " && tag !== "BUTTON" && tag !== "SELECT") { e.preventDefault(); alternar(); }
    else if (e.key === "Escape") panelTexto(false);
  });

  // segmentos de progreso
  D.forEach(function (d, k) {
    var s = document.createElement("button");
    s.className = "seg" + (d.tipo === "pregunta" ? " es-pregunta" : "");
    s.setAttribute("role", "listitem");
    s.setAttribute("aria-label", (k + 1) + ". " + d.titulo);
    s.title = (k + 1) + ". " + d.titulo;
    s.appendChild(document.createElement("i"));
    s.onclick = function () { ir(k, true); };
    $("segmentos").appendChild(s);
  });

  // transcripción
  $("trans-cuerpo").innerHTML = D.map(function (d, k) {
    var texto = (d.frases || []).map(function (f) { return f.texto; }).join(" ");
    return '<div class="trans-bloque"><h3><button data-k="' + k + '">' + (k + 1) + ". " + d.titulo + "</button></h3><p>" + texto + "</p></div>";
  }).join("");
  $("trans-cuerpo").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-k]");
    if (b) ir(Number(b.dataset.k), true);
  });

  // pantalla de inicio
  $("ini-empresa").textContent = M.empresa || "";
  $("ini-titulo").textContent = M.titulo || "";
  $("ini-sub").textContent = M.subtitulo || "";
  $("ini-dur").textContent = t("duracion", { d: minutos(M.duracion_total || 0), p: preguntas().length });
  var marcador = window.LMS.marcador();
  if (marcador > 0 && marcador < D.length) {
    $("btn-continuar").hidden = false;
    $("btn-continuar").textContent = t("continuar", { n: marcador + 1 });
    $("btn-continuar").onclick = function () { $("inicio").hidden = true; ir(Math.min(marcador, limite()), true); };
  }
  $("btn-empezar").onclick = function () { $("inicio").hidden = true; ir(0, true); };
  $("btn-empezar").focus();

  ir(Math.min(marcador, limite()), false);
})();
