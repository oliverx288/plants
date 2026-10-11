/** Reloj simulado: el prototipo arranca siempre el jueves 8 de octubre de 2026 a las 05:28. */
const SIM_START = Date.parse('2026-10-08T05:28:00+02:00');
const LOADED_AT = Date.now();

export const now = (): number => SIM_START + (Date.now() - LOADED_AT);
