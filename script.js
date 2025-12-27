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
    hacerTablaOrdenable("tablaPeliculas");
    activarBusqueda(res.data, "tablaPeliculas", "busquedaPeliculas");
  });

/* CARGAR SERIES */
fetch(URL_SERIES)
  .then(r => r.text())
  .then(txt => {
    const res = Papa.parse(txt, { header: true, skipEmptyLines: true });
    llenarTabla(res.data, "tablaSeries", "Serie");
    hacerTablaOrdenable("tablaSeries");
    activarBusqueda(res.data, "tablaSeries", "busquedaSeries");
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
      <td>${item["No."] || item["No"] || ""}</td>
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



/* ORDENAR TABLAS */
function hacerTablaOrdenable(tablaId) {
  const tabla = document.getElementById(tablaId);
  const headers = tabla.querySelectorAll("th");
  const tbody = tabla.querySelector("tbody");

  headers.forEach((th, colIndex) => {
    th.style.cursor = "pointer";

    let asc = true; // alterna asc/desc

    th.addEventListener("click", () => {
      const rows = Array.from(tbody.querySelectorAll("tr"));

      rows.sort((a, b) => {
        let A = a.children[colIndex].innerText.trim();
        let B = b.children[colIndex].innerText.trim();

        // Si es número, convertir
        if (!isNaN(A) && A !== "") A = Number(A);
        if (!isNaN(B) && B !== "") B = Number(B);

        if (A < B) return asc ? -1 : 1;
        if (A > B) return asc ? 1 : -1;
        return 0;
      });

      asc = !asc;

      rows.forEach(r => tbody.appendChild(r)); // reinsertar
    });
  });
}


/* BUSCAR EN TABLAS */
function activarBusqueda(data, tablaId, inputId) {
  const input = document.getElementById(inputId);
  input.addEventListener("input", () => {
    const texto = input.value.toLowerCase();

    const filtrados = data.filter(item => {
      const campos = [
        item["Título"],
        item["Género"],
        item["Tono"],
        item["Ritmo"],
        item["Etiquetas"],
        item["Reseña"]
      ];

      return campos.some(campo =>
        (campo || "").toString().toLowerCase().includes(texto)
      );
    });

    // vuelve a llenar la tabla con los resultados filtrados
    llenarTabla(filtrados, tablaId, tablaId === "tablaPeliculas" ? "Película" : "Serie");
    hacerTablaOrdenable(tablaId);
  });
}


document.querySelectorAll(".clear-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const input = btn.previousElementSibling;
    input.value = "";
    input.dispatchEvent(new Event("input"));
    input.focus();
  });
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    document.querySelectorAll(".buscador").forEach(input => {
      if (input.value !== "") {
        input.value = "";
        input.dispatchEvent(new Event("input"));
      }
    });
  }
});