# Faro · asistente de base de conocimiento para soporte técnico

[![CI](https://github.com/oliverx288/plants/actions/workflows/ci.yml/badge.svg)](https://github.com/oliverx288/plants/actions/workflows/ci.yml)

Proyecto de portfolio. **Faro** ayuda a un agente de soporte a resolver una llamada rápido: escribe la duda del
cliente con sus palabras y recibe **los pasos a seguir y el artículo del que salen**, con enlace para
comprobarlo en un clic. Si no hay información, lo dice y lo apunta para que el equipo de documentación sepa qué
artículo falta.

> **La empresa es ficticia.** «Velia» vende un smartwatch con GPS y botón SOS para personas mayores, con una
> app para familiares. Todos los datos (artículos, usuarios, preguntas) son inventados.

<p align="center">
  <img src="docs/screenshots/02-asistente-respuesta.png" alt="El asistente responde con los pasos del artículo y su fuente enlazada" width="720">
</p>

## Qué hace

| Rol | Usuaria de prueba | Puede |
|---|---|---|
| **Agente** | Lucía | Usar el asistente y leer artículos. **No** puede crear, editar ni borrar. |
| **Editor** | Nuria | Todo lo del agente, más crear/editar/borrar artículos, ver las **preguntas sin respuesta** y las **valoraciones** de las respuestas. |

Los tres principios del proyecto:

- **Fiable.** El asistente nunca inventa: responde solo con texto literal de los artículos, cita siempre la
  fuente y dice «No tengo información sobre esto» cuando no encuentra nada.
- **Seguro.** Login real y permisos aplicados **en el servidor** (Row Level Security), no solo ocultando botones.
- **Sencillo y bien terminado.** Pocas funciones, todas con tests.

## Capturas

| | |
|---|---|
| ![Login](docs/screenshots/01-login.png) **Login** | ![Sin información](docs/screenshots/03-asistente-sin-informacion.png) **«No tengo información»** (y se guarda la pregunta) |
| ![Artículos](docs/screenshots/04-articulos.png) **Artículos por categoría** | ![Detalle](docs/screenshots/05-articulo-detalle.png) **Detalle**, con la sección citada resaltada |
| ![Editor](docs/screenshots/06-editor-formulario.png) **Editor** (solo rol editor) | ![Preguntas](docs/screenshots/07-preguntas-sin-respuesta.png) **Preguntas sin respuesta**, agrupadas |
| ![Valoraciones](docs/screenshots/09-valoraciones.png) **Valoraciones** de las respuestas (solo editor) | ![Coincidencia débil](docs/screenshots/10-coincidencia-debil.png) **Aviso de coincidencia débil** |
| ![Importar PDF](docs/screenshots/11-importar-pdf.png) **Importar PDF** (solo editor): borrador para revisar | |

<p align="center"><img src="docs/screenshots/08-movil-asistente.png" alt="Versión móvil" width="260"><br>Responsive (390 px)</p>

> Las capturas se han generado con la aplicación real y el contenido del seed, usando un cliente de Supabase
> simulado. Puedes sustituirlas por capturas de tu despliegue.

## Cómo ejecutarlo

### Requisitos
Node 20 o superior y un proyecto gratuito de [Supabase](https://supabase.com).

### 1. Instalar
```bash
npm install
```

### 2. Preparar Supabase
1. **Authentication → Sign In / Providers:** desactiva **«Allow new users to sign up»**. Solo existirán los
   usuarios del seed.
2. **SQL Editor:** ejecuta, **en este orden**, los archivos de `supabase/migrations/`:
   1. `20261004000001_schema.sql` (tablas y validaciones)
   2. `20261004000002_rls.sql` (RLS y privilegios)
   3. `20261004000003_search.sql` (búsqueda y registro de preguntas sin respuesta)
   4. `20261004000004_save_article.sql` (guardado atómico de artículos)
   5. `20261004000005_answer_feedback.sql` (valoración «¿Te sirvió?» de las respuestas)
   6. `20261004000006_search_matched_terms.sql` (la búsqueda devuelve cuántos términos coinciden; permite aceptar consultas cortas y precisas como «el reloj no carga»)
   7. `20261004000007_search_typos.sql` (tolerancia a erratas: «baterai» → «batería»)
3. **Project Settings → API Keys:** copia la clave **pública** (anon / publishable) y la **service role** (secreta).

### 3. Variables de entorno
Copia `.env.example` a `.env` (está en `.gitignore`) y rellénalo:

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | URL de tu proyecto |
| `VITE_SUPABASE_ANON_KEY` | clave **pública** |
| `SUPABASE_SERVICE_ROLE_KEY` | clave **secreta**. Solo para el seed, en tu máquina. **Nunca** con prefijo `VITE_` |
| `SEED_AGENT_PASSWORD`, `SEED_EDITOR_PASSWORD` | contraseñas de los usuarios de prueba (12+ caracteres) |

Si pones la service role en `VITE_SUPABASE_ANON_KEY`, **el build falla** y la app se niega a arrancar.

### 4. Cargar los datos y arrancar
```bash
npm run seed   # crea los 2 usuarios de prueba y 21 artículos (idempotente)
npm run dev    # http://localhost:5173
```

### Credenciales de demostración (solo demo)

| Rol | Correo | Contraseña |
|---|---|---|
| Agente (Lucía) | `lucia@velia-demo.test` | la de `SEED_AGENT_PASSWORD` |
| Editor (Nuria) | `nuria@velia-demo.test` | la de `SEED_EDITOR_PASSWORD` |

Son cuentas de un dominio inventado (`.test`). Si publicas una demo, escribe aquí las contraseñas de demo que
hayas elegido y **no uses nunca contraseñas reales**.

### Comandos

| Comando | Qué hace |
|---|---|
| `npm test` | Todas las pruebas (450, incluida una auditoría de accesibilidad con axe-core), sin necesidad de credenciales |
| `npm run reliability` | Mide la fiabilidad del asistente con 41 preguntas y muestra el porcentaje de aciertos |
| `npm run security` | Tests de seguridad: cabeceras, secretos y arnés de intrusión |
| `npm run reliability:live` | Lo mismo que `reliability`, contra **tu** Supabase real |
| `npm run security:live` | Intenta «hackear» tu Supabase real como agente y sin sesión; debe fallar todo |
| `npm run build` / `npm run lint` / `npm run typecheck` | Compilar, linter y tipos |

## Cómo funciona el asistente

No hay LLM en esta versión. Es un flujo de tres pasos (`src/assistant/`):

```
pregunta ──► 1. RECUPERAR ──► 2. FILTRAR POR RELEVANCIA ──► 3. GENERAR
            (Postgres: búsqueda   (umbral calibrado con datos;    (extractivo: copia texto
             de texto en español,  si nada lo supera NO se llama   literal del artículo y
             sin acentos, por IDF) al generador)                   cita la fuente)
                                        │
                                        └─► «No tengo información» + se guarda la pregunta
```

El paso 3 es una interfaz (`AnswerGenerator`): está preparada para conectar un LLM más adelante **sin tocar** la
recuperación ni el umbral. La guía para hacerlo con seguridad está en
[`docs/PROMPT-INJECTION.md`](docs/PROMPT-INJECTION.md).

**Fiabilidad medida: lee esto con cuidado.** El asistente es **fiable en lo fácil y flojo en lo difícil**
(detalle y método en [`VALIDACION.md`](VALIDACION.md)):

| Tipo de pregunta | Aciertos | Respuestas inventadas |
|---|---|---|
| **Fáciles** (41 preguntas; las que no tienen artículo hablan de cosas ajenas al vocabulario del dominio: agua, garantía, precio) | **85 %** | 0 de 16 |
| **Difíciles** (59 preguntas nuevas, con preguntas *adversarias*: vocabulario del dominio para algo que no está cubierto, como «¿Aceptan pagos con PayPal?») | **56 %** | **12 de 29 (41 %)** |
| **Cortas y coloquiales** (32 consultas como «el reloj no carga») | **93,8 %** | 1 de 12 |
| **Muy cortas, vagas o con erratas** (28 consultas como «no enciende», «bateria», «baterai»; escritas después de implementarlo) | **82,1 %** | 0 de 12 |

Es decir: **cuando la pregunta no tiene artículo pero se parece al dominio, el asistente inventa una respuesta
en torno al 40 % de las veces** (la «respuesta» es siempre texto literal de un artículo, con su fuente, pero de
un artículo que no responde a la duda). Es una limitación de fondo de la búsqueda por palabras, y por eso la
interfaz **siempre enseña la fuente** y el agente debe comprobar que el artículo corresponde a la duda.
La solución de fondo es semántica (embeddings o un LLM como verificador, ver
[`docs/PROMPT-INJECTION.md`](docs/PROMPT-INJECTION.md)).

**Qué hace la interfaz para mitigarlo.** Cada respuesta empieza con *«Respuesta del artículo X. Antes de seguir los
pasos, comprueba que corresponde a la duda del cliente»*, y si la coincidencia es débil (puntuación < 0,4; en las
pruebas esas respuestas aciertan menos de la mitad de las veces) añade un aviso reforzado. **Nunca muestra un
mensaje de «alta confianza»**: la banda alta también falla (≈ 18 %). El botón «¿Te sirvió?» recoge datos reales.

## Seguridad

El frontend solo muestra u oculta; **la base de datos decide**.

- **RLS en todas las tablas**, con privilegios mínimos (`REVOKE` + `GRANT` por columna). Solo el editor
  inserta, modifica o borra artículos; el agente no puede ascenderse a editor ni leer preguntas ajenas.
- **El rol sale de la tabla `profiles`**, no de metadatos del token (que el usuario puede editar).
- **Claves:** la service role nunca está en el frontend ni en el repositorio; el build falla si se intenta, y
  hay un test que comprueba que ningún secreto llega al JavaScript compilado.
- **Entradas validadas** en cliente y en la base de datos (`CHECK`). El contenido se muestra **siempre como
  texto**, nunca como HTML.
- **Cabeceras:** CSP estricta (sin scripts en línea ni `eval`), `nosniff`, anti-clickjacking, HSTS…
- **Prompt injection:** tratado en [`docs/PROMPT-INJECTION.md`](docs/PROMPT-INJECTION.md).

Las pruebas y sus resultados están en [`VALIDACION.md`](VALIDACION.md).

## Decisiones técnicas

| Decisión | Por qué |
|---|---|
| **Búsqueda con Postgres full-text** (no embeddings) | Sin dependencias ni LLM; se explica en una entrevista; se aplica con RLS. Coste: no entiende sinónimos (ver limitaciones) |
| **Puntuación por IDF y por campo** (título > encabezado > cuerpo) | Las palabras comunes del dominio («reloj») pesan poco; las que no aparecen en ningún artículo («garantía») bajan la puntuación y delatan una pregunta sin respuesta |
| **Umbral = evidencia absoluta**, no proporción | La proporción se solapaba entre respuestas buenas y malas; la evidencia sí separaba (ver curva en `VALIDACION.md`) |
| **Generador extractivo** | Imposible inventar: solo copia texto del artículo |
| **Artículos en secciones con pasos** | Cada sección es un fragmento citable con enlace directo (`#seccion-N`) |
| **`save_article` transaccional** | Crear/editar toca dos tablas; así no queda nada a medias si algo falla |
| **Funciones `SECURITY INVOKER`** | RLS sigue aplicando en la búsqueda y el guardado; evita `SECURITY DEFINER` y sus riesgos |
| **Comprobar filas afectadas** al borrar/actualizar | RLS bloquea con «0 filas», no con un error: sin comprobarlo se mostraría «borrado» sin serlo |
| **CSS puro con tokens** + CSS Modules | Sistema de diseño explícito y sin dependencias; contrastes WCAG AA medidos. Estilo limpio inspirado en Stripe (fondo `#F6F9FC`, acento violeta `#635BFF`) |
| **pdf.js** (`pdfjs-dist`) | Importar PDFs: extrae el texto **en el navegador** (el archivo no se sube a ningún servidor). Se carga solo al entrar en «Importar PDF» y su worker se sirve desde el propio dominio, así que cumple la CSP |
| **Inter autoalojada** (`@fontsource-variable/inter`) | La CSP solo permite fuentes del propio dominio, así que no se carga desde Google Fonts: la fuente va en el bundle (y no se envía la IP del usuario a un tercero) |
| **Tests con Postgres real (PGlite)** | Verifican RLS y SQL de verdad, no con simulaciones |
| **Conjunto de test retenido** | Para saber si una mejora generaliza o solo memoriza el conjunto de desarrollo |

## Estructura

```
src/
  auth/        sesión, rol desde la base de datos, guardas de ruta
  assistant/   recuperar → filtrar → generar (+ umbral)
  components/  componentes UI reutilizables y formulario del editor
  design/      tokens de diseño (color, tipografía, espaciado)
  editor/      borrador de artículo y validación
  lib/         cliente de Supabase, datos, utilidades
  pages/       pantallas
supabase/
  migrations/  esquema, RLS, búsqueda, save_article, valoraciones
  seed/        21 artículos ficticios y tests de contenido
  reliability/ 41 preguntas de prueba y evaluador
  tests/       tests de SQL y RLS sobre Postgres real
security/      cabeceras, secretos y pruebas de intrusión contra la API
scripts/       seed, fiabilidad y seguridad contra el Supabase real
docs/          guía de prompt injection y capturas
```

## Despliegue en Vercel

1. Importa el repositorio en Vercel (Framework: Vite; ya hay `vercel.json` con las cabeceras y la reescritura SPA).
2. En **Environment Variables** añade **solo** `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
   **No añadas la service role ni las contraseñas del seed.**
3. Despliega. Si la clave pública fuera en realidad una service role, el build se cancelará.

## Limitaciones conocidas

- **Búsqueda léxica:** no entiende sinónimos («señal» ≠ «cobertura») ni erratas. Es la causa de casi todas las
  preguntas con artículo que no encuentra en las pruebas. Las consultas de **una sola palabra significativa**
  («no enciende») y las que **empatan entre dos artículos** («el SOS no llama») tampoco se responden, a propósito.
- **Inventa respuestas en preguntas cercanas al dominio que no tienen artículo** (≈ 40 % en las pruebas
  difíciles). El umbral actual es un compromiso: endurecerlo reduce las inventadas pero también responde mucho
  menos bien a las preguntas que sí tienen artículo.
- **Pocas preguntas de prueba**, escritas por quien hizo el sistema: son más benévolas que las de agentes
  reales (de hecho, las primeras 41 resultaron demasiado fáciles).
- **Sin control de concurrencia:** si dos editores guardan el mismo artículo a la vez, gana el último.
- **Sin historial de cambios** ni auditoría de quién editó qué.
- **Sesión en `localStorage`** (comportamiento por defecto de supabase-js): mitigado con CSP y sin HTML sin sanear.
- Sin MFA ni límite de peticiones propio (solo los de Supabase Auth).

## Mejoras propuestas

Tabla de sinónimos gestionable por el editor, tolerancia a erratas, usar las valoraciones para medir la fiabilidad con uso real, historial de cambios, conectar un LLM
siguiendo `docs/PROMPT-INJECTION.md`, y ampliar el conjunto de preguntas con casos reales del equipo.
