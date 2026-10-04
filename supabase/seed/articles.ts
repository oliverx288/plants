import type { SeedArticle } from './types'

/*
 * Base de conocimiento ficticia de Velia (smartwatch "Velia Brisa" + app "Velia Familia").
 * Todos los datos son inventados.
 *
 * Ficha de producto (para mantener los artículos coherentes entre sí):
 *  - Botón lateral (encendido) y botón SOS rojo. Reinicio forzado: lateral 10 s.
 *  - Autonomía: hasta 2 días. Carga completa ~2 h con base magnética + cable USB-C (adaptador 5 V, mín. 1 A).
 *  - Ubicación cada 5 min; modo ahorro (por debajo del 15 %): cada 30 min. "Actualizar ahora" tarda hasta 2 min.
 *  - SOS: pulsación de 3 s, cuenta atrás de 5 s, hasta 3 contactos, 30 s cada uno, 2 rondas. Llama como "Velia SOS".
 *  - Suscripción "Velia Conecta": necesaria para ubicación, avisos y llamadas. Gracia de 7 días tras fallar el pago;
 *    después solo funciona el SOS llamando al contacto 1.
 *  - Llamadas: solo de contactos autorizados (hasta 20). Hasta 5 familiares por reloj; invitación válida 7 días.
 *
 * Huecos deliberados (NO tienen artículo, para que el asistente diga "No tengo información"
 * y el editor vea qué falta): resistencia al agua, garantía y devoluciones, precios/planes,
 * cambio de pulsera. Un test comprueba que estas palabras no aparecen en el contenido.
 */
export const articles: SeedArticle[] = [
  // ---------------------------------------------------------------- Primera configuración
  {
    slug: 'emparejar-reloj-app',
    title: 'No consigo emparejar el reloj con la app',
    category: 'Primera configuración',
    lastReviewed: '2026-08-12',
    sections: [
      {
        heading: 'Qué ocurre',
        body: 'Al vincular el reloj con la app Velia Familia, la app no reconoce el código QR, no encuentra el reloj o muestra el mensaje «No se pudo vincular». Casi siempre se debe a permisos del móvil, a que el reloj no tiene conexión o a que el código QR ha caducado.',
      },
      {
        heading: 'Qué comprobar primero',
        steps: [
          'Carga el reloj al menos al 30 % y enciéndelo.',
          'Conecta el reloj a una red Wi-Fi o comprueba que tiene cobertura móvil (Ajustes > Conectividad).',
          'En el móvil, activa el Bluetooth y permite a la app Velia Familia el acceso a la cámara y a la ubicación.',
          'En el reloj, abre Ajustes > Vincular para mostrar un código QR nuevo. El código caduca a los 5 minutos.',
          'En la app, pulsa «Añadir reloj» y escanea el código con buena luz, a unos 20 centímetros de la pantalla.',
        ],
      },
      {
        heading: 'Si sigue fallando',
        steps: [
          'Cierra la app por completo y vuelve a abrirla.',
          'Reinicia el reloj manteniendo pulsado el botón lateral 10 segundos.',
          'Comprueba que la app Velia Familia está actualizada a la última versión.',
          'Si el error persiste, anota el código que muestra la app y abre una incidencia de segundo nivel.',
        ],
      },
    ],
  },
  {
    slug: 'reloj-no-enciende',
    title: 'El reloj no enciende o se queda en el logotipo',
    category: 'Primera configuración',
    lastReviewed: '2026-07-03',
    sections: [
      {
        heading: 'Qué ocurre',
        body: 'La pantalla permanece negra al pulsar el botón lateral, o el reloj muestra el logotipo de Velia y no avanza. La causa más habitual es la batería agotada; si no, suele resolverse con un reinicio forzado.',
      },
      {
        heading: 'Qué comprobar primero',
        steps: [
          'Coloca el reloj en su base de carga original, comprobando que los imanes encajan, y déjalo cargar 30 minutos aunque la pantalla siga negra.',
          'Pulsa el botón lateral durante 3 segundos.',
          'Si no responde, haz un reinicio forzado: mantén pulsado el botón lateral 10 segundos hasta que aparezca el logotipo.',
          'Si el reloj se queda en el logotipo más de 5 minutos, repite el reinicio forzado con el reloj puesto en la base de carga.',
        ],
      },
      {
        heading: 'Si sigue fallando',
        body: 'Si tras 30 minutos de carga no aparece ni el icono de carga ni el logotipo, el fallo puede estar en la base, en el cable o en el propio reloj.',
        steps: [
          'Prueba con otro cable USB-C y otro adaptador de corriente (5 V y al menos 1 A).',
          'Limpia los contactos de la parte trasera del reloj con un paño seco y suave.',
          'Si sigue sin responder, abre una incidencia de reparación con el número de serie, que está impreso en la caja y en la parte trasera del reloj.',
        ],
      },
    ],
  },
  {
    slug: 'reloj-sin-cobertura',
    title: 'El reloj no tiene cobertura móvil (SIM y línea)',
    category: 'Primera configuración',
    lastReviewed: '2026-06-18',
    sections: [
      {
        heading: 'Qué ocurre',
        body: 'El reloj muestra el icono «Sin red». El Velia Brisa lleva una eSIM integrada: sin cobertura no puede enviar su ubicación, hacer ni recibir llamadas, ni avisar a la familia.',
      },
      {
        heading: 'Qué comprobar primero',
        steps: [
          'Comprueba que el reloj no está en modo avión (Ajustes > Conectividad).',
          'Pide que salga a un lugar con mejor señal: los sótanos, los garajes y los edificios con muros gruesos reducen la cobertura.',
          'Reinicia el reloj: apágalo y vuelve a encenderlo.',
          'En la app, abre Reloj > Línea y comprueba que indica «Línea activa».',
          'Si indica «Línea pendiente», pulsa «Activar línea» y espera hasta 10 minutos con el reloj encendido y en un lugar con cobertura.',
        ],
      },
      {
        heading: 'Si sigue fallando',
        steps: [
          'Comprueba que la suscripción Velia Conecta está activa (App > Cuenta > Suscripción), porque incluye los datos del reloj.',
          'Si en esa misma zona el móvil del familiar tiene buena cobertura y el reloj lleva más de 24 horas sin red, abre una incidencia de línea con el número de serie.',
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- GPS y ubicación
  {
    slug: 'ubicacion-no-se-actualiza',
    title: 'La ubicación no se actualiza',
    category: 'GPS y ubicación',
    lastReviewed: '2026-09-05',
    sections: [
      {
        heading: 'Qué ocurre',
        body: 'En la app Velia Familia el reloj aparece con una ubicación antigua, el mapa no se mueve o se lee «Última ubicación hace varias horas». En uso normal el reloj envía su posición cada 5 minutos.',
      },
      {
        heading: 'Qué comprobar primero',
        steps: [
          'Comprueba que el reloj tiene el GPS activado (Ajustes > Ubicación > GPS).',
          'Comprueba que la suscripción Velia Conecta está activa (App > Cuenta > Suscripción).',
          'Mira la batería: con el modo ahorro activo (por debajo del 15 %) la ubicación se actualiza solo cada 30 minutos.',
          'Comprueba que el reloj tiene cobertura móvil, sin el icono «Sin red».',
          'En la app, pulsa «Actualizar ahora». Puede tardar hasta 2 minutos en aparecer la posición nueva.',
        ],
      },
      {
        heading: 'Si sigue fallando',
        steps: [
          'Reinicia el reloj manteniendo pulsado el botón lateral 10 segundos.',
          'Comprueba que el reloj tiene la última actualización de software.',
          'Si tras reiniciar sigue más de 24 horas sin enviar ubicación, con el GPS, la suscripción y la batería correctos, abre una incidencia.',
        ],
      },
    ],
  },
  {
    slug: 'ubicacion-equivocada',
    title: 'La ubicación aparece en un sitio equivocado',
    category: 'GPS y ubicación',
    lastReviewed: '2026-08-27',
    sections: [
      {
        heading: 'Qué ocurre',
        body: 'El mapa sitúa el reloj en otra calle, en otro edificio o a cientos de metros, y el círculo de precisión es muy grande. Al aire libre la precisión es de unos 10 metros, pero en interiores, centros comerciales y calles con edificios altos el reloj usa antenas y Wi-Fi, y el error puede superar los 100 metros.',
      },
      {
        heading: 'Qué comprobar primero',
        steps: [
          'Mira el círculo de precisión en el mapa: si es grande, la posición es aproximada y no un error del reloj.',
          'Pide que salga a un lugar abierto y pulsa «Actualizar ahora». Con el cielo despejado, el GPS necesita entre 1 y 2 minutos para fijar la posición.',
          'Comprueba la hora de la ubicación bajo el mapa. Si es antigua, el problema es otro: consulta «La ubicación no se actualiza».',
          'Comprueba que la opción Ajustes > Ubicación > Precisión alta está activada. Consume más batería.',
        ],
      },
      {
        heading: 'Si sigue fallando',
        steps: [
          'Comprueba que la fecha y la hora del reloj son correctas (Ajustes > Sistema > Fecha y hora automática activada). Una hora incorrecta retrasa el GPS.',
          'Reinicia el reloj y repite la prueba en un lugar abierto.',
        ],
      },
    ],
  },
  {
    slug: 'zona-segura-sin-aviso',
    title: 'No recibo aviso cuando sale de la zona segura',
    category: 'GPS y ubicación',
    lastReviewed: '2026-07-21',
    sections: [
      {
        heading: 'Qué ocurre',
        body: 'Las zonas seguras (casa, centro de día…) avisan al familiar cuando el reloj entra o sale. Si el aviso no llega, o llega tarde, suele ser un ajuste de la zona o de las notificaciones. El aviso depende de la frecuencia de ubicación, así que puede tardar hasta 5 minutos (30 minutos con el modo ahorro).',
      },
      {
        heading: 'Qué comprobar primero',
        steps: [
          'En la app, abre Zonas, elige la zona y comprueba que «Avisar al salir» está activado.',
          'Comprueba el radio de la zona: el mínimo recomendado es de 100 metros. Con radios más pequeños el aviso puede no saltar.',
          'Comprueba que el familiar que debe recibir el aviso está marcado en «Quién recibe el aviso».',
          'En el móvil del familiar, comprueba que las notificaciones de Velia Familia están permitidas.',
          'Comprueba que el reloj está enviando su ubicación con normalidad.',
        ],
      },
      {
        heading: 'Si sigue fallando',
        steps: [
          'Elimina la zona y vuelve a crearla.',
          'Haz una prueba: que el reloj se aleje unos 300 metros de la zona y espera 10 minutos.',
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- Batería y carga
  {
    slug: 'bateria-dura-poco',
    title: 'La batería dura poco',
    category: 'Batería y carga',
    lastReviewed: '2026-09-12',
    sections: [
      {
        heading: 'Qué ocurre',
        body: 'En uso normal el Velia Brisa dura hasta 2 días con una carga completa. Si la batería se agota en menos de un día, suele deberse a la configuración, a la falta de cobertura o al desgaste de la batería.',
      },
      {
        heading: 'Qué comprobar primero',
        steps: [
          'Activa el modo ahorro (Ajustes > Energía > Modo ahorro): reduce las actualizaciones de ubicación a una cada 30 minutos.',
          'Baja el brillo y desactiva «Pantalla siempre activa» (Ajustes > Pantalla).',
          'Comprueba la cobertura: si el reloj busca red de forma continua, gasta mucha batería.',
          'Comprueba que el reloj tiene la última versión de software.',
          'Carga el reloj hasta el 100 % con la base y el cable originales.',
        ],
      },
      {
        heading: 'Si sigue fallando',
        body: 'La batería pierde capacidad con el tiempo: tras unos 2 años de uso diario es normal que dure menos.',
        steps: [
          'Si con el modo ahorro activado y el reloj actualizado dura menos de 12 horas, abre una incidencia de revisión de batería.',
          'Indica en la incidencia la fecha de compra y el número de serie del reloj.',
        ],
      },
    ],
  },
  {
    slug: 'reloj-no-carga',
    title: 'El reloj no carga',
    category: 'Batería y carga',
    lastReviewed: '2026-06-30',
    sections: [
      {
        heading: 'Qué ocurre',
        body: 'Al colocar el reloj en la base no aparece el icono de carga (un rayo) o el porcentaje no sube. Una carga completa lleva unas 2 horas.',
      },
      {
        heading: 'Qué comprobar primero',
        steps: [
          'Alinea los imanes: el reloj debe quedar pegado y centrado en la base.',
          'Limpia los contactos de la parte trasera del reloj y de la base con un paño seco y suave, sin líquidos.',
          'Usa la base de carga original de Velia.',
          'Conecta el cable a otro adaptador (5 V y al menos 1 A) o a otro enchufe. Algunos puertos USB de televisores u ordenadores no dan suficiente corriente.',
          'Espera 10 minutos: con la batería muy baja el icono de carga puede tardar en aparecer.',
        ],
      },
      {
        heading: 'Si sigue fallando',
        steps: [
          'Prueba con otro cable USB-C.',
          'Si ningún cable ni adaptador funciona, el fallo está en la base o en el reloj: abre una incidencia de reparación con el número de serie.',
        ],
      },
    ],
  },
  {
    slug: 'reloj-se-apaga-solo',
    title: 'El reloj se apaga solo con batería disponible',
    category: 'Batería y carga',
    lastReviewed: '2026-08-02',
    sections: [
      {
        heading: 'Qué ocurre',
        body: 'El reloj se apaga cuando todavía marca entre un 20 % y un 50 % de batería, o se apaga cada noche. Un reloj apagado no envía ubicación ni permite usar el botón SOS.',
      },
      {
        heading: 'Qué comprobar primero',
        steps: [
          'Abre Ajustes > Energía > Apagado programado. Si está activado, el reloj se apaga a la hora indicada: desactívalo.',
          'Evita el frío intenso: a menos de 5 °C la batería marca menos de la que realmente tiene y el reloj puede apagarse.',
          'Comprueba que el reloj tiene la última actualización de software.',
          'Reinicia el reloj manteniendo pulsado el botón lateral 10 segundos.',
        ],
      },
      {
        heading: 'Si sigue fallando',
        steps: [
          'Si tras actualizar y reiniciar se apaga de forma repetida con más del 20 % de batería, abre una incidencia de revisión de batería con el número de serie.',
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- Botón SOS
  {
    slug: 'sos-no-llama',
    title: 'El botón SOS no llama',
    category: 'Botón SOS',
    lastReviewed: '2026-09-18',
    sections: [
      {
        heading: 'Qué ocurre',
        body: 'Al pulsar el botón SOS el reloj no inicia la cuenta atrás, o la inicia pero no llama y muestra «No se pudo llamar». Es una incidencia prioritaria porque afecta a la seguridad de la persona.',
      },
      {
        heading: 'Qué comprobar primero',
        steps: [
          'Mantén pulsado el botón SOS rojo durante 3 segundos, hasta que el reloj vibre y empiece una cuenta atrás de 5 segundos. Una pulsación corta no activa el SOS.',
          'Comprueba que hay al menos un contacto de emergencia (App > Reloj > Contactos de emergencia).',
          'Comprueba que el reloj tiene cobertura móvil y que no está en modo avión.',
          'Comprueba que la suscripción Velia Conecta está activa. Si caducó hace más de 7 días, el SOS solo llama al primer contacto y no envía ubicación.',
        ],
      },
      {
        heading: 'Si sigue fallando',
        steps: [
          'Reinicia el reloj manteniendo pulsado el botón lateral 10 segundos.',
          'Haz una prueba de SOS, avisando antes a los contactos de emergencia de que será una prueba.',
          'Si sigue sin llamar, abre una incidencia urgente con el número de serie.',
          'Mientras se resuelve, recomienda al cliente que la persona lleve consigo un teléfono móvil.',
        ],
      },
    ],
  },
  {
    slug: 'sos-falsa-alarma',
    title: 'Se activó el SOS sin querer (falsa alarma)',
    category: 'Botón SOS',
    lastReviewed: '2026-07-09',
    sections: [
      {
        heading: 'Qué ocurre',
        body: 'El botón SOS se ha pulsado por un roce, por ejemplo con la manga o durante el sueño, y los contactos han recibido una llamada y un aviso en la app.',
      },
      {
        heading: 'Qué hacer en el momento',
        steps: [
          'Si el reloj sigue en la cuenta atrás de 5 segundos, pulsa de nuevo el botón SOS o desliza «Cancelar»: no se llama ni se avisa a nadie.',
          'Si la llamada ya ha empezado, no cuelgues: explica a quien contesta que es una falsa alarma.',
          'Pide al titular que abra el aviso en la app (Historial) y lo marque como «Falsa alarma» para informar al resto de la familia.',
        ],
      },
      {
        heading: 'Cómo evitar que se repita',
        steps: [
          'En el reloj, abre Ajustes > SOS > Duración de la pulsación y elige 5 segundos en lugar de 3.',
          'Comprueba que el reloj está bien ajustado a la muñeca y que el botón no roza con la ropa.',
          'Si ocurre varias veces, repasa con el cliente cómo se cancela la cuenta atrás.',
        ],
      },
    ],
  },
  {
    slug: 'sos-nadie-contesta',
    title: 'Ningún contacto contesta la llamada SOS',
    category: 'Botón SOS',
    lastReviewed: '2026-08-14',
    sections: [
      {
        heading: 'Qué ocurre',
        body: 'Tras pulsar el SOS, el reloj muestra «Sin respuesta». El reloj llama en orden a un máximo de 3 contactos de emergencia, 30 segundos a cada uno, y repite la ronda 2 veces. Si nadie contesta, avisa a todos los familiares con una notificación en la app.',
      },
      {
        heading: 'Qué comprobar primero',
        steps: [
          'Revisa el orden de los contactos de emergencia (App > Reloj > Contactos de emergencia): el primero debe ser quien tiene más probabilidad de contestar.',
          'Comprueba que los números están completos y escritos con el prefijo correcto.',
          'Pide a cada contacto que permita las llamadas de «Velia SOS» cuando tiene activado No molestar o Concentración.',
          'Recomienda tener siempre 3 contactos de emergencia y no solo uno.',
        ],
      },
      {
        heading: 'Si sigue fallando',
        steps: [
          'Comprueba que los familiares reciben la notificación de SOS en la app (consulta «El familiar no recibe los avisos de SOS»).',
          'Haz una prueba de SOS, avisando antes a los contactos, y comprueba que todos los teléfonos suenan.',
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- Llamadas
  {
    slug: 'reloj-no-recibe-llamadas',
    title: 'El reloj no recibe llamadas',
    category: 'Llamadas',
    lastReviewed: '2026-08-20',
    sections: [
      {
        heading: 'Qué ocurre',
        body: 'Para evitar estafas y llamadas comerciales, el reloj solo recibe llamadas de contactos autorizados (hasta 20). Si el reloj no suena, lo más habitual es que el número no esté autorizado o que esté activado el modo No molestar.',
      },
      {
        heading: 'Qué comprobar primero',
        steps: [
          'En la app, abre Reloj > Contactos autorizados y comprueba que el número de quien llama está en la lista, con el prefijo correcto.',
          'Comprueba que no están activados «No molestar» ni «Horario silencioso» (Ajustes > Sonido).',
          'Sube el volumen del timbre (Ajustes > Sonido > Timbre).',
          'Comprueba que el reloj tiene cobertura móvil.',
          'Comprueba que la suscripción Velia Conecta está activa: las llamadas la necesitan.',
        ],
      },
      {
        heading: 'Si sigue fallando',
        steps: [
          'Reinicia el reloj.',
          'Llama desde otro contacto autorizado para saber si falla con todos los números o solo con uno.',
          'Si solo falla con un número, elimínalo de la lista de contactos autorizados y vuelve a añadirlo.',
        ],
      },
    ],
  },
  {
    slug: 'llamada-no-se-oye-bien',
    title: 'No se oye bien durante la llamada',
    category: 'Llamadas',
    lastReviewed: '2026-07-27',
    sections: [
      {
        heading: 'Qué ocurre',
        body: 'Durante una llamada la persona no oye a su interlocutor, lo oye muy bajo, o se producen ecos, cortes o una voz robótica.',
      },
      {
        heading: 'Qué comprobar primero',
        steps: [
          'Sube el volumen de llamada (Ajustes > Sonido > Volumen de llamada). Tiene 7 niveles.',
          'Activa «Altavoz automático» para que la persona pueda hablar sin acercar el reloj al oído.',
          'Limpia los orificios del altavoz y del micrófono, en el lateral del reloj, con un cepillo suave y seco.',
          'Pide que sujete el reloj a unos 10 centímetros de la boca al hablar.',
          'Comprueba la cobertura: los cortes y la voz robótica suelen indicar poca señal.',
        ],
      },
      {
        heading: 'Si sigue fallando',
        steps: [
          'Reinicia el reloj y haz una llamada de prueba.',
          'Si el problema ocurre con cualquier llamada y con buena cobertura, abre una incidencia de audio con el número de serie.',
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- App del familiar
  {
    slug: 'app-no-inicia-sesion',
    title: 'No puedo iniciar sesión en la app',
    category: 'App del familiar',
    lastReviewed: '2026-09-01',
    sections: [
      {
        heading: 'Qué ocurre',
        body: 'En la app Velia Familia aparece «Correo o contraseña incorrectos», no llega el código de verificación o la app se cierra al entrar.',
      },
      {
        heading: 'Qué comprobar primero',
        steps: [
          'Comprueba que el correo está escrito sin espacios ni errores y que es el mismo con el que se creó la cuenta.',
          'Usa «He olvidado mi contraseña»: el enlace llega por correo y es válido 30 minutos. Revisa también la carpeta de spam.',
          'Recuerda que tras 5 intentos fallidos la cuenta se bloquea durante 15 minutos.',
          'Si no llega el código de verificación por SMS, comprueba que el número es el correcto y que el móvil tiene cobertura.',
          'Actualiza la app a la última versión y vuelve a abrirla.',
        ],
      },
      {
        heading: 'Si sigue fallando',
        steps: [
          'Desinstala y vuelve a instalar la app. No se pierde ningún dato, porque todo está en la nube.',
          'Si el cliente ya no tiene acceso al correo de la cuenta, verifica su identidad antes de iniciar el cambio de correo.',
        ],
      },
    ],
  },
  {
    slug: 'anadir-familiar-cambiar-titular',
    title: 'Cómo añadir a otro familiar o cambiar de titular',
    category: 'App del familiar',
    lastReviewed: '2026-06-25',
    sections: [
      {
        heading: 'Qué ocurre',
        body: 'Cada reloj tiene un titular, que es quien contrató el servicio, y hasta 5 familiares que ven la ubicación y reciben los avisos. Solo el titular puede invitar o quitar familiares y transferir la titularidad.',
      },
      {
        heading: 'Añadir a un familiar',
        steps: [
          'El titular abre la app y entra en Familia > Invitar.',
          'Escribe el correo electrónico del familiar y envía la invitación. Es válida durante 7 días.',
          'El familiar instala la app Velia Familia, crea su cuenta con ese mismo correo y acepta la invitación.',
          'El titular elige qué puede hacer el nuevo familiar: ver la ubicación y recibir avisos de SOS.',
        ],
      },
      {
        heading: 'Cambiar de titular',
        steps: [
          'El nuevo titular debe ser ya uno de los familiares del reloj.',
          'El titular actual abre Cuenta > Transferir titularidad y elige al nuevo titular.',
          'El nuevo titular acepta el cambio en su app y revisa el método de pago, porque la suscripción pasa a su cuenta.',
          'Si el titular actual no puede acceder a la app, verifica su identidad antes de iniciar el cambio.',
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- Notificaciones
  {
    slug: 'familiar-no-recibe-avisos-sos',
    title: 'El familiar no recibe los avisos de SOS',
    category: 'Notificaciones',
    lastReviewed: '2026-09-22',
    sections: [
      {
        heading: 'Qué ocurre',
        body: 'Se ha pulsado el SOS en el reloj, pero el familiar no ha recibido la notificación en su móvil. Es la notificación más importante de la app, por lo que conviene resolverlo cuanto antes.',
      },
      {
        heading: 'Qué comprobar primero',
        steps: [
          'En los ajustes del móvil, comprueba que las notificaciones de Velia Familia están permitidas. En iPhone, activa también «Alertas críticas».',
          'Comprueba que el modo No molestar o Concentración no silencia la app, y permite a Velia Familia saltárselo.',
          'En Android, desactiva el ahorro de batería para la app (Batería > Velia Familia > Sin restricciones).',
          'En la app, abre Ajustes > Avisos y comprueba que «Avisos de SOS» está activado para ese familiar.',
          'Comprueba que el móvil tiene conexión de datos o Wi-Fi.',
        ],
      },
      {
        heading: 'Si sigue fallando',
        steps: [
          'Cierra sesión en la app, vuelve a entrar y haz una prueba de SOS avisando antes a la familia.',
          'Comprueba con el titular que el familiar sigue en la lista de Familia.',
          'Recuerda al cliente que, además de la notificación, el SOS llama por teléfono a los contactos de emergencia.',
        ],
      },
    ],
  },
  {
    slug: 'notificaciones-con-retraso',
    title: 'Las notificaciones llegan con retraso',
    category: 'Notificaciones',
    lastReviewed: '2026-08-08',
    sections: [
      {
        heading: 'Qué ocurre',
        body: 'Los avisos de la app llegan con minutos u horas de retraso respecto al momento en que ocurrieron en el reloj.',
      },
      {
        heading: 'Qué comprobar primero',
        steps: [
          'Desactiva el ahorro de batería y el ahorro de datos del móvil para la app Velia Familia, porque restringen su actividad en segundo plano.',
          'En iPhone, comprueba que está permitida la actualización en segundo plano (Ajustes > General > Actualización en segundo plano).',
          'Comprueba que el móvil tiene una conexión de datos o Wi-Fi estable.',
          'Ten en cuenta que los avisos de zona segura pueden tardar hasta 5 minutos, o 30 con el modo ahorro del reloj, porque dependen de la frecuencia de ubicación.',
          'Actualiza la app a la última versión.',
        ],
      },
      {
        heading: 'Si sigue fallando',
        steps: [
          'Compara la hora del suceso en el Historial de la app con la hora a la que llegó la notificación al móvil.',
          'Abre una incidencia indicando ambas horas y el modelo del móvil del familiar.',
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- Suscripción
  {
    slug: 'suscripcion-caducada-pago-rechazado',
    title: 'La suscripción aparece caducada o el pago fue rechazado',
    category: 'Suscripción',
    lastReviewed: '2026-09-09',
    sections: [
      {
        heading: 'Qué ocurre',
        body: 'En la app aparece «Suscripción caducada» o «Pago rechazado». Sin la suscripción Velia Conecta, el reloj no envía ubicación a la app, no avisa a los familiares ni hace llamadas. Tras fallar un pago hay un periodo de gracia de 7 días, con reintentos automáticos. Pasado ese plazo, solo sigue funcionando el botón SOS, que llama al primer contacto de emergencia.',
      },
      {
        heading: 'Qué comprobar primero',
        steps: [
          'El titular abre la app y entra en Cuenta > Suscripción > Método de pago.',
          'Comprueba que la tarjeta no ha caducado, que tiene saldo y que permite pagos por internet.',
          'Pulsa «Reintentar pago».',
          'Si el titular pagó desde la App Store o Google Play, comprueba el método de pago en la tienda.',
          'Tras un pago correcto, el servicio vuelve en pocos minutos. Si no, reinicia el reloj.',
        ],
      },
      {
        heading: 'Si sigue fallando',
        steps: [
          'Si el banco rechaza el pago, pide al titular que contacte con su banco o que pruebe con otra tarjeta.',
          'Si el pago se ha cobrado pero la suscripción sigue caducada pasada 1 hora, abre una incidencia de facturación adjuntando el justificante.',
        ],
      },
    ],
  },
  {
    slug: 'cancelar-cambiar-plan',
    title: 'Cómo cancelar la suscripción o cambiar de plan',
    category: 'Suscripción',
    lastReviewed: '2026-07-14',
    sections: [
      {
        heading: 'Qué ocurre',
        body: 'Solo el titular puede cancelar la suscripción o cambiar de plan. Al cancelar, el servicio sigue activo hasta el final del periodo ya pagado. Un cambio de plan se aplica en la siguiente renovación.',
      },
      {
        heading: 'Cancelar la suscripción',
        steps: [
          'El titular abre la app y entra en Cuenta > Suscripción > Gestionar.',
          'Pulsa «Cancelar suscripción» y confirma.',
          'Recibirá un correo de confirmación con la fecha en que terminará el servicio.',
          'Si contrató desde la App Store o Google Play, debe cancelar desde la propia tienda.',
        ],
      },
      {
        heading: 'Cambiar de plan',
        steps: [
          'El titular entra en Cuenta > Suscripción > Gestionar > Cambiar de plan.',
          'Elige el plan nuevo y confirma el cambio.',
          'El plan nuevo se aplica en la próxima renovación.',
        ],
      },
      {
        heading: 'Qué pasa al terminar el servicio',
        body: 'Al acabar el periodo pagado el reloj deja de enviar ubicación y de recibir llamadas. El botón SOS seguirá llamando al primer contacto de emergencia. Conviene avisar al cliente para que la familia lo tenga en cuenta.',
      },
    ],
  },

  // ---------------------------------------------------------------- Actualizaciones
  {
    slug: 'actualizacion-a-medias',
    title: 'La actualización del reloj se queda a medias',
    category: 'Actualizaciones',
    lastReviewed: '2026-08-30',
    sections: [
      {
        heading: 'Qué ocurre',
        body: 'La barra de progreso lleva mucho tiempo parada, el reloj muestra «Actualizando» durante más de 30 minutos o se reinicia una y otra vez. Una actualización normal dura entre 10 y 15 minutos.',
      },
      {
        heading: 'Qué comprobar primero',
        steps: [
          'No apagues el reloj ni lo quites de la base mientras se actualiza. Necesita al menos un 30 % de batería y una conexión Wi-Fi o móvil estable.',
          'Si lleva más de 30 minutos sin avanzar, coloca el reloj en la base de carga y espera 10 minutos más.',
          'Si sigue igual, haz un reinicio forzado: mantén pulsado el botón lateral 10 segundos.',
          'Cuando el reloj encienda, abre en la app Reloj > Buscar actualizaciones y repite la actualización conectado a una red Wi-Fi.',
        ],
      },
      {
        heading: 'Si sigue fallando',
        steps: [
          'Si el reloj se reinicia en bucle después de dos reinicios forzados, no sigas intentándolo.',
          'Abre una incidencia de reparación con el número de serie y la versión de software que intentaba instalar.',
        ],
      },
    ],
  },
]
