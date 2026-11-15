// generar-paginas.js
// Crea una página mínima por cada película y serie (p/peliculas/<slug>/ y p/series/<slug>/)
// con las etiquetas Open Graph (título, descripción y PÓSTER) para que, al pegar el enlace
// en WhatsApp, Telegram, etc., aparezca la tarjeta con la imagen. El sitio es una SPA y esas
// apps NO ejecutan JavaScript, así que no pueden leer los datos de #peliculas/<slug>:
// necesitan una página real. Cada página redirige a la ficha en cuanto se abre en un navegador.
// Pensado para correr vía GitHub Actions (ver .github/workflows/generar-paginas.yml).
//
// IMPORTANTE: los slugs deben salir IGUAL que en script.js (slugTitulo + _construirIndiceSlugs).

const Papa = require("papaparse");
const fs = require("fs");
const path = require("path");

const URL_SITIO  = "https://fatimallovet.github.io/videotecafatima/";
const URL_PELIS  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfZKKu9u0USHXUnyUHQXSxf4uRXK--I5t_5JEE4pjUhe23SWVEZfg1u1R33zazOyh2GIDb9koa8hga/pub?gid=0&single=true&output=csv";
const URL_SERIES = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfZKKu9u0USHXUnyUHQXSxf4uRXK--I5t_5JEE4pjUhe23SWVEZfg1u1R33zazOyh2GIDb9koa8hga/pub?gid=2141924116&single=true&output=csv";
const IMAGEN_SITIO = URL_SITIO + "og-imagen.jpg";
const SALIDA = path.join(__dirname, "p");

async function obtenerCsv(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("No se pudo leer la hoja: " + res.status);
  return Papa.parse(await res.text(), { header: true, skipEmptyLines: true }).data;
}

// Primer valor que exista entre varios nombres de columna (ignora mayúsculas), como campo() de script.js
function campo(d, nombres) {
  const keys = Object.keys(d);
  for (const n of nombres) {
    const k = keys.find((x) => x.toLowerCase() === n.toLowerCase());
    if (k) return d[k] || "";
  }
  return "";
}

// "¡Qué bello es vivir!" → "que-bello-es-vivir"
function slugTitulo(t) {
  return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function oraciones(t) {
  return t.match(/[\s\S]+?[.!?…]+["”»)]*(?=\s|$)|[\s\S]+$/g) || [t];
}
// Extracto de la reseña: hasta `max` caracteres, cortando en la última oración completa
function extracto(resena, max) {
  const t = resena.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  let acum = "";
  for (const o of oraciones(t)) {
    if ((acum + o).trim().length > max) break;
    acum += o;
  }
  if (acum.trim()) return acum.trim();
  return t.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

// Póster en w500 (ligero, ~45 KB; WhatsApp descarta imágenes muy pesadas). Solo se reescriben
// los tamaños estándar de TMDB; los recortes especiales se dejan tal cual (igual que urlPosterTMDB).
function posterOG(url) {
  const m = String(url || "").trim().match(/^https?:\/\/(?:[\w.-]*themoviedb\.org|image\.tmdb\.org)\/t\/p\/(?:original|w\d+)\/([^\/?#]+\.(?:jpe?g|png|webp))(?:[?#].*)?$/i);
  return m ? "https://image.tmdb.org/t/p/w500/" + m[1] : String(url || "").trim();
}

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function pagina({ carpeta, slug, titulo, anio, calif, generos, resena, poster }) {
  const nombre = titulo + (anio ? " (" + anio + ")" : "");
  const datos = [calif ? "⭐ " + calif + "/10" : "", generos].filter(Boolean).join(" · ");
  const ext = resena ? "«" + extracto(resena, 150) + "»" : "";
  const descripcion = [datos, ext].filter(Boolean).join(" — ");
  const url = URL_SITIO + "p/" + carpeta + "/" + slug + "/";
  const destino = "../../../#" + carpeta + "/" + slug;   // relativo: funciona en producción y en local
  const imagen = poster ? posterOG(poster) : IMAGEN_SITIO;
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(nombre)} — Videoteca Fátima</title>
<meta name="description" content="${esc(descripcion)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Videoteca Fátima">
<meta property="og:locale" content="es_MX">
<meta property="og:title" content="${esc(nombre)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(imagen)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(nombre)}">
<meta name="twitter:description" content="${esc(descripcion)}">
<meta name="twitter:image" content="${esc(imagen)}">
<link rel="icon" type="image/svg+xml" href="../../../favicon.svg">
<script>location.replace(${JSON.stringify(destino)});</script>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4f1ea;color:#2a2623;font-family:system-ui,sans-serif}a{color:#9b3f5c}</style>
</head>
<body>
<p><a href="${esc(destino)}">Ver «${esc(titulo)}» en Videoteca Fátima</a></p>
</body>
</html>
`;
}

async function main() {
  const conjuntos = [
    { carpeta: "peliculas", data: await obtenerCsv(URL_PELIS) },
    { carpeta: "series",    data: await obtenerCsv(URL_SERIES) },
  ];
  // Si algo falla antes de llegar aquí no se toca nada; solo se borra lo viejo cuando ya hay datos nuevos
  fs.rmSync(SALIDA, { recursive: true, force: true });

  let total = 0;
  for (const { carpeta, data } of conjuntos) {
    const usados = new Set();
    for (const item of data) {
      const titulo = campo(item, ["Título", "Titulo"]).trim();
      const base = slugTitulo(titulo);
      if (!base) continue;
      const anio = (campo(item, ["Año", "Anio"]).match(/\d{4}/) || [""])[0];
      // Misma regla que _construirIndiceSlugs: repetido → con año; si aún choca → número
      let slug = base;
      if (usados.has(slug) && anio) slug = base + "-" + anio;
      for (let n = 2; usados.has(slug); n++) slug = base + "-" + n;
      usados.add(slug);

      const dir = path.join(SALIDA, carpeta, slug);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "index.html"), pagina({
        carpeta, slug, titulo, anio,
        calif:   campo(item, ["Calificación", "Calificacion"]).trim(),
        generos: campo(item, ["Género", "Genero"]).split(",").map((g) => g.trim()).filter(Boolean).slice(0, 3).join(", "),
        resena:  campo(item, ["Reseña", "Resena"]),
        poster:  campo(item, ["Poster", "poster", "Póster", "póster"]),
      }));
      total++;
    }
  }
  console.log("Páginas generadas:", total);
}

main().catch((e) => { console.error(e); process.exit(1); });
