# Lot a Lot · web (prototipo)

Compra colectiva de fruta y verdura local. Vite + React + TypeScript + React Router, CSS propio (variables + CSS Modules), sin backend.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + build de producción
```

- **Datos simulados**: `src/data/*.ts`. **Capa de servicios** (cambiable por una API): `src/services/`. **Estado** persistido en localStorage: `src/state/store.tsx`.
- **Reloj simulado**: el prototipo arranca siempre el 8 de octubre de 2026 a las 05:28 (`src/services/clock.ts`).
- **Selector de rol** (solo en `npm run dev`): botón «Prototipo» abajo a la izquierda → sin sesión / compradora / productor / administración. «Reiniciar datos» borra el estado.

| Rol | Rutas |
| --- | --- |
| Pública | `/`, `/acceso`, `/productos`, `/productos/:id`, `/mercados`, `/info/:slug` |
| Compradora | `/mis-compras`, `/mi-cuenta` |
| Productor | `/productor`, `/productor/vender/1..4`, `/productor/vender/listo`, `/productor/producto/:id` |
| Administración | `/admin` |
