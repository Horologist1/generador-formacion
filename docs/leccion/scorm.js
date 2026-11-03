/* Conexión mínima con un LMS (SCORM 1.2). Si no hay LMS, guarda el progreso en el navegador. */
(function () {
  function buscarAPI(win) {
    for (var i = 0; win && i < 10; i++) {
      try { if (win.API) return win.API; } catch (e) { return null; }
      if (win.parent === win) break;
      win = win.parent;
    }
    return null;
  }
  var api = buscarAPI(window) || (window.opener ? buscarAPI(window.opener) : null);
  var clave = "leccion:" + ((window.CURSO && window.CURSO.meta.titulo) || location.pathname);
  var local = {};
  try { local = JSON.parse(localStorage.getItem(clave) || "{}"); } catch (e) {}
  var terminado = false;

  if (api) { try { api.LMSInitialize(""); } catch (e) { api = null; } }

  function get(k) {
    if (api) { try { return api.LMSGetValue(k) || ""; } catch (e) { return ""; } }
    return local[k] || "";
  }
  function set(k, v) {
    if (api) { try { api.LMSSetValue(k, String(v)); } catch (e) {} return; }
    local[k] = String(v);
    try { localStorage.setItem(clave, JSON.stringify(local)); } catch (e) {}
  }
  function guardar() { if (api) { try { api.LMSCommit(""); } catch (e) {} } }
  function cerrar() {
    if (terminado) return;
    terminado = true;
    if (api) { try { set("cmi.core.exit", "suspend"); api.LMSCommit(""); api.LMSFinish(""); } catch (e) {} }
  }
  window.addEventListener("pagehide", cerrar);
  window.addEventListener("beforeunload", cerrar);

  if (get("cmi.core.lesson_status") === "not attempted" || !get("cmi.core.lesson_status")) {
    set("cmi.core.lesson_status", "incomplete");
  }

  window.LMS = {
    conectado: !!api,
    marcador: function () { return parseInt(get("cmi.core.lesson_location"), 10) || 0; },
    datos: function () { try { return JSON.parse(get("cmi.suspend_data") || "{}"); } catch (e) { return {}; } },
    guardarPosicion: function (n, datos) {
      set("cmi.core.lesson_location", n);
      set("cmi.suspend_data", JSON.stringify(datos));
      guardar();
    },
    finalizar: function (nota, aprobado) {
      if (nota !== null) {
        set("cmi.core.score.raw", nota); set("cmi.core.score.min", 0); set("cmi.core.score.max", 100);
        set("cmi.core.lesson_status", aprobado ? "passed" : "failed");
      } else {
        set("cmi.core.lesson_status", "completed");
      }
      guardar();
    },
    reiniciar: function () {
      set("cmi.core.lesson_location", 0); set("cmi.suspend_data", "{}");
      set("cmi.core.lesson_status", "incomplete"); guardar();
    }
  };
})();
