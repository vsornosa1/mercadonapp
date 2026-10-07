# Launch runbook — Mercadonapp

Static PWA, single user, no backend. Most of the standard launch checklist applies
differently here: there is no server to scale, no database to migrate, no auth to
rate-limit. This document records what was verified, what is genuinely N/A and why,
and how to roll back.

## Pre-launch checklist

### Code quality — green

| Check | Command | Result |
|---|---|---|
| Tests | `npm test` | 163 passed, 23 files |
| Coverage | `npm run test:coverage` | ≥ 90 % floor on `src/lib` + pipeline logic |
| Build | `npm run build` | clean; JS 73.4 kB gzip |
| Types | `npm run typecheck` | clean |
| Lint | `npm run lint` | clean, `--max-warnings 0` |
| Debug statements | grep `console.log`/`console.debug` in `src/` | none. One `console.error` in `ErrorBoundary` is deliberate error reporting |
| TODOs | grep `TODO|FIXME|HACK` | none |
| Error handling | `ErrorBoundary` wraps the app; honest empty/error states throughout |

### Security — green, with N/A items named

| Check | Result |
|---|---|
| Secrets in code/VCS | none; no `.env` files tracked |
| Dependency audit | `npm audit` → **0 vulnerabilities** |
| Security headers | `public/_headers` → CSP, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`. **HSTS is deliberately not set here** — it belongs at the host/CDN, where HTTPS is guaranteed |
| XSS surface | no `dangerouslySetInnerHTML`; ingredient HTML is **stripped to text**, never rendered |
| Input validation | search input is normalised and used only as a string comparison — no injection path, no server |
| CORS | N/A — the app makes no cross-origin requests. Images load from a third-party CDN (no credentials, no data sent) |
| Auth / authz / rate limiting | **N/A — by design.** No accounts, no login, no server, no user data leaves the device. The cart lives in `localStorage` |
| CSP verified | built `dist/index.html` contains **no inline scripts or styles**; all assets are same-origin. `_headers` is inert on hosts that ignore it |

**Privacy note:** because there is no backend, no personal data is transmitted anywhere.
The app is safe to host publicly — anyone with the URL can use it, but it holds no
user data and exposes no secrets.

### Performance — measured, not assumed

| Metric | Measured |
|---|---|
| Cold catalogue download | 5.5 MB decoded / **~0.73 MB gzipped**, 164 ms on localhost |
| JSON parse | **19 ms** for 4,330 products |
| DOMContentLoaded / load | 45 ms / 45 ms |
| Second load | served from the service worker precache |
| Bundle | 73.4 kB gzip JS, 2.2 kB gzip CSS |
| Images | lazy-loaded, fixed dimensions (no layout shift) |

The 0.73 MB catalogue is the one real cost: paid once on first visit, then precached
and offline. A static host serving brotli will be smaller still.

### Accessibility — WCAG 2.1 AA, verified in a real browser

| Check | Result |
|---|---|
| Contrast, all 3 screens | **0 failures** after fixes (see below) |
| Accessible names | 150 interactive elements, **0 unnamed** |
| Heading hierarchy | H1 → H2, no skipped levels |
| `lang` attribute | `es` |
| Images | 0 without `alt` |
| Keyboard | sensible tab order; visible 2 px focus outline; Enter activates rows |
| Focus targets | ≥ 44 px touch targets on aisle-critical controls |

**Contrast fixes made at launch:** white on `#00a650` was **3.20:1** (below the 4.5:1 AA
threshold) on the header title and the "Añadir a la lista" button; the "Alimento entero"
badge was **4.30:1**. Introduced `--color-primary-strong: #007a3a` (5.46:1 with white,
4.89:1 on the tint) and applied it to those three surfaces. Brand green `#00a650` remains
for non-text fills and focus rings, where the 3:1 non-text threshold applies.

### Infrastructure — mostly N/A

| Check | Result |
|---|---|
| Env vars | none needed — no configuration at build or run time |
| Database / migrations | **N/A** — no database |
| DNS / SSL | host-provided |
| CDN for static assets | host-provided; hashed assets are `immutable` in `_headers` |
| Health check endpoint | **N/A** — no server |

## Rollback plan

Everything is a static artifact, so rollback is trivially safe: there is no schema, no
data migration and no server state to unwind. `git revert` and redeploy.

**Trigger conditions** — roll back if any of:
- The app fails to load, or the catalogue never leaves "Cargando catálogo".
- A wrong nutrition figure or processing tier is shown (correctness beats availability here).
- The service worker serves a stale build that cannot be updated.

**Steps**
1. `git revert <commit>` (or re-deploy the previous tag) and push.
2. The host rebuilds and republishes `dist/`.
3. Verify: load the app, search `platano`, open a product, confirm data renders.
4. If a *stale service worker* is the problem, the fix is a cache-bust:
   the SW is served `no-cache` by `_headers`, and Workbox uses a revision hash per
   asset, so a new build forces an update. Worst case, users can hard-reload.

**Time to roll back:** < 5 minutes (redeploy a static bundle). No database step exists.

**Client state:** the cart lives in `localStorage` under `mercadonapp.cart.v1`. A revert
does not touch it; the versioned key means a schema change cannot corrupt an existing cart.

## Monitoring — the honest position

This is a single-user static app with no server, so there are **no dashboards, no SLOs
and no error-tracking service**. Pretending otherwise would be worse than saying so:

- **Errors:** `ErrorBoundary` catches render crashes and shows a recoverable Spanish
  fallback instead of a white screen; it logs to the browser console. There is no remote
  reporting — adding one is an external dependency and a privacy decision, deliberately
  not taken for a personal app.
- **Availability:** if the host is down, the app is down. Because it is a PWA with a
  precached shell and catalogue, **an installed copy keeps working offline even if the
  host disappears**.
- **Performance/usage:** not instrumented. There is no analytics, by choice.
- **Correlation to "post-launch monitoring":** for this scale, the user *is* the
  monitor — there is exactly one, and they see any failure immediately.

**Error budget:** N/A. With one user and no SLO, there is no budget to burn; the gate
is simply "does it work on the phone".

## Post-launch verification (first hour)

1. Load the deployed URL — the shell renders.
2. Search `platano` → `Plátano de Canarias IGP` appears.
3. Open a product → photo, badge, nutrition (or honest "sin datos") and ingredients render.
4. Open "Alternativas mejores" on an ultraprocesado → numeric reasons appear.
5. Add to "Mi lista", tick it, reload → state persists.
6. Install to the home screen; open with aeroplane mode on → search still works.
7. DevTools → Network, full session → **zero** requests to `tienda.mercadona.es`.

## Deploy

The build is a static folder. **No network and no data pipeline run at build time** — the
enriched catalogue is committed, so a host's default build works as-is.

```bash
npm ci
npm run build          # runs the catalogue guard, then vite build → dist/
```

Publish `dist/`.

### Netlify / Cloudflare Pages

`netlify.toml` is committed, so either host works with no dashboard configuration:

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Node 22** — required, because the data scripts use Node's native TypeScript
  type-stripping. Set in `netlify.toml` and in `.nvmrc`.

`public/_headers` is copied to `dist/_headers` and honoured by both hosts: it sets the
CSP and prevents `/sw.js` from being cached (a cached service worker cannot be updated).

### The catalogue guard

`npm run build` runs `prebuild` → `scripts/ensure-catalog.ts`, which **fails the build**
if `public/catalog/products.json` is missing, unparseable, not an array, or has fewer than
1 000 products. Without it, a host that never ran the data pipeline would deploy an app
where search silently returns nothing — a failure that looks like "no results" rather than
a broken deploy.

### Other hosts

GitHub Pages does **not** read `_headers`; set the headers at the CDN instead. Everything
else (serving `dist/`, `catalog/products.json` reachable, `/sw.js` uncached) is the same.
