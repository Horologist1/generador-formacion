/* Motor de vídeo.
   crearVideo(stage, datos) monta las escenas dentro de `stage` (lienzo de 1920×1080) y devuelve
   { dibujar(t) }, que deja el lienzo exactamente como debe verse en el segundo t.
   Lo usan el editor web (vista previa) y generador/video.py (captura fotograma a fotograma). */
window.crearVideo = function (stage, V) {
  var M = V.meta, W = 1920, H = 1080, TR = 0.8;
  stage.innerHTML = "";
  stage.classList.add("vstage");
  // escala real del lienzo en pantalla (en la web se muestra reducido): las medidas se pasan a px del lienzo
  function escala() { return stage.getBoundingClientRect().width / W || 1; }
  var L = {
    en: { comprueba: "Quick check", pregunta: "Question {n} of {t}", piensa: "Pause and think" },
    es: { comprueba: "Comprueba", pregunta: "Pregunta {n} de {t}", piensa: "Piensa un momento" }
  }[(M.idioma || "es").slice(0, 2)] || null;
  L = L || { comprueba: "Quick check", pregunta: "Question {n} of {t}", piensa: "Pause and think" };
  stage.style.setProperty("--marca", M.color || "#0f5f73");

  // ------------------------------------------------------------ utilidades de animación
  var clamp = function (x, a, b) { return Math.max(a === undefined ? 0 : a, Math.min(b === undefined ? 1 : b, x)); };
  var prog = function (t, t0, d) { return clamp((t - t0) / d); };
  var lerp = function (a, b, p) { return a + (b - a) * p; };
  var E = {
    out: function (p) { return 1 - Math.pow(1 - p, 3); },
    inOut: function (p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; },
    back: function (p) { var c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); }
  };
  function el(tag, cls, html, padre) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined && html !== null) e.innerHTML = html;
    if (padre) padre.appendChild(e);
    return e;
  }
  // aparece: opacidad + desplazamiento vertical con rebote opcional
  function entra(e, t, t0, d, dy, curva) {
    var p = prog(t, t0, d || .6), k = (curva || E.out)(p);
    e.style.opacity = clamp(p * 1.6);
    e.style.transform = "translateY(" + ((1 - k) * (dy === undefined ? 40 : dy)) + "px)";
  }
  function palabras(texto) {
    return texto.split(/(\s+)/).filter(function (w) { return w.trim(); })
      .map(function (w) { return '<span class="w">' + w + "</span>"; }).join("");
  }
  var CHECK = '<svg viewBox="0 0 50 50"><path d="M11 26 L21 36 L40 15"/></svg>';
  function trazo(path, p) {  // dibuja un trazo SVG progresivamente
    var len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len * (1 - p);
  }

  // ------------------------------------------------------------ lienzo
  var blobs = [["#cfe6ec", 900, -200, -250], ["#fde3d3", 700, 1350, 600], ["#dbe9f6", 600, 1200, -200]].map(function (b) {
    var e = el("div", "blob", null, stage);
    e.style.background = b[0]; e.style.width = e.style.height = b[1] + "px";
    e.dataset.x = b[2]; e.dataset.y = b[3];
    return e;
  });
  var marca = el("div", "marca-video", "<i></i>" + (M.empresa || "") + " <span>· " + (M.titulo || "") + "</span>", stage);
  var barra = el("div", "barra-progreso", null, stage);
  var subs = el("div", "subs", "<span></span>", stage).firstChild;
  var banda = el("div", "banda", null, stage), banda2 = el("div", "banda b2", null, stage);

  // ------------------------------------------------------------ escenas
  var constructores = {

    portada: function (d, raiz) {
      var circs = [[1250, -180, 820, false], [1500, 520, 520, true], [-260, 700, 600, true], [1100, 640, 220, false]].map(function (c) {
        var e = el("div", "circ" + (c[3] ? " lleno" : ""), null, raiz);
        e.style.left = c[0] + "px"; e.style.top = c[1] + "px"; e.style.width = e.style.height = c[2] + "px";
        return e;
      });
      var cont = el("div", "p-cont", null, raiz);
      var eb = el("div", "p-eyebrow", (M.empresa || "") , cont);
      var br = el("div", "p-barra", null, cont);
      var ti = el("div", "p-titulo", palabras(d.titulo), cont);
      var su = el("div", "p-sub", M.subtitulo || "", cont);
      var ws = ti.querySelectorAll(".w");
      return function (t) {
        circs.forEach(function (c, i) {
          var s = 1 + .04 * Math.sin(t * .5 + i), r = t * (i % 2 ? -4 : 3);
          c.style.transform = "translate(" + Math.sin(t * .3 + i) * 30 + "px," + Math.cos(t * .25 + i) * 24 + "px) scale(" + s + ") rotate(" + r + "deg)";
        });
        entra(eb, t, .3, .6, 20);
        var pb = E.out(prog(t, .7, .7));
        br.style.transform = "scaleX(" + pb + ")";
        ws.forEach(function (w, i) {
          var p = prog(t, .8 + i * .09, .7), k = E.back(p);
          w.style.opacity = clamp(p * 2); w.style.transform = "translateY(" + (1 - k) * 90 + "px)";
        });
        entra(su, t, 1.4 + ws.length * .09, .8, 24);
        cont.style.transform = "scale(" + (1 + t * .0025) + ")";
      };
    },

    cifra: function (d, raiz) {
      el("div", "e-titulo", d.titulo, raiz);
      var m = /(\d+)(.*?)(\d+)/.exec(d.cifra || ""), a = m ? +m[1] : 0, b = m ? +m[3] : 0;
      var num = el("div", "c-num", null, raiz);
      var tx = el("div", "c-texto", palabras(d.texto || ""), raiz);
      var ws = tx.querySelectorAll(".w");
      var picto = null, personas = [];
      if (m && b > 0 && b <= 20) {
        picto = el("div", "c-picto", null, raiz);
        for (var i = 0; i < b; i++) {
          personas.push(el("div", null, '<svg viewBox="0 0 60 90"><circle class="p" cx="30" cy="18" r="15"/><path class="p" d="M6 88 C6 52 14 40 30 40 C46 40 54 52 54 88 Z"/></svg>', picto));
        }
      }
      var t0 = (d.frases[0] || { ini: .5 }).ini;
      return function (t) {
        var pc = E.inOut(prog(t, t0, 2.2)), n = Math.round(a * pc);
        num.innerHTML = m ? n + "<small>" + m[2] + m[3] + "</small>" : (d.cifra || "");
        entra(num, t, t0 - .3, .6, 50, E.back);
        personas.forEach(function (p, i) {
          var pi = prog(t, .2 + i * .07, .5), k = E.back(pi);
          p.style.opacity = clamp(pi * 2); p.style.transform = "scale(" + (.4 + .6 * k) + ")";
          p.querySelectorAll(".p").forEach(function (s) { s.classList.toggle("on", i < n); });
        });
        var habla = d.frases[0] ? d.frases[0].fin - d.frases[0].ini : 3;
        ws.forEach(function (w, i) { entra(w, t, t0 + 1.2 + i * Math.min(.18, habla * .6 / ws.length), .5, 24); });
      };
    },

    contenido: function (d, raiz) {
      var ti = el("div", "e-titulo", d.titulo, raiz);
      var lista = el("div", "l-lista", null, raiz);
      var items = (d.vinetas || []).map(function (v, i) {
        var it = el("div", "l-item", null, lista);
        el("div", "l-num", String(i + 1), it);
        el("div", "l-txt", v, it);
        return it;
      });
      var tiempos = items.map(function (_, i) { return d.pasos[i + 1]; });
      return function (t) {
        entra(ti, t, .2, .6, 30);
        var activo = -1;
        tiempos.forEach(function (tp, i) { if (t >= tp) activo = i; });
        items.forEach(function (it, i) {
          var p = prog(t, tiempos[i], .7), k = E.back(p);
          it.style.opacity = clamp(p * 2);
          var real = i === activo && t < d.fin_local - .5;
          it.classList.toggle("activo", real);
          it.style.transform = "translateX(" + (1 - k) * -120 + "px) scale(" + (real ? 1.02 : 1) + ")";
        });
      };
    },

    correo: function (d, raiz) {
      var cam = el("div", "cam", null, raiz);
      var ti = el("div", "e-titulo", d.titulo, raiz);
      var ven = el("div", "ventana", null, cam);
      el("div", "v-barra", "<i></i><i></i><i></i><span>Inbox</span>", ven);
      var cuerpo = el("div", null, d.correo_html, ven);
      var marcas = Array.prototype.slice.call(cuerpo.querySelectorAll("mark.paso"));
      // medidas en coordenadas de la cámara (sin transformar)
      raiz.style.visibility = "visible";
      var k = escala(), rc = cam.getBoundingClientRect();
      var cajas = marcas.map(function (mk) {
        var r = mk.getBoundingClientRect();
        return { x: (r.left - rc.left) / k, y: (r.top - rc.top) / k, w: r.width / k, h: r.height / k };
      });
      var rv = ven.getBoundingClientRect();
      var vista = { x: (rv.left - rc.left + rv.width / 2) / k, y: (rv.top - rc.top + rv.height / 2) / k, s: 1 };
      raiz.style.visibility = "";
      var extras = cajas.map(function (c, i) {
        var pad = 12, svgW = c.w + pad * 2, svgH = c.h + pad * 2;
        var sv = el("div", "marco", '<svg width="' + svgW + '" height="' + svgH + '"><rect x="4" y="4" rx="12" width="' + (svgW - 8) + '" height="' + (svgH - 8) + '"/></svg>', cam);
        sv.style.left = (c.x - pad) + "px"; sv.style.top = (c.y - pad) + "px";
        var ins = el("div", "insignia", String(i + 1), cam);
        ins.style.left = (c.x + c.w + 14) + "px"; ins.style.top = (c.y + c.h / 2 - 29) + "px";
        var gl = el("div", "globo", d.notas[i] || "", cam);
        var gx = c.x + c.w + 90, gy = c.y - 10, derecha = true;
        if (gx + 520 > 1880) { gx = Math.max(60, c.x + c.w - 520); gy = c.y + c.h + 30; derecha = false; }
        gl.style.left = gx + "px"; gl.style.top = gy + "px";
        var esBoton = !!marcas[i].querySelector(".correo-btn");
        var cur = null, onda = null;
        if (esBoton) {
          onda = el("div", "onda", null, cam);
          cur = el("div", "cursor", '<svg viewBox="0 0 24 24"><path d="M4 2 L4 20 L9 15 L12.5 22 L15.5 20.5 L12 13.5 L19 13.5 Z" fill="#16202b" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>', cam);
        }
        // encuadre de cámara: centra la marca y el globo
        var cx = derecha ? (c.x + gx + 520) / 2 : c.x + c.w / 2;
        var cy = c.y + c.h / 2 + (derecha ? 40 : 90);
        return { sv: sv, rect: sv.querySelector("rect"), ins: ins, gl: gl, cur: cur, onda: onda, c: c,
                 foco: { x: cx, y: cy, s: 1.55 } };
      });
      function encuadre(i) { return i > 0 ? extras[i - 1].foco : vista; }
      return function (t) {
        // ventana y título
        var pv = prog(t, .2, .9), kv = E.out(pv);
        ven.style.opacity = clamp(pv * 2);
        ven.style.transform = "translateY(" + (1 - kv) * 120 + "px) scale(" + (.94 + .06 * kv) + ")";
        // cámara: busca el foco vigente y el anterior
        var actual = 0, previo = 0, tCambio = -99;
        d.foco.forEach(function (f) { if (t >= f.t) { previo = actual; actual = f.paso; tCambio = f.t; } });
        var pf = E.inOut(prog(t, tCambio, 1.0)), a = encuadre(previo), b = encuadre(actual);
        var s = lerp(a.s, b.s, pf), x = lerp(a.x, b.x, pf), y = lerp(a.y, b.y, pf);
        cam.style.transform = "translate(" + (W / 2 - x * s) + "px," + (H / 2 + 40 - y * s) + "px) scale(" + s + ")";
        ti.style.opacity = (1 - clamp((s - 1) * 4)) * clamp(t * 3);
        raiz.dataset.zoom = s > 1.05 ? "1" : "";
        // marcas
        extras.forEach(function (x, i) {
          var tp = d.pasos[i + 1];
          if (tp === undefined) { x.sv.style.opacity = x.ins.style.opacity = x.gl.style.opacity = 0; return; }
          var pm = prog(t, tp + .5, .7);
          x.sv.style.opacity = pm > 0 ? 1 : 0;
          trazo(x.rect, E.inOut(pm));
          var pi = prog(t, tp + .9, .45);
          x.ins.style.opacity = clamp(pi * 2); x.ins.style.transform = "scale(" + E.back(pi) + ")";
          var enFoco = actual === i + 1;
          var pg = enFoco ? prog(t, tp + 1.0, .5) : 1 - prog(t, tCambio, .35);
          if (!enFoco && actual !== 0 && t < tp) pg = 0;
          if (!enFoco && actual === 0) pg = 1 - prog(t, tCambio, .35);
          x.gl.style.opacity = clamp(pg);
          x.gl.style.transform = "translateY(" + (1 - E.out(clamp(pg))) * 20 + "px)";
          if (x.cur) {  // el cursor va hacia el botón y "hace clic"
            var c = x.c, pc = E.inOut(prog(t, tp + .3, 1.2));
            var cx0 = c.x + c.w + 300, cy0 = c.y + 260, cx1 = c.x + c.w * .55, cy1 = c.y + c.h * .55;
            x.cur.style.opacity = t >= tp ? clamp(1 - prog(t, tp + 4.5, .5)) : 0;
            x.cur.style.left = lerp(cx0, cx1, pc) + "px"; x.cur.style.top = lerp(cy0, cy1, pc) + "px";
            var po = prog(t, tp + 1.55, .6);
            x.onda.style.opacity = po > 0 && po < 1 ? 1 - po : 0;
            x.onda.style.left = (cx1 - 45) + "px"; x.onda.style.top = (cy1 - 45) + "px";
            x.onda.style.transform = "scale(" + (.3 + po) + ")";
          }
        });
      };
    },

    pregunta: function (d, raiz) {
      var eb = el("div", "q-eyebrow", L.comprueba + " · " + L.pregunta.replace("{n}", d.n).replace("{t}", d.total), raiz);
      var qt = el("div", "q-texto", d.pregunta, raiz);
      var ops = el("div", "q-ops", null, raiz);
      var items = d.opciones.map(function (o, i) {
        var it = el("div", "q-op", null, ops);
        el("div", "q-letra", "ABCDEF"[i], it);
        el("div", null, o.texto, it);
        el("div", null, o.correcta ? CHECK : "", it);
        return it;
      });
      var reloj = el("div", "q-reloj", '<svg viewBox="0 0 300 300"><circle class="pista" cx="150" cy="150" r="130"/><circle class="arco" cx="150" cy="150" r="130"/></svg><div class="num"></div><div class="lbl">' + L.piensa + "</div>", raiz);
      var arco = reloj.querySelector(".arco"), numR = reloj.querySelector(".num"), circ = 2 * Math.PI * 130;
      var ex = el("div", "q-expl", d.explicacion, raiz);
      // posiciones dependientes del alto de la pregunta
      raiz.style.visibility = "visible";
      var altoQ = qt.getBoundingClientRect().height / escala();
      raiz.style.visibility = "";
      ops.style.top = (200 + altoQ + 46) + "px";
      return function (t) {
        entra(eb, t, .1, .5, 20);
        entra(qt, t, .3, .7, 30);
        var habla = Math.max(1.5, d.cuenta[0] - d.tPregunta);
        items.forEach(function (it, i) {
          var p = prog(t, d.tPregunta + .4 + i * Math.min(.9, habla / (items.length + 1)), .55), k = E.back(p);
          it.style.opacity = clamp(p * 2);
          it.style.transform = "translateX(" + (1 - k) * 80 + "px)";
          var rev = prog(t, d.tRevelar, .5);
          var esC = d.opciones[i].correcta;
          it.classList.toggle("correcta", esC && rev > 0);
          if (!esC && rev > 0) { it.style.opacity = 1 - .62 * rev; it.style.transform += " scale(" + (1 - .03 * rev) + ")"; }
          if (esC) { var pa = it.querySelector("path"); if (pa) trazo(pa, E.out(prog(t, d.tRevelar + .2, .5))); }
          if (esC && rev > 0) it.style.transform += " scale(" + (1 + .025 * Math.sin(Math.PI * rev)) + ")";
        });
        // cuenta atrás
        var c0 = d.cuenta[0], c1 = d.cuenta[1], pr = prog(t, c0 - .4, .5);
        var dentro = t < c1 + .3;
        reloj.style.opacity = dentro ? clamp(pr * 2) : 1 - prog(t, c1 + .3, .4);
        reloj.style.transform = "scale(" + (.6 + .4 * E.back(pr)) + ")";
        var resto = clamp((c1 - t) / (c1 - c0));
        arco.style.strokeDasharray = circ;
        arco.style.strokeDashoffset = circ * (1 - resto);
        numR.textContent = Math.max(0, Math.ceil(c1 - Math.max(t, c0)));
        // explicación (ocupa la columna derecha, donde estaba la cuenta atrás)
        entra(ex, t, d.tExpl - .2, .7, 50);
      };
    },

    cierre: function (d, raiz) {
      var ti = el("div", "e-titulo", d.titulo, raiz);
      var lista = el("div", "k-lista", null, raiz);
      var items = (d.vinetas || []).map(function (v) {
        var it = el("div", "k-item", null, lista);
        var ck = el("div", "k-check", CHECK, it);
        el("div", null, v, it);
        return it;
      });
      var fin = el("div", "k-fin", "<div><h2>" + (M.empresa || "") + "</h2><p>" + (M.titulo || "") + "</p></div>", raiz);
      return function (t) {
        entra(ti, t, .2, .6, 30);
        items.forEach(function (it, i) {
          var tp = d.pasos[i + 1], p = prog(t, tp, .6);
          it.style.opacity = clamp(p * 2);
          it.style.transform = "translateX(" + (1 - E.out(p)) * -60 + "px)";
          var ck = it.querySelector(".k-check");
          ck.style.transform = "scale(" + E.back(prog(t, tp + .1, .5)) + ")";
          trazo(ck.querySelector("path"), E.out(prog(t, tp + .35, .45)));
        });
        var pf = prog(t, d.tFin, .9);
        fin.style.clipPath = "circle(" + (E.inOut(pf) * 120) + "% at 50% 50%)";
        fin.style.opacity = pf > 0 ? 1 : 0;
        var h = fin.querySelector("h2");
        h.style.transform = "translateY(" + (1 - E.out(prog(t, d.tFin + .4, .8))) * 40 + "px)";
        h.style.opacity = prog(t, d.tFin + .4, .6);
      };
    }
  };

  var escenas = V.escenas.map(function (d) {
    var raiz = el("div", "escena e-" + d.tipo, null, stage);
    d.fin_local = d.fin - d.ini;
    var actualizar = (constructores[d.tipo] || constructores.contenido)(d, raiz);
    return { d: d, raiz: raiz, actualizar: actualizar };
  });

  // ------------------------------------------------------------ fotograma
  function dibujar(t) {
    // fondo vivo
    blobs.forEach(function (b, i) {
      b.style.transform = "translate(" + (+b.dataset.x + Math.sin(t * .17 + i * 2) * 80) + "px," + (+b.dataset.y + Math.cos(t * .13 + i) * 60) + "px)";
    });
    // escena actual (+ la anterior durante la transición)
    // la escena cambia justo en el corte, cuando la banda cubre toda la pantalla
    var k = 0;
    escenas.forEach(function (e, i) { if (t >= e.d.ini) k = i; });
    escenas.forEach(function (e, i) {
      e.raiz.style.visibility = i === k ? "visible" : "hidden";
      if (i === k) {
        e.actualizar(t - e.d.ini);
        var off = k > 0 ? (1 - E.out(prog(t, e.d.ini, .7))) * 140 : 0;
        e.raiz.style.transform = "translateX(" + off + "px)";
      }
    });
    // banda de transición (más ancha que la pantalla) + filo de color de acento
    var tc = null;
    escenas.slice(1).forEach(function (e) { if (Math.abs(t - e.d.ini) < TR / 2) tc = e.d.ini; });
    if (tc !== null) {
      var p = E.inOut(prog(t, tc - TR / 2, TR));
      banda.style.transform = "translateX(" + lerp(W + 200, -2900, p) + "px) skewX(-12deg)";
      banda2.style.transform = "translateX(" + lerp(W + 40, -2900 - 260, p) + "px) skewX(-12deg)";
    } else {
      banda.style.transform = banda2.style.transform = "translateX(-4000px)";
    }
    // cromo: marca (oculta en portada y en la tarjeta final), progreso, subtítulos
    var dk = escenas[k].d, tl = t - dk.ini;
    var sinMarca = (dk.tipo === "portada" && t < dk.fin) || (dk.tipo === "cierre" && tl >= dk.tFin) ||
                   escenas[k].raiz.dataset.zoom === "1";
    marca.style.opacity = sinMarca ? 0 : 1;
    barra.style.width = (t / V.duracion * W) + "px";
    var s = "";
    if (V.subtitulos) V.subs.forEach(function (c) { if (t >= c.ini && t <= c.fin) s = c.texto; });
    subs.textContent = s;
    subs.style.display = s ? "inline-block" : "none";
  }

  return { dibujar: dibujar, duracion: V.duracion, escenas: V.escenas };
};

// Modo captura (generador/video.py): si la página trae los datos, se monta sola.
if (window.VIDEO && document.getElementById("stage")) {
  window.dibujar = window.crearVideo(document.getElementById("stage"), window.VIDEO).dibujar;
  window.LISTO = true;
}
