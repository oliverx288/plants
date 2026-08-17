import { apiPostPublico } from "./api.js";
import { guardarSesion, estaAutenticado } from "./utils.js";

if (estaAutenticado()) {
  location.href = "/";
}

const form = document.getElementById("form-registro");
const errorEl = document.getElementById("form-registro-error");
const boton = document.getElementById("btn-registro");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.classList.add("oculto");
  boton.disabled = true;
  boton.textContent = "Creando cuenta…";

  try {
    const auth = await apiPostPublico("/auth/registro", {
      nombre: document.getElementById("campo-nombre").value.trim(),
      email: document.getElementById("campo-email").value.trim(),
      password: document.getElementById("campo-password").value,
    });
    guardarSesion(auth);
    location.href = "/";
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("oculto");
    boton.disabled = false;
    boton.textContent = "Crear cuenta";
  }
});
