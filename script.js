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
var streamingData = {}; // { "tt1234567": { titulo, plataformas, link, actualizado } }

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

/* info.html se separó del index para que se pueda editar sin tocar el resto del sitio */
fetch("info.html")
  .then(function(r) { return r.ok ? r.text() : "<p>No se pudo cargar la información.</p>"; })
  .then(function(html) { document.getElementById("info-contenido").innerHTML = html; })
  .catch(function() {
    document.getElementById("info-contenido").innerHTML = "<p>No se pudo cargar la información.</p>";
  });

/* streaming.json se genera solo cada semana vía GitHub Action.
   Si por algo no existe o falla, seguimos sin romper el resto del sitio. */
fetch("streaming.json")
  .then(function(r) { return r.ok ? r.json() : {}; })
  .then(function(json) { streamingData = json; })
  .catch(function() { streamingData = {}; });

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
  if (criterio === "calificacion") c.sort(function(a,b){
    var diff = getNum(b,"Calificación") - getNum(a,"Calificación");
    return diff !== 0 ? diff : getNo(b) - getNo(a);
  });
  if (criterio === "anio")         c.sort(function(a,b){
    var diff = getAnio(b) - getAnio(a);
    return diff !== 0 ? diff : getNo(b) - getNo(a);
  });
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
    var streaming = obtenerStreaming(item);
    var campos = [
      item["Título"] || item["Titulo"],
      item["Género"] || item["Genero"],
      item["Tono"], item["Ritmo"], item["Etiquetas"],
      item["Reseña"] || item["Resena"],
      streaming && streaming.plataformas ? streaming.plataformas.join(" ") : ""
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
function toggleModalBloque(id, valor) {
  var el = document.getElementById(id);
  if (!el) return;
  el.style.display = (valor && String(valor).trim()) ? "" : "none";
}

function mostrarModal(d) {
  _itemActual   = d;
  _tituloActual = d["Título"] || d["Titulo"] || "";

  document.getElementById("modal-titulo").textContent       = _tituloActual;
  document.getElementById("modal-calificacion").textContent = d["Calificación"] || d["Calificacion"] || "";
  document.getElementById("modal-origen").textContent       = d["Origen"] || "";
  document.getElementById("modal-anio").textContent         = d["Año"] || d["Anio"] || "";

  document.getElementById("modal-label-minutos-o-caps").textContent =
    d["Tipo"] === "Pelicula" ? "⏱ Minutos:" : "⏱ Capítulos:";
  document.getElementById("modal-minutos-o-caps").textContent =
    d["Tipo"] === "Pelicula" ? (d["Minutos"] || "") : (d["Capítulos"] || d["Capitulos"] || "");

  var genero    = d["Género"]    || d["Genero"]    || "";
  var tono      = d["Tono"]      || "";
  var ritmo     = d["Ritmo"]     || "";
  var publico   = d["Público"]   || d["Publico"]   || "";
  var etiquetas = d["Etiquetas"] || "";
  var flags     = d["Flags"]     || "";
  var resena    = d["Reseña"]    || d["Resena"]    || "";

  document.getElementById("modal-genero").textContent    = genero;
  document.getElementById("modal-tono").textContent      = tono;
  document.getElementById("modal-ritmo").textContent     = ritmo;
  document.getElementById("modal-publico").textContent   = publico;
  document.getElementById("modal-etiquetas").textContent = etiquetas;
  document.getElementById("modal-flags").textContent     = flags;
  document.getElementById("modal-resena").textContent    = resena;

  /* Oculta pills y secciones vacías para que la ficha no muestre huecos */
  toggleModalBloque("modal-genero-pill", genero);
  toggleModalBloque("modal-tono-pill", tono);
  toggleModalBloque("modal-ritmo-pill", ritmo);
  toggleModalBloque("modal-publico-pill", publico);
  toggleModalBloque("modal-etiquetas-wrap", etiquetas);
  toggleModalBloque("modal-flags-wrap", flags);
  toggleModalBloque("modal-resena-wrap", resena);

  var imdb = document.getElementById("modal-imdb");
  if (d["IMDB"]) { imdb.href = d["IMDB"]; imdb.style.display = "inline-flex"; }
  else           { imdb.href = "#";        imdb.style.display = "none";        }

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

  /* Disponibilidad en streaming */
  var streaming = obtenerStreaming(d);
  var streamingWrap = document.getElementById("modal-streaming-wrap");
  if (streaming && streaming.plataformas && streaming.plataformas.length > 0) {
    document.getElementById("modal-streaming").innerHTML = pillsStreaming(streaming.plataformas);
    streamingWrap.classList.remove("sin-streaming");
  } else {
    document.getElementById("modal-streaming").innerHTML =
      '<span class="streaming-pill streaming-ninguna">No disponible actualmente</span>';
    streamingWrap.classList.add("sin-streaming");
  }
  streamingWrap.style.display = "block";

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
function extraerImdbId(url) {
  if (!url) return null;
  var m = String(url).match(/tt\d+/);
  return m ? m[0] : null;
}

function obtenerStreaming(d) {
  var imdbId = extraerImdbId(campo(d, ["IMDB"]));
  if (!imdbId) return null;
  return streamingData[imdbId] || null;
}

function claseStreaming(nombre) {
  var slug = nombre.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return "streaming-" + slug;
}

function pillsStreaming(plataformas) {
  return plataformas.map(function(p) {
    return '<span class="streaming-pill ' + claseStreaming(p) + '">' + p + '</span>';
  }).join("");
}

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
}
function cerrarPanelDeseos() {
  document.getElementById("panel-deseos").classList.remove("abierto");
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

/* ══════════════════════════════════════
   MOODS
   ══════════════════════════════════════ */

var MOODS_DEF = {
  emocionar:   { emoji: "❤️",  nombre: "Ten pañuelos cerca" },
  enganchar:   { emoji: "🔎",  nombre: "No vas a poder parar" },
  aventura:    { emoji: "⚔️",  nombre: "Sube la adrenalina" },
  desconectar: { emoji: "☕",  nombre: "Apaga el cerebro un rato" },
  reir:        { emoji: "😂",  nombre: "Carcajada garantizada" },
  epoca:       { emoji: "🏛️", nombre: "Cine de época" },
  pensar:      { emoji: "🧠",  nombre: "Te deja pensando" },
  inspirar:    { emoji: "✨",  nombre: "Ganas de comerte el mundo" },
  lujo:        { emoji: "🥂",  nombre: "Amor y lujo" },
  diferente:   { emoji: "🎭",  nombre: "Fuera de serie" }
};

function clasificarMoodsBase(item) {
  var genero = campo(item, ["Género","Genero"]).toLowerCase();
  var tono   = campo(item, ["Tono"]).toLowerCase();
  var ritmo  = campo(item, ["Ritmo"]).toLowerCase();

  function m(txt, pp) { return pp.some(function(p){ return txt.indexOf(p) !== -1; }); }

  var moods = [];

  /* ── ❤️ TEN PAÑUELOS CERCA ───────────────────────
     Romance, o tono emotivo/tierno/nostálgico/desgarrador */
  if (m(genero, ["romance"]) ||
      m(tono, ["emotivo","desgarrador","conmovedor","melancólico","sentimental",
               "emocional","tierno","entrañable","romántico","cálido","nostálgico",
               "agridulce","dramático"])) {
    moods.push("emocionar");
  }

  /* ── 🔎 NO VAS A PODER PARAR ─────────────────────
     Misterio/suspenso/thriller/crimen/espionaje/intriga,
     o tono intrigante/misterioso/tenso/intenso (aunque el género no sea policial) */
  if (m(genero, ["misterio","suspenso","thriller","intriga","crimen","espionaje"]) ||
      m(tono, ["intrigante","misterioso","tenso","intenso"])) {
    moods.push("enganchar");
  }

  /* ── ⚔️ SUBE LA ADRENALINA ───────────────────────
     Acción/aventura/guerra/western/sci-fi/fantasía/deporte
     + ritmo movido o tono épico/intenso/dinámico/tenso */
  if (m(genero, ["acción","aventura","guerra","bélico","western","ciencia ficción",
                 "sci-fi","fantasía","deporte","deportivo","fútbol"]) &&
      (m(ritmo, ["rápido","ágil","dinámico","variado"]) ||
       m(tono, ["épico","heroico","trepidante","intenso","dinámico","tenso"]))) {
    moods.push("aventura");
  }

  /* ── ☕ APAGA EL CEREBRO UN RATO ──────────────────
     Tono ligero/cálido/entrañable/mágico, o géneros de "ver sin pensar":
     familiar, musical, culinario */
  if (m(tono, ["ligero","cálido","entrañable","tierno","mágico","optimista"]) ||
      m(genero, ["familia","familiar","musical","música","culinario"])) {
    moods.push("desconectar");
  }

  /* ── 😂 CARCAJADA GARANTIZADA ─────────────────────
     Género comedia (incluye comedia negra), o tono cómico */
  if (m(genero, ["comedia"]) ||
      m(tono, ["ingenioso","sarcástico","absurdo","divertido"])) {
    moods.push("reir");
  }

  /* ── 🏛️ CINE DE ÉPOCA ────────────────────────────
     Ambientadas en el pasado: histórico/historia/drama de época/
     k-drama/guerra/bélico. Es puramente por ambientación, no por tono. */
  if (m(genero, ["histórico","historia","drama de época","k-drama","bélico","guerra"])) {
    moods.push("epoca");
  }

  /* ── 🧠 TE DEJA PENSANDO ──────────────────────────
     SOLO por tono (serio/reflexivo/elegante/sofisticado/oscuro/histórico) —
     el género por sí solo (ej. "Drama Histórico") ya NO cuenta, porque
     ambientación no es lo mismo que profundidad (ver caso Sandokan) */
  if (m(tono, ["serio","reflexivo","elegante","sofisticado","dramático","oscuro",
               "melancólico","histórico"])) {
    moods.push("pensar");
  }

  /* ── ✨ GANAS DE COMERTE EL MUNDO ─────────────────
     SOLO por tono (inspirador/heroico/optimista) — igual que "pensar",
     el género biografía/deporte ya no dispara esto por sí solo */
  if (m(tono, ["inspirador","heroico","optimista"])) {
    moods.push("inspirar");
  }

  /* ── 🥂 AMOR Y LUJO ───────────────────────────────
     Romance + tono elegante/romántico/cálido/sofisticado/nostálgico:
     el "coloquial" de películas bonitas, bien hechas, con feeling good */
  if (m(genero, ["romance"]) &&
      m(tono, ["elegante","romántico","cálido","sofisticado","nostálgico"])) {
    moods.push("lujo");
  }

  /* ── 🎭 FUERA DE SERIE (regla explícita, sin contar la red de seguridad) ──
     Tono surrealista/teatral/absurdo, o musicales con toque mágico/nostálgico */
  if (m(tono, ["surrealista","teatral","absurdo"]) ||
      (m(genero, ["musical"]) && m(tono, ["mágico","nostálgico"]))) {
    moods.push("diferente");
  }

  return moods;
}

function clasificarMoods(item, tipo) {
  var moods = clasificarMoodsBase(item);
  /* Red de seguridad: si no matcheó ningún mood real, cae en "diferente"
     para que ningún título se quede sin categoría */
  if (moods.length === 0) moods.push("diferente");
  return moods;
}

/* ── Revisión de cobertura de moods ──────────────────────────────
   Corre automáticamente al cargar los datos y deja un reporte en la
   consola del navegador (F12 → Console). Úsalo cada vez que agregues
   títulos nuevos a tus Google Sheets: recarga el sitio, abre la consola
   y revisa qué títulos cayeron solo por la red de seguridad — esos son
   los que probablemente necesitan un ajuste de reglas o de Tono/Género. */
function revisarCoberturaMoods() {
  var todos = dataPeliculas.concat(dataSeries);
  var sinMoodReal = [];

  todos.forEach(function(item) {
    var base = clasificarMoodsBase(item);
    if (base.length === 0) {
      sinMoodReal.push(campo(item, ["Título","Titulo"]) + "  [Género: " + campo(item,["Género","Genero"]) +
        " | Tono: " + campo(item,["Tono"]) + " | Ritmo: " + campo(item,["Ritmo"]) + "]");
    }
  });

  console.log("%c🎭 Revisión de cobertura de moods", "font-weight:bold;font-size:13px");
  console.log("Total de títulos revisados: " + todos.length);
  if (sinMoodReal.length === 0) {
    console.log("✅ Todos los títulos matchean al menos un mood real. Nada cayó solo en la red de seguridad.");
  } else {
    console.warn("⚠️ " + sinMoodReal.length + " título(s) cayeron SOLO por la red de seguridad (mood 'Algo diferente' automático). Revisa si su Género/Tono necesita un ajuste, o si hace falta ampliar alguna regla:");
    sinMoodReal.forEach(function(linea) { console.warn("  • " + linea); });
  }
}

function actualizarContadoresMoods() {
  var todos = dataPeliculas.concat(dataSeries);
  var conteos = {};
  Object.keys(MOODS_DEF).forEach(function(k) { conteos[k] = 0; });

  todos.forEach(function(item) {
    var tipo  = dataPeliculas.indexOf(item) !== -1 ? "Pelicula" : "Serie";
    var moods = clasificarMoods(item, tipo);
    moods.forEach(function(m) { conteos[m]++; });
  });

  Object.keys(conteos).forEach(function(k) {
    var el = document.getElementById("count-" + k);
    if (el) el.textContent = conteos[k] + " títulos";
  });
}

function verMood(moodKey) {
  var def   = MOODS_DEF[moodKey];
  var todos = dataPeliculas.concat(dataSeries);

  var filtrados = todos.filter(function(item) {
    var tipo  = dataPeliculas.indexOf(item) !== -1 ? "Pelicula" : "Serie";
    return clasificarMoods(item, tipo).indexOf(moodKey) !== -1;
  });

  // Ordenar por año desc, desempate por No. desc
  filtrados.sort(function(a, b) {
    var ya = parseInt(((campo(a,["Año","Anio"]) || "0").match(/[0-9]{4}/) || ["0"])[0]);
    var yb = parseInt(((campo(b,["Año","Anio"]) || "0").match(/[0-9]{4}/) || ["0"])[0]);
    if (yb !== ya) return yb - ya;
    return (Number(campo(b,["No.","No"])) || 0) - (Number(campo(a,["No.","No"])) || 0);
  });

  document.getElementById("moods-grid").style.display    = "none";
  document.getElementById("mood-resultado").style.display = "block";
  document.getElementById("mood-resultado-titulo").textContent =
    def.emoji + " " + def.nombre;
  document.querySelector(".moods-intro").style.display = "none";

  var grid = document.getElementById("mood-cards");
  grid.innerHTML = "";
  filtrados.forEach(function(item) {
    var tipo = dataPeliculas.indexOf(item) !== -1 ? "Pelicula" : "Serie";
    grid.appendChild(crearCard(item, tipo));
  });
}

function volverMoods() {
  document.getElementById("moods-grid").style.display     = "grid";
  document.getElementById("mood-resultado").style.display = "none";
  document.querySelector(".moods-intro").style.display    = "block";
}

/* Actualizar contadores cuando los datos estén listos */
var _moodsPendientes = 2; // espera pelis + series
function checkMoodsReady() {
  _moodsPendientes--;
  if (_moodsPendientes === 0) {
    actualizarContadoresMoods();
    revisarCoberturaMoods();
  }
}
