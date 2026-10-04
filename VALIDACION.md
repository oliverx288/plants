# Validación de Faro

Este documento recoge **qué se ha probado, cómo y con qué resultado**, y deja claro **dónde** se verificó
cada cosa, porque no es lo mismo.

| Marca | Significa |
|---|---|
| ✅ **Real** | Comprobado por la autora contra su proyecto de Supabase real |
| 🧪 **Local** | Comprobado con tests automáticos sobre un Postgres real en local (PGlite) o con un Supabase simulado. Fiable para la lógica y el SQL; no sustituye a una prueba real |
| ⏳ **Pendiente** | Hay que ejecutarlo contra el Supabase real y pegar aquí el resultado (instrucciones incluidas) |

Pruebas automáticas: **399 tests en 25 archivos**, todos en verde (`npm test`), más typecheck y lint limpios.
Cada bloque de tests se validó además con **pruebas de mutación**: se rompió el código a propósito y se
comprobó que algún test fallaba. Las mutaciones que sobrevivieron se anotan donde corresponde.

---

## 1. Features: user story, cómo probarla y limitaciones

### 1.1 Login con roles
**User story.** *Como equipo de soporte, quiero entrar con mi cuenta y que cada persona tenga solo los permisos
de su rol.*

**Cómo probarla.** Entra como `lucia@velia-demo.test` (muestra «Agente») y como `nuria@velia-demo.test`
(muestra «Editor»). Prueba una contraseña incorrecta.

| Comprobación | Resultado |
|---|---|
| Lucía entra y ve su nombre y rol «Agente» | ✅ Real |
| Nuria entra y ve su nombre y rol «Editor» | ✅ Real |
| Contraseña incorrecta → «Correo o contraseña incorrectos» (mensaje genérico, no revela qué correos existen) | ✅ Real |
| Rutas protegidas, cuenta sin perfil sin acceso, rol leído de la base de datos y no de `user_metadata`, redirección tras login sin *open redirect* | 🧪 Local (14 + 11 + 8 + 3 tests) |

**Limitaciones.** Sin MFA ni recuperación de contraseña en la interfaz. Sin límite de intentos propio (solo el
de Supabase Auth). La sesión vive en `localStorage`.

### 1.2 Lista y detalle de artículos
**User story.** *Como agente, quiero leer los artículos por categoría para consultar un procedimiento completo.*

**Cómo probarla.** Entra en «Artículos»: 9 categorías, 21 artículos. Abre «La ubicación no se actualiza» y añade
`#seccion-1` a la URL.

| Comprobación | Resultado |
|---|---|
| 9 categorías y 21 artículos visibles | ✅ Real |
| Detalle con 3 secciones y pasos numerados | ✅ Real |
| `#seccion-1` resalta la sección «Qué comprobar primero» | ✅ Real |
| Contenido con HTML (`<script>`, `<img onerror>`) se muestra como texto y no se ejecuta; ids mal formados no llegan a la BD | 🧪 Local |

**Limitaciones.** Sin buscador de texto en la lista (para eso está el asistente). Sin paginación (21 artículos).

### 1.3 Asistente
**User story.** *Como agente de soporte, quiero escribir la duda del cliente en lenguaje natural y recibir los
pasos para resolverla con el artículo citado, para resolver la llamada rápido sin buscar en varios sitios.*

**Cómo probarla.** Pregunta «El reloj no envía la ubicación a la app del familiar» y «¿Es resistente al agua?».

| Comprobación | Resultado |
|---|---|
| La primera responde con los pasos del artículo correcto y **fuente enlazada** | ✅ Real |
| «¿Es resistente al agua?» → «No tengo información sobre esto» y **guarda la pregunta** | ✅ Real |
| «¿Cómo vincular el reloj?» responde con los pasos correctos | ✅ Real |
| Mismo comportamiento como Nuria | ✅ Real |
| Fiabilidad con 41 preguntas (sección 2) | ✅ Real (idéntica a la local) |
| La respuesta es texto literal del artículo; si nada supera el umbral no se llama al generador; órdenes dentro de artículos o preguntas son datos inertes | 🧪 Local |
| Cada respuesta pide comprobar que el artículo corresponde a la duda; si la coincidencia es débil (puntuación < 0,4) hay un aviso reforzado; **nunca** un mensaje de «alta confianza» (5 mutaciones detectadas; axe con contraste, móvil y CSP verificados en navegador real) | 🧪 Local |

**Limitaciones.** No entiende sinónimos ni erratas (sección 2.4) y, lo más importante, **inventa respuestas en ~41 % de las preguntas sin artículo cercanas al dominio** (§2.7). Solo devuelve un artículo (no sugiere
«quizá te interese»). Sin LLM, por decisión de diseño de esta versión.

### 1.4 Preguntas sin respuesta
**User story.** *Como responsable de la documentación, quiero ver qué preguntas se quedaron sin respuesta, para
saber qué artículos faltan.*

**Cómo probarla.** Como Lucía, pregunta algo sin respuesta. Como Nuria, abre «Preguntas sin respuesta».

| Comprobación | Resultado |
|---|---|
| Nuria ve «¿Es resistente al agua?» en su panel | ✅ Real |
| El agente puede registrar la suya pero **no leer** las de nadie; no duplica la misma pregunta | 🧪 Local (RLS sobre Postgres real) |
| Preguntas repetidas se agrupan («Preguntada 2 veces») y se marcan como resueltas en bloque | 🧪 Local |

**Limitaciones.** No se pueden borrar desde la interfaz (la política de RLS lo permite al editor; no se ofrece
para mantener pocas funciones). Las preguntas pueden contener datos personales si el agente los escribe: la
interfaz lo desaconseja con un aviso.

### 1.5 Gestión de artículos (editor)
**User story.** *Como responsable de la documentación, quiero crear, editar y borrar artículos.*

**Cómo probarla.** Como Nuria: «Crear un artículo con esta duda» desde una pregunta sin respuesta; edítalo;
bórralo.

| Comprobación | Resultado |
|---|---|
| Crear desde una pregunta, con categoría, encabezado y paso | ✅ Real |
| **Ciclo completo:** Lucía vuelve a preguntar «¿Es resistente al agua?» y el asistente responde con el artículo nuevo y su fuente | ✅ Real |
| Lucía **no ve** «Nuevo artículo», «Editar artículo» ni «Preguntas sin respuesta» | ✅ Real |
| Nuria edita y borra; la base queda como estaba | ✅ Real |
| Guardado atómico (si falla, no queda nada a medias), validación igual a los `CHECK`, borrado con confirmación, comprobación de filas afectadas | 🧪 Local (24 + 24 tests) |

**Limitaciones.** Sin control de concurrencia (gana el último en guardar). Sin historial de cambios. Las
secciones se reemplazan enteras en cada guardado (sus ids internos cambian; los enlaces usan la posición).

### 1.6 Valoración de las respuestas («¿Te sirvió?»)
**User story.** *Como responsable de la documentación, quiero saber qué respuestas no sirvieron a quien las usó, para
medir la fiabilidad con uso real y no solo con preguntas escritas por quien hizo el sistema.*

**Cómo probarla.** Como Lucía, pregunta algo con respuesta y pulsa «Sí, me sirvió» o «No me sirvió» (puedes
cambiar de opinión). Como Nuria, abre «Valoraciones».

| Comprobación | Resultado |
|---|---|
| Aplicar la migración `…_answer_feedback.sql` y valorar como Lucía: el botón aparece tras una respuesta y muestra «Gracias por tu valoración.» | ✅ Real |
| Verlo como Nuria en «Valoraciones» | ⏳ Pendiente (no reportado todavía) |
| La valoración se guarda y se actualiza si cambia de opinión (no se duplica); el título del artículo lo pone el servidor; si el artículo se borra, la valoración se conserva | 🧪 Local (14 tests sobre Postgres real) |
| El agente solo ve y cambia las suyas; no puede valorar a nombre de otra persona, cambiar la pregunta o el artículo, ni borrar; solo el editor ve todas | 🧪 Local (RLS; 5 mutaciones detectadas) |
| Si falla el guardado se dice y **no** se marca como hecha; nunca se muestra el error crudo; las agrupadas ignoran mayúsculas y no mezclan positivas con negativas | 🧪 Local |
| Accesibilidad con axe en navegador real (incluido contraste) y sin desbordamiento a 390 px | 🧪 Local |

**Limitaciones.** El porcentaje de «respuestas útiles» con pocas valoraciones es orientativo (la pantalla lo avisa por
debajo de 30). No hay comentario libre: solo sí/no. Las preguntas guardadas pueden contener datos personales si el
agente los escribe (la interfaz lo desaconseja).

### 1.7 Sistema de diseño y accesibilidad
Tokens de color, tipografía y espaciado; componentes reutilizables. Contrastes medidos con un script:
texto 7,2–15,5:1, botón primario 5,8:1, borde de controles 4,2:1 (todos ≥ WCAG AA). Foco visible, enlace «saltar
al contenido», estado activo no solo por color, objetivos táctiles de 44 px, sin desbordamiento horizontal a
390 px (comprobado en un navegador real, 🧪).

**Auditoría con axe-core en un navegador real 🧪** (WCAG 2.0/2.1/2.2 A y AA + buenas prácticas) sobre **12
pantallas y estados**: login, asistente (vacío, con respuesta, sin información, con error de validación),
artículos, detalle, editor (con errores de validación y con la confirmación de borrado abierta), preguntas sin
respuesta, y dos vistas móviles.

| Resultado | Detalle |
|---|---|
| **9 de 12 sin ninguna violación** | |
| **1 violación real, en 3 vistas del editor** | `heading-order`: los títulos «Sección N» eran `<h3>` justo debajo del `<h1>`, saltándose el nivel 2. **Corregido** (ahora `<h2>`) |
| «Contraste por revisar a mano» en 2–5 elementos | Son solo **iconos de texto** (✕, ↑, ↓): axe no puede calcular el contraste de un glifo. Usan los mismos tokens ya medidos. No son violaciones |

Para que no vuelva a pasar, la auditoría axe forma parte de `npm test` (jsdom: estructura, ARIA, etiquetas,
encabezados, nombres accesibles; **no** contraste). Se comprobó con mutaciones que reintroducir el salto de
encabezados, quitar una etiqueta de formulario o un nombre accesible, o quitar `role="alert"` a los avisos de
error hace fallar algún test (esta última sobrevivía y se añadió un test).

**Limitación: no se ha hecho una prueba manual con lector de pantalla** (NVDA, VoiceOver…) ni se ha medido el
contraste con axe en un navegador de la autora. axe detecta de forma automática solo una parte de los problemas
de accesibilidad.

---

## 2. Pruebas de fiabilidad

> ### ⚠️ Corrección importante (leer primero)
> Esta sección contaba inicialmente «85,4 % de aciertos y 0 respuestas inventadas». **Eso es cierto solo para el
> conjunto original de 41 preguntas, que resultó ser el caso fácil.** Al medir con **dos conjuntos nuevos de
> preguntas** (59 en total, escritos después, con preguntas *adversarias*) el resultado es muy distinto:
> **56 % de aciertos y 12 de 29 preguntas sin artículo contestadas con un artículo equivocado (41 %)**. La
> cifra «0 inventadas» **no debe citarse como garantía**. Los resultados completos están en §2.7.

**Cómo se ejecuta.** `npm run reliability` (Postgres local) y `npm run reliability:live` (tu Supabase).
Usan **la misma función de búsqueda SQL y el mismo umbral que la aplicación**.

### 2.1 Método
- **41 preguntas** (`supabase/reliability/questions.ts`): 25 con artículo y **16 sin él**, escritas con el
  lenguaje de un agente (sinónimos, jerga, una errata, preguntas cercanas al dominio como «¿Se puede pagar con
  Bizum?»).
- **Dos conjuntos definidos antes de medir:** *desarrollo* (20, se usó para calibrar el umbral) y *test
  retenido* (21, solo para medir). Así se sabe si una mejora generaliza.
- Cada pregunta se clasifica por **gravedad**: *correcta*; *no encontrada* (había artículo y dijo «No tengo
  información»: molesta, pero honesto); *otro artículo* (error grave); *inventada* (no había artículo y
  respondió: el peor).

### 2.2 Resultados

| | Aciertos | Con artículo | Sin artículo | Inventadas | Otro artículo | No encontrada |
|---|---|---|---|---|---|---|
| **Línea base** (umbral inicial) | 78,0 % | 64,0 % | 100 % | 0 | 2 | 7 |
| **Final — total** | **85,4 %** (IC 95 %: 72–93 %) | 76,0 % | **100 %** | **0** | 2 | 4 |
| Final — desarrollo (12+8) | 90,0 % | 83,3 % | 100 % | 0 | 1 | 1 |
| Final — **test retenido** (13+8) | **81,0 %** (IC 95 %: 60–92 %) | 69,2 % | 100 % | 0 | 1 | 3 |

- **Cuando responde, acierta el 90,5 %** de las veces.
- La búsqueda sola (sin umbral) acierta a la 1.ª el 88 % y entre las 3 primeras el 92 %.
- ✅ **Real:** `npm run reliability:live` contra el Supabase real dio **exactamente** los mismos números y los
  mismos 6 fallos con las mismas puntuaciones que el Postgres local (85,4 %, 0 inventadas).

### 2.3 Qué se mejoró (y qué no)

**Mejora: recalibrar el umbral.** La línea base usaba una proporción mínima (0,33), que se solapaba entre
respuestas buenas y malas. En desarrollo, la señal que separaba era la **evidencia absoluta** (cuánto casó,
ponderado por lo específico de cada palabra y por dónde casa): las preguntas sin artículo no pasaron de 3,0 y
las correctas estaban en 3,8 o más. Se fijó en **3,5** (≈ una palabra muy específica en el título, o dos
medianamente específicas).

**Lo que NO generalizó:** el umbral subió el conjunto de desarrollo del 75 % al 90 %, pero el **test retenido se
quedó en el 81 % antes y después**. Si solo se hubiera medido en desarrollo, habría salido «90 %», un número
engañoso. Los fallos del test retenido eran todos de vocabulario (ver 2.4), no de umbral.

**La curva del umbral** (sobre las 41 preguntas, informativa; no se usó para elegirlo):

| Evidencia mínima | Aciertos | Inventadas | Otro artículo | No encontradas |
|---|---|---|---|---|
| 2,0 | 63,4 % | 9 | 2 | 4 |
| 2,5 | 68,3 % | 7 | 2 | 4 |
| 3,0 | 75,6 % | 4 | 2 | 4 |
| **3,5 (actual)** | **85,4 %** | **0** | 2 | 4 |
| 4,0 | 80,5 % | 0 | 2 | 6 |
| 4,5 | 78,0 % | 0 | 2 | 7 |
| 5,0 | 70,7 % | 0 | 2 | 10 |

3,5 es el codo: por debajo aparecen respuestas inventadas, por encima se pierden respuestas correctas. **El
margen es estrecho**: ya a 3,0 hay cuatro inventadas. Por eso el proyecto prioriza «no inventar» sobre
«responder más».

### 2.4 Fallos conocidos (los 6 de las 41 preguntas)

| Pregunta | Qué pasó | Causa |
|---|---|---|
| «…el reloj se queda sin batería a **media** tarde» | Respondió con *actualización a medias* | Colisión de raíces: «media» y «medias» → `medi` |
| «Quiero darme de **baja** del servicio» | No la encontró (evidencia 2,1) | Sinónimo: baja ≠ cancelar |
| «Cómo añado a mi hermano para que vea **dónde está** mamá» | No la encontró | Sin palabras en común con el artículo |
| «El reloj no coge **señal**, pone sin red» | No la encontró (evidencia 2,9, a las puertas) | Sinónimo: señal ≠ cobertura |
| «Nadie contesta cuando se activa la **alarma** de emergencia» | Respondió con *falsa alarma* (otro artículo de SOS) | Sinónimo: alarma ≈ SOS |
| «La **baterya** se acaba enseguida» | No la encontró | Errata |

### 2.5 Limitaciones de esta medición (leer antes de citar los números)
1. **«0 inventadas de 16» no es «0 %».** El intervalo de confianza al 95 % para la tasa real de respuestas
   inventadas llega hasta ~**19 %**. Con 16 preguntas sin respuesta no se puede afirmar más.
2. **Las preguntas las escribió quien también escribió el sistema**; son más benévolas que las de agentes reales.
   Lo ideal es que el equipo de soporte añada las suyas, sobre todo preguntas sin respuesta cercanas al dominio.
3. **El conjunto de test retenido quedó «gastado»** al diagnosticar sus fallos. Nuevas mejoras deben medirse con
   preguntas nuevas.
4. Con 41 preguntas, los intervalos de confianza son anchos (el del test retenido va del 60 al 92 %).
5. Una mutación sobrevivió en este test (quitar el tratamiento de acentos): todas las preguntas llevan acentos.
   Esa propiedad la cubren los tests de SQL (`supabase/tests/search.test.ts`), que sí fallan.

### 2.6 Garantías automáticas de regresión
*(Son garantías de «no empeorar», no objetivos de calidad. Las del caso difícil están fijadas en el nivel actual, que es malo; ver §2.7.)*
`npm run reliability` falla si: hay **alguna respuesta inventada**; hay más de 2 respuestas con otro artículo; la
fiabilidad de lo que responde baja del 85 %; los aciertos totales bajan del 80 % (75 % en el test retenido); la
búsqueda sola deja de encontrar el artículo entre los 3 primeros en al menos el 85 %; o el conjunto de desarrollo
supera en más de 15 puntos al retenido (señal de sobreajuste). Se comprobó que bajar el umbral, quitarlo, o
quitar la ponderación por campo o por rareza hace fallar el test.

### 2.7 Conjuntos nuevos y adversarios: el resultado real

**Por qué existen.** El conjunto original (§2.1–2.6) se usó para calibrar el umbral y luego se «gastó» al
diagnosticar sus fallos. Para saber si el sistema aguanta preguntas que no se han mirado, se escribieron dos
conjuntos nuevos, **antes** de implementar nada:

- **Nuevo 1** (28 preguntas: 14 con artículo, 14 sin él) y **Nuevo 2** (31: 16 con artículo, 15 sin él, escrito
  *después* de analizar el Nuevo 1 y *antes* de decidir ningún cambio: es la comprobación **fuera de muestra**).
- Incluyen preguntas **adversarias**: usan vocabulario del dominio para algo que no está cubierto
  («¿Aceptan pagos con PayPal?», «¿Puedo pagar la suscripción en tres plazos?», «¿Cómo activo la detección de caídas?»).

| | Preguntas | Aciertos | Con artículo (recall) | Sin artículo | **Inventadas** | Otro artículo | No encontrada |
|---|---|---|---|---|---|---|---|
| Original (fácil) | 41 | 85,4 % | 76 % | 100 % | **0 de 16** | 2 | 4 |
| Nuevo 1 | 28 | 50,0 % | 42,9 % | 57,1 % | **6 de 14** | 2 | 6 |
| Nuevo 2 (fuera de muestra) | 31 | 61,3 % | 62,5 % | 60,0 % | **6 de 15** | 3 | 3 |
| **Nuevos 1 + 2** | **59** | **55,9 %** (IC 95 %: 43–68 %) | | | **12 de 29 (41 %)** | 5 | 9 |

En el Nuevo 2, de lo que el asistente responde solo el **52,6 %** es correcto.

**Por qué ocurre (diagnóstico).** El umbral mide cuánto de la pregunta coincide con un fragmento, pero **no sabe
distinguir «palabras del tema» de «palabras de relleno»** ni «pagos» como tema de «pagos» como algo que no está
cubierto. Ejemplos reales:
- «¿Se puede cambiar el **idioma** del reloj?» → casa `cambi` (de «cambiar de titular») y `pued` («puede»). La palabra
  decisiva, `idioma`, no existe en ningún artículo y aun así no frena la respuesta.
- «¿Aceptan **pagos** con **PayPal**?» → casa `acept` («acepta la invitación») y `pag` (suscripción).
- Palabras como `pued`, `quier`, `cuent`, `sal` o `nuev` **no son palabras vacías** para Postgres y cuentan como evidencia.

**Qué se probó para arreglarlo (y por qué no se hizo).** Una rejilla de umbrales sobre las 69 preguntas vistas
parecía resolverlo: con puntuación mínima 0,4 daba **0 inventadas**. **Fuera de muestra no se sostuvo:**

| Umbral (Nuevo 2, fuera de muestra) | Aciertos | Inventadas (de 15) | Con artículo respondidas bien |
|---|---|---|---|
| Actual (puntuación ≥ 0,2) | 61,3 % | **6** | 62,5 % |
| Candidato (puntuación ≥ 0,4) | 58,1 % | 2 | **31,3 %** |

El «0 inventadas» del candidato era **sobreajuste**: dentro de la muestra daba 0, fuera da 2, y a cambio se pierde
la mitad de las respuestas correctas. Con búsqueda por palabras, **la fiabilidad se compra con cobertura**.

**Conclusión.** Con la tecnología de esta versión (búsqueda léxica, sin LLM) **no se puede cumplir «nunca
inventa» para preguntas sin artículo cercanas al dominio**. Mitigaciones existentes: se cita siempre la fuente (el
agente ve de qué artículo sale), las respuestas son texto literal y existe la valoración «¿Te sirvió?» para medir
el problema con uso real. La solución de fondo es **semántica** (embeddings o un LLM como verificador con las
defensas de [`docs/PROMPT-INJECTION.md`](docs/PROMPT-INJECTION.md)).

**Mitigación en la interfaz (decidida con la autora).** No se toca la búsqueda. Cada respuesta se encabeza con
el artículo del que sale y la petición de comprobar que corresponde a la duda del cliente. Además, la puntuación sí
distingue las respuestas más dudosas (medido sobre las 54 respuestas que el asistente dio a las 100 preguntas de los
cuatro conjuntos; **en muestra, informativo**):

| Puntuación de la respuesta | Respondidas | Correctas | Fiabilidad |
|---|---|---|---|
| 0,20 – 0,39 («coincidencia débil») | 26 | 12 | **46 %** (30 % y 45 % en los dos conjuntos difíciles) |
| ≥ 0,40 | 28 | 23 | 82 % (75 % y 63 % en los difíciles) |

Por eso la banda débil lleva un aviso reforzado. **Pero la banda alta también falla** (5 de 28, incluida una respuesta
equivocada con puntuación 0,60: «¿Cómo hablo con una persona?»), así que **nunca se muestra un mensaje de «alta
confianza»** y hay un test que lo impide. El aviso reduce el riesgo; **no lo elimina**: depende de que el agente lea y
compruebe.

**Limitaciones de esta medición.** Las preguntas las escribió quien hizo el sistema (y sabía qué buscaba); 29
preguntas sin artículo dan un intervalo muy ancho (la tasa real de inventadas podría estar entre ~25 % y ~59 %);
el Nuevo 1 ya se miró fallo a fallo, así que solo el Nuevo 2 es estrictamente fuera de muestra.

### 2.8 Consultas cortas y coloquiales (hallazgo real de la autora)

**El hallazgo.** Probando la aplicación, la autora vio que `el reloj no carga` devolvía «No tengo información» aunque
**es literalmente el título de un artículo**, mientras que una frase larga sí funcionaba. Ningún conjunto de pruebas
lo detectó: todas las preguntas eran frases largas.

**Diagnóstico.** La consulta coincide al **100 %** con el título (puntuación 1,00) y el artículo correcto es el primero,
pero el umbral exige una *evidencia absoluta* ≥ 3,5, que se calibró para rechazar palabras sueltas como «reloj». Una
consulta corta tiene pocas palabras y suma poco peso (2,9) aunque coincida del todo. **Fue un fallo de diseño del
umbral, no un problema de sinónimos.**

**Método.** Se escribió un conjunto de **32 consultas cortas** (20 con artículo y 12 sin él: palabras sueltas, saludos,
consultas vagas) y se midió **antes** de cambiar nada: 78,1 % de aciertos y 70 % de recall; 5 de las 6 que no encontraba
tenían puntuación 1,00 con el artículo correcto primero.

**Solución: «coincidencia completa»** (una segunda vía que se suma a la general, no la sustituye). Se acepta solo si se
cumplen **todas** estas condiciones: (1) coinciden todos los términos significativos de la pregunta; (2) son **al menos
2** (una palabra suelta sigue rechazada); (3) puntuación ≥ 0,9, es decir, coinciden en el título; (4) evidencia mínima
2,0; (5) **sin empate**: el siguiente artículo queda ≥ 0,1 por debajo, y la regla solo se aplica al primer resultado.
Requiere la migración `…_search_matched_terms.sql` (la función devuelve cuántos términos coinciden); sin ella, la vía
nueva simplemente no se activa.

| Conjunto | Aciertos antes → después | Inventadas antes → después |
|---|---|---|
| Original (41), Nuevo 1 (28), Nuevo 2 (31) | **idénticos** | **idénticas** (0, 6 y 6) |
| **Cortas (32)** | 78,1 % → **87,5 %** (recall 70 % → 85 %) | 1 → 1 |

La evidencia independiente de que **no daña** es la primera fila: en las 100 preguntas anteriores el resultado no cambió
en ninguna. Un test lo vigila (la regla no puede añadir inventadas ni cambiar nada fuera de las cortas). Se recuperaron
`el reloj no carga`, `no recibe llamadas` y `la ubicación no se actualiza`.

**Un fallo cazado por los tests durante el desarrollo.** La primera versión de la regla comparaba cada resultado solo con
el *siguiente*; en un empate, el segundo no tenía siguiente y se colaba como «sin rival», contestando con el artículo
equivocado. Se corrigió aplicándola solo al primer resultado. Además, una mutación sobrevivió (el test del límite de
evidencia se calculaba a partir de la propia constante) y se fijaron los límites con valores literales.

### 2.9 Consultas muy cortas, vagas y con erratas («no enciende», «bateria», «no carga»)

**Petición.** Que el asistente entienda frases cortas e imprecisas: `no enciende`, `bateria` (con errata), `no carga`.

**Diagnóstico de lo que fallaba** (medido antes de tocar nada):

| Consulta | Qué pasaba |
|---|---|
| `no enciende`, `no carga` | «no» es palabra vacía, así que queda **un solo** término significativo. El artículo correcto era el primero con puntuación 1,00, pero la regla de §2.8 exigía ≥ 2 términos. |
| `bateria` | Dos artículos coinciden por igual en el título («La batería dura poco» y «El reloj se apaga solo con batería disponible»): **empate real**, no hay forma de saber cuál busca. |
| `baterai`, `bateira` | La palabra no existe en ningún artículo, así que no coincidía con nada. |

**Tres cambios, cada uno con su límite:**

1. **Una sola palabra gana si lo hace con claridad.** Con un único término significativo se exige más que con varios:
   puntuación ≥ 0,9, evidencia ≥ 1,5 y **margen ≥ 0,3** sobre el siguiente artículo (con ≥ 2 términos basta 0,1). Quiere
   decir: el término está en el título de un único artículo y, como mucho, en el cuerpo de los demás. Una palabra
   genérica («reloj», «problema») no pasa. Cubre `no enciende`, `no carga`, `se apaga`, `pago`.
2. **Los empates se ofrecen como sugerencias, no se responden.** Si varios artículos coinciden por completo (máximo 3) la
   interfaz dice «Varios artículos podrían servir» y enseña **solo títulos con enlace, sin pasos**. No se guarda la pregunta
   como «sin respuesta» (sí hay artículos que la cubren). Cubre `bateria` y `el SOS no llama`.
3. **Corrección de erratas en la base de datos** (migración 7, distancia de Levenshtein con `fuzzystrmatch`). Una palabra
   que no existe en los artículos se sustituye por la más parecida del vocabulario solo si: la raíz tiene **≥ 6 letras**,
   hay **una sola candidata** a esa distancia, la primera letra coincide, y la diferencia es **1 error o 1 transposición**.
   Una palabra que existe no se toca nunca.

**Un error que me cazó la propia medición.** La primera versión corregía raíces de 5 letras con hasta 2 errores. Los
conjuntos antiguos pasaron de **0 a 2 respuestas inventadas**: «quiero» (raíz «quier») se convertía en «querer» y «cuesta»
(«cuest») en «cuenta», y con eso «Quiero cambiar la pulsera del reloj» respondía con un artículo de SOS. Se endureció la
regla (arriba) hasta recuperar el 0 y hay tests con esos dos casos exactos. Los tests de la migración se verificaron
rompiéndola a propósito (4 mutaciones: longitud mínima, empate entre candidatas, primera letra, transposición): los
cuatro hacen fallar un test.

| Conjunto | Aciertos antes → después | Inventadas antes → después |
|---|---|---|
| Original (41) | 85,4 % → **85,4 %** (idéntico) | 0 → 0 |
| Nuevo 1 (28) | 50,0 % → 50,0 % | 6 → 6 |
| Nuevo 2 (31) | 58,1 % → **61,3 %** | 6 → 6 |
| Cortas (32) | 87,5 % → **93,8 %** (recall 85 % → 95 %) | 1 → 1 |
| **Muy cortas, vagas y erratas (28, nuevo)** | — → **82,1 %** (recall 69 %; todo lo que responde es correcto: 100 %) | 0 de 12 |

No aparecen respuestas inventadas nuevas en ningún conjunto (un test lo vigila). **Aviso honesto:** el conjunto «muy
cortas, vagas y erratas» lo escribí **después** de implementar los cambios y con ejemplos pensados para ellos, así que
demuestra que funcionan, **no** que generalicen a lo que escriba un agente real. Los otros conjuntos antiguos sí son
evidencia de que no se ha roto nada.

**Resultado de los tres ejemplos del encargo:**

| Consulta | Resultado |
|---|---|
| `no enciende` | ✅ «El reloj no enciende o se queda en el logotipo» |
| `no carga` | ✅ «El reloj no carga» |
| `bateria` / `baterai` | ⚠️ **Sugerencias**: «La batería dura poco» y «El reloj se apaga solo con batería disponible». No responde con una sola porque **hay dos artículos igual de buenos**; decidir por el agente es más honesto que adivinar. |
| `la baterya dura poco`, `no enciedne`, `la batreia dura poco` | ✅ corregidas |

**Lo que sigue sin funcionar (y los tests lo documentan):**
- **Sinónimos**: `no prende`, `darme de baja`. Hace falta una tabla de sinónimos o búsqueda semántica (embeddings).
- **Erratas en palabras cortas** (< 6 letras en la raíz): `no carca`. Es el precio de no inventar: corregirlas rompía otras
  respuestas.
- **Sustituciones que cambian la raíz** (`notificasiones` no llega a coincidir con la raíz de «notificaciones»).

⏳ Pendiente de verificar en tu Supabase real: aplicar la migración 7 y probar `no enciende`, `bateria`, `no carga`.

**Lo que NO resuelve (a propósito).**
- `no enciende` y `no tiene cobertura`: tras quitar palabras vacías solo queda **1** término, indistinguible de «reloj» a
  secas sin reabrir las respuestas inventadas.
- `el SOS no llama`: empata con «nadie contesta el SOS»; es preferible no responder a elegir uno al azar.
- Sinónimos y erratas (§2.4).

**Limitación de esta medición.** El conjunto de cortas se escribió **después** del hallazgo, así que demuestra que la regla
arregla ese patrón, no que generalice a otros; la prueba de que no daña es la de las 100 preguntas anteriores.

---

## 3. Pruebas de seguridad

Principio: *el frontend solo muestra u oculta; la seguridad la aplica el servidor.*

### 3.1 Pruebas automáticas sobre Postgres real 🧪
`supabase/tests/rls.test.ts` (33), `search.test.ts` (26), `search_typos.test.ts` (12), `save_article.test.ts` (24) y `feedback.test.ts` (14) ejecutan **las migraciones
reales** y comprueban con roles reales de Postgres (`anon`, `authenticated`) y RLS activa:

- RLS activada en **todas** las tablas (un test falla si se añade una tabla sin ella).
- El agente **no puede** insertar, editar ni borrar artículos ni secciones (RLS devuelve **0 filas**, sin error:
  los tests verifican que el contenido sigue intacto).
- El agente **no puede** ascenderse a editor, crear perfiles, leer preguntas ajenas, suplantar `user_id`,
  marcar preguntas como resueltas, ni cambiar el texto de una pregunta.
- Un usuario de Auth **sin perfil** no ve nada. Un anónimo no tiene ni permiso de ejecución sobre las funciones.
- Entradas hostiles (inyección SQL, operadores de búsqueda, 10 000 caracteres) se tratan como datos.
- Validación en la base de datos (`CHECK`), no solo en el formulario.
- Mutaciones: debilitar políticas, no recortar privilegios por defecto, quitar RLS de una tabla o hacer una
  función `SECURITY DEFINER` hace fallar los tests. Una sobrevivió y se corrigió (el test del `REVOKE` de `anon`
  pasaba por otra capa; se añadió una comprobación directa de privilegios).

### 3.2 Secretos y cabeceras 🧪
`security/secrets.test.ts` (6) y `security/headers.test.ts` (6):

- `.env` no está versionado y está en `.gitignore`; ningún archivo versionado contiene claves (`sb_secret_…`, JWT).
- Un secreto **sin prefijo `VITE_`** presente en el entorno de compilación **no aparece en el JavaScript
  desplegado** (build con valores centinela). El build **falla** si la clave «pública» es en realidad una
  service role.
- Cabeceras: CSP sin `unsafe-inline` ni `unsafe-eval`, conexión solo a `*.supabase.co`, `frame-ancestors 'none'`,
  `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS.
- Verificado en un **navegador real**: 0 violaciones de CSP en 7 rutas (incluido el login) y un `<script>` en
  línea inyectado a mano **fue bloqueado** y no se ejecutó.
- *Hallazgo durante el desarrollo:* con una service role puesta por error como clave pública, la app se negaba a
  arrancar pero el bundle ya contenía la clave. Se añadió la comprobación en tiempo de **build**.

### 3.3 Intrusión contra la API de Supabase ✅ Real
**Ejecutar:** `npm run security:live` (necesita en `.env` la clave pública y las contraseñas de Lucía y Nuria;
**no** usa la service role).

El script hace **24 intentos de intrusión + 2 controles positivos** y sale con código 1 si alguno falla. Se
dirigen a un **artículo y una pregunta temporales** (se crean y se borran dentro del script), nunca a los
reales. Tras cada intento, la editora **vuelve a leer la base de datos** para verificar que nada cambió: la
respuesta de la API no basta (un `UPDATE` bloqueado por RLS no da error sino 0 filas, y un error podría
esconder un cambio que sí ocurrió).

| Actor | Intentos |
|---|---|
| **Sin sesión** (S1–S5) | leer artículos; ejecutar la búsqueda; insertar un artículo; llamar a `save_article`; leer perfiles y preguntas |
| **Agente** (A2–A10) | insertar artículo (librería **y** `fetch` directo a `/rest/v1` con su token); insertar sección; editar título/categoría; editar sección; borrar secciones; borrar artículo; crear y editar con `save_article` |
| **Agente** (A11–A14) | ascenderse a editor (`UPDATE profiles`); crearse un perfil de editor (`upsert`); leer perfiles ajenos; usar la API de administración de usuarios |
| **Agente** (A15–A20) | leer preguntas sin respuesta; registrar una a nombre de otra persona; una de 301 caracteres; marcarla como resuelta; cambiar su texto; borrarla |
| **Controles positivos** (A1, E1) | el agente **sí** puede leer; la editora **sí** puede editar (demuestran que el arnés distingue «permitido» de «bloqueado») |

El propio arnés está probado (12 tests) con un Supabase simulado que se **rompe a propósito**: si se le quita
una protección (borrar, editar, ascender, leer preguntas, `save_article`, `fetch` directo, o toda la RLS), el
arnés marca FALLO exactamente en el intento correspondiente, y detecta incluso una API que «miente» diciendo
«0 filas» cuando sí cambió algo.

**Resultado en el Supabase real: ✅** `npm run security:live` fue ejecutado por la autora contra su proyecto y terminó con
«✓ Todas las protecciones funcionan», **24 de 24 intentos de intrusión bloqueados**. *(Lo comunicó la autora; no se pegó
aquí la salida completa, así que no se incluye el detalle de cada intento.)* Además, D4 y D5 de §3.4 ya eran peticiones
directas a `/rest/v1` con el token del agente y también fallaron como debían.

### 3.4 Desde la interfaz y las DevTools ✅ Real (hecho como Lucía, agente)
Ejecutado por la autora contra su Supabase real. Todos los intentos fallaron como debían. *Única salvedad:* de D5 solo se
reportó `DELETE`; el `PATCH` (editar) no se ha comprobado a mano contra el servidor real (sí lo cubren los tests de RLS y
el arnés de §3.3).

| # | Intento | Esperado | Resultado |
|---|---|---|---|
| U1 | Mirar «Artículos» y un artículo: ¿hay «Nuevo artículo» o «Editar artículo»? | No aparecen | ✅ Real (verificado en la fase 7) |
| U2 | Mirar la cabecera: ¿hay «Preguntas sin respuesta»? | No aparece | ✅ Real (verificado en la fase 7) |
| U3 | Escribir en la barra de direcciones `/articulos/nuevo` | «No tienes permiso para ver esta página»; sin formulario | ✅ «No tienes permiso para ver esta página» |
| U4 | Escribir `/preguntas` | «No tienes permiso…» | ✅ «No tienes permiso para ver esta página» |
| U5 | Escribir `/articulos/<id de un artículo>/editar` | «No tienes permiso…» | ✅ «No tienes permiso para ver esta página» |
| D1 | **DevTools → Network:** al usar el asistente, comprobar que las peticiones llevan solo la clave pública (`apikey`) y el token de Lucía, y que ninguna contiene la service role | Solo clave pública | ✅ |
| D2 | **DevTools → Application → Local Storage:** abrir la sesión guardada y buscar la service role | No está (solo token de Lucía) | ✅ Solo el `access_token` de Lucía; sin `service_role` |
| D3 | **DevTools → Sources/búsqueda global (Ctrl+Shift+F):** buscar `service_role` y `SUPABASE_SERVICE_ROLE_KEY` en el JS cargado | Ningún secreto (solo el texto del mensaje de error) | ✅ Sin resultados para `service_role` en el JS cargado |
| D4 | **DevTools → Consola:** `fetch` a la API con el token de Lucía para **crear un artículo** (snippet abajo) | HTTP 401/403, código `42501`, y el artículo no existe | ✅ **HTTP 403**, código `42501`, «new row violates row-level security policy» |
| D5 | Repetir D4 con **`PATCH`** (editar) y **`DELETE`** (borrar) sobre un artículo | `[]` (0 filas) o error; el artículo sigue igual | ✅ `DELETE` → **HTTP 200 con array vacío** (0 filas); el artículo sigue intacto |
| D6 | **Manipular el token:** cambiar un carácter del `access_token` y repetir una petición | HTTP 401 («JWT invalid») | ✅ **HTTP 401**, «Expected 3 parts in JWT» |

**Snippet para la consola (D4)** — pégalo estando logueada como Lucía, con tu URL y tu clave **pública**:

```js
const k = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
const { access_token } = JSON.parse(localStorage.getItem(k))
const url = 'https://TU-PROYECTO.supabase.co'
const anon = 'TU-CLAVE-PUBLICA'
fetch(`${url}/rest/v1/articles`, {
  method: 'POST',
  headers: { apikey: anon, Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
  body: JSON.stringify({ title: 'Intento desde DevTools', category: 'Prueba' }),
}).then(async (r) => console.log(r.status, await r.json()))
```
Debe imprimir un estado 401/403 y `code: "42501"` («new row violates row-level security policy»). Para D5 usa
`method: 'PATCH'` con `?id=eq.<id>` (y `Prefer: return=representation`) y `method: 'DELETE'`: deben devolver `[]`.

### 3.5 Prompt injection
Hoy no hay LLM, así que la amenaza no puede materializarse; lo que existe se prueba (🧪 17 tests): texto con
órdenes dentro de un artículo o de una pregunta es un **dato inerte**, y la respuesta **no depende** del texto de
la pregunta (propiedad que detectó una mutación que sobrevivía). El diseño para conectar un LLM con seguridad
(9 controles, plantilla de prompt, batería de pruebas) está en
[`docs/PROMPT-INJECTION.md`](docs/PROMPT-INJECTION.md).

---

## 4. Riesgos conocidos y recomendaciones

| Riesgo | Estado | Recomendación |
|---|---|---|
| Registro público abierto en Supabase Auth | ✅ Comprobado **desactivado** por la autora | Mantenerlo así: con el registro abierto, cualquiera podría crear cuentas (sin perfil no ven nada, pero conviene no permitirlo) |
| Sesión en `localStorage` | Aceptado | CSP estricta + nada de HTML sin sanear (ya aplicados) |
| Sin MFA para la cuenta de editor | Pendiente | Activarlo si se usa en serio |
| Sin historial de cambios de artículos | Pendiente | Tabla de auditoría (`articles_history`) |
| Concurrencia entre editores | Pendiente | Control optimista con `updated_at` |
| **Respuestas inventadas (≈ 41 %) en preguntas sin artículo cercanas al dominio** | **Problema conocido y medido (§2.7)** | Valoración «¿Te sirvió?» para medirlo con uso real; la solución de fondo es semántica (embeddings o LLM verificador) |
| Búsqueda léxica | Limitación conocida | Tabla de sinónimos; después, embeddings o un LLM con las defensas de `docs/PROMPT-INJECTION.md` |
| Credenciales de demo en un README público | Decisión de la autora | Que sean de demo, nunca reales |
