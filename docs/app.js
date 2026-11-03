/* Editor web del generador de formación.
   Lee el guion (mismo formato que generador/*.py), calcula la línea de tiempo SIN VOZ (cada frase dura
   lo que se tarda en leerla) y la anima con el mismo motor que el vídeo (motor/video.js).
   Todo ocurre en el navegador: el guion no se envía a ningún servidor. */
(function () {
  "use strict";

  var LEAD = 0.9, PAUSA = 0.4, COLA = 1.1, CUENTA = 5;
  var RESPUESTA = { en: "The correct answer is {l}.", es: "La respuesta correcta es la {l}." };
  var CLAVE_BORRADOR = "generador-formacion:borrador";
  var $ = function (id) { return document.getElementById(id); };

  // ================================================================ idioma de la interfaz
  var TXT = {
    en: {
      app: "Training Video Builder", ejemplo: "Example", elegir: "Choose…", ej_en: "Phishing (English)", ej_es: "Phishing (Spanish)",
      ej_nuevo: "Blank script", como: "How to write", exportar: "Export",
      exp_video: "Animated video (HTML)", exp_video_d: "A single file that plays in any browser.",
      exp_scorm: "SCORM lesson (.zip)", exp_scorm_d: "For your LMS, with scored questions.",
      exp_guion: "Script (.md)", exp_guion_d: "To keep it, or to render the voiced version locally.",
      anadir: "Add scene:", p_portada: "Title", p_contenido: "List", p_cifra: "Big number", p_correo: "Email",
      p_pregunta: "Question", p_cierre: "Summary", guion: "Script", vista: "Preview", posicion: "Position",
      velocidad: "Reading speed", ppm: "words/min", subs: "Show narration text on screen",
      nota: "No voice: each sentence lasts as long as it takes to read it. For the voiced version, export the script and render the video locally with <code>generador/video.py</code>.",
      ayuda_tit: "How to write the script", cerrar: "Close", reproducir: "Play", pausa: "Pause",
      estado: "{n} scenes · {d} of video · saved in this browser", vacio: "Choose an example or start a blank script.",
      cargado: "Another script has been loaded.", recuperar: "Restore the previous one", noEjemplo: "The example could not be loaded.",
      noExport: "Export failed: {e}. If you opened the file directly, use the published website instead.", noZip: "the compression library (JSZip) did not load",
      sinEscenas: "The script has no scenes. Each scene starts with “## Title”.", escena: "Scene {n} (“{t}”): ",
      tipoMal: "unknown type “{x}”. Use: {l}.", faltaCorreo: "the ```correo … ``` block is missing.", faltaCifra: "the “cifra: …” line is missing.",
      faltaPreg: "the “pregunta: …” line is missing.", dosOpc: "needs at least two “- [ ]” options.", marcaOk: "mark the correct answer with “- [x]”.",
      repasarMal: "“repasar” points to “{x}”, which does not exist.", archivo: "course"
    },
    es: {
      app: "Generador de formación", ejemplo: "Ejemplo", elegir: "Elegir…", ej_en: "Phishing (inglés)", ej_es: "Phishing (español)",
      ej_nuevo: "Guion en blanco", como: "Cómo se escribe", exportar: "Exportar",
      exp_video: "Vídeo animado (HTML)", exp_video_d: "Un archivo que se reproduce en cualquier navegador.",
      exp_scorm: "Lección SCORM (.zip)", exp_scorm_d: "Para el LMS, con preguntas puntuables.",
      exp_guion: "Guion (.md)", exp_guion_d: "Para guardarlo o generar la versión con voz en local.",
      anadir: "Añadir escena:", p_portada: "Portada", p_contenido: "Lista", p_cifra: "Cifra", p_correo: "Correo",
      p_pregunta: "Pregunta", p_cierre: "Cierre", guion: "Guion", vista: "Vista previa", posicion: "Posición",
      velocidad: "Velocidad de lectura", ppm: "palabras/min", subs: "Texto de la narración en pantalla",
      nota: "Sin voz: cada frase dura lo que se tarda en leerla. Para la versión con voz, exporta el guion y genera el vídeo en local con <code>generador/video.py</code>.",
      ayuda_tit: "Cómo se escribe el guion", cerrar: "Cerrar", reproducir: "Reproducir", pausa: "Pausa",
      estado: "{n} escenas · {d} de vídeo · guardado en este navegador", vacio: "Elige un ejemplo o empieza un guion en blanco.",
      cargado: "Se ha cargado otro guion.", recuperar: "Recuperar el anterior", noEjemplo: "No se ha podido cargar el ejemplo.",
      noExport: "No se ha podido exportar: {e}. Si has abierto el archivo directamente, ábrelo desde la web publicada.", noZip: "no se ha cargado la librería de compresión (JSZip)",
      sinEscenas: "El guion no tiene escenas. Cada escena empieza con «## Título».", escena: "Escena {n} («{t}»): ",
      tipoMal: "tipo «{x}» desconocido. Usa: {l}.", faltaCorreo: "falta el bloque ```correo … ```.", faltaCifra: "falta la línea «cifra: …».",
      faltaPreg: "falta la línea «pregunta: …».", dosOpc: "necesita al menos dos opciones «- [ ]».", marcaOk: "marca la respuesta correcta con «- [x]».",
      repasarMal: "«repasar» apunta a «{x}», que no existe.", archivo: "curso"
    }
  };
  var CLAVE_IDIOMA = "generador-formacion:idioma";
  var idiomaUI = "en";
  try { idiomaUI = localStorage.getItem(CLAVE_IDIOMA) || "en"; } catch (e) {}
  if (!TXT[idiomaUI]) idiomaUI = "en";
  function T(clave, vars) {
    return String(TXT[idiomaUI][clave]).replace(/\{(\w+)\}/g, function (_, k) { return vars && vars[k] !== undefined ? vars[k] : ""; });
  }
  function aplicarIdioma() {
    document.documentElement.lang = idiomaUI;
    document.title = T("app");
    document.querySelectorAll("[data-t]").forEach(function (e) { e.textContent = T(e.dataset.t); });
    document.querySelectorAll("[data-t-html]").forEach(function (e) { e.innerHTML = T(e.dataset.tHtml); });
    document.querySelectorAll("[data-t-aria]").forEach(function (e) { e.setAttribute("aria-label", T(e.dataset.tAria)); });
    document.querySelectorAll("[data-solo]").forEach(function (e) { e.hidden = e.dataset.solo !== idiomaUI; });
    document.querySelectorAll("[data-idioma]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.idioma === idiomaUI); });
  }
  aplicarIdioma();

  // ================================================================ lectura del guion
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function inline(t) { return esc(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"); }
  function limpio(t) { return String(t || "").replace(/\*\*(.+?)\*\*/g, "$1").trim(); }
  function r3(x) { return Math.round(x * 1000) / 1000; }

  function leerGuion(texto) {
    texto = texto.replace(/\r\n?/g, "\n").replace(/<!--[\s\S]*?-->/g, "");
    var meta = {};
    var m = /^\s*---\s*\n([\s\S]*?)\n---\s*\n/.exec(texto);
    if (m) {
      m[1].split("\n").forEach(function (l) {
        var i = l.indexOf(":");
        if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      });
      texto = texto.slice(m[0].length);
    }
    var bloques = texto.split(/^## +/m).slice(1);
    return { meta: meta, diapositivas: bloques.map(function (b, i) { return leerDiapositiva(b, i + 1); }) };
  }

  function leerDiapositiva(bloque, num) {
    var lineas = bloque.split("\n");
    var d = { num: num, titulo: lineas[0].trim(), tipo: "contenido", vinetas: [], narracion: [], opciones: [] };
    var resto = [], i = 1;
    while (i < lineas.length) {
      if (lineas[i].trim().indexOf("```correo") === 0) {
        var j = i + 1, c = [];
        while (j < lineas.length && lineas[j].trim().indexOf("```") !== 0) { c.push(lineas[j]); j++; }
        d.correo = c.join("\n");
        i = j + 1;
        continue;
      }
      resto.push(lineas[i]);
      i++;
    }
    resto.forEach(function (l) {
      var s = l.trim(), mm;
      if (!s) return;
      if (s[0] === ">") d.narracion.push(s.slice(1).trim());
      else if (/^- \[( |x|X)\] /.test(s)) d.opciones.push({ texto: s.slice(6).trim(), correcta: s[3].toLowerCase() === "x" });
      else if (s.indexOf("- ") === 0) d.vinetas.push(s.slice(2).trim());
      else if ((mm = /^(tipo|cifra|texto|pregunta|explicacion|repasar):\s*(.*)$/.exec(s))) d[mm[1]] = mm[2].trim();
    });
    return d;
  }

  function dividirFrases(parrafos) {
    var out = [];
    parrafos.forEach(function (p) {
      p.split(/(?<=[.!?…])\s+/).forEach(function (f) {
        f = f.trim();
        if (!f) return;
        var pasos = (f.match(/\{(\d+)\}/g) || []).map(function (x) { return +x.slice(1, -1); });
        var l = f.replace(/\s*\{\d+\}\s*/g, " ").trim();
        out.push({
          texto: l.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1"),
          dicho: l.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$2"),
          paso: pasos.length ? Math.max.apply(null, pasos) : 0
        });
      });
    });
    return out;
  }

  function correoAHtml(src) {
    var notas = [];
    function marca(contNota) {
      var i = contNota.indexOf("|");
      var cont = i < 0 ? contNota : contNota.slice(0, i), nota = i < 0 ? "" : contNota.slice(i + 1);
      notas.push(nota.trim());
      var n = notas.length;
      var dentro = cont.indexOf("btn:") === 0 ? '<span class="correo-btn">' + esc(cont.slice(4).trim()) + "</span>" : esc(cont);
      return '<mark class="paso" data-paso="' + n + '">' + dentro + "<sup>" + n + "</sup></mark>";
    }
    function proc(t) {
      return t.split(/(\[\[.+?\]\])/).map(function (p) {
        return /^\[\[.+\]\]$/.test(p) ? marca(p.slice(2, -2)) : esc(p);
      }).join("");
    }
    var k = src.indexOf("\n\n");
    var cab = k < 0 ? src : src.slice(0, k), cuerpo = k < 0 ? "" : src.slice(k + 2);
    var cabHtml = cab.split("\n").filter(function (l) { return l.trim(); }).map(function (l) {
      var i = l.indexOf(":");
      var c = i < 0 ? l : l.slice(0, i), v = i < 0 ? "" : l.slice(i + 1);
      return '<div class="correo-fila"><span class="correo-k">' + esc(c.trim()) + ':</span> <span class="correo-v">' + proc(v.trim()) + "</span></div>";
    }).join("");
    var parr = cuerpo.split("\n\n").map(function (p) { return p.trim(); }).filter(Boolean)
      .map(function (p) { return "<p>" + proc(p).replace(/\n/g, "<br>") + "</p>"; }).join("");
    return { html: '<div class="correo"><div class="correo-cab">' + cabHtml + '</div><div class="correo-cuerpo">' + parr + "</div></div>", notas: notas };
  }

  function duracionHabla(texto, ppm) {
    var palabras = texto.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1.0, palabras / (ppm / 60)) + 0.15;
  }

  function trocear(texto, max) {
    if (texto.length <= max) return [texto];
    var partes = [], actual = "";
    texto.split(/(?<=[,;:])\s+/).forEach(function (tr) {
      if (actual && actual.length + tr.length + 1 > max) { partes.push(actual); actual = tr; }
      else actual = (actual + " " + tr).trim();
    });
    partes.push(actual);
    var salida = [];
    partes.forEach(function (p) {
      while (p.length > max) {
        var c = p.lastIndexOf(" ", max);
        if (c <= 0) c = max;
        salida.push(p.slice(0, c));
        p = p.slice(c + 1);
      }
      salida.push(p);
    });
    return salida;
  }

  // ================================================================ validación
  var TIPOS = ["portada", "contenido", "cifra", "correo", "pregunta", "cierre"];
  function validar(meta, diaps) {
    var avisos = [], titulos = {};
    if (!diaps.length) avisos.push(T("sinEscenas"));
    diaps.forEach(function (d) { titulos[d.titulo] = true; });
    diaps.forEach(function (d) {
      var donde = T("escena", { n: d.num, t: d.titulo });
      if (TIPOS.indexOf(d.tipo) < 0) avisos.push(donde + T("tipoMal", { x: d.tipo, l: TIPOS.join(", ") }));
      if (d.tipo === "correo" && !d.correo) avisos.push(donde + T("faltaCorreo"));
      if (d.tipo === "cifra" && !d.cifra) avisos.push(donde + T("faltaCifra"));
      if (d.tipo === "pregunta") {
        if (!d.pregunta) avisos.push(donde + T("faltaPreg"));
        if (d.opciones.length < 2) avisos.push(donde + T("dosOpc"));
        if (!d.opciones.some(function (o) { return o.correcta; })) avisos.push(donde + T("marcaOk"));
        if (d.repasar && !titulos[d.repasar]) avisos.push(donde + T("repasarMal", { x: d.repasar }));
      }
    });
    return avisos;
  }

  // ================================================================ línea de tiempo del vídeo (sin voz)
  function construirVideo(meta, diaps, ppm, subtitulos) {
    var idioma = (meta.idioma || "es").slice(0, 2);
    var totalPreg = diaps.filter(function (d) { return d.tipo === "pregunta"; }).length, nPreg = 0;
    var t = 0, escenas = [], subs = [];
    diaps.forEach(function (d) {
      var ini = t, frases = [], roles = {};
      var segs = [{ sil: LEAD }];
      dividirFrases(d.narracion).forEach(function (f) { segs.push({ voz: f, rol: "narracion" }, { sil: PAUSA }); });
      if (d.tipo === "pregunta") {
        nPreg++;
        dividirFrases([limpio(d.pregunta)]).forEach(function (f) { segs.push({ voz: f, rol: "pregunta" }, { sil: PAUSA }); });
        segs.push({ sil: CUENTA, rol: "cuenta" });
        var c = Math.max(0, d.opciones.findIndex(function (o) { return o.correcta; }));
        var r = (RESPUESTA[idioma] || RESPUESTA.en).replace("{l}", "ABCDEF"[c]);
        segs.push({ voz: { texto: r, dicho: r, paso: 0 }, rol: "respuesta" }, { sil: PAUSA });
        dividirFrases([limpio(d.explicacion)]).forEach(function (f) { segs.push({ voz: f, rol: "explicacion" }, { sil: PAUSA }); });
        d._n = nPreg; d._total = totalPreg;
      }
      segs.push({ sil: COLA });
      segs.forEach(function (s) {
        if (s.sil !== undefined) {
          if (s.rol === "cuenta") roles.cuenta = [r3(t - ini), r3(t - ini + s.sil)];
          t += s.sil;
          return;
        }
        var dur = duracionHabla(s.voz.dicho, ppm);
        var f = { ini: r3(t - ini), fin: r3(t - ini + dur), texto: s.voz.texto, paso: s.voz.paso };
        frases.push(f);
        if (!(s.rol in roles)) roles[s.rol] = f.ini;
        var trozos = trocear(s.voz.texto, 70), total = trozos.reduce(function (a, x) { return a + x.length; }, 0), t0 = t;
        trozos.forEach(function (x) {
          var t1 = t0 + dur * x.length / total;
          subs.push({ ini: r3(t0), fin: r3(t1 + 0.15), texto: x });
          t0 = t1;
        });
        t += dur;
      });
      escenas.push(datosEscena(d, frases, roles, ini, t));
    });
    return {
      meta: { titulo: esc(meta.titulo), subtitulo: esc(meta.subtitulo), empresa: esc(meta.empresa), idioma: idioma, color: meta.color || "#0f5f73" },
      duracion: t, subs: subs, subtitulos: subtitulos, escenas: escenas
    };
  }

  function datosEscena(d, frases, roles, ini, fin) {
    var tipo = d.tipo || "contenido";
    var e = { tipo: tipo, titulo: esc(d.titulo), ini: r3(ini), fin: r3(fin), frases: frases };
    var th0 = frases.length ? frases[0].ini : LEAD;
    var th1 = frases.length ? frases[frases.length - 1].fin : (fin - ini - COLA);
    var pasos = {};
    frases.forEach(function (f) { if (f.paso && !(f.paso in pasos)) pasos[f.paso] = f.ini; });
    var elementos = d.vinetas.length || ((d.correo || "").match(/\[\[/g) || []).length;
    for (var k = 1; k <= elementos; k++) {
      if (!(k in pasos)) pasos[k] = r3(th0 + 0.3 + (th1 - th0) * 0.75 * (k - 1) / Math.max(1, elementos));
    }
    e.pasos = pasos;
    if (d.vinetas.length) e.vinetas = d.vinetas.map(inline);
    if (tipo === "cifra") { e.cifra = esc(d.cifra || ""); e.texto = inline(d.texto || ""); }
    if (tipo === "correo") {
      var c = correoAHtml(d.correo || "");
      e.correo_html = c.html; e.notas = c.notas.map(esc);
      var foco = [], mostrado = false;
      frases.forEach(function (f) {
        if (f.paso) { foco.push({ t: f.ini, paso: f.paso }); mostrado = true; }
        else if (mostrado && foco.length && foco[foco.length - 1].paso !== 0) foco.push({ t: f.ini, paso: 0 });
      });
      e.foco = foco;
    }
    if (tipo === "pregunta") {
      e.pregunta = inline(d.pregunta || "");
      e.explicacion = inline(d.explicacion || "");
      e.opciones = d.opciones.map(function (o) { return { texto: inline(o.texto), correcta: o.correcta }; });
      e.tPregunta = roles.pregunta !== undefined ? roles.pregunta : 1;
      e.cuenta = roles.cuenta || [3, 8];
      e.tRevelar = roles.respuesta !== undefined ? roles.respuesta : 9;
      e.tExpl = roles.explicacion !== undefined ? roles.explicacion : 10;
      e.n = d._n || 1; e.total = d._total || 1;
    }
    if (tipo === "cierre") {
      e.tFin = frases.length > 1 ? frases[frases.length - 1].ini : r3(fin - ini - 2.5);
      var n = d.vinetas.length, hasta = e.tFin - 0.6;
      for (var j = 1; j <= n; j++) {
        if (!frases.some(function (f) { return f.paso === j; })) pasos[j] = r3(th0 + 0.4 + (hasta - th0 - 0.4) * (j - 1) / Math.max(1, n));
      }
    }
    return e;
  }

  // ================================================================ lección interactiva (SCORM), sin audio
  function construirLeccion(meta, diaps, ppm) {
    var titulos = {}, total = 0;
    diaps.forEach(function (d) { titulos[d.titulo] = d.num; });
    var D = diaps.map(function (d) {
      var it = { num: d.num, titulo: esc(d.titulo), tipo: d.tipo || "contenido" };
      if (it.tipo === "correo" && d.correo) { var c = correoAHtml(d.correo); it.correo_html = c.html; it.notas = c.notas.map(esc); }
      if (d.vinetas.length) it.vinetas = d.vinetas.map(inline);
      if (d.cifra) it.cifra = inline(d.cifra);
      if (d.texto) it.texto = inline(d.texto);
      if (it.tipo === "pregunta") {
        it.pregunta = inline(d.pregunta || "");
        it.opciones = d.opciones.map(function (o) { return { texto: inline(o.texto), correcta: o.correcta }; });
        it.explicacion = inline(d.explicacion || "");
        if (d.repasar && titulos[d.repasar]) it.repasar = titulos[d.repasar];
      }
      var fr = dividirFrases(d.narracion);
      if (fr.length) {
        var t = 0;
        it.frases = fr.map(function (f) {
          var dur = duracionHabla(f.dicho, ppm), x = { ini: r3(t), fin: r3(t + dur), texto: esc(f.texto), paso: f.paso };
          t += dur + PAUSA;
          return x;
        });
        total += t;
      }
      return it;
    });
    var m = {};
    Object.keys(meta).forEach(function (k) { m[k] = esc(meta[k]); });
    m.duracion_total = Math.round(total);
    return { meta: m, diapositivas: D };
  }

  function manifest(meta, nombre, ficheros) {
    var lista = ficheros.map(function (f) { return '      <file href="' + f + '"/>'; }).join("\n");
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<manifest identifier="' + nombre + '_manifest" version="1.0"\n' +
      '  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"\n' +
      '  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"\n' +
      '  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n' +
      '  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">\n' +
      "  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>\n" +
      '  <organizations default="org1">\n    <organization identifier="org1">\n      <title>' + esc(meta.empresa || "Organización") + "</title>\n" +
      '      <item identifier="item1" identifierref="res1">\n        <title>' + esc(meta.titulo || nombre) + "</title>\n" +
      "        <adlcp:masteryscore>" + (parseInt(meta.nota_aprobado, 10) || 50) + "</adlcp:masteryscore>\n      </item>\n    </organization>\n  </organizations>\n" +
      '  <resources>\n    <resource identifier="res1" type="webcontent" adlcp:scormtype="sco" href="index.html">\n' + lista + "\n    </resource>\n  </resources>\n</manifest>\n";
  }

  // ================================================================ interfaz
  var editor = $("guion"), lienzo = $("lienzo"), pantalla = $("pantalla");
  var video = null, datos = null, guion = null, t = 0, reproduciendo = false, ultimo = null, temporizador = null;

  function ajustarEscala() {
    var k = pantalla.clientWidth / 1920;
    lienzo.style.transform = "scale(" + k + ")";
  }
  new ResizeObserver(function () { ajustarEscala(); if (video) video.dibujar(t); }).observe(pantalla);

  function mmss(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }

  function escenaDelCursor() {
    var antes = editor.value.slice(0, editor.selectionStart);
    var n = (antes.replace(/<!--[\s\S]*?-->/g, "").match(/^## /gm) || []).length;
    return Math.max(0, n - 1);
  }

  function reconstruir(irAlCursor) {
    var estado = $("estado");
    try {
      guion = leerGuion(editor.value);
      var avisos = validar(guion.meta, guion.diapositivas);
      if (!guion.diapositivas.length) throw new Error(avisos[0]);
      datos = construirVideo(guion.meta, guion.diapositivas, +$("ppm").value || 150, $("chk-subs").checked);
      ajustarEscala();
      video = window.crearVideo(lienzo, datos);
      if (irAlCursor) {
        var e = datos.escenas[Math.min(escenaDelCursor(), datos.escenas.length - 1)];
        // fotograma representativo: la escena ya montada (casi al final)
        t = e.ini + Math.max(0.8, (e.fin - e.ini) * 0.85);
        if (e.tipo === "cierre") t = e.ini + Math.max(0.8, e.tFin - 0.3);
        reproduciendo = false;
      }
      t = Math.min(t, datos.duracion);
      video.dibujar(t);
      pintarEscenas();
      actualizarControles();
      estado.className = "ed-estado" + (avisos.length ? " error" : "");
      estado.innerHTML = avisos.length
        ? "<ul>" + avisos.map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("") + "</ul>"
        : T("estado", { n: datos.escenas.length, d: mmss(datos.duracion) });
    } catch (err) {
      estado.className = "ed-estado error";
      estado.textContent = err.message || String(err);
    }
  }

  function pintarEscenas() {
    $("escenas").innerHTML = datos.escenas.map(function (e, i) {
      var tit = document.createElement("span");
      tit.innerHTML = e.titulo;
      return '<button data-i="' + i + '" title="' + esc(tit.textContent) + '">' + (i + 1) + ". " + esc(tit.textContent) + "</button>";
    }).join("");
  }

  function actualizarControles() {
    if (!datos) return;
    $("barra-tiempo").value = Math.round(t / datos.duracion * 1000) || 0;
    $("tiempo").textContent = mmss(t) + " / " + mmss(datos.duracion);
    $("btn-play").textContent = reproduciendo ? "❚❚" : "▶";
    $("btn-play").setAttribute("aria-label", T(reproduciendo ? "pausa" : "reproducir"));
    var k = 0;
    datos.escenas.forEach(function (e, i) { if (t >= e.ini) k = i; });
    document.querySelectorAll("#escenas button").forEach(function (b, i) { b.classList.toggle("actual", i === k); });
  }

  function bucle(ts) {
    if (reproduciendo && video) {
      if (ultimo !== null) t += (ts - ultimo) / 1000;
      ultimo = ts;
      if (t >= datos.duracion) { t = datos.duracion; reproduciendo = false; }
      video.dibujar(t);
      actualizarControles();
    } else ultimo = null;
    requestAnimationFrame(bucle);
  }
  requestAnimationFrame(bucle);

  $("btn-play").onclick = function () {
    if (!datos) return;
    if (!reproduciendo && t >= datos.duracion - 0.05) t = 0;
    reproduciendo = !reproduciendo;
    actualizarControles();
  };
  $("barra-tiempo").oninput = function () {
    if (!datos) return;
    t = this.value / 1000 * datos.duracion;
    video.dibujar(t);
    actualizarControles();
  };
  $("escenas").onclick = function (ev) {
    var b = ev.target.closest("button[data-i]");
    if (!b) return;
    t = datos.escenas[+b.dataset.i].ini + 0.01;
    reproduciendo = true;
    actualizarControles();
  };
  $("ppm").onchange = function () { reconstruir(false); };
  $("chk-subs").onchange = function () { reconstruir(false); };

  function guardarBorrador() { try { localStorage.setItem(CLAVE_BORRADOR, editor.value); } catch (e) {} }
  editor.addEventListener("input", function () {
    clearTimeout(temporizador);
    temporizador = setTimeout(function () { guardarBorrador(); reconstruir(true); }, 450);
  });
  editor.addEventListener("click", function () { if (!reproduciendo) reconstruir(true); });
  editor.addEventListener("keydown", function (e) {
    if (e.key === "Tab") {  // tabulador = dos espacios
      e.preventDefault();
      var s = editor.selectionStart;
      editor.setRangeText("  ", s, editor.selectionEnd, "end");
    }
  });

  // --------------------------------------------------------------- plantillas de escena
  var PLANTILLAS_IDIOMA = {
    es: {
      portada: "## Título del curso\ntipo: portada\n\n> Hola, y bienvenido. En los próximos minutos vas a aprender…\n",
      contenido: "## Título de la lista\ntipo: contenido\n\n- **Idea 1**: explicación breve.\n- **Idea 2**: explicación breve.\n- **Idea 3**: explicación breve.\n\n> Frase de introducción.\n> {1} Explica la idea 1.\n> {2} Explica la idea 2.\n> {3} Explica la idea 3.\n",
      cifra: "## Por qué importa\ntipo: cifra\ncifra: 3 de cada 5\ntexto: empleados han recibido un correo sospechoso este año.\n\n> Tres de cada cinco empleados han recibido un correo sospechoso este año.\n",
      correo: "## Un ejemplo\ntipo: correo\n\n```correo\nDe: Remitente <[[direccion@ejemplo.com|Qué tiene de raro]]>\nPara: tú\nAsunto: [[Asunto del correo|Por qué es sospechoso]]\n\nHola,\n\nCuerpo del mensaje.\n\n[[btn:Botón|Adónde lleva en realidad]]\n```\n\n> Mira este correo.\n> {1} Fíjate en el remitente.\n> {2} El asunto mete prisa.\n> {3} Y el botón lleva a una web falsa.\n",
      pregunta: "## Comprueba lo aprendido\ntipo: pregunta\npregunta: ¿Escribe aquí la pregunta?\n- [ ] Opción incorrecta.\n- [x] Opción correcta.\n- [ ] Otra opción incorrecta.\nexplicacion: Por qué la correcta es la correcta.\n\n> Vamos a comprobarlo.\n",
      cierre: "## Resumen\ntipo: cierre\n\n- Primera idea clave.\n- Segunda idea clave.\n- Tercera idea clave.\n\n> Recuerda las tres ideas clave.\n> Gracias por tu tiempo.\n",
      cabecera: "---\ntitulo: Título del curso\nsubtitulo: Formación interna\nempresa: Tu empresa\nidioma: es\ncolor: \"#0f5f73\"\nnota_aprobado: 50\n---\n\n"
    },
    en: {
      portada: "## Course title\ntipo: portada\n\n> Hi, and welcome. In the next few minutes you'll learn…\n",
      contenido: "## List title\ntipo: contenido\n\n- **Idea 1**: short explanation.\n- **Idea 2**: short explanation.\n- **Idea 3**: short explanation.\n\n> Introductory sentence.\n> {1} Explain idea 1.\n> {2} Explain idea 2.\n> {3} Explain idea 3.\n",
      cifra: "## Why it matters\ntipo: cifra\ncifra: 3 in 5\ntexto: employees received a suspicious email this year.\n\n> Three out of five employees received a suspicious email this year.\n",
      correo: "## An example\ntipo: correo\n\n```correo\nFrom: Sender <[[address@example.com|What looks odd]]>\nTo: you\nSubject: [[Email subject|Why it is suspicious]]\n\nHi,\n\nMessage body.\n\n[[btn:Button|Where it really leads]]\n```\n\n> Take a look at this email.\n> {1} Look at the sender.\n> {2} The subject rushes you.\n> {3} And the button leads to a fake site.\n",
      pregunta: "## Check what you've learned\ntipo: pregunta\npregunta: Write your question here?\n- [ ] Wrong option.\n- [x] Correct option.\n- [ ] Another wrong option.\nexplicacion: Why the correct answer is correct.\n\n> Let's check.\n",
      cierre: "## Summary\ntipo: cierre\n\n- First key idea.\n- Second key idea.\n- Third key idea.\n\n> Remember the three key ideas.\n> Thanks for your time.\n",
      cabecera: "---\ntitulo: Course title\nsubtitulo: Internal training\nempresa: Your company\nidioma: en\ncolor: \"#0f5f73\"\nnota_aprobado: 50\n---\n\n"
    }
  };
  function plantilla(k) { return PLANTILLAS_IDIOMA[idiomaUI][k]; }
  document.querySelector(".ed-barra").onclick = function (ev) {
    var b = ev.target.closest("[data-plantilla]");
    if (!b) return;
    var texto = editor.value, pos = editor.selectionStart;
    var sig = texto.slice(pos).search(/^## /m);   // se inserta al final de la escena actual
    var donde = sig < 0 ? texto.length : pos + sig;
    var bloque = (texto.slice(0, donde).endsWith("\n\n") ? "" : texto.slice(0, donde).endsWith("\n") ? "\n" : "\n\n") + plantilla(b.dataset.plantilla) + (sig < 0 ? "" : "\n");
    editor.setRangeText(bloque, donde, donde, "end");
    var inicioTitulo = donde + bloque.indexOf("## ") + 3;
    editor.focus();
    editor.setSelectionRange(inicioTitulo, editor.value.indexOf("\n", inicioTitulo));
    guardarBorrador();
    reconstruir(true);
  };

  // --------------------------------------------------------------- ejemplos y borrador
  var previo = null;
  function aviso(html) { $("aviso").innerHTML = html; $("aviso").hidden = !html; }
  $("sel-ejemplo").onchange = function () {
    var v = this.value;
    this.value = "";
    if (!v) return;
    previo = editor.value;
    var cargar = function (txt) {
      editor.value = txt;
      guardarBorrador();
      t = 0;
      reconstruir(false);
      aviso(esc(T("cargado")) + ' <button id="btn-recuperar">' + esc(T("recuperar")) + "</button>");
    };
    if (v === "nuevo") cargar(plantilla("cabecera") + plantilla("portada"));
    else fetch(v).then(function (r) { return r.text(); }).then(cargar).catch(function () { aviso(esc(T("noEjemplo"))); });
  };
  $("aviso").onclick = function (ev) {
    if (ev.target.id === "btn-recuperar" && previo !== null) {
      editor.value = previo; previo = null; guardarBorrador(); reconstruir(false); aviso("");
    }
  };

  // --------------------------------------------------------------- idioma
  document.querySelector(".ed-idioma").onclick = function (ev) {
    var b = ev.target.closest("[data-idioma]");
    if (!b || b.dataset.idioma === idiomaUI) return;
    idiomaUI = b.dataset.idioma;
    try { localStorage.setItem(CLAVE_IDIOMA, idiomaUI); } catch (e) {}
    aplicarIdioma();
    if (datos) reconstruir(false);
  };

  // --------------------------------------------------------------- ayuda y menú
  function alternar(boton, panel, abrir) {
    panel.hidden = !abrir;
    boton.setAttribute("aria-expanded", abrir);
  }
  $("btn-ayuda").onclick = function () { alternar(this, $("ayuda"), $("ayuda").hidden); };
  $("btn-cerrar-ayuda").onclick = function () { alternar($("btn-ayuda"), $("ayuda"), false); };
  $("btn-exportar").onclick = function (e) { e.stopPropagation(); alternar(this, $("menu-exportar"), $("menu-exportar").hidden); };
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".ed-menu")) alternar($("btn-exportar"), $("menu-exportar"), false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { alternar($("btn-exportar"), $("menu-exportar"), false); alternar($("btn-ayuda"), $("ayuda"), false); }
  });

  // --------------------------------------------------------------- exportaciones
  function nombreArchivo() {
    return (limpio(guion && guion.meta.titulo) || T("archivo")).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || T("archivo");
  }
  function descargar(contenido, nombre, tipo) {
    var url = URL.createObjectURL(contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo }));
    var a = document.createElement("a");
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function texto(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.text(); }); }

  $("menu-exportar").onclick = function (ev) {
    var b = ev.target.closest("[data-exp]");
    if (!b || !guion) return;
    alternar($("btn-exportar"), $("menu-exportar"), false);
    var tipo = b.dataset.exp, nombre = nombreArchivo();
    if (tipo === "guion") return descargar(editor.value, nombre + ".md", "text/markdown;charset=utf-8");
    if (tipo === "video") return exportarVideo(nombre).catch(errorExportar);
    if (tipo === "scorm") return exportarScorm(nombre).catch(errorExportar);
  };
  function errorExportar(e) { aviso(esc(T("noExport", { e: e.message || e }))); }

  function exportarVideo(nombre) {
    return Promise.all([texto("motor/video.css"), texto("motor/video.js")]).then(function (r) {
      var json = JSON.stringify(datos).replace(/</g, "\\u003c");
      var reproductor = REPRODUCTOR_VIDEO.toString().replace(/^function\s*\(\)\s*\{|\}$/g, "");
      var html = '<!doctype html>\n<html lang="' + datos.meta.idioma + '">\n<head>\n<meta charset="utf-8">\n' +
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' + (datos.meta.titulo || "Vídeo") + "</title>\n" +
        "<style>\n" + r[0] + "\n" + CSS_REPRODUCTOR + "\n</style>\n</head>\n<body>\n" +
        '<div class="rv-marco" id="marco"><div id="lienzo"></div><button class="rv-grande" id="grande" aria-label="Play">▶</button></div>\n' +
        '<div class="rv-ctrl"><button id="pp" aria-label="Play">▶</button><input type="range" id="barra" min="0" max="1000" value="0" aria-label="Position">' +
        '<span id="tiempo">0:00</span><button id="pc" aria-label="Full screen">⛶</button></div>\n' +
        "<script>window.DATOS = " + json + ";</script>\n<script>\n" + r[1] + "\n</script>\n<script>\n" + reproductor + "\n</script>\n</body>\n</html>\n";
      descargar(html, nombre + "-video.html", "text/html;charset=utf-8");
    });
  }

  var CSS_REPRODUCTOR = [
    "html,body{margin:0;height:100%;background:#0b1118;color:#fff;font-family:system-ui,-apple-system,'Segoe UI',sans-serif}",
    "body{display:flex;flex-direction:column;align-items:center;justify-content:center}",
    ".rv-marco{position:relative;width:min(100vw,calc((100vh - 64px)*16/9));aspect-ratio:16/9;overflow:hidden;background:#000;cursor:pointer}",
    "#lienzo{position:absolute;left:0;top:0;transform-origin:0 0}",
    ".rv-grande{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:110px;height:110px;border-radius:50%;border:0;background:rgba(15,95,115,.92);color:#fff;font-size:42px;cursor:pointer}",
    ".rv-ctrl{width:min(100vw,calc((100vh - 64px)*16/9));height:64px;display:flex;align-items:center;gap:14px;padding:0 16px;box-sizing:border-box}",
    ".rv-ctrl button{width:44px;height:44px;border-radius:50%;border:0;background:#1f2a36;color:#fff;font-size:18px;cursor:pointer}",
    ".rv-ctrl input{flex:1;accent-color:#e8590c}",
    ".rv-ctrl span{font-variant-numeric:tabular-nums;font-size:16px;min-width:96px;text-align:right}",
    ".rv-marco:fullscreen{width:100vw;height:100vh;aspect-ratio:auto}"
  ].join("\n");

  // se inserta como texto dentro del vídeo exportado
  var REPRODUCTOR_VIDEO = function () {
    var D = window.DATOS, lienzo = document.getElementById("lienzo"), marco = document.getElementById("marco");
    var v = null, t = 0, on = false, ult = null;
    function escala() {
      var w = marco.clientWidth, h = marco.clientHeight, k = Math.min(w / 1920, h / 1080);
      lienzo.style.transform = "translate(" + (w - 1920 * k) / 2 + "px," + (h - 1080 * k) / 2 + "px) scale(" + k + ")";
    }
    function mmss(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
    function ui() {
      document.getElementById("barra").value = Math.round(t / D.duracion * 1000);
      document.getElementById("tiempo").textContent = mmss(t) + " / " + mmss(D.duracion);
      document.getElementById("pp").textContent = on ? "❚❚" : "▶";
      document.getElementById("grande").style.display = on ? "none" : "block";
    }
    function alternar() { if (!on && t >= D.duracion - .05) t = 0; on = !on; ui(); }
    function bucle(ts) {
      if (on) { if (ult !== null) t += (ts - ult) / 1000; ult = ts; if (t >= D.duracion) { t = D.duracion; on = false; } v.dibujar(t); ui(); }
      else ult = null;
      requestAnimationFrame(bucle);
    }
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
      escala();
      v = window.crearVideo(lienzo, D);
      v.dibujar(0); ui();
      requestAnimationFrame(bucle);
    });
    window.addEventListener("resize", function () { escala(); });
    document.addEventListener("fullscreenchange", function () { setTimeout(function () { escala(); if (v) v.dibujar(t); }, 50); });
    marco.onclick = alternar;
    document.getElementById("pp").onclick = alternar;
    document.getElementById("barra").oninput = function () { t = this.value / 1000 * D.duracion; v.dibujar(t); ui(); };
    document.getElementById("pc").onclick = function () { if (document.fullscreenElement) document.exitFullscreen(); else marco.requestFullscreen(); };
    document.addEventListener("keydown", function (e) { if (e.key === " ") { e.preventDefault(); alternar(); } });
  };

  function exportarScorm(nombre) {
    if (!window.JSZip) return Promise.reject(new Error(T("noZip")));
    var archivos = ["index.html", "estilo.css", "reproductor.js", "scorm.js"];
    return Promise.all(archivos.map(function (f) { return texto("leccion/" + f); })).then(function (r) {
      var leccion = construirLeccion(guion.meta, guion.diapositivas, +$("ppm").value || 150);
      var zip = new JSZip();
      r[0] = r[0].replace("{{TITULO}}", esc(limpio(guion.meta.titulo) || "Curso")).replace("{{IDIOMA}}", esc(guion.meta.idioma || "es"));
      archivos.forEach(function (f, i) { zip.file(f, r[i]); });
      zip.file("curso.js", "window.CURSO = " + JSON.stringify(leccion, null, 1).replace(/</g, "\\u003c") + ";");
      zip.file("imsmanifest.xml", manifest(guion.meta, nombre, archivos.concat(["curso.js"])));
      return zip.generateAsync({ type: "blob" });
    }).then(function (blob) { descargar(blob, nombre + "-scorm.zip"); });
  }

  // --------------------------------------------------------------- arranque
  var guardado = null;
  try { guardado = localStorage.getItem(CLAVE_BORRADOR); } catch (e) {}
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
    if (guardado) { editor.value = guardado; reconstruir(false); }
    else texto("ejemplos/curso_en.md").then(function (txt) { editor.value = txt; reconstruir(false); })
      .catch(function () { $("estado").textContent = T("vacio"); });
  });
})();
