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
  set: 'dev' | 'test' | 'fresh' | 'fresh2'
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

/*
 * Conjunto NUEVO ("fresh"), escrito DESPUÉS de gastar el conjunto de test y ANTES de implementar los sinónimos
 * y las sugerencias. Sirve para medir esas dos mejoras con preguntas que no se miraron al diseñarlas.
 * Se midió primero el sistema SIN ninguna mejora (línea base). Misma limitación: lo escribió quien también
 * escribió el sistema.
 */
export const FRESH_QUESTIONS: TestQuestion[] = [
  // ------------------------------------------------------------ CON respuesta
  { set: 'fresh', expected: 'reloj-sin-cobertura', question: 'El reloj de mi suegra no coge la línea' },
  { set: 'fresh', expected: 'ubicacion-no-se-actualiza', question: 'No puedo ver dónde está mi madre en el mapa desde ayer', note: 'difícil: sin palabras del título' },
  { set: 'fresh', expected: 'zona-segura-sin-aviso', question: 'Quiero que me avise cuando mi padre salga del barrio', note: 'difícil: avisar/salir/barrio' },
  { set: 'fresh', expected: 'actualizacion-a-medias', question: 'El reloj se ha quedado congelado actualizando el software' },
  { set: 'fresh', expected: 'sos-no-llama', question: 'Mi madre dice que el botón de emergencia no responde', note: 'sinónimo: emergencia/SOS' },
  { set: 'fresh', expected: 'notificaciones-con-retraso', question: 'Me llegan los avisos del reloj muy tarde', note: 'sinónimos: avisos/notificaciones, tarde/retraso' },
  { set: 'fresh', expected: 'anadir-familiar-cambiar-titular', question: 'No sé cómo dar de alta a mi cuñada para que vea al abuelo', note: 'difícil' },
  { set: 'fresh', expected: 'suscripcion-caducada-pago-rechazado', question: 'La tarjeta de la suscripción ha caducado, ¿cómo la actualizo?' },
  { set: 'fresh', expected: 'reloj-no-recibe-llamadas', question: 'Mi madre no puede contestar llamadas, no suena' },
  { set: 'fresh', expected: 'llamada-no-se-oye-bien', question: 'No se escucha a la persona que llama, hay mucho eco', note: 'sinónimo: escuchar/oír' },
  { set: 'fresh', expected: 'app-no-inicia-sesion', question: 'No me acuerdo de la contraseña de la app' },
  { set: 'fresh', expected: 'reloj-no-carga', question: 'El reloj tarda siglos en ponerse a cargar' },
  { set: 'fresh', expected: 'bateria-dura-poco', question: 'La batería no aguanta ni medio día', note: 'sinónimo: aguantar/durar' },
  { set: 'fresh', expected: 'sos-falsa-alarma', question: 'Se activó la alarma sin querer mientras dormía' },

  // ------------------------------------------------------------ SIN respuesta
  { set: 'fresh', expected: null, question: '¿Puedo usar el reloj con un móvil iPhone?', note: 'cercana: "móvil" aparece en artículos' },
  { set: 'fresh', expected: null, question: '¿Cuántos días tarda el envío del reloj?' },
  { set: 'fresh', expected: null, question: '¿Hay descuentos para familias numerosas?' },
  { set: 'fresh', expected: null, question: '¿El reloj mide la tensión arterial?' },
  { set: 'fresh', expected: null, question: '¿Se puede cambiar el idioma del reloj?' },
  { set: 'fresh', expected: null, question: '¿Cuánto cuesta reparar la pantalla rota?', note: 'cercana: "pantalla" y "reparación" aparecen' },
  { set: 'fresh', expected: null, question: '¿Qué hago con el reloj antiguo de mi padre que ya no funciona?', note: 'reciclaje' },
  { set: 'fresh', expected: null, question: '¿Cómo configuro el reloj para que cuente los pasos?', note: 'adversaria: "pasos" aparece en todos los artículos' },
  { set: 'fresh', expected: null, question: '¿Se puede cambiar el color de la esfera del reloj?' },
  { set: 'fresh', expected: null, question: '¿Qué hago si se me pierde el reloj?' },
  { set: 'fresh', expected: null, question: '¿Aceptan pagos con PayPal?', note: 'adversaria: "pago" aparece en suscripción' },
  { set: 'fresh', expected: null, question: '¿Cuándo sale el modelo nuevo del reloj?' },
  { set: 'fresh', expected: null, question: '¿El reloj funciona con la app en una tableta?', note: 'cercana: "app"' },
  { set: 'fresh', expected: null, question: 'Necesito la factura de mi suscripción', note: 'adversaria: "suscripción" aparece' },
]

/*
 * Segundo conjunto nuevo ("fresh2"). Se escribió DESPUÉS de ver que el sistema inventaba respuestas en "fresh"
 * y de analizar la rejilla de umbrales (dentro de la muestra), y ANTES de decidir ningún cambio. Es la comprobación
 * FUERA DE MUESTRA: ningún umbral ni regla se ajustó mirando estas preguntas.
 * Incluye a propósito preguntas adversarias (vocabulario del dominio para algo que no está cubierto).
 */
export const FRESH2_QUESTIONS: TestQuestion[] = [
  // ------------------------------------------------------------ CON respuesta
  { set: 'fresh2', expected: 'reloj-sin-cobertura', question: 'El reloj no se conecta a internet' },
  { set: 'fresh2', expected: 'reloj-se-apaga-solo', question: 'Cómo hago para que el reloj no se apague de noche' },
  { set: 'fresh2', expected: 'emparejar-reloj-app', question: 'La app me dice que el código de vinculación ha caducado' },
  { set: 'fresh2', expected: 'app-no-inicia-sesion', question: 'Se me ha olvidado la contraseña del correo de la cuenta' },
  { set: 'fresh2', expected: 'reloj-sin-cobertura', question: 'El reloj muestra que no hay línea activa' },
  { set: 'fresh2', expected: 'familiar-no-recibe-avisos-sos', question: 'Mi hijo no recibe la alerta cuando mi madre pulsa el botón rojo', note: 'sinónimo: alerta/aviso' },
  { set: 'fresh2', expected: 'sos-no-llama', question: 'El reloj vibra pero no llama a nadie cuando aprieto el SOS' },
  { set: 'fresh2', expected: 'ubicacion-equivocada', question: 'La ubicación del reloj sale con un círculo enorme' },
  { set: 'fresh2', expected: 'sos-falsa-alarma', question: 'Mi madre pulsó SOS por error, ¿cómo se cancela?' },
  { set: 'fresh2', expected: 'anadir-familiar-cambiar-titular', question: '¿Cómo se cambia el titular de la cuenta?' },
  { set: 'fresh2', expected: 'suscripcion-caducada-pago-rechazado', question: 'El pago de este mes ha fallado' },
  { set: 'fresh2', expected: 'cancelar-cambiar-plan', question: 'Quiero cancelar la suscripción de mi padre' },
  { set: 'fresh2', expected: 'llamada-no-se-oye-bien', question: 'El volumen de las llamadas es muy bajo' },
  { set: 'fresh2', expected: 'actualizacion-a-medias', question: 'La actualización no termina nunca' },
  { set: 'fresh2', expected: 'bateria-dura-poco', question: 'No sé por qué la batería baja tan rápido' },
  { set: 'fresh2', expected: 'anadir-familiar-cambiar-titular', question: '¿Cuántos familiares puedo añadir como máximo?', note: 'la respuesta es un dato: hasta 5' },

  // ------------------------------------------------------------ SIN respuesta
  { set: 'fresh2', expected: null, question: '¿Cuánto tiempo tarda en llegar un reloj nuevo?' },
  { set: 'fresh2', expected: null, question: '¿Puedo pagar la suscripción en tres plazos?', note: 'adversaria: "pagar" y "suscripción"' },
  { set: 'fresh2', expected: null, question: '¿Puedo tener dos relojes en la misma cuenta?', note: 'cercana: "cuenta"' },
  { set: 'fresh2', expected: null, question: '¿El reloj tiene linterna?' },
  { set: 'fresh2', expected: null, question: '¿Se puede ver el historial de ubicaciones de la semana pasada?', note: 'adversaria: "ubicaciones"' },
  { set: 'fresh2', expected: null, question: '¿Cómo activo la detección de caídas?', note: 'cercana: dominio SOS' },
  { set: 'fresh2', expected: null, question: '¿Puedo cambiar el número de teléfono del reloj?', note: 'adversaria: "cambiar", "teléfono"' },
  { set: 'fresh2', expected: null, question: '¿Qué pasa si mi madre viaja al extranjero?' },
  { set: 'fresh2', expected: null, question: '¿Se puede nadar con el reloj?' },
  { set: 'fresh2', expected: null, question: '¿Cuántas alarmas puedo programar?', note: 'adversaria: "alarma" aparece' },
  { set: 'fresh2', expected: null, question: '¿Tienen una versión para niños?' },
  { set: 'fresh2', expected: null, question: '¿Cómo hablo con una persona?' },
  { set: 'fresh2', expected: null, question: '¿Cuál es la contraseña del wifi del reloj?', note: 'adversaria: "contraseña"' },
  { set: 'fresh2', expected: null, question: '¿El SOS llama a la policía directamente?', note: 'cercana: dominio SOS; el contenido no lo dice' },
  { set: 'fresh2', expected: null, question: '¿Cuánto cuesta añadir un familiar más?', note: 'adversaria: "añadir familiar"' },
]
