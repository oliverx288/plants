const BASE = "/api";
export const TOKEN_KEY = "savia-token";
export const USUARIO_KEY = "savia-usuario";

function cabeceras(extra) {
  const token = localStorage.getItem(TOKEN_KEY);
  const cabeceras = { ...extra };
  if (token) cabeceras["Authorization"] = "Bearer " + token;
  return cabeceras;
}

async function leerError(res) {
  let mensaje = "Ha ocurrido un error inesperado.";
  try {
    const data = await res.json();
    if (data && data.error) mensaje = data.error;
  } catch (e) {
    /* respuesta sin cuerpo JSON */
  }
  return mensaje;
}

async function manejarRespuesta(res) {
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    const volver = encodeURIComponent(location.pathname);
    location.href = "/login?next=" + volver;
    throw new Error("Es necesario iniciar sesión");
  }

  if (!res.ok) {
    throw new Error(await leerError(res));
  }
  if (res.status === 204) return null;
  return res.json();
}

/**
 * Como apiPost, pero sin la redirección automática a /login en un 401 — la
 * usan las propias pantallas de login/registro, donde un 401 es solo
 * "contraseña incorrecta", no "sesión caducada".
 */
export async function apiPostPublico(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await leerError(res));
  }
  return res.json();
}

export async function apiGet(path) {
  const res = await fetch(BASE + path, { headers: cabeceras() });
  return manejarRespuesta(res);
}

export async function apiPost(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: cabeceras({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  return manejarRespuesta(res);
}

export async function apiPut(path, body) {
  const res = await fetch(BASE + path, {
    method: "PUT",
    headers: cabeceras({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  return manejarRespuesta(res);
}

export async function apiDelete(path) {
  const res = await fetch(BASE + path, { method: "DELETE", headers: cabeceras() });
  return manejarRespuesta(res);
}

export async function subirImagen(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(BASE + "/uploads", { method: "POST", headers: cabeceras(), body: formData });
  const data = await manejarRespuesta(res);
  return data.url;
}
