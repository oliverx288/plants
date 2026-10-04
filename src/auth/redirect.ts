/**
 * Devuelve una ruta interna segura a la que volver tras el login.
 * Evita "open redirect": un enlace /login?from=https://sitio-malo.com no debe sacar al usuario de la app.
 */
export function getSafeRedirect(from: unknown, fallback = '/'): string {
  if (typeof from !== 'string') return fallback
  // Solo rutas absolutas de la propia app: empiezan por una única "/" (no "//host" ni "/\host").
  if (!from.startsWith('/') || from.startsWith('//') || from.startsWith('/\\')) return fallback
  // Los caracteres de control (saltos de línea, tabuladores…) se usan para engañar a los navegadores.
  if ([...from].some((char) => char.charCodeAt(0) < 32)) return fallback
  if (from === '/login') return fallback
  return from
}
