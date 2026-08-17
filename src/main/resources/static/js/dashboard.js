import { apiGet } from "./api.js";
import { ESTADOS, iconoPlaceholder, escaparHtml, iniciarTema } from "./utils.js";

iniciarTema();

const grid = document.getElementById("grid-plantas");
const resumen = document.getElementById("resumen-coleccion");

function textoUltimoRiego(planta) {
  if (planta.fechaUltimoRiego == null) return "Sin registrar";
  const dias = planta.diasDesdeUltimoRiego;
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Ayer";
  return `Hace ${dias} días`;
}

function tarjetaPlanta(planta) {
  const foto = planta.fotoPrincipalUrl
    ? `<img src="${escaparHtml(planta.fotoPrincipalUrl)}" alt="${escaparHtml(planta.nombre)}" loading="lazy">`
    : iconoPlaceholder();

  const estadoMeta = ESTADOS[planta.estado] ?? ESTADOS.SALUDABLE;

  return `
    <a class="card-planta" href="/plantas/${encodeURIComponent(planta.slug)}">
      <div class="card-planta-foto">
        ${foto}
        <span class="estado-pill estado-${planta.estado}"><span class="dot"></span>${estadoMeta.label}</span>
      </div>
      <div class="card-planta-body">
        <div>
          <h3>${escaparHtml(planta.nombre)}</h3>
          <div class="especie">${escaparHtml(planta.especie || "Especie sin especificar")}</div>
        </div>
        <div class="card-planta-meta">
          <div class="fila"><span>Último riego</span><strong>${textoUltimoRiego(planta)}</strong></div>
          <div class="fila"><span>Próximo cuidado</span><strong>${escaparHtml(planta.proximoCuidadoTexto || "—")}</strong></div>
        </div>
      </div>
    </a>
  `;
}

function estadoVacio() {
  return `
    <div class="estado-vacio" style="grid-column: 1 / -1;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20C4 11 10 4 20 4c0 10-7 16-16 16Z"/><path d="M4 20c3-6 7-9 12-11"/></svg>
      <p>Todavía no has añadido ninguna planta.</p>
      <p style="margin-top:14px;"><a class="btn btn-primary" href="/plantas/nueva">Añadir la primera</a></p>
    </div>
  `;
}

async function cargar() {
  try {
    const plantas = await apiGet("/plantas");

    if (plantas.length === 0) {
      grid.innerHTML = estadoVacio();
      resumen.textContent = "Empieza tu pasaporte digital añadiendo tu primera planta.";
      return;
    }

    grid.innerHTML = plantas.map(tarjetaPlanta).join("");

    const necesitanAtencion = plantas.filter((p) => p.estado !== "SALUDABLE").length;
    if (necesitanAtencion === 0) {
      resumen.innerHTML = `<strong>${plantas.length}</strong> plantas en tu colección — todas en buen estado.`;
    } else {
      resumen.innerHTML = `<strong>${plantas.length}</strong> plantas en tu colección — <strong>${necesitanAtencion}</strong> necesitan un vistazo.`;
    }
  } catch (err) {
    grid.innerHTML = `<div class="estado-vacio" style="grid-column:1/-1;"><p>No se han podido cargar las plantas. ${escaparHtml(err.message)}</p></div>`;
  }
}

cargar();
