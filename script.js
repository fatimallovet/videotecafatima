/* script.js — Videoteca Fátima */

/* ── NAVEGACIÓN ── */
function openTab(tabId) { setTab(tabId); } // alias por compatibilidad

function setTab(tabId) {
  /* Secciones */
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('visible'));
  var target = document.getElementById(tabId);
  if (target) target.classList.add('visible');

  /* Tabs del header (desktop) */
  document.querySelectorAll('.tab-btn').forEach(function(b) {
    b.classList.toggle('activo', b.dataset.tab === tabId);
  });

  /* Botones barra inferior (móvil) */
  document.querySelectorAll('.bottom-btn').forEach(function(b) {
    b.classList.toggle('activo', b.dataset.tab === tabId);
  });
}

/* ── URLS ── */
const URL_PELIS  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfZKKu9u0USHXUnyUHQXSxf4uRXK--I5t_5JEE4pjUhe23SWVEZfg1u1R33zazOyh2GIDb9koa8hga/pub?gid=0&single=true&output=csv";
const URL_SERIES = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfZKKu9u0USHXUnyUHQXSxf4uRXK--I5t_5JEE4pjUhe23SWVEZfg1u1R33zazOyh2GIDb9koa8hga/pub?gid=2141924116&single=true&output=csv";

/* ── DATOS ── */
var dataPeliculas = [];
var dataSeries    = [];

/* ── ESTADO MODAL ── */
var _itemActual   = {};
var _tituloActual = "";

/* ══════════════════════════════════════
   CARGA DE DATOS — un fetch por sección
   ══════════════════════════════════════ */
fetch(URL_PELIS)
  .then(function(r) { if (!r.ok) throw new Error("Error"); return r.text(); })
  .then(function(txt) {
    var res = Papa.parse(txt, { header: true, skipEmptyLines: true });
    dataPeliculas = res.data.filter(function(i) { return Object.values(i).join("").trim() !== ""; });
    renderizar("Pelicula");
    activarBusqueda("busquedaPeliculas", "Pelicula");
    activarOrden("ordenPeliculas", "Pelicula");
  });

fetch(URL_SERIES)
  .then(function(r) { return r.text(); })
  .then(function(txt) {
    var res = Papa.parse(txt, { header: true, skipEmptyLines: true });
    dataSeries = res.data.filter(function(i) { return Object.values(i).join("").trim() !== ""; });
    renderizar("Serie");
    activarBusqueda("busquedaSeries", "Serie");
    activarOrden("ordenSeries", "Serie");
  });

/* ══════════════════════════════════════
   ORDENAR + FILTRAR → RENDERIZAR
   ══════════════════════════════════════ */
function getNum(item, key) {
  var v = item[key] || item[key.replace(/[óÓ]/g,"o").replace(/[éÉ]/g,"e")] || "";
  return parseFloat(v) || 0;
}
function getAnio(item) {
  var v = item["Año"] || item["Anio"] || "";
  var m = String(v).match(/\d{4}/);
  return m ? Number(m[0]) : 0;
}
function getNo(item) { return Number(item["No."] || item["No"] || 0); }

function ordenarData(data, criterio) {
  var c = data.slice();
  if (criterio === "recientes")    c.sort(function(a,b){ return getNo(b) - getNo(a); });
  if (criterio === "calificacion") c.sort(function(a,b){ return getNum(b,"Calificación") - getNum(a,"Calificación"); });
  if (criterio === "anio")         c.sort(function(a,b){ return getAnio(b) - getAnio(a); });
  return c;
}

function renderizar(tipo) {
  var esPeli  = tipo === "Pelicula";
  var data    = esPeli ? dataPeliculas : dataSeries;
  var gridId  = esPeli ? "cardsPeliculas" : "cardsSeries";
  var inputId = esPeli ? "busquedaPeliculas" : "busquedaSeries";
  var ordenId = esPeli ? "ordenPeliculas" : "ordenSeries";

  var texto    = (document.getElementById(inputId) || {value:""}).value.toLowerCase();
  var criterio = (document.getElementById(ordenId)  || {value:"recientes"}).value;

  var filtrados = data.filter(function(item) {
    var campos = [
      item["Título"] || item["Titulo"],
      item["Género"] || item["Genero"],
      item["Tono"], item["Ritmo"], item["Etiquetas"],
      item["Reseña"] || item["Resena"]
    ];
    return campos.some(function(c) { return (c||"").toString().toLowerCase().includes(texto); });
  });

  llenarCards(ordenarData(filtrados, criterio), gridId, tipo);
}

function activarBusqueda(inputId, tipo) {
  var el = document.getElementById(inputId);
  if (el) el.addEventListener("input", function() { renderizar(tipo); });
}
function activarOrden(selectId, tipo) {
  var el = document.getElementById(selectId);
  if (el) el.addEventListener("change", function() { renderizar(tipo); });
}

/* Limpiar */
document.querySelectorAll(".clear-btn").forEach(function(btn) {
  btn.addEventListener("click", function() {
    var input = btn.closest(".buscador-wrapper").querySelector(".buscador");
    input.value = "";
    input.dispatchEvent(new Event("input"));
    input.focus();
  });
});

document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") {
    cerrarModal();
    document.querySelectorAll(".buscador").forEach(function(i) {
      if (i.value !== "") { i.value = ""; i.dispatchEvent(new Event("input")); }
    });
  }
});

/* ══════════════════════════════════════
   CARDS
   ══════════════════════════════════════ */
function claseBanda(g) {
  if (!g) return "banda-otros";
  g = g.toLowerCase();
  if (g.includes("drama"))                                            return "banda-drama";
  if (g.includes("comedia") || g.includes("comedy"))                 return "banda-comedia";
  if (g.includes("thriller") || g.includes("suspen"))                return "banda-thriller";
  if (g.includes("terror")  || g.includes("horror"))                 return "banda-terror";
  if (g.includes("accion")  || g.includes("acción") || g.includes("aventura")) return "banda-accion";
  if (g.includes("romance") || g.includes("romántic"))               return "banda-romance";
  if (g.includes("ciencia") || g.includes("sci-fi")  || g.includes("ficcion")) return "banda-ciencia";
  if (g.includes("animacion") || g.includes("animación") || g.includes("anime")) return "banda-animacion";
  if (g.includes("documental"))                                       return "banda-doc";
  if (g.includes("crimen")  || g.includes("crime")   || g.includes("policial")) return "banda-crimen";
  if (g.includes("historia")|| g.includes("period")  || g.includes("biogr"))    return "banda-historia";
  return "banda-otros";
}

function estrellas(calif) {
  var n = parseFloat(calif);
  if (isNaN(n) || calif === "") return "";
  return "⭐ " + n.toFixed(1).replace(".0","");
}

function crearCard(item, tipo) {
  var card = document.createElement("div");
  card.className = "pelicard";

  var titulo    = campo(item, ["Título","Titulo"]);
  var anio      = campo(item, ["Año","Anio"]);
  var genero    = campo(item, ["Género","Genero"]);
  var calif     = campo(item, ["Calificación","Calificacion"]);
  var poster    = campo(item, ["Poster","poster","Póster","póster"]).trim();
  var label     = tipo === "Serie" ? "Serie" : "Película";
  var anioCorto = (String(anio).match(/\d{4}/) || [""])[0];
  var enD       = estaEnDeseos(titulo);
  var bandaClass = claseBanda(genero);

  /* Zona superior: póster si existe, banda de color si no */
  var zonaTop;
  if (poster) {
    var wrap = document.createElement("div");
    wrap.className = "pelicard-poster-wrap";
    var img = document.createElement("img");
    img.className = "pelicard-poster";
    img.src = poster;
    img.alt = titulo;
    img.loading = "lazy";
    img.onerror = function() {
      wrap.outerHTML = '<div class="pelicard-banda ' + bandaClass + '"></div>';
    };
    var overlay = document.createElement("div");
    overlay.className = "pelicard-poster-overlay";
    overlay.innerHTML =
      '<span class="pelicard-estrellas-over">' + estrellas(calif) + '</span>' +
      '<button class="card-deseo-btn' + (enD ? " activo" : "") + '" title="Guardar en lista">' + (enD ? "♥" : "♡") + '</button>';
    wrap.appendChild(img);
    wrap.appendChild(overlay);
    card.appendChild(wrap);
    zonaTop = null; // ya añadido
  } else {
    zonaTop = '<div class="pelicard-banda ' + bandaClass + '"></div>';
  }

  /* Cuerpo de la card (siempre) */
  var body = document.createElement("div");
  body.className = "pelicard-body";
  body.innerHTML =
    '<div class="pelicard-header">' +
      '<span class="pelicard-tipo">' + label + '</span>' +
      '<span class="pelicard-anio">' + anioCorto + '</span>' +
    '</div>' +
    '<div class="pelicard-titulo">' + titulo + '</div>' +
    '<div class="pelicard-genero">' + genero + '</div>' +
    (poster ? '' :
      '<div class="pelicard-footer">' +
        '<span class="pelicard-estrellas">' + estrellas(calif) + '</span>' +
        '<button class="card-deseo-btn' + (enD ? " activo" : "") + '" title="Guardar en lista">' + (enD ? "♥" : "♡") + '</button>' +
      '</div>'
    );

  if (!poster) {
    card.innerHTML = zonaTop;
  }
  card.appendChild(body);

  /* Botón ♡ — no abre modal */
  card.querySelector(".card-deseo-btn").addEventListener("click", function(e) {
    e.stopPropagation();
    var obj = { titulo: titulo, tipo: label, genero: genero, calif: calif };
    toggleDeseoItem(obj);
    var ahora = estaEnDeseos(titulo);
    this.textContent = ahora ? "♥" : "♡";
    this.classList.toggle("activo", ahora);
  });

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
   MODAL
   ══════════════════════════════════════ */
function mostrarModal(d) {
  _itemActual   = d;
  _tituloActual = d["Título"] || d["Titulo"] || "";

  document.getElementById("modal-titulo").textContent       = _tituloActual;
  document.getElementById("modal-calificacion").textContent = d["Calificación"] || d["Calificacion"] || "";
  document.getElementById("modal-origen").textContent       = d["Origen"] || "";
  document.getElementById("modal-anio").textContent         = d["Año"] || d["Anio"] || "";

  document.getElementById("modal-label-minutos-o-caps").textContent =
    d["Tipo"] === "Pelicula" ? "Minutos: " : "Capítulos: ";
  document.getElementById("modal-minutos-o-caps").textContent =
    d["Tipo"] === "Pelicula" ? (d["Minutos"] || "") : (d["Capítulos"] || d["Capitulos"] || "");

  document.getElementById("modal-genero").textContent    = d["Género"]    || d["Genero"]    || "";
  document.getElementById("modal-tono").textContent      = d["Tono"]      || "";
  document.getElementById("modal-ritmo").textContent     = d["Ritmo"]     || "";
  document.getElementById("modal-publico").textContent   = d["Público"]   || d["Publico"]   || "";
  document.getElementById("modal-etiquetas").textContent = d["Etiquetas"] || "";
  document.getElementById("modal-flags").textContent     = d["Flags"]     || "";
  document.getElementById("modal-resena").textContent    = d["Reseña"]    || d["Resena"]    || "";

  var imdb = document.getElementById("modal-imdb");
  if (d["IMDB"]) { imdb.href = d["IMDB"]; imdb.style.display = "inline"; }
  else           { imdb.href = "#";        imdb.style.display = "none";   }

  /* Póster en modal */
  var poster = campo(d, ["Poster","poster","Póster","póster"]).trim();
  var modalPoster = document.getElementById("modal-poster-wrap");
  if (poster) {
    modalPoster.innerHTML =
      '<img id="modal-poster-img" class="modal-poster-img" src="' + poster + '" alt="' + (d["Título"]||d["Titulo"]||"") + '" title="Ver en grande">';
    modalPoster.style.display = "block";
    document.getElementById("modal-poster-img").addEventListener("click", function() {
      abrirPosterGrande(poster, d["Título"]||d["Titulo"]||"");
    });
  } else {
    modalPoster.style.display = "none";
    modalPoster.innerHTML = "";
  }

  /* Botón deseos en modal */
  actualizarBtnDeseoModal();
  document.getElementById("modal").style.display = "flex";
}

function cerrarModal() {
  document.getElementById("modal").style.display = "none";
}
function cerrarModalFuera(e) {
  if (e.target === document.getElementById("modal")) cerrarModal();
}

/* ══════════════════════════════════════
   COMPARTIR — escritorio siempre clipboard,
               móvil usa share nativo
   ══════════════════════════════════════ */
/* ══════════════════════════════════════
   FICHA COMPLETA EN TEXTO
   ══════════════════════════════════════ */
function campo(d, nombres) {
  /* Busca la primera clave que exista en el objeto, ignorando tildes y mayúsculas */
  var keys = Object.keys(d);
  for (var i = 0; i < nombres.length; i++) {
    var buscado = nombres[i].toLowerCase();
    for (var j = 0; j < keys.length; j++) {
      if (keys[j].toLowerCase() === buscado) return d[keys[j]] || "";
    }
  }
  return "";
}

function fichaTexto(d) {
  var esPeli    = d["Tipo"] === "Pelicula";
  var tipo      = esPeli ? "Película" : "Serie";
  var titulo    = campo(d, ["Título","Titulo"]);
  var calif     = campo(d, ["Calificación","Calificacion"]);
  var origen    = campo(d, ["Origen"]);
  var anio      = campo(d, ["Año","Anio"]);
  var durLabel  = esPeli ? "Minutos" : "Capítulos";
  var durVal    = esPeli ? campo(d, ["Minutos"]) : campo(d, ["Capítulos","Capitulos"]);
  var genero    = campo(d, ["Género","Genero"]);
  var tono      = campo(d, ["Tono"]);
  var ritmo     = campo(d, ["Ritmo"]);
  var publico   = campo(d, ["Público","Publico"]);
  var etiquetas = campo(d, ["Etiquetas"]);
  var flags     = campo(d, ["Flags"]);
  var resena    = campo(d, ["Reseña","Resena"]);
  var imdb      = campo(d, ["IMDB"]);

  var lineas = [];
  lineas.push("🎬 " + titulo + " (" + tipo + ")");
  lineas.push("─────────────────────────");
  if (calif)     lineas.push("⭐ Calificación: " + calif + " / 10");
  if (anio)      lineas.push("Año: " + anio);
  if (origen)    lineas.push("Origen: " + origen);
  if (durVal)    lineas.push(durLabel + ": " + durVal);
  if (genero)    lineas.push("Género: " + genero);
  if (tono)      lineas.push("Tono: " + tono);
  if (ritmo)     lineas.push("Ritmo: " + ritmo);
  if (publico)   lineas.push("Público: " + publico);
  if (etiquetas) lineas.push("Etiquetas: " + etiquetas);
  if (flags)     lineas.push("⚠️ Flags: " + flags);
  if (resena)    lineas.push("\nReseña: " + resena);
  lineas.push("\n— Recomendada por: Fátima Llovet");
  lineas.push("https://fatimallovet.github.io/videotecafatima/");
  return lineas.join("\n");
}

function compartirTitulo() {
  var texto   = fichaTexto(_itemActual);
  var esMobil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (esMobil && navigator.share) {
    navigator.share({ text: texto }).catch(function(){});
  } else {
    _copiarAlPortapapeles(texto);
  }
}

function mostrarToast(msg) {
  var t = document.getElementById("toast-compartir");
  t.textContent = msg;
  t.classList.add("visible");
  setTimeout(function() { t.classList.remove("visible"); }, 2800);
}

/* ══════════════════════════════════════
   LISTA DE DESEOS
   ══════════════════════════════════════ */
var _deseos = [];
try { _deseos = JSON.parse(localStorage.getItem("videoteca_deseos") || "[]"); } catch(e) {}

function guardarDeseos() {
  try { localStorage.setItem("videoteca_deseos", JSON.stringify(_deseos)); } catch(e) {}
  actualizarFab();
}

function estaEnDeseos(titulo) {
  return _deseos.some(function(d) { return d.titulo === titulo; });
}

function toggleDeseoItem(obj) {
  if (estaEnDeseos(obj.titulo)) {
    _deseos = _deseos.filter(function(d) { return d.titulo !== obj.titulo; });
  } else {
    _deseos.push(obj);
    mostrarToast("Añadido a tu lista ♥");
  }
  guardarDeseos();
  renderPanelDeseos();
}

/* Desde el modal */
function toggleDeseo() {
  var d      = _itemActual;
  var titulo = d["Título"] || d["Titulo"] || "";
  var tipo   = d["Tipo"] === "Pelicula" ? "Película" : "Serie";
  var genero = d["Género"] || d["Genero"] || "";
  var calif  = d["Calificación"] || d["Calificacion"] || "";

  toggleDeseoItem({ titulo: titulo, tipo: tipo, genero: genero, calif: calif });
  actualizarBtnDeseoModal();

  /* Sincronizar botón en card visible */
  sincronizarCardDeseo(titulo);
}

function actualizarBtnDeseoModal() {
  var btn = document.getElementById("modal-deseos-btn");
  if (!btn) return;
  var enD = estaEnDeseos(_tituloActual);
  btn.textContent = enD ? "♥ En mi lista" : "♡ Guardar";
  btn.classList.toggle("activo", enD);
}

function sincronizarCardDeseo(titulo) {
  document.querySelectorAll(".pelicard").forEach(function(card) {
    var tit = card.querySelector(".pelicard-titulo");
    if (!tit || tit.textContent !== titulo) return;
    var btn = card.querySelector(".card-deseo-btn");
    if (!btn) return;
    var enD = estaEnDeseos(titulo);
    btn.textContent = enD ? "♥" : "♡";
    btn.classList.toggle("activo", enD);
  });
}

/* FAB */
function actualizarFab() {
  var n = _deseos.length;

  /* FAB — visible en desktop */
  var fab = document.getElementById("fab-deseos");
  var cnt = document.getElementById("fab-count");
  if (fab) { cnt.textContent = n; fab.style.display = n > 0 ? "flex" : "none"; }

  /* Botón wishlist en bottom-nav — visible en móvil */
  var botBtn = document.getElementById("bottom-wishlist-btn");
  var botCnt = document.getElementById("bottom-wishlist-count");
  if (botBtn) {
    var mostrar = n > 0;
    botBtn.style.display  = mostrar ? "flex" : "none";
    botCnt.textContent    = mostrar ? n : "";
    botBtn.classList.toggle("tiene-items", mostrar);
  }
}

/* Panel */
function compartirItem(titulo) {
  /* Buscar el item completo en los datos para usar fichaTexto */
  var encontrado = null;
  dataPeliculas.concat(dataSeries).forEach(function(item) {
    if ((item["Título"] || item["Titulo"] || "") === titulo) encontrado = item;
  });

  var texto;
  if (encontrado) {
    /* Necesitamos saber el Tipo; buscamos en cuál lista estaba */
    var esPeli = dataPeliculas.some(function(i) { return (i["Título"]||i["Titulo"]||"") === titulo; });
    texto = fichaTexto(Object.assign({}, encontrado, { Tipo: esPeli ? "Pelicula" : "Serie" }));
  } else {
    texto = "🎬 " + titulo + "\n— Videoteca Fátima\nhttps://fatimallovet.github.io/videotecafatima/";
  }

  var esMobil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (esMobil && navigator.share) {
    navigator.share({ text: texto }).catch(function(){});
  } else {
    _copiarAlPortapapeles(texto);
  }
}

function compartirListaCompleta() {
  if (_deseos.length === 0) return;
  var lineas = _deseos.map(function(d, i) {
    return (i+1) + ". " + d.titulo + (d.tipo ? " (" + d.tipo + ")" : "");
  });
  var texto = "🎬 Mi lista de deseos — Videoteca Fátima\n\n" +
              lineas.join("\n") +
              "\n\nhttps://fatimallovet.github.io/videotecafatima/";
  var esMobil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (esMobil && navigator.share) {
    navigator.share({ text: texto }).catch(function(){});
  } else {
    _copiarAlPortapapeles(texto);
  }
}

function _copiarAlPortapapeles(texto) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(texto)
      .then(function()  { mostrarToast("¡Copiado al portapapeles! 📋"); })
      .catch(function() { _copiarFallback(texto); });
  } else {
    _copiarFallback(texto);
  }
}

function _copiarFallback(texto) {
  var ta = document.createElement("textarea");
  ta.value = texto; ta.style.cssText = "position:fixed;opacity:0";
  document.body.appendChild(ta); ta.focus(); ta.select();
  try { document.execCommand("copy"); mostrarToast("¡Copiado al portapapeles! 📋"); }
  catch(e) { mostrarToast("No se pudo copiar 😕"); }
  document.body.removeChild(ta);
}

function renderPanelDeseos() {
  var lista = document.getElementById("deseos-lista");
  var cnt   = document.getElementById("deseos-count");
  if (!lista) return;
  if (cnt) cnt.textContent = _deseos.length;
  lista.innerHTML = "";

  if (_deseos.length === 0) {
    lista.innerHTML = '<p class="deseos-vacia">Tu lista está vacía.<br>Toca ♡ en cualquier tarjeta.</p>';
    return;
  }

  _deseos.forEach(function(item) {
    var row = document.createElement("div");
    row.className = "deseo-item";
    row.innerHTML =
      '<div class="deseo-info">' +
        '<span class="deseo-titulo">' + item.titulo + '</span>' +
        '<span class="deseo-meta">' + (item.tipo || "") +
          (item.genero ? " · " + item.genero.split(",")[0] : "") + '</span>' +
      '</div>' +
      '<div class="deseo-acciones">' +
        '<button class="deseo-compartir-item" title="Compartir">↗</button>' +
        '<button class="deseo-quitar" title="Quitar">✖</button>' +
      '</div>';

    row.querySelector(".deseo-quitar").addEventListener("click", function() {
      _deseos = _deseos.filter(function(d) { return d.titulo !== item.titulo; });
      guardarDeseos();
      renderPanelDeseos();
      sincronizarCardDeseo(item.titulo);
      if (_tituloActual === item.titulo) actualizarBtnDeseoModal();
    });

    row.querySelector(".deseo-compartir-item").addEventListener("click", function() {
      compartirItem(item.titulo);
    });

    lista.appendChild(row);
  });
}

function abrirPanelDeseos() {
  renderPanelDeseos();
  document.getElementById("panel-deseos").classList.add("abierto");
  document.getElementById("panel-deseos-overlay").classList.add("visible");
}
function cerrarPanelDeseos() {
  document.getElementById("panel-deseos").classList.remove("abierto");
  document.getElementById("panel-deseos-overlay").classList.remove("visible");
}
function vaciarDeseos() {
  _deseos = [];
  guardarDeseos();
  renderPanelDeseos();
  document.querySelectorAll(".card-deseo-btn").forEach(function(b) {
    b.textContent = "♡"; b.classList.remove("activo");
  });
  actualizarBtnDeseoModal();
  mostrarToast("Lista vaciada");
}

/* Init */
document.addEventListener("DOMContentLoaded", function() { actualizarFab(); });

/* ══════════════════════════════════════
   LIGHTBOX PÓSTER
   ══════════════════════════════════════ */
function abrirPosterGrande(url, titulo) {
  var lb = document.getElementById("lightbox-poster");
  if (!lb) {
    lb = document.createElement("div");
    lb.id = "lightbox-poster";
    lb.className = "lightbox-poster";
    lb.innerHTML =
      '<div class="lightbox-inner">' +
        '<button class="lightbox-close" onclick="cerrarPosterGrande()">✖</button>' +
        '<img id="lightbox-img" src="" alt="">' +
        '<p id="lightbox-titulo"></p>' +
      '</div>';
    lb.addEventListener("click", function(e) {
      if (e.target === lb) cerrarPosterGrande();
    });
    document.body.appendChild(lb);
  }
  document.getElementById("lightbox-img").src   = url;
  document.getElementById("lightbox-img").alt   = titulo;
  document.getElementById("lightbox-titulo").textContent = titulo;
  lb.style.display = "flex";
}

function cerrarPosterGrande() {
  var lb = document.getElementById("lightbox-poster");
  if (lb) lb.style.display = "none";
}
