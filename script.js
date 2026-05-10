/* script.js */

/* ── NAVEGACIÓN ── */
function openTab(tabId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('visible'));
  document.getElementById(tabId).classList.add('visible');
}

/* ── URLS ── */
const URL_PELIS  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfZKKu9u0USHXUnyUHQXSxf4uRXK--I5t_5JEE4pjUhe23SWVEZfg1u1R33zazOyh2GIDb9koa8hga/pub?gid=0&single=true&output=csv";
const URL_SERIES = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfZKKu9u0USHXUnyUHQXSxf4uRXK--I5t_5JEE4pjUhe23SWVEZfg1u1R33zazOyh2GIDb9koa8hga/pub?gid=2141924116&single=true&output=csv";

/* ── DATOS EN MEMORIA ── */
let dataPeliculas = [];
let dataSeries    = [];

/* ══════════════════════════════════════
   CARGA DE DATOS
   ══════════════════════════════════════ */
fetch(URL_PELIS)
  .then(r => { if (!r.ok) throw new Error("Error cargando peliculas"); return r.text(); })
  .then(txt => {
    const res = Papa.parse(txt, { header: true, skipEmptyLines: true });
    dataPeliculas = res.data
      .filter(item => Object.values(item).join("").trim() !== "")
      .sort((a, b) => Number(b["No."] || b["No"]) - Number(a["No."] || a["No"]));

    llenarTabla(dataPeliculas, "tablaPeliculas", "Pelicula");
    hacerTablaOrdenable("tablaPeliculas");
    llenarCards(dataPeliculas, "cardsPeliculas", "Pelicula");
    iniciarToggle("togglePeliculas", "cardsPeliculas", "tablawrapperPeliculas");
    activarBusqueda(dataPeliculas, "tablaPeliculas", "busquedaPeliculas", "cardsPeliculas", "Pelicula");
  });

fetch(URL_SERIES)
  .then(r => r.text())
  .then(txt => {
    const res = Papa.parse(txt, { header: true, skipEmptyLines: true });
    dataSeries = res.data
      .filter(item => Object.values(item).join("").trim() !== "")
      .sort((a, b) => Number(b["No."] || b["No"]) - Number(a["No."] || a["No"]));

    llenarTabla(dataSeries, "tablaSeries", "Serie");
    hacerTablaOrdenable("tablaSeries");
    llenarCards(dataSeries, "cardsSeries", "Serie");
    iniciarToggle("toggleSeries", "cardsSeries", "tablawrapperSeries");
    activarBusqueda(dataSeries, "tablaSeries", "busquedaSeries", "cardsSeries", "Serie");
  });

/* ══════════════════════════════════════
   LLENAR TABLA
   ══════════════════════════════════════ */
function llenarTabla(data, tablaId, tipo) {
  const tbody = document.querySelector("#" + tablaId + " tbody");
  tbody.innerHTML = "";

  data.forEach(item => {
    const valores = Object.values(item).join("").trim();
    if (valores === "") return;

    const row = document.createElement("tr");
    row.innerHTML =
      "<td>" + (item["No."] || item["No"] || "") + "</td>" +
      "<td>" + (item["Titulo"] || item["\u00CDtulo"] || item["T\u00EDtulo"] || "") + "</td>" +
      "<td>" + (item["Año"] || item["A\u00F1o"] || "") + "</td>" +
      "<td>" + (item["Calificacion"] || item["Calificaci\u00F3n"] || "") + "</td>" +
      "<td>" + (item["Genero"] || item["G\u00E9nero"] || "") + "</td>";
    row.addEventListener("click", () => mostrarModal(Object.assign({}, item, { Tipo: tipo })));
    tbody.appendChild(row);
  });
}

/* ══════════════════════════════════════
   MODAL
   ══════════════════════════════════════ */
var _tituloActual = "";

function mostrarModal(d) {
  var titulo     = d["Título"] || d["Titulo"] || "";
  var calif      = d["Calificación"] || d["Calificacion"] || "";
  var origen     = d["Origen"] || "";
  var anio       = d["Año"] || d["Anio"] || "";
  var genero     = d["Género"] || d["Genero"] || "";
  var tono       = d["Tono"] || "";
  var ritmo      = d["Ritmo"] || "";
  var publico    = d["Público"] || d["Publico"] || "";
  var etiquetas  = d["Etiquetas"] || "";
  var flags      = d["Flags"] || "";
  var resena     = d["Reseña"] || d["Resena"] || "";

  _tituloActual = titulo;
  document.getElementById("modal-titulo").textContent       = titulo;
  document.getElementById("modal-calificacion").textContent = calif;
  document.getElementById("modal-origen").textContent       = origen;
  document.getElementById("modal-anio").textContent         = anio;

  document.getElementById("modal-label-minutos-o-caps").textContent =
    d["Tipo"] === "Pelicula" ? "Minutos: " : "Capítulos: ";
  document.getElementById("modal-minutos-o-caps").textContent =
    d["Tipo"] === "Pelicula"
      ? (d["Minutos"] || "")
      : (d["Capítulos"] || d["Capitulos"] || "");

  document.getElementById("modal-genero").textContent    = genero;
  document.getElementById("modal-tono").textContent      = tono;
  document.getElementById("modal-ritmo").textContent     = ritmo;
  document.getElementById("modal-publico").textContent   = publico;
  document.getElementById("modal-etiquetas").textContent = etiquetas;
  document.getElementById("modal-flags").textContent     = flags;
  document.getElementById("modal-resena").textContent    = resena;

  var imdb = document.getElementById("modal-imdb");
  if (d["IMDB"]) {
    imdb.href = d["IMDB"];
    imdb.style.display = "inline";
  } else {
    imdb.href = "#";
    imdb.style.display = "none";
  }

  document.getElementById("modal").style.display = "flex";
}

function cerrarModal() {
  document.getElementById("modal").style.display = "none";
}

/* ══════════════════════════════════════
   ORDENAR TABLAS
   ══════════════════════════════════════ */
function extraerAnio(valor) {
  if (!valor) return null;
  var match = valor.toString().match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

function hacerTablaOrdenable(tablaId) {
  var tabla   = document.getElementById(tablaId);
  var headers = tabla.querySelectorAll("th");
  var tbody   = tabla.querySelector("tbody");

  headers.forEach(function(th, colIndex) {
    th.style.cursor = "pointer";
    var asc = true;

    th.addEventListener("click", function() {
      var rows = Array.from(tbody.querySelectorAll("tr"));

      rows.sort(function(a, b) {
        var A = a.children[colIndex].innerText.trim();
        var B = b.children[colIndex].innerText.trim();

        if (headers[colIndex].innerText.includes("Año")) {
          A = extraerAnio(A);
          B = extraerAnio(B);
        } else {
          if (!isNaN(A) && A !== "") A = Number(A);
          if (!isNaN(B) && B !== "") B = Number(B);
        }

        if (A === null) return 1;
        if (B === null) return -1;
        if (A < B) return asc ? -1 : 1;
        if (A > B) return asc ? 1 : -1;
        return 0;
      });

      asc = !asc;
      rows.forEach(function(r) { tbody.appendChild(r); });
    });
  });
}

/* ══════════════════════════════════════
   BUSQUEDA (tabla + cards)
   ══════════════════════════════════════ */
function activarBusqueda(data, tablaId, inputId, gridId, tipo) {
  var input = document.getElementById(inputId);
  input.addEventListener("input", function() {
    var texto = input.value.toLowerCase();

    var filtrados = data.filter(function(item) {
      var campos = [
        item["Título"] || item["Titulo"],
        item["Género"] || item["Genero"],
        item["Tono"],
        item["Ritmo"],
        item["Etiquetas"],
        item["Reseña"] || item["Resena"]
      ];
      return campos.some(function(c) {
        return (c || "").toString().toLowerCase().includes(texto);
      });
    });

    llenarTabla(filtrados, tablaId, tipo);
    hacerTablaOrdenable(tablaId);
    llenarCards(filtrados, gridId, tipo);
  });
}

document.querySelectorAll(".clear-btn").forEach(function(btn) {
  btn.addEventListener("click", function() {
    var wrapper = btn.closest(".buscador-wrapper");
    var input   = wrapper.querySelector(".buscador");
    input.value = "";
    input.dispatchEvent(new Event("input"));
    input.focus();
  });
});

document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") {
    document.querySelectorAll(".buscador").forEach(function(input) {
      if (input.value !== "") {
        input.value = "";
        input.dispatchEvent(new Event("input"));
        input.blur();
      }
    });
  }
});

/* ══════════════════════════════════════
   CARDS
   ══════════════════════════════════════ */
/* Devuelve clase CSS de color según el primer género */
function claseBanda(genero) {
  if (!genero) return "banda-otros";
  var g = genero.toLowerCase();
  if (g.includes("drama"))                          return "banda-drama";
  if (g.includes("comedia") || g.includes("comedy"))return "banda-comedia";
  if (g.includes("thriller") || g.includes("suspen"))return "banda-thriller";
  if (g.includes("terror") || g.includes("horror")) return "banda-terror";
  if (g.includes("accion") || g.includes("acción") || g.includes("aventura")) return "banda-accion";
  if (g.includes("romance") || g.includes("romántic"))return "banda-romance";
  if (g.includes("ciencia") || g.includes("sci-fi") || g.includes("ficcion"))return "banda-ciencia";
  if (g.includes("animacion") || g.includes("animación") || g.includes("anime"))return "banda-animacion";
  if (g.includes("documental") || g.includes("document"))return "banda-doc";
  if (g.includes("crimen") || g.includes("crime") || g.includes("policial"))return "banda-crimen";
  if (g.includes("historia") || g.includes("period") || g.includes("biogr"))return "banda-historia";
  return "banda-otros";
}

/* Convierte calificación numérica a estrellitas */
function estrellas(calif) {
  var n = parseFloat(calif);
  if (isNaN(n)) return "";
  var llenas  = Math.floor(n / 2);
  var media   = (n % 2) >= 1 ? 1 : 0;
  var vacias  = 5 - llenas - media;
  return "★".repeat(llenas) + (media ? "½" : "") + "☆".repeat(vacias);
}

function crearCard(item, tipo) {
  var card = document.createElement("div");
  card.className = "pelicard";

  var titulo  = item["Título"]        || item["Titulo"]        || "";
  var anio    = item["Año"]           || item["Anio"]          || "";
  var genero  = item["Género"]        || item["Genero"]        || "";
  var calif   = item["Calificación"]  || item["Calificacion"]  || "";
  var tipoLabel = tipo === "Serie" ? "Serie" : "Película";
  var anioCorto = String(anio).match(/\d{4}/);
  anioCorto = anioCorto ? anioCorto[0] : anio;

  card.innerHTML =
    '<div class="pelicard-banda ' + claseBanda(genero) + '"></div>' +
    '<div class="pelicard-body">' +
      '<div class="pelicard-header">' +
        '<span class="pelicard-tipo">' + tipoLabel + '</span>' +
        '<span class="pelicard-anio">' + anioCorto + '</span>' +
      '</div>' +
      '<div class="pelicard-titulo">' + titulo + '</div>' +
      '<div class="pelicard-genero">' + genero + '</div>' +
      '<div class="pelicard-footer">' +
        '<span class="pelicard-estrellas">' + estrellas(calif) + '</span>' +
        '<span class="pelicard-nota">' + calif + '</span>' +
      '</div>' +
    '</div>';

  card.addEventListener("click", function() {
    mostrarModal(Object.assign({}, item, { Tipo: tipo }));
  });

  return card;
}

function llenarCards(data, gridId, tipo) {
  var grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = "";
  data.forEach(function(item) {
    if (Object.values(item).join("").trim() === "") return;
    grid.appendChild(crearCard(item, tipo));
  });
}

/* ══════════════════════════════════════
   TOGGLE VISTA
   ══════════════════════════════════════ */
function iniciarToggle(toggleId, gridId, tablaWrapperId) {
  var toggle = document.getElementById(toggleId);
  if (!toggle) return;

  toggle.querySelectorAll(".vista-btn").forEach(function(btn) {
    btn.addEventListener("click", function() {
      toggle.querySelectorAll(".vista-btn").forEach(function(b) {
        b.classList.remove("activo");
      });
      btn.classList.add("activo");

      var grid         = document.getElementById(gridId);
      var tablaWrapper = document.getElementById(tablaWrapperId);

      if (btn.dataset.vista === "cards") {
        grid.style.display         = "grid";
        tablaWrapper.style.display = "none";
      } else {
        grid.style.display         = "none";
        tablaWrapper.style.display = "block";
      }
    });
  });
}


/* ══════════════════════════════════════
   COMPARTIR
   ══════════════════════════════════════ */
function compartirTitulo() {
  var texto = "Te recomiendo ver: " + _tituloActual + " — Videoteca Fátima https://fatimallovet.github.io/videotecafatima/";

  if (navigator.share) {
    navigator.share({ text: texto }).catch(function() {});
  } else {
    navigator.clipboard.writeText(texto).then(function() {
      mostrarToast("¡Enlace copiado al portapapeles!");
    }).catch(function() {
      mostrarToast("No se pudo copiar 😕");
    });
  }
}

function mostrarToast(msg) {
  var toast = document.getElementById("toast-compartir");
  toast.textContent = msg;
  toast.classList.add("visible");
  setTimeout(function() { toast.classList.remove("visible"); }, 2800);
}

/* ══════════════════════════════════════
   CERRAR MODAL AL HACER CLIC FUERA
   ══════════════════════════════════════ */
function cerrarModalFuera(e) {
  if (e.target === document.getElementById("modal")) cerrarModal();
}

/* ══════════════════════════════════════
   MÓVIL: forzar cards al cargar
   ══════════════════════════════════════ */
function forzarCardsEnMovil() {
  if (window.innerWidth > 600) return;
  ["tablawrapperPeliculas", "tablawrapperSeries"].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) { el.style.display = "none"; el.classList.add("tablawrapper-movil-hidden"); }
  });
  ["cardsPeliculas", "cardsSeries"].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = "grid";
  });
  /* Marcar botón cards como activo */
  document.querySelectorAll(".toggle-vista .vista-btn[data-vista='cards']").forEach(function(b) {
    b.classList.add("activo");
  });
  document.querySelectorAll(".toggle-vista .vista-btn[data-vista='tabla']").forEach(function(b) {
    b.classList.remove("activo");
  });
}

document.addEventListener("DOMContentLoaded", forzarCardsEnMovil);
window.addEventListener("resize", forzarCardsEnMovil);
