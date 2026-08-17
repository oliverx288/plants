import { apiPostPublico } from "./api.js";
import { guardarSesion, estaAutenticado } from "./utils.js";

function destinoTrasLogin() {
  const params = new URLSearchParams(location.search);
  const next = params.get("next");
  return next && next.startsWith("/") ? next : "/";
}

if (estaAutenticado()) {
  location.href = destinoTrasLogin();
}

const form = document.getElementById("form-login");
const errorEl = document.getElementById("form-login-error");
const boton = document.getElementById("btn-login");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.classList.add("oculto");
  boton.disabled = true;
  boton.textContent = "Entrando…";

  try {
    const auth = await apiPostPublico("/auth/login", {
      email: document.getElementById("campo-email").value.trim(),
      password: document.getElementById("campo-password").value,
    });
    guardarSesion(auth);
    location.href = destinoTrasLogin();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("oculto");
    boton.disabled = false;
    boton.textContent = "Iniciar sesión";
  }
});
