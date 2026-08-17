import { TOKEN_KEY, USUARIO_KEY } from "./api.js";

export const TIPOS_ACCION = {
  RIEGO: { emoji: "💧", label: "Riego" },
  ABONADO: { emoji: "🌱", label: "Abonado" },
  PODA: { emoji: "✂️", label: "Poda" },
  TRASPLANTE: { emoji: "🪴", label: "Trasplante" },
  CAMBIO_UBICACION: { emoji: "📍", label: "Cambio de ubicación" },
  FOTO: { emoji: "📸", label: "Foto añadida" },
  NOTA: { emoji: "📝", label: "Nota" },
};

export const ESTADOS = {
  SALUDABLE: { label: "Saludable" },
  ATENCION: { label: "Necesita atención" },
  PROBLEMAS: { label: "Con problemas" },
};

export const LUZ = {
  BAJA: "Luz baja",
  MEDIA: "Luz media",
  ALTA: "Luz alta / indirecta intensa",
};

const formatoFecha = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" });
const formatoFechaHora = new Intl.DateTimeFormat("es-ES", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
});
const formatoFechaCorta = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });

export function formatFecha(valor) {
  if (!valor) return null;
  return formatoFecha.format(new Date(valor));
}

export function formatFechaHora(valor) {
  if (!valor) return null;
  return formatoFechaHora.format(new Date(valor));
}

export function formatFechaCorta(valor) {
  if (!valor) return null;
  return formatoFechaCorta.format(new Date(valor));
}

export function iniciales(nombre) {
  return (nombre || "?").trim().charAt(0).toUpperCase();
}

let toastTimeout;
export function mostrarToast(mensaje) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = mensaje;
  toast.classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("visible"), 3200);
}

function esOscuroActual() {
  const actual = document.documentElement.getAttribute("data-theme");
  if (actual) return actual === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function actualizarIconoTema(boton) {
  const uso = boton.querySelector("use");
  if (uso) uso.setAttribute("href", esOscuroActual() ? "#i-moon" : "#i-sun");
}

export function iniciarTema() {
  const boton = document.querySelector("[data-toggle-tema]");
  if (!boton) return;
  actualizarIconoTema(boton);
  boton.addEventListener("click", () => {
    const nuevo = esOscuroActual() ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nuevo);
    localStorage.setItem("savia-tema", nuevo);
    actualizarIconoTema(boton);
  });
}

export function iconoPlaceholder() {
  return `<div class="placeholder-leaf"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20C4 11 10 4 20 4c0 10-7 16-16 16Z"/><path d="M4 20c3-6 7-9 12-11"/></svg></div>`;
}

export function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

export function estaAutenticado() {
  return !!localStorage.getItem(TOKEN_KEY);
}

export function usuarioActual() {
  const raw = localStorage.getItem(USUARIO_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function guardarSesion(auth) {
  localStorage.setItem(TOKEN_KEY, auth.token);
  localStorage.setItem(USUARIO_KEY, JSON.stringify({ id: auth.id, nombre: auth.nombre, email: auth.email }));
}

export function cerrarSesion() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USUARIO_KEY);
  location.href = "/login";
}

export function iniciarBarraSesion() {
  const slot = document.querySelector("[data-auth-slot]");
  if (!slot) return;
  const usuario = usuarioActual();
  if (usuario) {
    slot.innerHTML = `
      <span class="auth-usuario">${escaparHtml(usuario.nombre)}</span>
      <button class="btn btn-ghost btn-sm" id="btn-cerrar-sesion">Salir</button>
    `;
    document.getElementById("btn-cerrar-sesion").addEventListener("click", cerrarSesion);
  } else {
    slot.innerHTML = `<a class="btn btn-ghost btn-sm" href="/login">Iniciar sesión</a>`;
  }
}
