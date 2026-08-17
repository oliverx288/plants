# Savia — el pasaporte digital de tu colección de plantas

Proyecto FCT (DAW): una pequeña colección física de plantas, cada una con una
pegatina NFC en su maceta. Al acercar el móvil se abre su **pasaporte
digital** — no una ficha de cuidados, sino un documento vivo con identidad,
diario de crecimiento, historial de cuidados, estado actual y personalidad
propia.

Dossier de propuesta completo (diseño visual, modelo de datos, arquitectura,
flujo NFC, hoja de ruta MVP → fase 2):
https://claude.ai/code/artifact/ae2bd37b-62a8-4531-9eed-e1b0f2f1f243

## 1. Concepto

**Savia** — el líquido que circula por una planta y la mantiene viva. El
sistema hace circular información entre el mundo físico (la maceta con su
etiqueta NFC) y el digital (la historia de la planta). Cada planta "habla" en
primera persona con un tono ligado a su especie y a una personalidad asignada
por el usuario (la diva, la estoica, la dramática...).

Nombres alternativos considerados: `Radix` (más técnico), `Brote` (más
cercano en español). Recomendación: **Savia**.

## 2. Experiencia física

1. **Adopción**: se escanea una etiqueta NFC virgen y se completa un
   asistente de alta (nombre, especie, fecha de adopción, personalidad).
2. **Colocación del sello físico**: pegatina NFC (NTAG213/215) en la maceta
   o en una estaca, junto a una mini tarjeta impresa con QR de respaldo.
3. **Visita**: cualquiera acerca el móvil y ve el pasaporte público. Si el
   propietario está logueado en ese dispositivo, aparecen acciones rápidas.
4. **Sello**: registrar riego/abono/poda/trasplante queda fechado como un
   sello real en el pasaporte.

## 3. Funcionalidades principales

- Identidad: nombre, especie, fecha de adopción, ubicación.
- Diario de crecimiento con fotografías e hitos.
- Historial de riegos.
- Registro de abonado, poda, trasplantes y tratamientos.
- Estado actual (índice de salud visible de un vistazo).
- Ficha de cuidados: luz, humedad, temperatura, frecuencia de riego.
- Línea temporal de eventos.
- Estadísticas (regularidad de riego, fotos por mes, comparativas).
- Registro de nuevas acciones desde el móvil al escanear la NFC.

## 4. Diferenciales originales

- **Motor de personalidad**: mensajes dinámicos según arquetipo y estado.
- **Estado de ánimo visual**: indicador de humor calculado del historial.
- **Rachas y logros**: gamificación de la constancia del cuidador.
- **Time-lapse automático** a partir del diario fotográfico.
- **Sugerencias sensibles al clima** (API meteorológica + especie).
- **Invernadero público**: colección compartible en modo portfolio.

## 5. Mapa de páginas

| Página | Acceso | Contenido |
|---|---|---|
| Inicio | Público | Qué es Savia, cómo funciona el NFC |
| Pasaporte de planta `/p/:slug` | Público (lectura) | Vista completa de la planta |
| Acción rápida | Propietario | Registrar riego/abono/poda/trasplante |
| Alta de planta | Propietario | Vinculación de etiqueta NFC nueva |
| Dashboard general | Propietario | Todas las plantas, estados y alertas |
| Estadísticas globales | Propietario | Comparativas y tendencias |
| Alertas | Propietario | Plantas que necesitan atención |
| Gestión de etiquetas NFC | Propietario | Vincular / sustituir / desactivar |
| Invernadero público | Público (opcional) | Galería de la colección |
| Perfil y ajustes | Propietario | Cuenta, notificaciones, privacidad |

## 6. Modelo de base de datos (PostgreSQL)

**Núcleo**: `usuarios`, `especies`, `plantas`
**NFC**: `etiquetas_nfc`, `visitas_nfc`
**Historial**: `fotos`, `entradas_diario`, `acciones_cuidado`, `alertas`
**Personalidad**: `mensajes_personalidad`

Ver el dossier para el detalle de columnas y claves foráneas de cada tabla.

## 7. Arquitectura

- **Frontend**: HTML/CSS/JS mobile-first, PWA instalable, Chart.js.
- **Backend**: Spring Boot (Web, Security, Validation), API REST + JWT para
  el propietario, endpoints públicos de solo lectura, Flyway.
- **Datos**: PostgreSQL + almacén de imágenes (volumen/MinIO).
- **Despliegue**: Docker Compose.

## 8. Flujo NFC

1. Al dar de alta una planta se escribe en la etiqueta un registro NDEF de
   tipo URI: `savia.app/p/{slug}`.
2. El sistema operativo del móvil reconoce el registro y ofrece abrirlo en
   el navegador sin necesidad de app.
3. `GET /p/{slug}` resuelve la planta, registra la visita y devuelve la
   vista pública.
4. Si hay un JWT válido de sesión previa en ese dispositivo, se activa el
   modo cuidador con acciones rápidas.
5. La acción se guarda con fecha automática y la interfaz responde con el
   mensaje de personalidad correspondiente.

## 9. Puesta en escena para la defensa

- Pasaporte físico plastificado junto a cada maceta, con sellos impresos
  de hitos reales.
- Demo en directo escaneando plantas reales delante del tribunal.
- Identidad visual coherente entre macetas, web y memoria escrita.
- Mención de ampliación futura con sensor de humedad (ESP32).

## 10. Hoja de ruta

**MVP**: modelo de datos + API REST, auth JWT, pasaporte público real vía
NFC, registro de acciones desde móvil, línea temporal, galería de fotos,
dashboard general, mensajes de personalidad con reglas simples,
estadísticas básicas, Docker Compose.

**Fase 2**: rachas e insignias, invernadero público, time-lapse automático,
sugerencias sensibles al clima, sensor de humedad real (ESP32), PWA con
notificaciones push, exportar pasaporte a PDF, multi-idioma.
