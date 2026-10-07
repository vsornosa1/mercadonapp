# Mercadonapp 🥗

Tu asistente de nutrición para la compra en Mercadona. Una PWA instalable que te dice qué hay de verdad en cada producto — aditivos, procesamiento y macronutrientes — y te propone una alternativa mejor del mismo pasillo.

Instalable, funciona sin conexión, y **no hace ninguna petición a los servidores de Mercadona**: el catálogo y la nutrición se resuelven en tiempo de construcción y se sirven como datos estáticos.

## Qué hace

- **Busca** los ~4.300 productos del catálogo (sin acentos, con una mano en el pasillo).
- **Muestra** foto, precio, y por cada producto:
  - una **señal de procesamiento** (NOVA cuando Open Food Facts la tiene; si no, nuestra heurística sobre los ingredientes; para frescos, una regla por categoría — siempre etiquetada por su origen);
  - **macronutrientes por 100 g** donde existen, o un honesto "sin datos nutricionales";
  - el **texto de ingredientes** detrás de cada afirmación.
- **Sugiere alternativas mejores** del mismo pasillo, con el motivo en números (más proteína, menos azúcar, menos aditivos…).
- **Lista de la compra** persistente, para ir tachando con un toque.

## Requisitos

- Node.js ≥ 22 (usa el *type stripping* nativo para ejecutar los scripts TS).
- Sin servidor: el resultado es estático.

## Puesta en marcha

```bash
npm ci
npm run build          # verifica el catálogo y construye la PWA → dist/
npm run preview        # sirve el build de producción
```

Eso es todo: el catálogo enriquecido está versionado en `public/catalog/`, así que **no hace falta red para construir**. `npm run build` comprueba primero que el catálogo existe y falla con un mensaje claro si no.

Solo si quieres **actualizar los datos** (el espejo cambia cada semana):

```bash
npm run data:fetch     # descarga el espejo (≈3 min) → data/raw/
npm run data:build     # regenera public/catalog/products.json
```

Consulta el pipeline completo más abajo.

## Pipeline de datos

| Comando | Qué hace | Dónde | Red |
|---|---|---|---|
| `npm run data:fetch` | Descarga el espejo del catálogo | `data/raw/` (ignorado) | Hugging Face |
| `npm run data:enrich` | Une cada EAN con Open Food Facts y calcula la señal de procesamiento | `data/enriched/` (**versionado**) | Open Food Facts |
| `npm run data:build` | Emite el bundle final (catálogo + nutrición) | `public/catalog/` (**versionado**) | — |
| `npm run data:coverage` | Mide la cobertura real de Open Food Facts sobre una muestra | `data/raw/coverage-sample.json` | Open Food Facts |

Los dos artefactos derivados caros —`data/enriched/` y `public/catalog/`— están **versionados a propósito**: el enriquecimiento cuesta miles de peticiones a Open Food Facts, y el bundle hace que el despliegue sea un `npm ci && npm run build` sin red y sin depender de que el espejo esté disponible en el momento del build.

**Cobertura medida (2026-10-07):** kcal en el 46 % del catálogo completo (~50 % de los envasados), grupo NOVA en el 36 %, aditivos vía ingredientes de Mercadona en el 64 %. Los frescos (fruta, verdura, pescado, carne) no tienen código de barras real, así que usan la regla por categoría.

## Licencias y atribución

- **Catálogo:** del espejo [`datania/mercadona-catalog`](https://huggingface.co/datasets/datania/mercadona-catalog) (MIT). Los datos subyacentes son de Mercadona; **nunca** se consulta a Mercadona en tiempo de ejecución.
- **Nutrición:** [Open Food Facts](https://world.openfoodfacts.org/), licencia **ODbL 1.0** — requiere atribución; la app la muestra como "Fuente: Open Food Facts" en cada panel nutricional.

## Frecuencia de actualización

El espejo se actualiza semanalmente. Para refrescar: `npm run data:fetch && npm run data:enrich && npm run data:build`. El enriquecimiento es educado (secuencial, ~1 s de pausa, respeta `Retry-After`) y es **incremental** (cachea cada respuesta por EAN), así que las re-ejecuciones cuestan poco.

## Desarrollo

```bash
npm run dev            # servidor de desarrollo
npm test               # tests (vitest)
npm run test:coverage  # tests + cobertura (mínimo 90 % en src/lib y scripts)
npm run typecheck      # tsc --noEmit
npm run lint           # eslint --max-warnings 0
```

## Decisiones clave

- **Sin servidor.** Todo se resuelve en tiempo de construcción; la app es un conjunto de archivos estáticos.
- **`unknown` es una respuesta válida.** Sin lista de ingredientes no es "sin aditivos"; sin macronutriente no es cero. Nunca se estima ni se inventa un número.
- **La etiqueta dice lo que se ha medido.** El vocabulario de NOVA se usa solo cuando NOVA ha producido la clasificación; si sale de nuestra heurística de ingredientes, la etiqueta describe los aditivos ("sin aditivos", "con aditivos", "muchos aditivos"), y para los frescos dice "fresco". Nunca se presenta una heurística como NOVA.
- **Se recomienda sobre la misma señal que se muestra.** El ranking usa la clasificación compuesta que ve el usuario, así que la app no puede proponer un producto que su propia ficha marca como más procesado.
- **El procesamiento manda sobre los macros.** Ninguna recomendación empeora el procesamiento. Un macro puede sacrificarse a cambio de uno, y siempre se enseña el coste ("a cambio: más azúcar").
- **Dos escalas, nunca mezcladas.** NOVA (autoritativa) y nuestra heurística de ingredientes se muestran como señales distintas y etiquetadas por su origen.

Consulta la especificación en `.agents/docs/intent/` y el plan en `tasks/`.
