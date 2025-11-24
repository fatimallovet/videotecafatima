/* script.js */
function openTab(tabId, event) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('visible'));
  document.getElementById(tabId).classList.add('visible');
}

/* URLs SEPARADAS */
const URL_PELIS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfZKKu9u0USHXUnyUHQXSxf4uRXK--I5t_5JEE4pjUhe23SWVEZfg1u1R33zazOyh2GIDb9koa8hga/pub?gid=0&single=true&output=csv";

const URL_SERIES = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfZKKu9u0USHXUnyUHQXSxf4uRXK--I5t_5JEE4pjUhe23SWVEZfg1u1R33zazOyh2GIDb9koa8hga/pub?gid=2141924116&single=true&output=csv";

/* CARGAR PELÍCULAS */
fetch(URL_PELIS)
  .then(r => r.text())
  .then(txt => {
    const res = Papa.parse(txt, { header: true, skipEmptyLines: true });
    llenarTabla(res.data, "tablaPeliculas", "Película");
  });

/* CARGAR SERIES */
fetch(URL_SERIES)
  .then(r => r.text())
  .then(txt => {
    const res = Papa.parse(txt, { header: true, skipEmptyLines: true });
    llenarTabla(res.data, "tablaSeries", "Serie");
  });

/* LLENAR TABLAS */
function llenarTabla(data, tablaId, tipo) {
  const tbody = document.querySelector(`#${tablaId} tbody`);
  tbody.innerHTML = "";

  data.forEach(item => {
    // ❗ SI LA FILA ESTÁ VACÍA → LA SALTAMOS
    const valores = Object.values(item).join("").trim();
    if (valores === "") return;

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${item["Título"] || ""}</td>
      <td>${item["Año"] || ""}</td>
      <td>${item["Calificación"] || ""}</td>
      <td>${item["Género"] || ""}</td>
    `;

    row.addEventListener("click", () => mostrarModal({ ...item, Tipo: tipo }));

    tbody.appendChild(row);
  });
}

function mostrarModal(d) {
  document.getElementById("modal-titulo").textContent = d["Título"] || "";
  document.getElementById("modal-calificacion").textContent = d["Calificación"] || "";
  document.getElementById("modal-origen").textContent = d["Origen"] || "";
  document.getElementById("modal-anio").textContent = d["Año"] || "";

  // Label dinámico
  document.getElementById("modal-label-minutos-o-caps").textContent =
    d["Tipo"] === "Película" ? "Minutos: " : "Capítulos: ";

  // Valor dinámico
  document.getElementById("modal-minutos-o-caps").textContent =
    d["Tipo"] === "Película"
      ? (d["Minutos"] || "")
      : (d["Capítulos"] || d["Capitulos"] || "");

  document.getElementById("modal-genero").textContent = d["Género"] || "";
  document.getElementById("modal-tono").textContent = d["Tono"] || "";
  document.getElementById("modal-ritmo").textContent = d["Ritmo"] || "";
  document.getElementById("modal-publico").textContent = d["Público"] || d["Publico"] || "";
  document.getElementById("modal-etiquetas").textContent = d["Etiquetas"] || "";
  document.getElementById("modal-flags").textContent = d["Flags"] || "";
  document.getElementById("modal-resena").textContent = d["Reseña"] || d["Resena"] || "";

  // IMDB
  const imdb = document.getElementById("modal-imdb");
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
