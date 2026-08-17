import { apiGet, apiPost, apiPut, apiDelete, subirImagen } from "./api.js";
import { mostrarToast, iniciarTema, iniciarBarraSesion, estaAutenticado, escaparHtml } from "./utils.js";

iniciarTema();
iniciarBarraSesion();

const partes = location.pathname.split("/").filter(Boolean);
const esEdicion = partes.length === 3 && partes[2] === "editar";
const slug = esEdicion ? decodeURIComponent(partes[1]) : null;

if (!estaAutenticado()) {
  location.href = "/login?next=" + encodeURIComponent(location.pathname);
}

const form = document.getElementById("form-planta");
const fotoUploadLabel = document.getElementById("foto-upload-label");
const errorForm = document.getElementById("form-planta-error");
const btnGuardar = document.getElementById("btn-guardar-planta");
const btnEliminar = document.getElementById("btn-eliminar-planta");

let archivoFotoSeleccionado = null;
let fotoActualUrl = null;

const campos = {
  nombre: document.getElementById("campo-nombre"),
  especie: document.getElementById("campo-especie"),
  descripcion: document.getElementById("campo-descripcion"),
  fechaAdopcion: document.getElementById("campo-fecha-adopcion"),
  ubicacion: document.getElementById("campo-ubicacion"),
  luz: document.getElementById("campo-luz"),
  frecuencia: document.getElementById("campo-frecuencia"),
  humedad: document.getElementById("campo-humedad"),
  tempMin: document.getElementById("campo-temp-min"),
  tempMax: document.getElementById("campo-temp-max"),
  estadoManual: document.getElementById("campo-estado-manual"),
};

function manejarSeleccionFoto(e) {
  const archivo = e.target.files[0];
  if (!archivo) return;
  archivoFotoSeleccionado = archivo;
  const lector = new FileReader();
  lector.onload = () => mostrarPreviewFoto(lector.result);
  lector.readAsDataURL(archivo);
}

function mostrarPreviewFoto(src) {
  fotoUploadLabel.classList.add("tiene-imagen");
  fotoUploadLabel.innerHTML = `<img src="${src}" alt="Vista previa"><input type="file" id="campo-foto" accept="image/png,image/jpeg,image/webp,image/gif">`;
  document.getElementById("campo-foto").addEventListener("change", manejarSeleccionFoto);
}

document.getElementById("campo-foto").addEventListener("change", manejarSeleccionFoto);

document.getElementById("btn-cancelar-form").addEventListener("click", () => {
  history.back();
});

if (esEdicion) {
  document.getElementById("titulo-formulario").textContent = "Editar planta";
  document.getElementById("subtitulo-formulario").textContent = "Actualiza su ficha de cuidados.";
  document.getElementById("enlace-volver").href = `/plantas/${encodeURIComponent(slug)}`;
  btnEliminar.classList.remove("oculto");

  cargarPlanta();
} else {
  document.getElementById("nota-nfc-nueva").classList.remove("oculto");
}

async function cargarPlanta() {
  try {
    const p = await apiGet(`/plantas/${encodeURIComponent(slug)}`);

    if (!p.esPropia) {
      mostrarToast("Esta planta no te pertenece.");
      location.href = `/plantas/${encodeURIComponent(slug)}`;
      return;
    }

    campos.nombre.value = p.nombre ?? "";
    campos.especie.value = p.especie ?? "";
    campos.descripcion.value = p.descripcion ?? "";
    campos.fechaAdopcion.value = p.fechaAdopcion ?? "";
    campos.ubicacion.value = p.ubicacion ?? "";
    campos.luz.value = p.luzNecesaria ?? "";
    campos.frecuencia.value = p.frecuenciaRiegoDias ?? "";
    campos.humedad.value = p.humedadRecomendada ?? "";
    campos.tempMin.value = p.temperaturaMin ?? "";
    campos.tempMax.value = p.temperaturaMax ?? "";
    campos.estadoManual.value = p.estadoManual ?? "";

    fotoActualUrl = p.fotoPrincipalUrl ?? null;
    if (fotoActualUrl) mostrarPreviewFoto(fotoActualUrl);

    document.getElementById("nfc-panel-form").classList.remove("oculto");
    document.getElementById("nfc-url-form").textContent = p.urlNfc;
    document.getElementById("btn-copiar-nfc-form").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(p.urlNfc);
        mostrarToast("URL copiada.");
      } catch {
        mostrarToast("No se ha podido copiar automáticamente.");
      }
    });
  } catch (err) {
    errorForm.textContent = err.message;
    errorForm.classList.remove("oculto");
  }
}

btnEliminar.addEventListener("click", async () => {
  if (!confirm("¿Eliminar esta planta y todo su historial? Esta acción no se puede deshacer.")) return;
  try {
    await apiDelete(`/plantas/${encodeURIComponent(slug)}`);
    location.href = "/";
  } catch (err) {
    mostrarToast(err.message);
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorForm.classList.add("oculto");

  if (!campos.nombre.value.trim()) {
    errorForm.textContent = "El nombre es obligatorio.";
    errorForm.classList.remove("oculto");
    return;
  }

  btnGuardar.disabled = true;
  btnGuardar.textContent = "Guardando…";

  try {
    let fotoPrincipalUrl = fotoActualUrl;
    if (archivoFotoSeleccionado) {
      fotoPrincipalUrl = await subirImagen(archivoFotoSeleccionado);
    }

    const payload = {
      nombre: campos.nombre.value.trim(),
      especie: campos.especie.value.trim() || null,
      descripcion: campos.descripcion.value.trim() || null,
      fechaAdopcion: campos.fechaAdopcion.value || null,
      ubicacion: campos.ubicacion.value.trim() || null,
      luzNecesaria: campos.luz.value || null,
      frecuenciaRiegoDias: campos.frecuencia.value ? Number(campos.frecuencia.value) : null,
      humedadRecomendada: campos.humedad.value.trim() || null,
      temperaturaMin: campos.tempMin.value !== "" ? Number(campos.tempMin.value) : null,
      temperaturaMax: campos.tempMax.value !== "" ? Number(campos.tempMax.value) : null,
      fotoPrincipalUrl: fotoPrincipalUrl,
      estadoManual: campos.estadoManual.value || null,
    };

    const resultado = esEdicion
      ? await apiPut(`/plantas/${encodeURIComponent(slug)}`, payload)
      : await apiPost("/plantas", payload);

    mostrarToast(esEdicion ? "Planta actualizada." : "Planta añadida a tu colección.");
    location.href = `/plantas/${encodeURIComponent(resultado.slug)}`;
  } catch (err) {
    errorForm.textContent = err.message;
    errorForm.classList.remove("oculto");
    btnGuardar.disabled = false;
    btnGuardar.textContent = "Guardar planta";
  }
});
