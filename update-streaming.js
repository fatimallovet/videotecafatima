// update-streaming.js
// Recorre las películas y series de Videoteca Fátima, busca cada título en TMDB
// usando su IMDB ID, y guarda en streaming.json las plataformas donde se puede
// ver en streaming (region MX). Pensado para correr vía GitHub Actions.

const Papa = require("papaparse");
const fs = require("fs");

const URL_PELIS  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfZKKu9u0USHXUnyUHQXSxf4uRXK--I5t_5JEE4pjUhe23SWVEZfg1u1R33zazOyh2GIDb9koa8hga/pub?gid=0&single=true&output=csv";
const URL_SERIES = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfZKKu9u0USHXUnyUHQXSxf4uRXK--I5t_5JEE4pjUhe23SWVEZfg1u1R33zazOyh2GIDb9koa8hga/pub?gid=2141924116&single=true&output=csv";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const REGION = "MX";

if (!TMDB_API_KEY) {
  console.error("Falta la variable de entorno TMDB_API_KEY");
  process.exit(1);
}

// Extrae el ID tipo tt1234567 de un link de IMDB
function extraerImdbId(url) {
  if (!url) return null;
  const m = url.match(/tt\d+/);
  return m ? m[0] : null;
}

async function obtenerCsv(url) {
  const res = await fetch(url);
  const texto = await res.text();
  const parsed = Papa.parse(texto, { header: true, skipEmptyLines: true });
  return parsed.data;
}

// Espera ms milisegundos (para no saturar la API de TMDB)
function esperar(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Dado un IMDB ID, encuentra el título en TMDB y regresa { tipo, id }
async function buscarEnTmdb(imdbId) {
  const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();

  if (data.movie_results && data.movie_results.length > 0) {
    return { tipo: "movie", id: data.movie_results[0].id };
  }
  if (data.tv_results && data.tv_results.length > 0) {
    return { tipo: "tv", id: data.tv_results[0].id };
  }
  return null;
}

// Dado el tipo e ID de TMDB, regresa la lista de plataformas de streaming en REGION
async function obtenerProveedores(tipo, id) {
  const url = `https://api.themoviedb.org/3/${tipo}/${id}/watch/providers?api_key=${TMDB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();

  const datosRegion = data.results && data.results[REGION];
  if (!datosRegion) return { flatrate: [], link: null };

  const flatrate = (datosRegion.flatrate || []).map((p) => p.provider_name);
  return { flatrate, link: datosRegion.link || null };
}

async function procesarCsv(rows, resultado) {
  for (const row of rows) {
    const imdbId = extraerImdbId(row["IMDB"]);
    const titulo = row["Título"] || "(sin título)";

    if (!imdbId) {
      console.log(`  ⚠️  Sin IMDB ID: ${titulo}`);
      continue;
    }
    if (resultado[imdbId]) continue; // ya procesado (evita duplicados entre CSVs)

    const encontrado = await buscarEnTmdb(imdbId);
    if (!encontrado) {
      console.log(`  ✖ No encontrado en TMDB: ${titulo} (${imdbId})`);
      await esperar(250);
      continue;
    }

    const proveedores = await obtenerProveedores(encontrado.tipo, encontrado.id);
    resultado[imdbId] = {
      titulo,
      plataformas: proveedores ? proveedores.flatrate : [],
      link: proveedores ? proveedores.link : null,
      actualizado: new Date().toISOString().slice(0, 10),
    };

    console.log(`  ✔ ${titulo}: ${resultado[imdbId].plataformas.join(", ") || "(sin streaming disponible)"}`);
    await esperar(250); // pequeña pausa para no saturar la API
  }
}

async function main() {
  const resultado = {};

  console.log("Descargando y procesando películas...");
  const pelis = await obtenerCsv(URL_PELIS);
  await procesarCsv(pelis, resultado);

  console.log("Descargando y procesando series...");
  const series = await obtenerCsv(URL_SERIES);
  await procesarCsv(series, resultado);

  fs.writeFileSync("streaming.json", JSON.stringify(resultado, null, 2), "utf-8");
  console.log(`\nListo. ${Object.keys(resultado).length} títulos guardados en streaming.json`);
}

main().catch((err) => {
  console.error("Error general:", err);
  process.exit(1);
});
