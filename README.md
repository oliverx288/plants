# Savia — pasaporte digital de plantas con NFC

Aplicación web para gestionar una colección física de plantas mediante
etiquetas NFC. Cada planta tiene una URL única (`/plantas/{slug}`); al
escribir esa URL en una pegatina NFC y pegarla en la maceta, acercar el
móvil abre directamente su pasaporte digital — identidad, diario de
crecimiento, historial de cuidados, estado actual y estadísticas — con la
posibilidad de registrar nuevos cuidados al momento, desde el propio móvil.

El documento [`docs/propuesta-savia.md`](docs/propuesta-savia.md) recoge la
propuesta original del proyecto (concepto, diferenciales, hoja de ruta).
Este README describe la aplicación tal y como está implementada.

## Stack

- **Backend**: Java 17 + Spring Boot 3 (Web, Data JPA, Validation), API REST.
- **Base de datos**: PostgreSQL, migraciones con Flyway.
- **Frontend**: HTML + CSS + JavaScript vanilla (módulos ES, sin frameworks),
  servido como recursos estáticos por el propio backend.
- **NFC**: sin hardware — cada pegatina simplemente contiene la URL pública
  de la planta (`https://tu-dominio/plantas/{slug}`).
- **Docker**: `Dockerfile` multi-stage + `docker-compose.yml` (app + Postgres).

## Puesta en marcha

### Con Docker Compose (recomendado)

```bash
docker compose up --build
```

La aplicación queda disponible en `http://localhost:8080`, con PostgreSQL
levantado automáticamente y datos de ejemplo cargados por Flyway.

### En local con Maven

Requiere una instancia de PostgreSQL accesible (por defecto
`localhost:5432`, base de datos `savia`, usuario/contraseña `savia`; se
puede sobrescribir con las variables `DB_HOST`, `DB_PORT`, `DB_NAME`,
`DB_USER`, `DB_PASSWORD`).

```bash
mvn spring-boot:run
```

Al arrancar, Flyway crea el esquema y carga tres plantas de ejemplo (una
saludable, una que necesita atención y una con un problema activo) con
varias semanas de historial, para poder ver el dashboard, el diario y las
estadísticas funcionando con contenido real desde el primer momento.

## Estructura del proyecto

```
src/main/java/com/savia/
  domain/       entidades JPA (Planta, AccionCuidado) y enums
  repository/   Spring Data JPA
  service/      lógica de negocio: estado/mensajes dinámicos, cuidados, subida de imágenes
  dto/          objetos de transferencia usados por la API
  web/          controladores REST + controlador de vistas + manejo de errores
  config/       configuración de recursos estáticos (imágenes subidas)
src/main/resources/
  db/migration/ migraciones Flyway (esquema + datos de ejemplo)
  static/       frontend: HTML, CSS y JS servidos directamente por Spring
```

## API REST

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/plantas` | Listado resumido para el dashboard |
| GET | `/api/plantas/{slug}` | Ficha completa de una planta |
| POST | `/api/plantas` | Crear planta |
| PUT | `/api/plantas/{slug}` | Editar planta |
| DELETE | `/api/plantas/{slug}` | Eliminar planta y su historial |
| GET | `/api/plantas/{slug}/acciones` | Historial de cuidados |
| POST | `/api/plantas/{slug}/acciones` | Registrar un cuidado (riego, abonado, poda, trasplante, cambio de ubicación, foto, nota) |
| GET | `/api/plantas/{slug}/diario` | Entradas del diario de crecimiento (fotos, orden cronológico) |
| GET | `/api/plantas/{slug}/estadisticas` | Conteos por tipo de cuidado y evolución mensual |
| POST | `/api/uploads` | Subida de imágenes (multipart), devuelve la URL pública |

## Cómo funciona el flujo NFC

1. Al dar de alta una planta se genera un identificador único (`slug`) a
   partir de su nombre.
2. Se escribe en la etiqueta NFC (NTAG213/215) un registro NDEF de tipo URI
   con `https://tu-dominio/plantas/{slug}` — desde la propia página de la
   planta hay un botón para copiar esa URL.
3. Cualquier móvil moderno reconoce el registro NDEF al acercarlo y ofrece
   abrir la URL directamente en el navegador, sin necesidad de ninguna app.
4. `GET /plantas/{slug}` sirve el pasaporte de esa planta con sus datos
   reales; si el propietario tiene sesión iniciada en ese dispositivo,
   aparecen además los controles para registrar cuidados al instante.

## Notas de diseño

- El estado de cada planta (saludable / necesita atención / con problemas)
  se calcula a partir de la regularidad del riego, con un mensaje distinto
  cada vez; también se puede forzar manualmente para casos que el
  calendario no detecta, como una plaga.
- El frontend no depende de ningún CDN externo (ni siquiera para el
  gráfico de estadísticas, dibujado en SVG/CSS propio) — solo la tipografía
  se sirve desde Google Fonts, y de forma no bloqueante, para que la
  aplicación siga siendo utilizable aunque esa petición falle o vaya lenta
  (importante para un uso real con el móvil en el momento de escanear).
