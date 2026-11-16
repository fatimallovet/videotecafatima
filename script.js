/* script.js — Videoteca Fátima */

/* ── NAVEGACIÓN ── */

/* Aplica el cambio visual de tab. No toca el historial del navegador;
   eso lo maneja setTab()/aplicarHash() para que el botón "atrás" funcione. */
function mostrarTab(tabId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('visible'));
  var target = document.getElementById(tabId);
  if (target) target.classList.add('visible');

  /* Título de la cabecera móvil (ya no lleva el logo) */
  var titulos = { "peliculas": "Películas", "series": "Series", "moods": "Colecciones", "como-funciona": "Info" };
  var mbt = document.getElementById("mb-title");
  if (mbt && titulos[tabId]) mbt.textContent = titulos[tabId];

  /* Barra lateral / cajón */
  document.querySelectorAll('.nav-item[data-tab]').forEach(function(b) {
    b.classList.toggle('activo', b.dataset.tab === tabId);
    b.setAttribute('aria-current', b.dataset.tab === tabId ? 'page' : 'false');
  });
}

/* Cambia de tab y actualiza la URL (#peliculas, #series, etc.)
   para que el usuario pueda usar el botón "atrás" del navegador. */
function setTab(tabId) {
  var nuevoHash = '#' + tabId;
  if (location.hash === nuevoHash) { mostrarTab(tabId); return; }
  location.hash = nuevoHash; // dispara "hashchange" → aplicarHash() hace el resto
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
    checkMoodsReady();
  });

fetch(URL_SERIES)
  .then(function(r) { return r.text(); })
  .then(function(txt) {
    var res = Papa.parse(txt, { header: true, skipEmptyLines: true });
    dataSeries = res.data.filter(function(i) { return Object.values(i).join("").trim() !== ""; });
    renderizar("Serie");
    activarBusqueda("busquedaSeries", "Serie");
    activarOrden("ordenSeries", "Serie");
    checkMoodsReady();
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
var _streamingCargado = false;
fetch("streaming.json")
  .then(function(r) { return r.ok ? r.json() : {}; })
  .then(function(json) { streamingData = json; })
  .catch(function() { streamingData = {}; })
  .then(function() {
    _streamingCargado = true;
    ["Pelicula", "Serie"].forEach(function(t) {
      var hero = document.getElementById(t === "Pelicula" ? "hero-peliculas" : "hero-series");
      if (hero && hero.dataset.listo) { var oculto = hero.hidden; construirHero(t); hero.hidden = oculto; }
    });
    checkFichaPendiente();
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

  var campoBusq = document.getElementById(inputId) || {value:""};
  var texto    = campoBusq.value.toLowerCase();
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
  if (filtrados.length === 0 && texto.trim()) {
    mostrarSinResultados(document.getElementById(gridId), campoBusq.value.trim());
  }

  /* Contador junto a los controles */
  var ct = document.getElementById(esPeli ? "ct-peliculas" : "ct-series");
  if (ct) {
    ct.textContent = texto.trim()
      ? filtrados.length + (filtrados.length === 1 ? " resultado" : " resultados")
      : data.length + (esPeli ? " películas" : " series");
  }

  /* La portada solo se ve mientras no se está buscando */
  var hero = document.getElementById(esPeli ? "hero-peliculas" : "hero-series");
  if (hero) {
    if (!hero.dataset.listo) construirHero(tipo);
    hero.hidden = !hero.dataset.listo || !!texto.trim();
  }
}

/* ══════════════════════════════════════
   PORTADA — «Destacadas»: las mejor calificadas de cada sección, rotando
   ══════════════════════════════════════ */
var HERO_CUANTAS = 5;        // cuántas destacadas rotan
var HERO_SEGUNDOS = 7;       // cuánto dura cada una

/* Las mejor calificadas; si empatan, la más reciente (No. más alto) */
function _destacadas(data) {
  return ordenarData(data, "calificacion").slice(0, HERO_CUANTAS);
}

function _nodo(tag, clase, texto) {
  var n = document.createElement(tag);
  if (clase) n.className = clase;
  if (texto !== undefined) n.textContent = texto;
  return n;
}

function _crearSlideHero(item, tipo) {
  var esPeli  = tipo === "Pelicula";
  var titulo  = campo(item, ["Título","Titulo"]);
  var calif   = campo(item, ["Calificación","Calificacion"]);
  var anio    = (campo(item, ["Año","Anio"]).match(/\d{4}/) || [""])[0];
  var genero  = campo(item, ["Género","Genero"]);
  var poster  = campo(item, ["Poster","poster","Póster","póster"]).trim();
  var resena  = campo(item, ["Reseña","Resena"]).replace(/\s+/g, " ").trim();
  var streaming = obtenerStreaming(item);
  var plataformas = (streaming && streaming.plataformas) ? streaming.plataformas.slice(0, 2) : [];
  var generos = genero.split(/\s*,\s*/).filter(Boolean).slice(0, 3).join(", ");
  var meta = [calif ? "★ " + calif : "", anio, generos, plataformas.join(" · ")].filter(Boolean).join("  ·  ");
  var extracto = resena ? _extractoResena(resena, 170).replace(/ \[…\]$/, "…") : "";
  var datos = Object.assign({}, item, { Tipo: tipo });

  var slide = _nodo("div", "hero-slide");
  slide.dataset.titulo = titulo;
  function fondoHero(u) { slide.style.setProperty("--hero-img", 'url("' + String(u).replace(/"/g, "%22") + '")'); }
  if (poster) {
    fondoHero(urlPosterTMDB(poster, "w342"));   // va muy desenfocado: no necesita más
    slide.appendChild(_nodo("div", "hero-bg"));
  }

  var tx = _nodo("div", "hero-texto");
  tx.appendChild(_nodo("div", "hero-kicker", "Destacadas"));
  tx.appendChild(_nodo("h2", "hero-titulo", titulo));
  if (meta) tx.appendChild(_nodo("div", "hero-meta", meta));
  if (extracto) tx.appendChild(_nodo("p", "hero-resena", "“" + extracto + "”"));
  var acc = _nodo("div", "hero-acciones");
  var ver = _nodo("button", "hero-btn hero-btn--ver", "Ver ficha");
  ver.type = "button";
  ver.addEventListener("click", function() { abrirFicha(datos); });
  var guardar = _nodo("button", "hero-btn hero-btn--guardar");
  guardar.type = "button";
  guardar.addEventListener("click", function() {
    toggleDeseoItem({ titulo: titulo, tipo: esPeli ? "Película" : "Serie", genero: genero, calif: calif, anio: anio, poster: poster });
    sincronizarCardDeseo(titulo);
  });
  acc.appendChild(ver);
  acc.appendChild(guardar);
  tx.appendChild(acc);
  slide.appendChild(tx);

  if (poster) {
    var img = _nodo("img", "hero-poster");
    var urlHero = urlPosterTMDB(poster, "w500");
    img.src = urlHero;
    img.alt = titulo;
    img.addEventListener("click", function() { abrirFicha(datos); });
    img.addEventListener("error", function() {
      if (urlHero !== poster && !img.dataset.original) { img.dataset.original = "1"; img.src = poster; fondoHero(poster); }
      else img.remove();
    });
    slide.appendChild(img);
  }
  return slide;
}

function construirHero(tipo) {
  var esPeli = tipo === "Pelicula";
  var data = esPeli ? dataPeliculas : dataSeries;
  var el = document.getElementById(esPeli ? "hero-peliculas" : "hero-series");
  if (!el || !data.length) return;

  var items = _destacadas(data);
  var actual = Math.min(Number(el.dataset.actual || 0), items.length - 1);
  clearInterval(el._timer);

  el.innerHTML = "";
  el.dataset.listo = "1";
  var slides = items.map(function(item) { return _crearSlideHero(item, tipo); });
  var caja = _nodo("div", "hero-slides");
  slides.forEach(function(sl) { caja.appendChild(sl); });
  el.appendChild(caja);

  var puntos = [];
  if (items.length > 1) {
    var nav = _nodo("div", "hero-puntos");
    items.forEach(function(item, i) {
      var b = _nodo("button", "hero-punto");
      b.type = "button";
      b.setAttribute("aria-label", "Destacada " + (i + 1) + " de " + items.length);
      b.addEventListener("click", function() { mostrar(i); programar(); });
      nav.appendChild(b);
      puntos.push(b);
    });
    el.appendChild(nav);
  }

  function mostrar(i) {
    actual = (i + slides.length) % slides.length;
    el.dataset.actual = actual;
    slides.forEach(function(sl, k) {
      sl.classList.toggle("activo", k === actual);
      sl.setAttribute("aria-hidden", k === actual ? "false" : "true");
      sl.querySelectorAll("button, img").forEach(function(x) { x.tabIndex = k === actual ? 0 : -1; });
    });
    puntos.forEach(function(b, k) { b.classList.toggle("activo", k === actual); });
  }

  /* Rota sola, salvo que haya movimiento reducido, la persona esté encima o la sección no se vea */
  function programar() {
    clearInterval(el._timer);
    if (slides.length < 2 || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    el._timer = setInterval(function() {
      if (document.hidden || el.hidden || el.offsetParent === null) return;
      if (el.matches(":hover") || el.contains(document.activeElement)) return;
      mostrar(actual + 1);
    }, HERO_SEGUNDOS * 1000);
  }

  /* En el teléfono, deslizar cambia de destacada */
  var x0 = null;
  caja.addEventListener("touchstart", function(e) { x0 = e.touches[0].clientX; }, { passive: true });
  caja.addEventListener("touchend", function(e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 50) { mostrar(actual + (dx < 0 ? 1 : -1)); programar(); }
  }, { passive: true });

  mostrar(actual);
  programar();
  actualizarBotonesHero();
}

/* «Guardar» / «En mi lista» según el estado de la lista de deseos */
function actualizarBotonesHero() {
  document.querySelectorAll(".hero-slide").forEach(function(sl) {
    var b = sl.querySelector(".hero-btn--guardar");
    if (!b || !sl.dataset.titulo) return;
    var enD = estaEnDeseos(sl.dataset.titulo);
    b.textContent = enD ? "♥ En mi lista" : "♡ Guardar";
    b.classList.toggle("activo", enD);
  });
}

/* Aviso cuando una búsqueda no encuentra nada (textContent: el texto del usuario no se interpreta como HTML) */
function mostrarSinResultados(grid, texto) {
  var caja = document.createElement("div");
  caja.className = "sin-resultados";
  var titulo = document.createElement("p");
  titulo.className = "sin-resultados-titulo";
  titulo.textContent = "No encontré nada para «" + texto + "»";
  var ayuda = document.createElement("p");
  ayuda.textContent = "Prueba con otro título, género o plataforma.";
  caja.appendChild(titulo);
  caja.appendChild(ayuda);
  grid.appendChild(caja);
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
    cerrarMenu();
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

/* ── PÓSTERS DE TMDB ──
   La hoja guarda los pósters en tamaño grande (w1280 u original, ~580 KB cada uno), pero una
   tarjeta mide ~170px. TMDB sirve el mismo archivo en otros tamaños (/t/p/w342/<archivo>), así
   que para mostrar se pide uno chico (~44 KB). La hoja no cambia y el visor «en grande» sigue
   usando el original. Solo se reescriben los tamaños estándar (original, wNNN): los recortes
   especiales de TMDB (p. ej. w600_and_h900_face) conservan su encuadre y ya son pequeños. Si la
   URL no es de TMDB, se devuelve tal cual. */
function urlPosterTMDB(url, tam) {
  var m = String(url || "").match(/^https?:\/\/(?:[\w.-]*themoviedb\.org|image\.tmdb\.org)\/t\/p\/(?:original|w\d+)\/([^\/?#]+\.(?:jpe?g|png|webp))(?:[?#].*)?$/i);
  return m ? "https://image.tmdb.org/t/p/" + tam + "/" + m[1] : url;
}

function crearCard(item, tipo) {
  var card = document.createElement("div");
  card.className = "pelicard " + (tipo === "Serie" ? "pelicard--serie" : "pelicard--pelicula");

  var titulo    = campo(item, ["Título","Titulo"]);
  var anio      = campo(item, ["Año","Anio"]);
  var genero    = campo(item, ["Género","Genero"]);
  var calif     = campo(item, ["Calificación","Calificacion"]);
  var poster    = campo(item, ["Poster","poster","Póster","póster"]).trim();
  var label     = tipo === "Serie" ? "Serie" : "Película";
  var anioCorto = (String(anio).match(/\d{4}/) || [""])[0];
  var enD       = estaEnDeseos(titulo);
  var bandaClass = claseBanda(genero);
  var iconoTipo = tipo === "Serie" ? "i-tv" : "i-film";

  /* Zona superior: el póster; si falta (o no carga), un bloque del color del género
     con el icono del tipo. En ambos casos lleva encima la nota y el ♡. */
  var wrap = document.createElement("div");
  wrap.className = "pelicard-poster-wrap";
  function sinPoster() {
    wrap.classList.add("pelicard-poster-vacio", bandaClass);
    wrap.insertAdjacentHTML("afterbegin",
      '<svg class="ico pelicard-poster-ico" aria-hidden="true"><use href="#' + iconoTipo + '"/></svg>');
  }
  if (poster) {
    var img = document.createElement("img");
    img.className = "pelicard-poster";
    var urlChico = urlPosterTMDB(poster, "w342");
    img.src = urlChico;
    img.alt = titulo;
    img.loading = "lazy";
    img.decoding = "async";
    /* Si el tamaño chico fallara, se prueba el original antes de mostrar el bloque de color */
    img.onerror = function() {
      if (urlChico !== poster && !img.dataset.original) { img.dataset.original = "1"; img.src = poster; }
      else { img.remove(); sinPoster(); }
    };
    wrap.appendChild(img);
  } else {
    sinPoster();
  }
  var overlay = document.createElement("div");
  overlay.className = "pelicard-poster-overlay";
  overlay.innerHTML =
    '<span class="pelicard-estrellas-over">' + estrellas(calif) + '</span>' +
    '<button class="card-deseo-btn' + (enD ? " activo" : "") + '" title="Guardar en lista">' + (enD ? "♥" : "♡") + '</button>';
  wrap.appendChild(overlay);
  card.appendChild(wrap);

  /* Cuerpo: título + «año · primer género» (la lista completa de géneros está en la ficha) */
  var primerGenero = genero.split(",")[0].trim();
  var meta = [anioCorto, primerGenero].filter(Boolean).join(" · ");
  var body = document.createElement("div");
  body.className = "pelicard-body";
  body.innerHTML =
    '<div class="pelicard-titulo">' + titulo + '</div>' +
    '<div class="pelicard-meta">' +
      '<svg class="ico pelicard-tipo-ico" role="img" aria-label="' + label + '"><use href="#' + iconoTipo + '"/></svg>' +
      '<span>' + meta + '</span>' +
    '</div>';
  card.appendChild(body);

  /* Botón ♡ — no abre modal */
  card.querySelector(".card-deseo-btn").addEventListener("click", function(e) {
    e.stopPropagation();
    var obj = { titulo: titulo, tipo: label, genero: genero, calif: calif, anio: anioCorto, poster: poster };
    toggleDeseoItem(obj);
    var ahora = estaEnDeseos(titulo);
    this.textContent = ahora ? "♥" : "♡";
    this.classList.toggle("activo", ahora);
  });

  card.addEventListener("click", function() {
    abrirFicha(Object.assign({}, item, { Tipo: tipo }));
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
  precargarImagenFicha(d);

  document.getElementById("modal-titulo").textContent       = _tituloActual;
  document.getElementById("modal-calificacion").textContent = d["Calificación"] || d["Calificacion"] || "";
  document.getElementById("modal-origen").textContent       = d["Origen"] || "";
  document.getElementById("modal-anio").textContent         = d["Año"] || d["Anio"] || "";

  document.getElementById("modal-tipo").textContent = d["Tipo"] === "Pelicula" ? "Película" : "Serie";
  var cantidad = d["Tipo"] === "Pelicula" ? (d["Minutos"] || "") : (d["Capítulos"] || d["Capitulos"] || "");
  cantidad = String(cantidad).trim();
  document.getElementById("modal-duracion").textContent =
    cantidad ? cantidad + (d["Tipo"] === "Pelicula" ? " min" : " capítulos") : "";
  document.getElementById("modal-sep-duracion").style.display = cantidad ? "" : "none";

  var genero    = d["Género"]    || d["Genero"]    || "";
  var tono      = d["Tono"]      || "";
  var ritmo     = d["Ritmo"]     || "";
  var publico   = d["Público"]   || d["Publico"]   || "";
  var etiquetas = d["Etiquetas"] || "";
  var flags     = d["Flags"]     || "";
  var resena    = d["Reseña"]    || d["Resena"]    || "";

  var chipsGenero = document.getElementById("modal-genero");
  chipsGenero.innerHTML = "";
  genero.split(",").forEach(function(g) {
    g = g.trim();
    if (!g) return;
    var chip = document.createElement("span");
    chip.className = "modal-chip";
    chip.textContent = g;
    chipsGenero.appendChild(chip);
  });
  document.getElementById("modal-tono").textContent      = tono;
  document.getElementById("modal-ritmo").textContent     = ritmo;
  document.getElementById("modal-publico").textContent   = publico;
  var chipsTemas = document.getElementById("modal-etiquetas");
  chipsTemas.innerHTML = "";
  etiquetas.split(",").forEach(function(t) {
    t = t.trim();
    if (!t) return;
    var chip = document.createElement("span");
    chip.className = "modal-chip modal-chip--suave";
    chip.textContent = t;
    chipsTemas.appendChild(chip);
  });
  document.getElementById("modal-resena").textContent    = resena;

  /* Oculta bloques vacíos para que la ficha no muestre huecos; «Ninguna» no es una advertencia */
  if (/^ninguna?s?\.?$/i.test(flags.trim())) flags = "";
  toggleModalBloque("modal-genero", genero);
  toggleModalBloque("modal-tono-pill", tono);
  toggleModalBloque("modal-ritmo-pill", ritmo);
  toggleModalBloque("modal-publico-pill", publico);
  toggleModalBloque("modal-rasgos", [tono, ritmo, publico].join(""));
  toggleModalBloque("modal-etiquetas-wrap", etiquetas);
  document.getElementById("modal-flags").textContent = flags;
  toggleModalBloque("modal-flags-wrap", flags);
  toggleModalBloque("modal-resena-wrap", resena);

  var imdb = document.getElementById("modal-imdb");
  if (d["IMDB"]) { imdb.href = d["IMDB"]; imdb.style.display = "inline-flex"; }
  else           { imdb.href = "#";        imdb.style.display = "none";        }

  /* Póster en modal */
  var poster = campo(d, ["Poster","poster","Póster","póster"]).trim();
  var modalPoster = document.getElementById("modal-poster-wrap");
  document.getElementById("modal").classList.toggle("sin-poster", !poster);
  if (poster) {
    var urlMini = urlPosterTMDB(poster, "w500");
    modalPoster.innerHTML =
      '<img id="modal-poster-img" class="modal-poster-img" src="' + urlMini + '" alt="' + (d["Título"]||d["Titulo"]||"") + '" title="Ver en grande">';
    modalPoster.style.display = "block";
    var imgMini = document.getElementById("modal-poster-img");
    imgMini.addEventListener("error", function() {
      if (urlMini !== poster && !imgMini.dataset.original) { imgMini.dataset.original = "1"; imgMini.src = poster; }
    });
    imgMini.addEventListener("click", function() {
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

/* Oculta la ficha sin tocar el historial (lo usa el router al reaccionar a la URL) */
function ocultarModal() {
  document.getElementById("modal").style.display = "none";
  _modalConEntrada = false;
}

/* Cierra la ficha por acción del usuario (✖, clic fuera, Esc) y deja la URL en la pestaña.
   Si la ficha se abrió desde el sitio, vuelve atrás en el historial; si se llegó con un
   enlace directo, no hay "atrás" dentro del sitio, así que solo se reescribe la URL. */
function cerrarModal() {
  if (document.getElementById("modal").style.display !== "flex") return;
  var conEntrada = _modalConEntrada;
  ocultarModal();
  if (!/^#(peliculas|series)\//.test(location.hash)) return;
  if (conEntrada) history.back();
  else history.replaceState(null, "", "#" + location.hash.slice(1).split("/")[0]);
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
  return "streaming-" + slugTitulo(nombre);
}

/* ══════════════════════════════════════
   ENLACES DIRECTOS A UNA FICHA
   #peliculas/toy-story-5  ·  #series/healer
   ══════════════════════════════════════ */
var URL_SITIO = "https://fatimallovet.github.io/videotecafatima/";

/* "¡Qué bello es vivir!" → "que-bello-es-vivir" */
function slugTitulo(texto) {
  return String(texto || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/* Tabla slug ↔ ficha, por sección. Si dos títulos dieran el mismo slug, el segundo
   lleva el año (y, si aún chocara, un número) para que cada enlace apunte a una sola ficha. */
var _indiceSlugs = null;
function _construirIndiceSlugs() {
  var idx = { Pelicula: { porSlug: {}, porClave: {} }, Serie: { porSlug: {}, porClave: {} } };
  [["Pelicula", dataPeliculas], ["Serie", dataSeries]].forEach(function(par) {
    par[1].forEach(function(item) {
      var titulo = campo(item, ["Título","Titulo"]);
      var base = slugTitulo(titulo);
      if (!base) return;
      var anio = (campo(item, ["Año","Anio"]).match(/\d{4}/) || [""])[0];
      var slug = base;
      if (idx[par[0]].porSlug[slug] && anio) slug = base + "-" + anio;
      for (var n = 2; idx[par[0]].porSlug[slug]; n++) slug = base + "-" + n;
      idx[par[0]].porSlug[slug] = item;
      idx[par[0]].porClave[titulo + "|" + anio] = slug;
    });
  });
  return idx;
}
function _slugs() {
  if (!_indiceSlugs && _moodsPendientes === 0) _indiceSlugs = _construirIndiceSlugs();
  return _indiceSlugs;
}

/* Enlace directo a una ficha (d trae el campo Tipo). Si aún no hay datos, enlaza al inicio. */
function urlFicha(d) {
  var idx = _slugs();
  var esPeli = d["Tipo"] === "Pelicula";
  var anio = (campo(d, ["Año","Anio"]).match(/\d{4}/) || [""])[0];
  var slug = idx && idx[esPeli ? "Pelicula" : "Serie"].porClave[campo(d, ["Título","Titulo"]) + "|" + anio];
  return slug ? URL_SITIO + "#" + (esPeli ? "peliculas" : "series") + "/" + slug : URL_SITIO;
}

/* Enlace para COMPARTIR una ficha: apunta a su página de vista previa (p/peliculas/<slug>/),
   que lleva el póster y la descripción para la tarjeta de WhatsApp y luego redirige a la ficha.
   (Las apps de mensajería no ejecutan JavaScript: con #peliculas/<slug> solo verían el sitio genérico.)
   Si esa página aún no existe, 404.html redirige a la ficha igual. */
function urlCompartirFicha(d) {
  var url = urlFicha(d);
  var m = url.match(/#(peliculas|series)\/(.+)$/);
  return m ? URL_SITIO + "p/" + m[1] + "/" + m[2] + "/" : url;
}

/* Abre una ficha por acción del usuario: la URL pasa a ser la de esa ficha
   (así el botón "atrás" la cierra y la dirección de la barra ya es compartible). */
var _modalConEntrada = false;
function abrirFicha(d) {
  mostrarModal(d);
  var url = urlFicha(d);
  if (url.indexOf("#") !== -1) {
    history.pushState(null, "", url.slice(url.indexOf("#")));
    _modalConEntrada = true;
  }
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

/* ── Texto para compartir (pensado para WhatsApp: *negrita* y _cursiva_) ──
   Breve y con gancho: título con año, datos clave, géneros, plataforma, un extracto
   de la reseña y el enlace directo a la ficha. */

/* Quita los caracteres que WhatsApp interpretaría como formato dentro de un texto ajeno */
function _waLimpio(t) { return String(t || "").replace(/[*_~`]/g, "").trim(); }

/* Extracto de la reseña: hasta `max` caracteres, cortando en la última oración completa */
function _extractoResena(resena, max) {
  var t = resena.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  var oraciones = _oraciones(t), acum = "";
  for (var i = 0; i < oraciones.length; i++) {
    if ((acum + oraciones[i]).trim().length > max) break;
    acum += oraciones[i];
  }
  if (acum.trim()) return acum.trim() + " […]";
  return t.slice(0, max).replace(/\s+\S*$/, "") + "…"; // la 1.ª oración ya excede el límite
}

/* Datos de la ficha ya listos para armar el texto */
function _datosFichaWA(d) {
  var esPeli = d["Tipo"] === "Pelicula";
  var flags = campo(d, ["Flags"]).trim();
  var streaming = obtenerStreaming(d);
  return {
    esPeli:   esPeli,
    titulo:   _waLimpio(campo(d, ["Título","Titulo"])),
    anio:     (campo(d, ["Año","Anio"]).match(/\d{4}/) || [""])[0],
    calif:    campo(d, ["Calificación","Calificacion"]),
    origen:   campo(d, ["Origen"]),
    dur:      esPeli ? campo(d, ["Minutos"]) : campo(d, ["Capítulos","Capitulos"]),
    genero:   campo(d, ["Género","Genero"]),
    tono:     campo(d, ["Tono"]),
    ritmo:    campo(d, ["Ritmo"]),
    publico:  campo(d, ["Público","Publico"]),
    flags:    /^ningun[ao]\.?$/i.test(flags) ? "" : flags, // "Ninguna" no es una advertencia
    plataformas: (streaming && streaming.plataformas) ? streaming.plataformas : [],
    resena:   _waLimpio(campo(d, ["Reseña","Resena"]))
  };
}

/* Las dos primeras líneas: 🎬 *Título* (año) y ⭐ 7/10 · Película · EE.UU. · 102 min */
function _cabeceraWA(x) {
  var datos = [];
  if (x.calif) datos.push("⭐ " + x.calif + "/10");
  datos.push(x.esPeli ? "Película" : "Serie");
  if (x.origen) datos.push(x.origen);
  if (x.dur) datos.push(x.dur + (x.esPeli ? " min" : " caps"));
  return [(x.esPeli ? "🎬" : "📺") + " *" + x.titulo + "*" + (x.anio ? " (" + x.anio + ")" : ""),
          datos.join(" · ")];
}

/* Texto que acompaña a lo que se comparte. Lo puede enviar cualquiera (no solo la dueña del sitio),
   así que habla en neutro: título con año y una invitación a abrir la ficha completa.
   La nota, géneros y un extracto de la reseña ya van en la imagen (o en la tarjeta de vista previa). */
function textoCompartir(d) {
  return _cabeceraWA(_datosFichaWA(d))[0] + "\n\nReseña completa y dónde verla 👇";
}

/* ¿Este navegador puede mandar una imagen junto con texto desde el menú de compartir del sistema?
   (celulares y también Safari/Chrome recientes en Mac y Windows) */
function _puedeCompartirImagen() {
  try {
    return !!navigator.canShare && navigator.canShare({ files: [new File(["x"], "a.png", { type: "image/png" })] });
  } catch (e) { return false; }
}

/* La imagen de la ficha tarda un poco en generarse (carga el póster). Se prepara de antemano al
   abrir la ficha, para que al tocar «Compartir» ya esté lista y el menú del sistema se abra al
   instante (los navegadores exigen que se abra dentro del toque del usuario). Se guarda solo la última. */
var _imgFicha = { clave: "", promesa: null };
function _imagenFichaPromesa(d) {
  var clave = d["Tipo"] + "|" + campo(d, ["Título","Titulo"]);
  if (_imgFicha.clave !== clave || !_imgFicha.promesa) {
    var p = generarImagenFicha(d);
    p.catch(function() { if (_imgFicha.promesa === p) _imgFicha = { clave: "", promesa: null }; });
    _imgFicha = { clave: clave, promesa: p };
  }
  return _imgFicha.promesa;
}
function precargarImagenFicha(d) {
  if (!_puedeCompartirImagen()) return;
  setTimeout(function() {
    if (_itemActual === d) _imagenFichaPromesa(d).catch(function() {});
  }, 500);
}

/* Solo el enlace: menú del sistema (título, texto y enlace por separado para que no salga duplicado)
   o, si no existe, copia texto + enlace. */
function _compartirSoloEnlace(d) {
  var url   = urlCompartirFicha(d);
  var texto = textoCompartir(d);
  function copiar() { _copiarAlPortapapeles(texto + "\n" + url, "¡Enlace copiado! Pégalo donde quieras 🔗"); }
  if (navigator.share) {
    navigator.share({ title: _waLimpio(campo(d, ["Título","Titulo"])), text: texto, url: url }).catch(function(err) {
      if (!err || err.name !== "AbortError") copiar();   // cancelar el menú no es un error
    });
  } else {
    copiar();
  }
}

/* Compartir una ficha = SIEMPRE imagen + enlace juntos, en un solo toque:
   · Con menú de compartir del sistema que acepta archivos (celulares, Safari/Chrome recientes):
     se abre con la imagen de la ficha y, como texto, el título + el enlace que abre la ficha completa.
   · Sin él (p. ej. Firefox o Chrome de escritorio antiguo): copia al portapapeles la imagen Y el enlace
     en un mismo elemento (ClipboardItem con image/png + text/plain). Se le pasa la PROMESA de la imagen
     en el mismo clic, para no perder el permiso del gesto.
   · Si nada de eso funciona: comparte/copia solo el enlace. */
function compartirEnlace(d) {
  var titulo = _waLimpio(campo(d, ["Título","Titulo"]));
  var nombre = (campo(d, ["Título","Titulo"]) || "ficha").replace(/[^\w\-]+/g, "_") + ".png";
  var texto  = textoCompartir(d) + "\n" + urlCompartirFicha(d);

  if (_puedeCompartirImagen()) {
    var listo = _imgFicha.clave === d["Tipo"] + "|" + campo(d, ["Título","Titulo"]) && _imgFicha.promesa;
    if (!listo) mostrarToast("Preparando la imagen… 🖼️");
    _imagenFichaPromesa(d).then(function(blob) {
      var file = new File([blob], nombre, { type: "image/png" });
      /* El enlace va dentro del texto (no como `url`): con archivos, varias apps descartan el campo `url` */
      var datos = { files: [file], title: titulo, text: texto };
      if (!navigator.canShare(datos)) throw new Error("no-compartible");
      return navigator.share(datos);
    }).catch(function(err) {
      if (err && err.name === "AbortError") return;   // cancelar el menú no es un error
      _compartirSoloEnlace(d);
    });
    return;
  }

  if (navigator.clipboard && window.ClipboardItem) {
    var promesa = _imagenFichaPromesa(d);
    navigator.clipboard.write([ new ClipboardItem({
      "image/png":  promesa,
      "text/plain": promesa.then(function() { return new Blob([texto], { type: "text/plain" }); })
    }) ])
      .then(function() { mostrarToast("¡Imagen y enlace copiados! Pégalos donde quieras 🔗"); })
      .catch(function() { _compartirSoloEnlace(d); });
    return;
  }
  _compartirSoloEnlace(d);
}

function compartirTitulo() { compartirEnlace(_itemActual); }

function mostrarToast(msg) {
  var t = document.getElementById("toast-compartir");
  t.textContent = msg;
  t.classList.add("visible");
  setTimeout(function() { t.classList.remove("visible"); }, 2800);
}

/* ══════════════════════════════════════
   MENÚ "COMPARTIR" — texto o imagen (solo para la lista de deseos; las fichas comparten imagen + enlace juntos)
   Overlay centrado (no depende de la posición de ningún botón,
   así siempre queda visible por encima del modal / panel de deseos).
   ══════════════════════════════════════ */
var _menuCompartirFondo = null;

function mostrarMenuCompartir(anchorEl, handlers) {
  cerrarMenuCompartir();

  var fondo = document.createElement("div");
  fondo.className = "menu-compartir-fondo";

  var menu = document.createElement("div");
  menu.className = "menu-compartir";
  menu.innerHTML =
    '<div class="menu-compartir-titulo">¿Cómo quieres compartir?</div>' +
    '<button class="menu-compartir-op" data-op="texto">📝 Como texto</button>' +
    '<button class="menu-compartir-op" data-op="imagen">🖼️ Como imagen</button>' +
    '<button class="menu-compartir-cancelar" data-op="cancelar">Cancelar</button>';

  fondo.appendChild(menu);
  document.body.appendChild(fondo);

  fondo.addEventListener("click", function(ev) {
    if (ev.target === fondo) cerrarMenuCompartir();
  });

  menu.querySelector('[data-op="texto"]').addEventListener("click", function(ev) {
    ev.stopPropagation();
    cerrarMenuCompartir();
    handlers.texto();
  });
  menu.querySelector('[data-op="imagen"]').addEventListener("click", function(ev) {
    ev.stopPropagation();
    cerrarMenuCompartir();
    handlers.imagen();
  });
  menu.querySelector('[data-op="cancelar"]').addEventListener("click", function(ev) {
    ev.stopPropagation();
    cerrarMenuCompartir();
  });

  _menuCompartirFondo = fondo;
}

function cerrarMenuCompartir() {
  if (_menuCompartirFondo) {
    _menuCompartirFondo.remove();
    _menuCompartirFondo = null;
  }
}

/* ══════════════════════════════════════
   COMPARTIR — texto directo (share nativo o portapapeles)
   ══════════════════════════════════════ */
function _compartirTextoDirecto(texto) {
  var esMobil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (esMobil && navigator.share) {
    navigator.share({ text: texto }).catch(function(){});
  } else {
    _copiarAlPortapapeles(texto);
  }
}

/* ══════════════════════════════════════
   COMPARTIR — archivo de imagen (share nativo, portapapeles o descarga)
   ══════════════════════════════════════ */
/* En escritorio, navigator.clipboard.write() SOLO funciona si se invoca
   de inmediato dentro del clic del usuario. Si esperamos a que la imagen
   termine de generarse (cargar póster, fuentes, etc.) antes de llamarlo,
   el navegador ya no lo permite y falla en silencio. Por eso aquí llamamos
   a clipboard.write() ya mismo, pasándole la PROMESA de la imagen — el
   navegador espera a que resuelva sin perder el permiso del clic. */
function _compartirImagenDesdePromesa(promesaBlob, nombreArchivo, textoAlt) {
  var esMobil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (!esMobil && navigator.clipboard && window.ClipboardItem) {
    navigator.clipboard.write([ new ClipboardItem({ "image/png": promesaBlob }) ])
      .then(function() { mostrarToast("¡Imagen copiada! Pégala donde quieras 🖼️"); })
      .catch(function() {
        promesaBlob.then(function(blob) { _descargarImagen(blob, nombreArchivo); })
          .catch(function() { mostrarToast("No se pudo generar la imagen 😕"); });
      });
    return;
  }

  promesaBlob.then(function(blob) {
    _compartirArchivoImagen(blob, nombreArchivo, textoAlt);
  }).catch(function() {
    mostrarToast("No se pudo generar la imagen 😕");
  });
}

function _compartirArchivoImagen(blob, nombreArchivo, textoAlt) {
  var esMobil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  var file    = new File([blob], nombreArchivo, { type: "image/png" });

  if (esMobil && navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], text: textoAlt }).catch(function(err) {
      if (!err || err.name !== "AbortError") _descargarImagen(blob, nombreArchivo);
    });
    return;
  }

  _descargarImagen(blob, nombreArchivo);
}

function _descargarImagen(blob, nombreArchivo) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url; a.download = nombreArchivo;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
  mostrarToast("Imagen descargada 📥");
}

/* ══════════════════════════════════════
   GENERACIÓN DE IMÁGENES (canvas)
   ══════════════════════════════════════ */
var BANDA_COLORES = {
  "banda-drama":"#7b9e87","banda-comedia":"#e8a87c","banda-thriller":"#6b7fa3",
  "banda-terror":"#8b6a6a","banda-accion":"#c47d3e","banda-romance":"#c48a9e",
  "banda-ciencia":"#5b8fa8","banda-animacion":"#80b5a0","banda-doc":"#a89860",
  "banda-crimen":"#7a6e8a","banda-historia":"#8a7a5a","banda-otros":"#9aab9e"
};

function _cargarImagen(url) {
  return new Promise(function(resolve, reject) {
    var img = new Image();
    img.crossOrigin = "anonymous";
    img.onload  = function() { resolve(img); };
    img.onerror = function() { reject(new Error("no-image")); };
    img.src = url;
  });
}

/* TMDB no siempre manda las cabeceras CORS necesarias para poder "leer"
   la imagen desde un canvas (es inconsistente según su CDN). Para que el
   póster SIEMPRE se pueda incluir en la imagen a compartir, la pedimos a
   través de images.weserv.nl, un proxy público que sí agrega esas cabeceras.
   Si por lo que sea el proxy fallara, se intenta cargar la URL original. */
function _urlProxyCORS(url) {
  var sinProtocolo = url.replace(/^https?:\/\//, "");
  return "https://images.weserv.nl/?url=" + encodeURIComponent(sinProtocolo);
}

function _cargarPoster(url, tam) {
  var chico = urlPosterTMDB(url, tam || "w500");
  var intento = _cargarImagen(_urlProxyCORS(chico));
  if (chico !== url) intento = intento.catch(function() { return _cargarImagen(_urlProxyCORS(url)); });
  return intento.catch(function() { return _cargarImagen(url); });
}

/* Parte un texto en líneas que caben en maxWidth. No trunca: devuelve
   todas las líneas necesarias para mostrar el texto completo. */
function _partirLineas(ctx, texto, maxWidth) {
  var palabras = String(texto).split(" ");
  var linea = "", lineas = [];
  for (var i = 0; i < palabras.length; i++) {
    var prueba = linea + palabras[i] + " ";
    if (ctx.measureText(prueba).width > maxWidth && linea !== "") {
      lineas.push(linea.trim());
      linea = palabras[i] + " ";
    } else {
      linea = prueba;
    }
  }
  if (linea.trim()) lineas.push(linea.trim());
  return lineas;
}

/* Trunca una sola línea con "…" si no cabe en maxWidth (para filas de una sola línea) */
function _truncarLinea(ctx, texto, maxWidth) {
  if (!texto) return "";
  if (ctx.measureText(texto).width <= maxWidth) return texto;
  var t = texto;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

function _redondeado(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y,   x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x,   y+h, r);
  ctx.arcTo(x,   y+h, x,   y,   r);
  ctx.arcTo(x,   y,   x+w, y,   r);
  ctx.closePath();
}

/* Divide un texto en oraciones (no corta en abreviaturas como "EE.UU." ni en "6.5") */
function _oraciones(texto) {
  return texto.match(/[\s\S]+?[.!?…]+["”»)]*(?=\s|$)|[\s\S]+$/g) || [texto];
}

/* Divide un texto en oraciones (no corta en abreviaturas como "EE.UU." ni en "6.5") */
function _oraciones(texto) {
  return texto.match(/[\s\S]+?[.!?…]+["”»)]*(?=\s|$)|[\s\S]+$/g) || [texto];
}

/* ── Ficha individual → imagen para compartir ──
   Formato fijo 4:5 (1080×1350). Los chats muestran una imagen 4:5 completa y a todo el
   ancho, así que el texto conserva siempre el mismo tamaño aparente, sin importar lo larga
   que sea la reseña (antes el alto crecía sin límite y los chats la encogían).
   Arriba: póster + datos. Debajo: reseña centrada. Si la reseña no cabe ni con la letra
   más pequeña, se corta en la última oración completa que quepa y se marca con "[…]". */
var IMG_FICHA = { W: 1080, H: 1350, pad: 72, footerH: 100, posterW: 300, posterH: 450 };

/* ── Ficha individual → imagen para compartir ──
   Formato fijo 4:5 (1080×1350): los chats la muestran completa y a todo el ancho, así el texto
   conserva siempre el mismo tamaño aparente. Para no desperdiciar espacio, el diseño se ADAPTA:
   prueba combinaciones de alto de póster y tamaño de letra de la reseña y se queda con la que
   deja el póster y el texto más grandes sin pasarse (una reseña corta → letra grande; una larga →
   póster algo menor). Si ni así cabe, la reseña se corta en la última oración completa con «[…]».
   Letras: Instrument Serif (título), FUENTE_LECTURA (reseña) y Poppins (datos). */
var FUENTE_LECTURA = "Newsreader";
var IMG_FICHA = { W: 1080, H: 1350, pad: 64, footerH: 108 };

/* Reseña en bloque de lectura (sin cursiva), a la izquierda. Devuelve { lineas, size, lh } o null si no cabe. */
function _resenaEnTamano(ctx, texto, ancho, altoDisp, size) {
  ctx.font = "400 " + size + "px " + FUENTE_LECTURA + ", Georgia, serif";
  var lh = Math.round(size * 1.46);
  var lineas = _partirLineas(ctx, texto, ancho);
  return lineas.length * lh <= altoDisp ? { lineas: lineas, size: size, lh: lh } : null;
}

/* Último recurso: corta la reseña por oraciones completas para que quepa con la letra mínima */
function _cortarResena(ctx, texto, ancho, altoDisp, size) {
  ctx.font = "400 " + size + "px " + FUENTE_LECTURA + ", Georgia, serif";
  var lh = Math.round(size * 1.46), maxLineas = Math.max(1, Math.floor(altoDisp / lh));
  var oraciones = _oraciones(texto), acumulado = "", mejor = null, i;
  for (i = 0; i < oraciones.length; i++) {
    var l = _partirLineas(ctx, (acumulado + oraciones[i]).trim() + " […]", ancho);
    if (l.length > maxLineas) break;
    acumulado += oraciones[i];
    mejor = l;
  }
  if (!mejor) { // ni la primera oración cabe: se corta por palabras
    var palabras = texto.split(" "), corte = "";
    for (i = 0; i < palabras.length; i++) {
      var p = (corte + " " + palabras[i]).trim();
      if (_partirLineas(ctx, p + "…", ancho).length > maxLineas) break;
      corte = p;
    }
    mejor = _partirLineas(ctx, corte + "…", ancho);
  }
  return { lineas: mejor, size: size, lh: lh };
}

function generarImagenFicha(d, forzarSinPoster) {
  var W = IMG_FICHA.W, H = IMG_FICHA.H, pad = IMG_FICHA.pad, footerH = IMG_FICHA.footerH;
  var cx = W / 2;

  var titulo   = campo(d, ["Título","Titulo"]);
  var calif    = campo(d, ["Calificación","Calificacion"]);
  var origen   = campo(d, ["Origen"]);
  var anio     = campo(d, ["Año","Anio"]);
  var esPeli   = d["Tipo"] === "Pelicula";
  var durVal   = esPeli ? campo(d, ["Minutos"]) : campo(d, ["Capítulos","Capitulos"]);
  var durLabel = esPeli ? "min" : "caps";
  var genero   = campo(d, ["Género","Genero"]);
  var tono     = campo(d, ["Tono"]);
  var flags    = campo(d, ["Flags"]).trim();
  if (/^ningun[ao]\.?$/i.test(flags)) flags = ""; // "Ninguna" no es una advertencia: no se dibuja el ⚠
  var resena   = campo(d, ["Reseña","Resena"]).replace(/\s+/g, " ").trim();
  var poster   = campo(d, ["Poster","poster","Póster","póster"]).trim();
  var colorBanda = BANDA_COLORES[claseBanda(genero)] || "#9aab9e";
  var streaming  = obtenerStreaming(d);
  var plataformas = (streaming && streaming.plataformas) ? streaming.plataformas : [];

  var cargaPoster = (poster && !forzarSinPoster)
    ? _cargarPoster(poster).catch(function() { return null; })
    : Promise.resolve(null);
  /* Las letras deben estar cargadas ANTES de medir y dibujar en el canvas */
  var fontsListos = Promise.all([
    document.fonts && document.fonts.load ? document.fonts.load('400 80px "Instrument Serif"') : 0,
    document.fonts && document.fonts.load ? document.fonts.load('400 40px "' + FUENTE_LECTURA + '"') : 0,
    document.fonts && document.fonts.load ? document.fonts.load('600 26px Poppins') : 0,
    document.fonts && document.fonts.load ? document.fonts.load('400 26px Poppins') : 0
  ]).catch(function() {});
  var cargaLogo = _cargarImagen("logo-claro.svg").catch(function() { return null; });

  return Promise.all([cargaPoster, fontsListos, cargaLogo]).then(function(res) {
    var imgPoster = res[0];
    var imgLogo   = res[2];
    var canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext("2d");
    ctx.textBaseline = "top";
    var SERIF = '"Instrument Serif", Georgia, serif';

    var ratio = imgPoster ? imgPoster.width / imgPoster.height : 2 / 3;
    var chips = (genero ? genero.split(/\s*,\s*/) : []).filter(Boolean).slice(0, 3);
    if (tono) chips.push(tono.split(/\s*,\s*/)[0]);
    var txtStr = plataformas.length
      ? "Disponible en " + plataformas.slice(0, 2).join(" · ") + (plataformas.length > 2 ? "  +" + (plataformas.length - 2) : "")
      : "";
    var meta = [origen, anio, durVal ? (durVal + " " + durLabel) : ""].filter(Boolean).join("  ·  ");

    /* ── Columna de datos: se mide como una lista de bloques (alto + cómo dibujarlo) ── */
    function bloquesDatos(colW) {
      var bl = [], GAP = 22;
      bl.push({ h: 30, draw: function(x, y) {
        ctx.fillStyle = "#a39c8c"; ctx.font = "600 24px Poppins, sans-serif";
        ctx.fillText(esPeli ? "PELÍCULA" : "SERIE", x, y);
      }});
      var tSizes = [92, 84, 76, 68, 60, 52], tSize = 52, lineasTitulo = [], s;
      for (s = 0; s < tSizes.length; s++) {
        tSize = tSizes[s];
        ctx.font = "400 " + tSize + "px " + SERIF;
        lineasTitulo = _partirLineas(ctx, titulo, colW);
        if (lineasTitulo.length <= 3) break;
      }
      if (lineasTitulo.length > 3) {
        lineasTitulo = lineasTitulo.slice(0, 3);
        lineasTitulo[2] = _truncarLinea(ctx, lineasTitulo[2] + "…", colW);
      }
      var tLh = Math.round(tSize * 1.04);
      bl.push({ h: lineasTitulo.length * tLh, draw: function(x, y) {
        ctx.fillStyle = "#ffffff"; ctx.font = "400 " + tSize + "px " + SERIF;
        lineasTitulo.forEach(function(l, i) { ctx.fillText(l, x, y + i * tLh); });
      }});
      if (calif) bl.push({ h: 58, draw: function(x, y) {
        ctx.fillStyle = "#f3c344"; ctx.font = "700 46px Poppins, sans-serif";
        var t = "★ " + calif; ctx.fillText(t, x, y);
        var w = ctx.measureText(t).width;
        ctx.fillStyle = "#a39c8c"; ctx.font = "400 28px Poppins, sans-serif";
        ctx.fillText(" / 10", x + w, y + 15);
      }});
      if (meta) bl.push({ h: 34, draw: function(x, y) {
        ctx.fillStyle = "#cfc9bb"; ctx.font = "400 27px Poppins, sans-serif";
        ctx.fillText(_truncarLinea(ctx, meta, colW), x, y);
      }});
      if (chips.length) {
        ctx.font = "500 24px Poppins, sans-serif";
        var pos = [], cxp = 0, cyp = 0, chipH = 46, chipPad = 22;
        chips.forEach(function(chip) {
          var wChip = ctx.measureText(chip).width + chipPad * 2;
          if (cxp + wChip > colW && cxp > 0) { cxp = 0; cyp += chipH + 12; }
          pos.push({ t: chip, x: cxp, y: cyp, w: wChip });
          cxp += wChip + 12;
        });
        bl.push({ h: cyp + chipH, draw: function(x, y) {
          ctx.font = "500 24px Poppins, sans-serif";
          pos.forEach(function(p) {
            ctx.fillStyle = "#3b3636";
            _redondeado(ctx, x + p.x, y + p.y, p.w, chipH, chipH / 2); ctx.fill();
            ctx.fillStyle = "#f4f1ea"; ctx.fillText(p.t, x + p.x + chipPad, y + p.y + 10);
          });
        }});
      }
      if (txtStr) {
        ctx.font = "600 24px Poppins, sans-serif";
        var ts = _truncarLinea(ctx, txtStr, colW - 44), wStr = ctx.measureText(ts).width + 44;
        bl.push({ h: 48, draw: function(x, y) {
          ctx.fillStyle = "#b05070"; _redondeado(ctx, x, y, wStr, 48, 24); ctx.fill();
          ctx.fillStyle = "#ffffff"; ctx.font = "600 24px Poppins, sans-serif";
          ctx.fillText(ts, x + 22, y + 11);
        }});
      }
      var total = bl.reduce(function(a, b) { return a + b.h; }, 0) + GAP * (bl.length - 1);
      return { bloques: bl, gap: GAP, alto: total };
    }

    /* ── Medidas de la reseña (zona de lectura) ── */
    ctx.font = "600 26px Poppins, sans-serif";
    var lineasFlags = flags ? _partirLineas(ctx, "⚠️ " + flags, W - pad * 2) : [];
    var flagsH = lineasFlags.length ? 20 + lineasFlags.length * 36 : 0;
    var ornH = 64, anchoTxt = W - pad * 2, footerTop = H - footerH;

    function medir(ph) {
      var pw = Math.min(Math.round(ph * ratio), 460);
      ph = Math.round(pw / ratio);
      var colX = pad + pw + 48, colW = W - pad - colX;
      var datos = bloquesDatos(colW);
      var heroH = Math.max(ph, datos.alto);
      var divY = pad + heroH + 40;
      var zonaTop = divY + 30, zonaH = (footerTop - 34) - zonaTop;
      return { pw: pw, ph: ph, colX: colX, colW: colW, datos: datos, heroH: heroH, divY: divY, zonaTop: zonaTop, zonaH: zonaH };
    }

    /* Elegir la combinación póster + letra que mejor aproveche el espacio */
    var mejor = null, ph, fs, M, R, score;
    var tamanos = [44, 42, 40, 38, 36, 34, 32, 30];
    if (resena) {
      for (ph = 620; ph >= 450; ph -= 20) {
        M = medir(ph);
        for (var k = 0; k < tamanos.length; k++) {
          fs = tamanos[k];
          R = _resenaEnTamano(ctx, resena, anchoTxt, M.zonaH - ornH - flagsH, fs);
          if (!R) continue;
          score = fs / 40 + ph / 620 * 0.85;
          if (!mejor || score > mejor.score) mejor = { score: score, M: M, R: R };
          break; // con este póster, la letra más grande que cabe ya es la mejor
        }
      }
    }
    if (!mejor) {
      M = medir(450);
      R = resena ? _cortarResena(ctx, resena, anchoTxt, M.zonaH - ornH - flagsH, 30) : { lineas: [], size: 34, lh: 50 };
      mejor = { M: M, R: R };
    }
    M = mejor.M; R = mejor.R;

    /* ── Dibujo ── */
    ctx.fillStyle = "#262424";
    ctx.fillRect(0, 0, W, H);

    /* Póster completo, a su propia proporción */
    ctx.save();
    _redondeado(ctx, pad, pad, M.pw, M.ph, 22);
    ctx.clip();
    if (imgPoster) {
      ctx.drawImage(imgPoster, pad, pad, M.pw, M.ph);
    } else {
      ctx.fillStyle = colorBanda;
      ctx.fillRect(pad, pad, M.pw, M.ph);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.font = "120px sans-serif";
      ctx.fillText(esPeli ? "🎬" : "📺", pad + M.pw / 2, pad + M.ph / 2 - 60);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    /* Datos, centrados en vertical junto al póster */
    ctx.textAlign = "left";
    var yy = pad + Math.max(0, (M.heroH - M.datos.alto) / 2);
    M.datos.bloques.forEach(function(b) { b.draw(M.colX, yy); yy += b.h + M.datos.gap; });

    /* Línea divisoria */
    ctx.fillStyle = "#4a4545";
    ctx.fillRect(pad, M.divY, W - pad * 2, 2);

    /* Reseña: comillas, texto a la izquierda y advertencias; el bloque se centra en su zona */
    var textoH = R.lineas.length * R.lh;
    var bloqueH = (resena ? ornH + textoH : 0) + flagsH;
    var y0 = M.zonaTop + Math.max(0, (M.zonaH - bloqueH) / 2);
    ctx.textAlign = "left";
    if (resena) {
      ctx.fillStyle = "#b05070";
      ctx.font = "700 130px Georgia, 'Times New Roman', serif";
      ctx.fillText("“", pad - 4, y0 - 22);
      ctx.fillStyle = "#ece8de";
      ctx.font = "400 " + R.size + "px " + FUENTE_LECTURA + ", Georgia, serif";
      R.lineas.forEach(function(l, i) { ctx.fillText(l, pad, y0 + ornH + i * R.lh); });
    }
    if (lineasFlags.length) {
      ctx.fillStyle = "#e0a05a";
      ctx.font = "600 26px Poppins, sans-serif";
      var yFlags = y0 + (resena ? ornH + textoH : 0) + 20;
      lineasFlags.forEach(function(l, i) { ctx.fillText(l, pad, yFlags + i * 36); });
    }

    /* ── Pie: marca (logo + nombre + enlace), centrado ── */
    ctx.fillStyle = "#556b5d";
    ctx.fillRect(0, footerTop, W, footerH);
    var sello = imgLogo ? 66 : 0, gap = imgLogo ? 18 : 0;
    ctx.font = "600 30px Poppins, sans-serif";
    var wNombre = ctx.measureText("Videoteca Fátima").width;
    ctx.font = "400 21px Poppins, sans-serif";
    var wUrl = ctx.measureText("fatimallovet.github.io/videotecafatima").width;
    var grupoW = sello + gap + Math.max(wNombre, wUrl);
    var gx = (W - grupoW) / 2, gy = footerTop + (footerH - 58) / 2; // 58 = alto del bloque de texto
    if (imgLogo) ctx.drawImage(imgLogo, gx, footerTop + (footerH - sello) / 2, sello, sello);
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 30px Poppins, sans-serif";
    ctx.fillText("Videoteca Fátima", gx + sello + gap, gy);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "400 21px Poppins, sans-serif";
    ctx.fillText("fatimallovet.github.io/videotecafatima", gx + sello + gap, gy + 36);

    return new Promise(function(resolve, reject) {
      try {
        canvas.toBlob(function(blob) {
          if (blob) resolve(blob); else reject(new Error("toBlob-vacio"));
        }, "image/png");
      } catch (err) { reject(err); }
    });
  }).catch(function(err) {
    /* Si el póster deja el canvas "contaminado", reintenta sin él */
    if (!forzarSinPoster) return generarImagenFicha(d, true);
    throw err;
  });
}

/* Lista de deseos → imagen (miniatura + título + tipo + año + género + calificación) */
function generarImagenLista() {
  var W = 720;
  var filaAltura   = 84;
  var headerAltura = 116;
  var footerAltura = 74;
  var thumbW = 48, thumbH = 72;
  var padX = 28;

  var deseos = _deseos.map(_enriquecerDeseo);
  var H = headerAltura + (deseos.length * filaAltura) + footerAltura + 16;

  var fontsListos = (document.fonts && document.fonts.ready) || Promise.resolve();
  var cargaPosters = Promise.all(deseos.map(function(item) {
    return item.poster ? _cargarPoster(item.poster, "w185").catch(function() { return null; }) : Promise.resolve(null);
  }));

  return Promise.all([cargaPosters, fontsListos]).then(function(res) {
    var posters = res[0];
    var canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext("2d");

    var gFondo = ctx.createLinearGradient(0,0,0,H);
    gFondo.addColorStop(0, "#3a3833");
    gFondo.addColorStop(1, "#1e1c19");
    ctx.fillStyle = gFondo;
    ctx.fillRect(0,0,W,H);

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 30px Poppins, sans-serif";
    ctx.fillText("🎬 Mi lista de deseos", padX, 54);
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "400 18px Poppins, sans-serif";
    ctx.fillText("Videoteca Fátima  ·  " + deseos.length + " título" + (deseos.length === 1 ? "" : "s"), padX, 82);

    var textX = padX + thumbW + 16;
    var anchoDisponible = W - textX - padX;

    var y = headerAltura;
    deseos.forEach(function(item, i) {
      if (i % 2 === 1) {
        ctx.fillStyle = "rgba(255,255,255,0.045)";
        ctx.fillRect(0, y, W, filaAltura);
      }

      var esPeli = item.tipo === "Película" || item.tipo === "Pelicula";
      var thumbY = y + (filaAltura - thumbH) / 2;
      var img = posters[i];

      if (img) {
        /* Fondo del color de género, por si el póster no llena toda la miniatura */
        ctx.fillStyle = BANDA_COLORES[claseBanda(item.genero || "")] || "#9aab9e";
        _redondeado(ctx, padX, thumbY, thumbW, thumbH, 7);
        ctx.fill();

        /* "Contain": se ve la portada completa, sin recortar */
        var escala = Math.min(thumbW/img.width, thumbH/img.height);
        var pw = img.width*escala, ph = img.height*escala;
        var px = padX + (thumbW-pw)/2, py = thumbY + (thumbH-ph)/2;
        ctx.save();
        _redondeado(ctx, padX, thumbY, thumbW, thumbH, 7);
        ctx.clip();
        ctx.drawImage(img, px, py, pw, ph);
        ctx.restore();
      } else {
        ctx.fillStyle = BANDA_COLORES[claseBanda(item.genero || "")] || "#9aab9e";
        _redondeado(ctx, padX, thumbY, thumbW, thumbH, 7);
        ctx.fill();
        ctx.textAlign = "center";
        ctx.font = "22px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.fillText(esPeli ? "🎬" : "📺", padX + thumbW/2, thumbY + thumbH/2 + 8);
        ctx.textAlign = "left";
      }

      ctx.fillStyle = "#ffffff";
      ctx.font = "600 21px Poppins, sans-serif";
      var lineaTitulo = _truncarLinea(ctx, (esPeli ? "🎬 " : "📺 ") + item.titulo, anchoDisponible);
      ctx.fillText(lineaTitulo, textX, y + filaAltura/2 - 6);

      var sub = [
        item.anio   ? item.anio : "",
        item.genero ? item.genero.split(",")[0].trim() : "",
        item.calif  ? "⭐ " + item.calif : ""
      ].filter(Boolean).join("   ·   ");
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "400 17px Poppins, sans-serif";
      ctx.fillText(_truncarLinea(ctx, sub, anchoDisponible), textX, y + filaAltura/2 + 20);

      y += filaAltura;
    });

    ctx.fillStyle = "#556b5d";
    ctx.fillRect(0, H - footerAltura, W, footerAltura);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 22px Poppins, sans-serif";
    ctx.fillText("🎬 Videoteca Fátima", W/2, H - footerAltura/2 - 6);
    ctx.font = "400 16px Poppins, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("fatimallovet.github.io/videotecafatima", W/2, H - footerAltura/2 + 18);

    return new Promise(function(resolve, reject) {
      try {
        canvas.toBlob(function(blob) {
          if (blob) resolve(blob); else reject(new Error("toBlob-vacio"));
        }, "image/png");
      } catch (err) { reject(err); }
    });
  });
}

function _compartirImagenLista() {
  if (_deseos.length === 0) return;
  var textoAlt = "🎬 Mi lista de deseos — Videoteca Fátima\n" + URL_SITIO;
  _compartirImagenDesdePromesa(generarImagenLista(), "mi-lista-videoteca.png", textoAlt);
}

/* ══════════════════════════════════════
   LISTA DE DESEOS
   ══════════════════════════════════════ */
var _deseos = [];
try { _deseos = JSON.parse(localStorage.getItem("videoteca_deseos") || "[]"); } catch(e) {}

function guardarDeseos() {
  try { localStorage.setItem("videoteca_deseos", JSON.stringify(_deseos)); } catch(e) {}
  actualizarContadorDeseos();
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
  var anioRaw = d["Año"] || d["Anio"] || "";
  var anio   = (String(anioRaw).match(/\d{4}/) || [""])[0];
  var poster = campo(d, ["Poster","poster","Póster","póster"]).trim();

  toggleDeseoItem({ titulo: titulo, tipo: tipo, genero: genero, calif: calif, anio: anio, poster: poster });
  actualizarBtnDeseoModal();

  /* Sincronizar botón en card visible */
  sincronizarCardDeseo(titulo);
}

function actualizarBtnDeseoModal() {
  var btn = document.getElementById("modal-deseos-btn");
  if (!btn) return;
  var enD = estaEnDeseos(_tituloActual);
  btn.innerHTML = '<svg class="ico"><use href="#i-heart"/></svg>' + (enD ? "En mi lista" : "Guardar");
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

/* Contador de la lista de deseos: barra lateral y cabecera móvil (se ocultan si es 0) */
function actualizarContadorDeseos() {
  var n = _deseos.length;
  document.querySelectorAll(".js-deseos-n").forEach(function(el) {
    el.textContent = n > 0 ? n : "";
  });
  actualizarBotonesHero();
}

/* Panel */
/* Si un registro de la lista de deseos se guardó antes de tener año/poster,
   completa esos datos buscando el título en el catálogo ya cargado. */
function _buscarDatoOriginal(titulo) {
  var todos = dataPeliculas.concat(dataSeries);
  for (var i = 0; i < todos.length; i++) {
    if ((todos[i]["Título"] || todos[i]["Titulo"] || "") === titulo) return todos[i];
  }
  return null;
}

function _enriquecerDeseo(item) {
  if (item.anio && item.poster !== undefined) return item;
  var orig = _buscarDatoOriginal(item.titulo);
  if (!orig) return item;
  var anioOriginal = (String(campo(orig, ["Año","Anio"])).match(/\d{4}/) || [""])[0];
  return {
    titulo: item.titulo,
    tipo:   item.tipo   || (dataPeliculas.indexOf(orig) !== -1 ? "Película" : "Serie"),
    genero: item.genero || campo(orig, ["Género","Genero"]),
    calif:  item.calif  || campo(orig, ["Calificación","Calificacion"]),
    anio:   item.anio   || anioOriginal,
    poster: (item.poster !== undefined ? item.poster : campo(orig, ["Poster","poster","Póster","póster"]).trim())
  };
}

function compartirItem(titulo) {
  /* Buscar el item completo en los datos para armar su enlace */
  var encontrado = null;
  dataPeliculas.concat(dataSeries).forEach(function(item) {
    if ((item["Título"] || item["Titulo"] || "") === titulo) encontrado = item;
  });
  if (!encontrado) { mostrarToast("No encontré los datos de este título 😕"); return; }
  var esPeli = dataPeliculas.indexOf(encontrado) !== -1;
  compartirEnlace(Object.assign({}, encontrado, { Tipo: esPeli ? "Pelicula" : "Serie" }));
}

function compartirListaCompleta(e) {
  if (_deseos.length === 0) return;
  var anchor = (e && e.currentTarget) || document.querySelector(".deseos-compartir-lista-btn");

  mostrarMenuCompartir(anchor, {
    texto: function() {
      var lineas = _deseos.map(_enriquecerDeseo).map(function(d, i) {
        var extra = [];
        if (d.tipo)   extra.push(d.tipo);
        if (d.anio)   extra.push(d.anio);
        if (d.genero) extra.push(d.genero.split(",")[0].trim());
        return (i+1) + ". " + d.titulo + (extra.length ? " (" + extra.join(" · ") + ")" : "");
      });
      var texto = "🎬 Mi lista de deseos — Videoteca Fátima\n\n" +
                  lineas.join("\n") +
                  "\n\n" + URL_SITIO;
      _compartirTextoDirecto(texto);
    },
    imagen: function() { _compartirImagenLista(); }
  });
}

function _copiarAlPortapapeles(texto, aviso) {
  aviso = aviso || "¡Copiado al portapapeles! 📋";
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(texto)
      .then(function()  { mostrarToast(aviso); })
      .catch(function() { _copiarFallback(texto, aviso); });
  } else {
    _copiarFallback(texto, aviso);
  }
}

function _copiarFallback(texto, aviso) {
  var ta = document.createElement("textarea");
  ta.value = texto; ta.style.cssText = "position:fixed;opacity:0";
  document.body.appendChild(ta); ta.focus(); ta.select();
  try { document.execCommand("copy"); mostrarToast(aviso); }
  catch(e) { mostrarToast("No se pudo copiar 😕"); }
  document.body.removeChild(ta);
}

var ICONO_PELICULA_VACIA = '<svg class="ico"><use href="#i-film"/></svg>';

function renderPanelDeseos() {
  var lista = document.getElementById("deseos-lista");
  var cnt   = document.getElementById("deseos-count");
  if (!lista) return;
  if (cnt) cnt.textContent = _deseos.length ? _deseos.length + " por ver" : "";
  lista.innerHTML = "";

  if (_deseos.length === 0) {
    lista.innerHTML = '<p class="deseos-vacia">Tu lista está vacía.<br>Toca ♡ en cualquier tarjeta.</p>';
    return;
  }

  _deseos.forEach(function(item) {
    var datos = _enriquecerDeseo(item);
    var row = document.createElement("div");
    row.className = "deseo-item";

    var miniatura = document.createElement("div");
    miniatura.className = "deseo-poster";
    if (datos.poster) {
      var img = document.createElement("img");
      img.alt = "";
      img.loading = "lazy";
      var urlMini = urlPosterTMDB(datos.poster, "w185");
      img.src = urlMini;
      img.addEventListener("error", function() {
        if (urlMini !== datos.poster && !img.dataset.original) { img.dataset.original = "1"; img.src = datos.poster; }
        else { img.remove(); miniatura.classList.add("deseo-poster--vacio"); miniatura.innerHTML = ICONO_PELICULA_VACIA; }
      });
      miniatura.appendChild(img);
    } else {
      miniatura.classList.add("deseo-poster--vacio");
      miniatura.innerHTML = ICONO_PELICULA_VACIA;
    }

    var info = document.createElement("div");
    info.className = "deseo-info";
    var tit = document.createElement("span");
    tit.className = "deseo-titulo";
    tit.textContent = item.titulo;
    var meta = document.createElement("span");
    meta.className = "deseo-meta";
    meta.textContent = [datos.tipo, datos.anio, datos.genero ? datos.genero.split(",")[0].trim() : ""]
      .filter(Boolean).join(" · ");
    info.appendChild(tit);
    info.appendChild(meta);

    var acciones = document.createElement("div");
    acciones.className = "deseo-acciones";
    acciones.innerHTML =
      '<button type="button" class="deseo-compartir-item" aria-label="Compartir"><svg class="ico"><use href="#i-share"/></svg></button>' +
      '<button type="button" class="deseo-quitar" aria-label="Quitar de mi lista"><svg class="ico"><use href="#i-x"/></svg></button>';

    row.appendChild(miniatura);
    row.appendChild(info);
    row.appendChild(acciones);

    row.querySelector(".deseo-quitar").addEventListener("click", function() {
      _deseos = _deseos.filter(function(d) { return d.titulo !== item.titulo; });
      guardarDeseos();
      renderPanelDeseos();
      sincronizarCardDeseo(item.titulo);
      if (_tituloActual === item.titulo) actualizarBtnDeseoModal();
    });

    row.querySelector(".deseo-compartir-item").addEventListener("click", function(e) {
      compartirItem(item.titulo, e);
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
document.addEventListener("DOMContentLoaded", function() { actualizarContadorDeseos(); });

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
  accion_aventura: { nombre: "Acción y Aventura" },
  dramas:          { nombre: "Dramas" },
  crimen_suspenso: { nombre: "Crimen y Suspenso" },
  comedia:         { nombre: "Comedia" },
  biografias:      { nombre: "Biografías" },
  scifi_fantasia:  { nombre: "Ciencia Ficción y Fantasía" },
  romance:         { nombre: "Romance" },
  epoca:           { nombre: "Cine de Época" },
  kdrama:          { nombre: "K-dramas" },
  familiares:      { nombre: "Familiares" },
  musicales:       { nombre: "Musicales" },
  deportivo:       { nombre: "Cine Deportivo" },
  lujo:            { nombre: "Amor y Lujo" },
  navidad:         { nombre: "Navideñas" },
  diferente:       { nombre: "Algo diferente" }
};

function clasificarMoodsBase(item) {
  /* Todo se compara en minúsculas y SIN acentos: la hoja se escribe a mano y trae variantes
     («Histórica», «Biográfico», «Ciencia Ficción», «cine de época»…); así una sola regla las cubre. */
  function plano(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  var genero = plano(campo(item, ["Género","Genero"]));
  var tono   = plano(campo(item, ["Tono"]));
  var origen = plano(campo(item, ["Origen"]));

  function m(txt, pp) { return pp.some(function(p){ return txt.indexOf(plano(p)) !== -1; }); }

  /* ── 🎄 NAVIDEÑAS: exclusivo, no entra a ninguna otra categoría ── */
  if (m(genero, ["navideña","navideño"])) {
    return ["navidad"];
  }

  var moods = [];

  /* ── Acción y Aventura ── */
  if (m(genero, ["acción","aventura","bélico","guerra","western"])) {
    moods.push("accion_aventura");
  }

  /* ── Comedia (incluye comedia negra) ── */
  if (m(genero, ["comedia"])) {
    moods.push("comedia");
  }

  /* ── Romance ── */
  if (m(genero, ["romance"])) {
    moods.push("romance");
  }

  /* ── Crimen y Suspenso ── */
  if (m(genero, ["crimen","thriller","suspenso","misterio","intriga","espionaje"])) {
    moods.push("crimen_suspenso");
  }

  /* ── Ciencia Ficción y Fantasía ── */
  if (m(genero, ["ciencia ficción","sci-fi","fantasía"])) {
    moods.push("scifi_fantasia");
  }

  /* ── Cine de Época (por ambientación, no por tono) ── */
  if (m(genero, ["histor","época"])) {   // histórico / histórica / historia / drama de época / cine de época
    moods.push("epoca");
  }

  /* ── Familiares (la animación también: Toy Story, Robot Salvaje…) ── */
  if (m(genero, ["familiar","familia","animación"])) {
    moods.push("familiares");
  }

  /* ── Musicales ── */
  if (m(genero, ["musical","música"])) {
    moods.push("musicales");
  }

  /* ── Biografías ── */
  if (m(genero, ["biograf"])) {   // biografía / biográfica / biográfico
    moods.push("biografias");
  }

  /* ── Cine Deportivo ── */
  if (m(genero, ["deporte","deportivo","fútbol"])) {
    moods.push("deportivo");
  }

  /* ── K-dramas (por Origen, no por género) ── */
  if (m(origen, ["corea"])) {
    moods.push("kdrama");
  }

  /* ── Dramas, depurado: solo si "drama" es realmente el género dominante.
     Si además trae un género que le da otra identidad más fuerte
     (comedia/acción/aventura/fantasía/sci-fi), ya no cuenta como "Drama" puro */
  var contradiceDrama = ["comedia","acción","aventura","fantasía","ciencia ficción","sci-fi"];
  if (m(genero, ["drama"]) && !m(genero, contradiceDrama)) {
    moods.push("dramas");
  }

  /* ── Amor y Lujo: sub-selección especial dentro de Romance ── */
  if (m(genero, ["romance"]) &&
      m(tono, ["elegante","romántico","cálido","sofisticado","nostálgico"])) {
    moods.push("lujo");
  }

  /* ── Algo diferente: tono surrealista/teatral/absurdo
     (y, en clasificarMoods, la red de seguridad para lo que no calzó en ninguna otra) ── */
  if (m(tono, ["surrealista","teatral","absurdo"])) {
    moods.push("diferente");
  }

  return moods;
}

function clasificarMoods(item, tipo) {
  var moods = clasificarMoodsBase(item);
  /* Red de seguridad: si no matcheó ninguna categoría real, cae en
     "Algo diferente" para que ningún título se quede sin categoría */
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

/* Cambia a un mood y actualiza la URL (#moods/kdrama, etc.) */
function verMood(moodKey) {
  var nuevoHash = '#moods/' + moodKey;
  if (location.hash === nuevoHash) { mostrarMoodResultado(moodKey); return; }
  location.hash = nuevoHash;
}

function mostrarMoodResultado(moodKey) {
  var def   = MOODS_DEF[moodKey];
  if (!def) return;
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
  document.getElementById("mood-resultado-titulo").textContent = def.nombre;
  document.querySelector(".moods-intro").style.display = "none";

  var grid = document.getElementById("mood-cards");
  grid.innerHTML = "";
  filtrados.forEach(function(item) {
    var tipo = dataPeliculas.indexOf(item) !== -1 ? "Pelicula" : "Serie";
    grid.appendChild(crearCard(item, tipo));
  });
}

/* Vuelve a la grilla de colecciones y actualiza la URL (#moods) */
function volverMoods() {
  var nuevoHash = '#moods';
  if (location.hash === nuevoHash) { mostrarMoodGrid(); return; }
  location.hash = nuevoHash;
}

function mostrarMoodGrid() {
  document.getElementById("moods-grid").style.display     = "grid";
  document.getElementById("mood-resultado").style.display = "none";
  document.querySelector(".moods-intro").style.display    = "block";
}

/* Actualizar contadores cuando los datos estén listos */
var _moodsPendientes = 2; // espera pelis + series
function checkMoodsReady() {
  var nP = document.getElementById("n-peliculas"), nS = document.getElementById("n-series");
  if (nP && dataPeliculas.length) nP.textContent = dataPeliculas.length;
  if (nS && dataSeries.length)    nS.textContent = dataSeries.length;
  _moodsPendientes--;
  if (_moodsPendientes === 0) {
    actualizarContadoresMoods();
    revisarCoberturaMoods();
    /* Si la página se cargó con una URL tipo #moods/kdrama, la aplicamos
       ahora que ya hay datos suficientes para filtrar el mood. */
    if (_moodPendienteInicial) {
      mostrarMoodResultado(_moodPendienteInicial);
      _moodPendienteInicial = null;
    }
    checkFichaPendiente();
  }
}

/* ══════════════════════════════════════
   RUTAS (hash) — permite usar el botón "atrás" del navegador
   para moverse entre Películas / Series / Colecciones / Info,
   y entre la grilla de colecciones y un mood abierto.
   ══════════════════════════════════════ */
var TABS_VALIDOS = ["peliculas", "series", "moods", "como-funciona"];
var _moodPendienteInicial = null;
var _fichaPendienteInicial = null; // { tab, slug } si el enlace llegó antes que los datos

/* Abre la ficha de un enlace tipo #peliculas/toy-story-5. Necesita los CSV y streaming.json
   (para mostrar las plataformas); si aún no llegan, queda pendiente. */
function abrirFichaDesdeHash(tab, slug) {
  if (_moodsPendientes > 0 || !_streamingCargado) {
    _fichaPendienteInicial = { tab: tab, slug: slug, hash: location.hash };
    return;
  }
  var tipo = tab === "peliculas" ? "Pelicula" : "Serie";
  var item = _slugs()[tipo].porSlug[slug];
  if (!item) {
    ocultarModal();
    history.replaceState(null, "", "#" + tab);
    mostrarToast("No encontré esa ficha 😕");
    return;
  }
  mostrarModal(Object.assign({}, item, { Tipo: tipo }));
}

function checkFichaPendiente() {
  if (!_fichaPendienteInicial || _moodsPendientes > 0 || !_streamingCargado) return;
  var p = _fichaPendienteInicial;
  _fichaPendienteInicial = null;
  /* Si mientras tanto el usuario cambió de página, ya no hay nada que abrir */
  if (location.hash === p.hash) abrirFichaDesdeHash(p.tab, p.slug);
}

function aplicarHash() {
  var hash   = location.hash.replace(/^#/, "");
  var partes = hash.split("/");
  var tab    = partes[0] || "peliculas";
  if (TABS_VALIDOS.indexOf(tab) === -1) tab = "peliculas";

  mostrarTab(tab);
  cerrarMenu();
  marcarColeccionActiva(tab === "moods" && MOODS_DEF[partes[1]] ? partes[1] : null);

  /* #peliculas/slug · #series/slug → ficha abierta; cualquier otra ruta la cierra */
  if ((tab === "peliculas" || tab === "series") && partes[1]) {
    var slug = partes.slice(1).join("/");
    try { slug = decodeURIComponent(slug); } catch (e) {}
    abrirFichaDesdeHash(tab, slug.toLowerCase());
    return;
  }
  _fichaPendienteInicial = null;
  ocultarModal();

  if (tab === "moods") {
    var moodKey = partes[1];
    if (moodKey && MOODS_DEF[moodKey]) {
      if (_moodsPendientes === 0) {
        mostrarMoodResultado(moodKey);
      } else {
        /* Los datos (CSV) todavía no cargan; se aplica en checkMoodsReady() */
        _moodPendienteInicial = moodKey;
      }
    } else {
      mostrarMoodGrid();
    }
  }
}

/* ══════════════════════════════════════
   BARRA LATERAL: lista de colecciones y cajón (menú compacto)
   ══════════════════════════════════════ */
function construirListaColecciones() {
  var cont = document.getElementById("cl-lista");
  if (!cont) return;
  var claves = Object.keys(MOODS_DEF).sort(function(a, b) {
    return MOODS_DEF[a].nombre.localeCompare(MOODS_DEF[b].nombre, "es");
  });
  /* El punto reutiliza el degradado de la colección (.mood-card--clave) */
  cont.innerHTML = claves.map(function(k) {
    return '<a class="cl-item" href="#moods/' + k + '" data-mood="' + k + '">' +
             '<i class="cl-dot mood-card--' + k + '"></i><span>' + MOODS_DEF[k].nombre + '</span></a>';
  }).join("");
}

function marcarColeccionActiva(moodKey) {
  document.querySelectorAll(".cl-item").forEach(function(el) {
    el.classList.toggle("activo", el.dataset.mood === moodKey);
  });
}

function cerrarMenu() {
  document.body.classList.remove("menu-abierto");
  var t = document.getElementById("menu-toggle");
  if (t) { t.setAttribute("aria-expanded", "false"); t.setAttribute("aria-label", "Abrir menú"); }
}
function alternarMenu() {
  var abierto = document.body.classList.toggle("menu-abierto");
  var t = document.getElementById("menu-toggle");
  if (t) { t.setAttribute("aria-expanded", abierto ? "true" : "false"); t.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú"); }
}
construirListaColecciones();
(function() {
  var t = document.getElementById("menu-toggle"), sc = document.getElementById("sb-scrim"), sb = document.getElementById("sidebar");
  if (t)  t.addEventListener("click", alternarMenu);
  if (sc) sc.addEventListener("click", cerrarMenu);
  /* Elegir cualquier opción cierra el cajón (en escritorio no hace nada) */
  if (sb) sb.addEventListener("click", function(e) { if (e.target.closest("a, button")) cerrarMenu(); });
})();

window.addEventListener("hashchange", aplicarHash);
aplicarHash(); // aplica el estado inicial según la URL con la que llegó el usuario
