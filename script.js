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
   POSTERS (TMDB)
   ══════════════════════════════════════ */
var posterCache = {};

function obtenerPoster(titulo, anio, tipo) {
  var clave = titulo + "_" + anio + "_" + tipo;
  if (posterCache[clave] !== undefined) return Promise.resolve(posterCache[clave]);

  var mediaType = tipo === "Serie" ? "tv" : "movie";
  var q         = encodeURIComponent(titulo);
  var yearStr   = anio ? (String(anio).match(/\d{4}/) || [""])[0] : "";
  var yearParam = yearStr ? "&year=" + yearStr : "";
  var url       = "https://api.themoviedb.org/3/search/" + mediaType +
                  "?api_key=8265bd1679663a7ea12ac168da84d2e8&query=" + q + yearParam + "&language=es-ES";

  return fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(json) {
      var path   = json.results && json.results[0] && json.results[0].poster_path;
      var imgUrl = path ? "https://image.tmdb.org/t/p/w342" + path : null;
      posterCache[clave] = imgUrl;
      return imgUrl;
    })
    .catch(function() {
      posterCache[clave] = null;
      return null;
    });
}

/* ══════════════════════════════════════
   CARDS
   ══════════════════════════════════════ */
function crearCard(item, tipo) {
  var card = document.createElement("div");
  card.className = "pelicard";

  var titulo = item["Título"] || item["Titulo"] || "";
  var anio   = item["Año"]    || item["Anio"]   || "";
  var genero = item["Género"] || item["Genero"] || "";
  var calif  = item["Calificación"] || item["Calificacion"] || "";
  var emoji  = tipo === "Serie" ? "📺" : "🎬";
  var generoCorto = genero ? " · " + genero.split(",")[0] : "";

  card.innerHTML =
    '<div class="pelicard-poster-placeholder">' +
      '<span style="font-size:2rem">' + emoji + '</span>' +
      '<span class="placeholder-titulo">' + titulo + '</span>' +
    '</div>' +
    '<div class="pelicard-info">' +
      '<div class="pelicard-titulo">' + titulo + '</div>' +
      '<div class="pelicard-meta">' + anio + generoCorto + '</div>' +
      '<div class="pelicard-calificacion">★ ' + calif + '</div>' +
    '</div>';

  card.addEventListener("click", function() {
    mostrarModal(Object.assign({}, item, { Tipo: tipo }));
  });

  /* Póster en segundo plano */
  obtenerPoster(titulo, anio, tipo).then(function(url) {
    if (!url) return;
    var placeholder = card.querySelector(".pelicard-poster-placeholder");
    if (!placeholder) return;
    var img     = document.createElement("img");
    img.className = "pelicard-poster";
    img.src     = url;
    img.alt     = titulo;
    img.loading = "lazy";
    img.onload  = function() { placeholder.replaceWith(img); };
  });

  return card;
}

function llenarCards(data, gridId, tipo) {
  var grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = "";

  data.forEach(function(item) {
    if (Object.values(item).join("").trim() === "") return;
    var card = crearCard(item, tipo);
    grid.appendChild(card);
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
