/*
 * Conjunto de preguntas de prueba de fiabilidad.
 *
 * `expected`: slug del artículo que debe responder, o null si NO hay artículo que la cubra
 * (el asistente debe decir "No tengo información sobre esto").
 *
 * Dos conjuntos con distinto uso, definidos ANTES de medir:
 *  - 'dev'  : se puede mirar fallo a fallo para mejorar la búsqueda y calibrar el umbral.
 *  - 'test' : conjunto retenido. NO se usa para ajustar nada; solo para medir el resultado final
 *             y comprobar que las mejoras generalizan en lugar de memorizar el conjunto de desarrollo.
 *
 * Están escritas con el lenguaje de un agente de soporte (sinónimos, jerga, descripciones del cliente),
 * no copiando los títulos. Incluyen casos difíciles a propósito (sinónimos, una errata, preguntas
 * relacionadas con el dominio pero sin artículo): un 100 % sería sospechoso.
 *
 * LIMITACIÓN: las escribió quien también escribió el sistema, así que son más benévolas que las que
 * haría un agente real. Lo ideal es que el equipo de soporte añada aquí sus propias preguntas.
 */
export interface TestQuestion {
  question: string
  expected: string | null
  set: 'dev' | 'test'
  /** Por qué es interesante / qué dificultad tiene. */
  note?: string
}

export const QUESTIONS: TestQuestion[] = [
  // ------------------------------------------------------------ CON respuesta · desarrollo
  { set: 'dev', expected: 'ubicacion-no-se-actualiza', question: 'El reloj no envía la ubicación a la app del familiar', note: 'ejemplo del enunciado' },
  { set: 'dev', expected: 'bateria-dura-poco', question: 'Mi padre dice que el reloj se queda sin batería a media tarde' },
  { set: 'dev', expected: 'emparejar-reloj-app', question: 'No consigo vincular el reloj nuevo con el móvil', note: 'vincular/emparejar' },
  { set: 'dev', expected: 'cancelar-cambiar-plan', question: 'Quiero darme de baja del servicio', note: 'sinónimo: baja/cancelar' },
  { set: 'dev', expected: 'sos-falsa-alarma', question: 'La abuela ha pulsado el botón rojo sin querer y han llamado a toda la familia' },
  { set: 'dev', expected: 'reloj-no-carga', question: 'El reloj marca que está cargando pero el porcentaje no sube' },
  { set: 'dev', expected: 'ubicacion-equivocada', question: 'En el mapa sale en otra calle, a varios cientos de metros de su casa' },
  { set: 'dev', expected: 'app-no-inicia-sesion', question: 'No me deja entrar en la aplicación, dice que la contraseña es incorrecta' },
  { set: 'dev', expected: 'suscripcion-caducada-pago-rechazado', question: 'Han rechazado el pago de la tarjeta y la suscripción aparece caducada' },
  { set: 'dev', expected: 'reloj-no-recibe-llamadas', question: 'Cuando me llama mi hija el reloj no suena' },
  { set: 'dev', expected: 'llamada-no-se-oye-bien', question: 'Se oye muy bajito la voz de quien llama', note: 'sin la palabra "llamada"' },
  { set: 'dev', expected: 'reloj-no-enciende', question: 'La pantalla está negra y no hay manera de encenderlo' },

  // ------------------------------------------------------------ CON respuesta · test retenido
  { set: 'test', expected: 'familiar-no-recibe-avisos-sos', question: 'El familiar no recibe la notificación cuando mi madre pulsa el SOS' },
  { set: 'test', expected: 'sos-no-llama', question: 'El botón SOS no hace nada cuando lo aprieta', note: 'sinónimo: aprieta/pulsa' },
  { set: 'test', expected: 'notificaciones-con-retraso', question: 'Las notificaciones de la app llegan con mucho retraso' },
  { set: 'test', expected: 'anadir-familiar-cambiar-titular', question: 'Cómo añado a mi hermano para que también vea dónde está mamá', note: 'difícil: sin palabras del título' },
  { set: 'test', expected: 'actualizacion-a-medias', question: 'La actualización se ha quedado a medias y el reloj se reinicia solo' },
  { set: 'test', expected: 'reloj-sin-cobertura', question: 'El reloj no coge señal, pone sin red', note: 'sinónimo: señal/cobertura' },
  { set: 'test', expected: 'reloj-se-apaga-solo', question: 'Se apaga solo por las noches' },
  { set: 'test', expected: 'zona-segura-sin-aviso', question: 'No avisa cuando sale de casa', note: 'difícil: no dice "zona segura"' },
  { set: 'test', expected: 'sos-nadie-contesta', question: 'Nadie contesta cuando se activa la alarma de emergencia', note: 'sinónimo: alarma/SOS' },
  { set: 'test', expected: 'cancelar-cambiar-plan', question: 'Quiero cambiar de plan' },
  { set: 'test', expected: 'reloj-no-carga', question: '¿Cuánto tarda en cargarse del todo?', note: 'difícil: el artículo dice "unas 2 horas"' },
  { set: 'test', expected: 'app-no-inicia-sesion', question: '¿Qué hago si no me llega el SMS de verificación?' },
  { set: 'test', expected: 'bateria-dura-poco', question: 'La baterya se acaba enseguida', note: 'errata a propósito' },

  // ------------------------------------------------------------ SIN respuesta · desarrollo
  { set: 'dev', expected: null, question: '¿Es resistente al agua?', note: 'hueco deliberado' },
  { set: 'dev', expected: null, question: '¿Cuánto cuesta el reloj?', note: 'hueco deliberado' },
  { set: 'dev', expected: null, question: '¿Cuánto dura la garantía?', note: 'hueco deliberado' },
  { set: 'dev', expected: null, question: 'Quiero devolver el reloj, ¿cómo lo hago?', note: 'hueco deliberado' },
  { set: 'dev', expected: null, question: 'Quiero cambiar la pulsera del reloj', note: 'hueco deliberado; comparte "cambiar" con otros artículos' },
  { set: 'dev', expected: null, question: '¿Cuál es la capital de Francia?', note: 'fuera de dominio' },
  { set: 'dev', expected: null, question: 'Hola, buenas tardes', note: 'saludo' },
  { set: 'dev', expected: null, question: 'Cuéntame un chiste', note: 'fuera de dominio' },

  // ------------------------------------------------------------ SIN respuesta · test retenido
  { set: 'test', expected: null, question: '¿Se puede usar el reloj en la ducha?', note: 'hueco deliberado (agua)' },
  { set: 'test', expected: null, question: '¿Puedo comprar otro reloj para mi marido?', note: 'comercial, sin artículo' },
  { set: 'test', expected: null, question: '¿Qué tiempo hará mañana?', note: 'fuera de dominio' },
  { set: 'test', expected: null, question: '¿Qué tamaño tiene la pantalla del reloj?', note: 'cercana al dominio: "pantalla" aparece en artículos' },
  { set: 'test', expected: null, question: '¿Dónde está la tienda más cercana?', note: 'fuera de dominio' },
  { set: 'test', expected: null, question: 'Mi madre quiere saber si funciona en otro país', note: 'hueco: itinerancia' },
  { set: 'test', expected: null, question: '¿Cuál es el teléfono de atención al cliente?', note: 'cercana al dominio: "teléfono" aparece' },
  { set: 'test', expected: null, question: '¿Se puede pagar con Bizum?', note: 'adversaria: "pagar/pago" aparece en el artículo de suscripción' },
]
