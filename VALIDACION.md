# Validación de Faro

Este documento recoge **qué se ha probado, cómo y con qué resultado**, y deja claro **dónde** se verificó
cada cosa, porque no es lo mismo.

| Marca | Significa |
|---|---|
| ✅ **Real** | Comprobado por la autora contra su proyecto de Supabase real |
| 🧪 **Local** | Comprobado con tests automáticos sobre un Postgres real en local (PGlite) o con un Supabase simulado. Fiable para la lógica y el SQL; no sustituye a una prueba real |
| ⏳ **Pendiente** | Hay que ejecutarlo contra el Supabase real y pegar aquí el resultado (instrucciones incluidas) |

Pruebas automáticas: **298 tests en 22 archivos**, todos en verde (`npm test`), más typecheck y lint limpios.
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

**Limitaciones.** No entiende sinónimos ni erratas (sección 2.4). Solo devuelve un artículo (no sugiere
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

### 1.6 Sistema de diseño y accesibilidad
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
`npm run reliability` falla si: hay **alguna respuesta inventada**; hay más de 2 respuestas con otro artículo; la
fiabilidad de lo que responde baja del 85 %; los aciertos totales bajan del 80 % (75 % en el test retenido); la
búsqueda sola deja de encontrar el artículo entre los 3 primeros en al menos el 85 %; o el conjunto de desarrollo
supera en más de 15 puntos al retenido (señal de sobreajuste). Se comprobó que bajar el umbral, quitarlo, o
quitar la ponderación por campo o por rareza hace fallar el test.

---

## 3. Pruebas de seguridad

Principio: *el frontend solo muestra u oculta; la seguridad la aplica el servidor.*

### 3.1 Pruebas automáticas sobre Postgres real 🧪
`supabase/tests/rls.test.ts` (33), `search.test.ts` (26) y `save_article.test.ts` (24) ejecutan **las migraciones
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

### 3.3 Intrusión contra la API de Supabase ⏳ Pendiente de ejecutar
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

**Resultado en el Supabase real:** *(pegar aquí la salida de `npm run security:live`)*. Mientras tanto, **D4 y D5 de §3.4 ya son
peticiones directas a `/rest/v1` con el token del agente contra el servidor real** y fallaron como debían.

```text
⏳ pendiente de ejecutar
```

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
| Tasa real de «inventar» no acotada con precisión | Limitación de la medición (§2.5) | Ampliar las preguntas sin respuesta con casos reales |
| Búsqueda léxica | Limitación conocida | Tabla de sinónimos; después, embeddings o un LLM con las defensas de `docs/PROMPT-INJECTION.md` |
| Credenciales de demo en un README público | Decisión de la autora | Que sean de demo, nunca reales |
