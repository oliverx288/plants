const BASE = "/api";

async function manejarRespuesta(res) {
  if (!res.ok) {
    let mensaje = "Ha ocurrido un error inesperado.";
    try {
      const data = await res.json();
      if (data && data.error) mensaje = data.error;
    } catch (e) {
      /* respuesta sin cuerpo JSON */
    }
    throw new Error(mensaje);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function apiGet(path) {
  const res = await fetch(BASE + path);
  return manejarRespuesta(res);
}

export async function apiPost(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return manejarRespuesta(res);
}

export async function apiPut(path, body) {
  const res = await fetch(BASE + path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return manejarRespuesta(res);
}

export async function apiDelete(path) {
  const res = await fetch(BASE + path, { method: "DELETE" });
  return manejarRespuesta(res);
}

export async function subirImagen(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(BASE + "/uploads", { method: "POST", body: formData });
  const data = await manejarRespuesta(res);
  return data.url;
}
