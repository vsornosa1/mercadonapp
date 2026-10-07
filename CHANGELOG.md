# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
Versionado [semántico](https://semver.org/lang/es/).

## [1.0.0] — 2026-10-07

Primera versión: un asistente de nutrición para la compra en Mercadona, instalable y sin conexión.

### Added

- **Búsqueda** de los 4.330 productos del catálogo, insensible a acentos (`platano` encuentra `Plátano`), con chips de categoría cuando no hay consulta.
- **Ficha de producto** con foto, precio, señal de procesamiento, macronutrientes por 100 g y el texto de ingredientes.
- **Señal de procesamiento** con tres bases distintas y siempre etiquetadas: NOVA de Open Food Facts (autoritativa), heurística propia sobre los ingredientes de Mercadona, y regla por categoría para los frescos. Nunca se mezclan.
- **Alternativas mejores** del mismo pasillo, con el motivo en números (más proteína, menos azúcar, menos sal, menos aditivos).
- **Lista de la compra** persistente, con marcado de un solo toque para ir tachando en el pasillo.
- **PWA instalable** que funciona sin conexión: el catálogo va en el precache del service worker.
- **`ErrorBoundary`** con recuperación en español, para que un fallo no deje una pantalla en blanco.
- **Cabeceras de seguridad** (`public/_headers`): CSP estricta, `nosniff`, `frame-ancestors 'none'`, `Permissions-Policy`.
- **Pipeline de datos reproducible**: `data:fetch`, `data:enrich`, `data:build`, `data:coverage`.
- **Guardia de despliegue**: `npm run build` falla con un mensaje claro si falta el catálogo, para que un host mal configurado no publique una app cuya búsqueda no devuelve nada.
- **`netlify.toml` + `.nvmrc`** con Node 22, para que Netlify y Cloudflare Pages funcionen sin configurar nada.

### Security

- Sin backend, sin cuentas y sin datos de usuario: la lista vive en `localStorage` y **nada** sale del dispositivo.
- **Cero peticiones a `tienda.mercadona.es`** en tiempo de ejecución. El catálogo procede de un espejo estático; Mercadona prohíbe su `/api` en `robots.txt` y bloquea a los scrapers.
- El HTML de ingredientes se convierte a texto plano; no se usa `dangerouslySetInnerHTML`.
- `npm audit`: 0 vulnerabilidades.

### Accessibility

- WCAG 2.1 AA verificado en un navegador real: 0 fallos de contraste en las tres pantallas, 150 elementos interactivos con nombre accesible y 0 imágenes sin `alt`.
- Corregido antes de publicar: el blanco sobre `#00a650` daba 3,20:1 (por debajo de 4,5:1). Se introduce `--color-primary-strong` (`#007a3a`) para las superficies con texto blanco.
- Objetivos táctiles de ≥ 44 px en los controles que se usan en el pasillo; foco visible de 2 px.

### Fixed

- Los productos azucarados sin números E (leche condensada, jarabes) se clasificaban como «alimento entero»; ahora detectan el azúcar añadido como señal de procesamiento.
- La búsqueda sin conexión ahora funciona: el catálogo entró en el precache, que Workbox limitaba a 2 MiB.
- El cliente de Open Food Facts trata un `404` como «no encontrado» en lugar de fallar, y el enriquecimiento tolera fallos por producto.
