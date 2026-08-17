import { apiGet, apiPost, apiDelete, subirImagen } from "./api.js";
import {
  TIPOS_ACCION, ESTADOS, LUZ,
  formatFecha, formatFechaHora, formatFechaCorta,
  iconoPlaceholder, escaparHtml, mostrarToast, iniciarTema,
} from "./utils.js";

iniciarTema();

const slug = decodeURIComponent(location.pathname.split("/")[2] || "");

const contenido = document.getElementById("contenido-planta");
const secciones = document.getElementById("secciones-planta");

let plantaActual = null;
let archivoFotoSeleccionado = null;

function iconoAccion(tipo) {
  return TIPOS_ACCION[tipo]?.emoji ?? "🌿";
}

function renderHero(p) {
  const foto = p.fotoPrincipalUrl
    ? `<img src="${escaparHtml(p.fotoPrincipalUrl)}" alt="${escaparHtml(p.nombre)}">`
    : iconoPlaceholder();

  const estadoMeta = ESTADOS[p.estado] ?? ESTADOS.SALUDABLE;

  contenido.innerHTML = `
    <div class="planta-hero">
      <div class="planta-hero-foto">
        ${foto}
        <div class="planta-hero-overlay">
          <span class="estado-pill estado-${p.estado}"><span class="dot"></span>${estadoMeta.label}</span>
          <h1>${escaparHtml(p.nombre)}</h1>
          ${p.especie ? `<div class="especie">${escaparHtml(p.especie)}</div>` : ""}
        </div>
      </div>
      <div class="planta-hero-actions">
        <button class="icon-btn" id="btn-editar" aria-label="Editar planta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/></svg></button>
        <button class="icon-btn" id="btn-eliminar" aria-label="Eliminar planta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7h14M9 7V5h6v2m-9 0 1 13h8l1-13"/></svg></button>
      </div>
    </div>
    <div class="mensaje-callout">
      <div class="icono estado-${p.estado}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20C4 11 10 4 20 4c0 10-7 16-16 16Z"/><path d="M4 20c3-6 7-9 12-11"/></svg></div>
      <div>
        <p>${escaparHtml(p.mensajeEstado)}</p>
        <div class="sub">${p.proximoCuidadoTexto ? escaparHtml(p.proximoCuidadoTexto) : ""}</div>
      </div>
    </div>
  `;

  document.getElementById("btn-editar").addEventListener("click", () => {
    location.href = `/plantas/${encodeURIComponent(slug)}/editar`;
  });
  document.getElementById("btn-eliminar").addEventListener("click", async () => {
    if (!confirm(`¿Eliminar a ${p.nombre} y todo su historial? Esta acción no se puede deshacer.`)) return;
    try {
      await apiDelete(`/plantas/${encodeURIComponent(slug)}`);
      location.href = "/";
    } catch (err) {
      mostrarToast(err.message);
    }
  });

  document.title = `${p.nombre} · Savia`;
}

function tile(etiqueta, valor) {
  const contenido = valor ?? null;
  return `<div class="info-tile"><span class="eyebrow">${etiqueta}</span><span class="valor ${contenido ? "" : "vacio"}">${contenido ? escaparHtml(contenido) : "Sin especificar"}</span></div>`;
}

function renderInfo(p) {
  const temperatura = (p.temperaturaMin != null || p.temperaturaMax != null)
    ? `${p.temperaturaMin ?? "?"}–${p.temperaturaMax ?? "?"} °C`
    : null;

  document.getElementById("info-grid").innerHTML = [
    tile("Adoptada el", formatFecha(p.fechaAdopcion)),
    tile("Ubicación", p.ubicacion),
    tile("Luz", p.luzNecesaria ? LUZ[p.luzNecesaria] : null),
    tile("Riego", p.frecuenciaRiegoDias ? `Cada ${p.frecuenciaRiegoDias} días` : null),
    tile("Humedad", p.humedadRecomendada),
    tile("Temperatura", temperatura),
  ].join("");

  const descripcion = document.getElementById("planta-descripcion");
  if (p.descripcion) {
    descripcion.textContent = p.descripcion;
    descripcion.classList.remove("oculto");
  }

  const urlNfc = p.urlNfc || `${location.origin}/plantas/${slug}`;
  document.getElementById("nfc-url").textContent = urlNfc;
  document.getElementById("btn-copiar-nfc").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(urlNfc);
      mostrarToast("URL copiada. Ya puedes escribirla en la etiqueta NFC.");
    } catch {
      mostrarToast("No se ha podido copiar automáticamente.");
    }
  });
}

function renderHistorial(acciones) {
  const lista = document.getElementById("historial-lista");
  const vacio = document.getElementById("historial-vacio");

  if (acciones.length === 0) {
    lista.innerHTML = "";
    vacio.style.display = "block";
    return;
  }
  vacio.style.display = "none";

  lista.innerHTML = acciones.map((a) => {
    const meta = TIPOS_ACCION[a.tipo] ?? { emoji: "🌿", label: a.tipo };
    let extra = "";
    if (a.ubicacionNueva) extra += `<div class="notas">Nueva ubicación: ${escaparHtml(a.ubicacionNueva)}</div>`;
    if (a.notas) extra += `<div class="notas">${escaparHtml(a.notas)}</div>`;
    if (a.fotoUrl) extra += `<div class="foto-nota"><img src="${escaparHtml(a.fotoUrl)}" alt=""></div>`;

    return `
      <li>
        <div class="marca">${meta.emoji}</div>
        <div class="contenido">
          <div class="fila-top">
            <span class="tipo">${meta.label}</span>
            <time>${formatFechaHora(a.fecha)}</time>
          </div>
          ${extra}
        </div>
      </li>
    `;
  }).join("");
}

function renderDiario(entradas) {
  const seccion = document.getElementById("seccion-diario");
  if (entradas.length === 0) {
    seccion.classList.add("oculto");
    return;
  }
  seccion.classList.remove("oculto");

  document.getElementById("diario-lista").innerHTML = entradas.map((e) => `
    <div class="diario-item">
      <div class="foto"><img src="${escaparHtml(e.fotoUrl)}" alt="" loading="lazy"></div>
      <div>
        <div class="fecha">${formatFechaCorta(e.fecha)}</div>
        <div class="texto">${e.notas ? escaparHtml(e.notas) : "Nueva fotografía en el diario."}</div>
      </div>
    </div>
  `).join("");
}

function renderStats(stats) {
  const tilesStat = [
    ["Riegos", stats.numRiegos],
    ["Abonados", stats.numAbonados],
    ["Podas", stats.numPodas],
    ["Trasplantes", stats.numTrasplantes],
    ["Fotografías", stats.fotografias],
    ["Días sin riego", stats.diasDesdeUltimoRiego ?? "—"],
  ];
  document.getElementById("stats-grid").innerHTML = tilesStat.map(([etiqueta, valor]) => `
    <div class="stat-tile"><div class="valor">${valor}</div><div class="etiqueta">${etiqueta}</div></div>
  `).join("");

  renderGraficoEvolucion(stats.evolucionMensual);
}

/**
 * Gráfico de barras minimalista en SVG puro, sin dependencias externas:
 * en una demo en directo con NFC no queremos que un CDN caído se lleve
 * por delante la página.
 */
function renderGraficoEvolucion(datos) {
  const contenedor = document.getElementById("grafico-evolucion");

  if (datos.length === 0) {
    contenedor.innerHTML = '<p class="descripcion-planta" style="margin-top:4px;">Todavía no hay datos suficientes para mostrar la evolución.</p>';
    return;
  }

  const maximo = Math.max(...datos.map((d) => d.total), 1);
  const alturaMax = 130;

  const barras = datos.map((d) => {
    const alturaPx = Math.round((d.total / maximo) * alturaMax) || 4;
    return `
      <div class="barra-evolucion">
        <span class="valor-barra">${d.total}</span>
        <div class="barra" style="height:${alturaPx}px;"></div>
        <span class="etiqueta-barra">${escaparHtml(d.mes)}</span>
      </div>
    `;
  }).join("");

  contenedor.innerHTML = `<div class="grafico-barras">${barras}</div>`;
}

/* ---------- modal registrar cuidado ---------- */

const overlay = document.getElementById("modal-overlay");
const form = document.getElementById("form-accion");
const grupoTipo = document.getElementById("grupo-tipo");
const campoFotoWrap = document.getElementById("campo-foto-wrap");
const campoUbicacionWrap = document.getElementById("campo-ubicacion-wrap");
const fotoUploadLabel = document.getElementById("foto-upload-label");
const errorForm = document.getElementById("form-accion-error");

grupoTipo.innerHTML = Object.entries(TIPOS_ACCION).map(([valor, meta], i) => `
  <label class="opcion-tipo">
    <input type="radio" name="tipo" value="${valor}" ${i === 0 ? "checked" : ""}>
    <span class="emoji">${meta.emoji}</span>
    <span>${meta.label}</span>
  </label>
`).join("");

function tipoSeleccionado() {
  return form.querySelector('input[name="tipo"]:checked').value;
}

function actualizarCamposCondicionales() {
  const tipo = tipoSeleccionado();
  campoFotoWrap.classList.toggle("oculto", tipo !== "FOTO");
  campoUbicacionWrap.classList.toggle("oculto", tipo !== "CAMBIO_UBICACION");
}

grupoTipo.addEventListener("change", actualizarCamposCondicionales);

function ahoraParaInput() {
  const ahora = new Date();
  const offsetMs = ahora.getTimezoneOffset() * 60000;
  return new Date(ahora - offsetMs).toISOString().slice(0, 16);
}

function restaurarCampoFoto() {
  archivoFotoSeleccionado = null;
  fotoUploadLabel.classList.remove("tiene-imagen");
  fotoUploadLabel.innerHTML = `<span>Toca para elegir una imagen</span><input type="file" id="campo-foto" accept="image/png,image/jpeg,image/webp,image/gif">`;
  document.getElementById("campo-foto").addEventListener("change", manejarSeleccionFoto);
}

function abrirModal() {
  form.reset();
  restaurarCampoFoto();
  errorForm.classList.add("oculto");
  document.getElementById("campo-fecha").value = ahoraParaInput();
  actualizarCamposCondicionales();
  overlay.classList.add("abierto");
}

function cerrarModal() {
  overlay.classList.remove("abierto");
}

document.getElementById("btn-registrar").addEventListener("click", abrirModal);
document.getElementById("fab-registrar").addEventListener("click", abrirModal);
document.getElementById("btn-cerrar-modal").addEventListener("click", cerrarModal);
document.getElementById("btn-cancelar-modal").addEventListener("click", cerrarModal);
overlay.addEventListener("click", (e) => { if (e.target === overlay) cerrarModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarModal(); });

function manejarSeleccionFoto(e) {
  const archivo = e.target.files[0];
  if (!archivo) return;
  archivoFotoSeleccionado = archivo;
  const lector = new FileReader();
  lector.onload = () => {
    fotoUploadLabel.classList.add("tiene-imagen");
    fotoUploadLabel.innerHTML = `<img src="${lector.result}" alt="Vista previa"><input type="file" id="campo-foto" accept="image/png,image/jpeg,image/webp,image/gif">`;
    document.getElementById("campo-foto").addEventListener("change", manejarSeleccionFoto);
  };
  lector.readAsDataURL(archivo);
}

document.getElementById("campo-foto").addEventListener("change", manejarSeleccionFoto);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorForm.classList.add("oculto");

  const tipo = tipoSeleccionado();
  const fecha = document.getElementById("campo-fecha").value;
  const notas = document.getElementById("campo-notas").value.trim();
  const ubicacionNueva = document.getElementById("campo-ubicacion").value.trim();

  if (tipo === "FOTO" && !archivoFotoSeleccionado) {
    errorForm.textContent = "Selecciona una fotografía para este tipo de registro.";
    errorForm.classList.remove("oculto");
    return;
  }

  const botonGuardar = document.getElementById("btn-guardar-accion");
  botonGuardar.disabled = true;
  botonGuardar.textContent = "Guardando…";

  try {
    let fotoUrl = null;
    if (tipo === "FOTO" && archivoFotoSeleccionado) {
      fotoUrl = await subirImagen(archivoFotoSeleccionado);
    }

    await apiPost(`/plantas/${encodeURIComponent(slug)}/acciones`, {
      tipo,
      fecha,
      notas: notas || null,
      fotoUrl,
      ubicacionNueva: tipo === "CAMBIO_UBICACION" ? (ubicacionNueva || null) : null,
    });

    cerrarModal();
    mostrarToast("Cuidado registrado.");
    await cargarTodo();
  } catch (err) {
    errorForm.textContent = err.message;
    errorForm.classList.remove("oculto");
  } finally {
    botonGuardar.disabled = false;
    botonGuardar.textContent = "Guardar";
  }
});

/* ---------- carga inicial ---------- */

async function cargarTodo() {
  try {
    const [detalle, historial, diario, stats] = await Promise.all([
      apiGet(`/plantas/${encodeURIComponent(slug)}`),
      apiGet(`/plantas/${encodeURIComponent(slug)}/acciones`),
      apiGet(`/plantas/${encodeURIComponent(slug)}/diario`),
      apiGet(`/plantas/${encodeURIComponent(slug)}/estadisticas`),
    ]);

    plantaActual = detalle;
    renderHero(detalle);
    renderInfo(detalle);
    renderHistorial(historial);
    renderDiario(diario);
    renderStats(stats);
    secciones.classList.remove("oculto");
  } catch (err) {
    contenido.innerHTML = `<div class="estado-vacio"><p>${escaparHtml(err.message)}</p><p style="margin-top:14px;"><a class="btn btn-ghost" href="/">Volver a la colección</a></p></div>`;
  }
}

cargarTodo();
