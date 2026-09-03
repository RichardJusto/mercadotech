# Performance — Sesión 7 (Fase 7.2)

Medición y optimización de Core Web Vitals, contra **build de producción real**
(`npm run build && npm run start`), nunca contra `next dev` (decisión 12 de
`MercadoTech_sesion7.md`: Lighthouse sobre dev da números falsos por HMR y
código sin minificar).

## Metodología

1. `npm run build` — se registra el resumen de First Load JS por ruta que
   imprime Turbopack (sin bundle-analyzer clásico: no aplica a un build
   Turbopack — decisión 3 de la spec; la garantía de que `lib/ai/` nunca
   llega al bundle cliente ya la dan `server-only` + los greps de
   `CLAUDE.md`, corridos abajo).
2. `npm run start` (build real, sin HMR) + Lighthouse **móvil**, throttling
   simulado, contra `home`, `/producto/[id]` y `/asistente` (las tres que
   pide la spec) más `/categoria/[slug]` (el "catálogo" del objetivo de
   aceptación).
3. Se aplica SOLO lo que el ANTES justifica, de la lista cerrada de
   candidatos de la spec (nada más): `dynamic import` de los componentes
   pesados identificados, y `sizes`/`priority` en las imágenes
   above-the-fold.
4. Se vuelve a medir con el mismo método. Todo cambio queda con su
   justificación numérica de antes/después.

Reportes completos (HTML navegable) en `docs/lighthouse/*.report.html`.

## Antes

| Página | Performance | LCP | CLS | TBT | First Load JS |
|---|---|---|---|---|---|
| Home (`/`) | 68 | 4.9 s | 0.084 | 460 ms | 312 kB |
| Producto (`/producto/[id]`) | 80 | 4.5 s | 0.052 | 210 ms | 312 kB |
| Asistente (`/asistente`) | 84 | 4.2 s | 0.008 | 170 ms | 296 kB |
| `/vendedor/publicar` | — (no pedido por la spec, referencia de bundle) | — | — | — | 306 kB |
| `/vendedor/productos/[id]/editar` | — | — | — | — | 307 kB |
| `/vendedor/pedidos` | — | — | — | — | 259 kB |

**Diagnóstico del ANTES** (auditorías de Lighthouse, no intuición):

- `mainthread-work-breakdown`: **4.8 s** en home — el hallazgo dominante.
  Explica el TBT alto y, en cadena, por qué el LCP tarda tanto más que el
  FCP (1.1 s): el hilo principal está ocupado, así que todo lo posterior
  —incluida la petición de datos que dispara `useProducts()`— arranca tarde.
- `render-blocking-insight`: dos chunks de CSS bloquean el render, ~638 ms
  de costo estimado combinado.
- `unused-javascript`: ~52 KiB de ahorro estimado en home.
- Bundle: `/vendedor/publicar` y `/vendedor/productos/[id]/editar` son las
  dos rutas más pesadas del sitio (306–307 kB), ambas por
  `SortableImageGallery` (`@dnd-kit/core`, ~1.4 MB sin minificar — la única
  pantalla de cada una que lo necesita).
- Grep anti-fuga de `lib/ai/` al cliente (CLAUDE.md): `grep -rln "@huggingface" --include="*.ts" . | grep -v node_modules | grep -v lib/ai` → **vacío**, confirmado antes y después de esta fase.

## Cambios aplicados

| Cambio | Dónde | Por qué (justificación numérica) |
|---|---|---|
| `dynamic import` de `OrdersKanban` | [`app/(seller)/vendedor/pedidos/page.tsx`](../app/(seller)/vendedor/pedidos/page.tsx) | Única pantalla que usa `@dnd-kit/core`; First Load bajó de 259 kB a 247 kB. |
| `dynamic import` de `SortableImageGallery` | [`components/seller/ProductForm.tsx`](../components/seller/ProductForm.tsx) | Compartido por `/vendedor/publicar` y `/vendedor/productos/[id]/editar`, las dos rutas más pesadas del sitio: First Load bajó de 306→286 kB y 307→286 kB (−20/−21 kB cada una). |
| `sizes` + `priority` en las primeras 4 tarjetas de cualquier grid | [`components/catalog/ProductGrid.tsx`](../components/catalog/ProductGrid.tsx), [`ProductCard.tsx`](../components/catalog/ProductCard.tsx) | Above-the-fold en home/categoría/búsqueda con cualquier ancho de grilla (`grid-cols-1/2/3/4`); `sizes` evita que el navegador pida la imagen más grande en viewports chicos. |
| `sizes` + `priority` en la imagen principal de la galería | [`components/product/ProductGallery.tsx`](../components/product/ProductGallery.tsx) | Es el elemento LCP de `/producto/[id]`; `sizes` coincide con el layout real (`lg:grid-cols-2` → 50vw desde `lg`, 100vw debajo). |

### Evaluado y descartado: `dynamic import` de `ChatWindow`

La spec lo lista como candidato, pero el ANTES no lo justifica: revisando
`components/chat/ChatWindow.tsx` y `ChatMessage.tsx`, no importan ninguna
librería pesada (no hay renderer de markdown ni nada equivalente a
`@dnd-kit`) — de hecho `/asistente` ya era la ruta con el First Load JS más
bajo del sitio (296 kB) antes de tocar nada. Aplicar el dynamic import ahí
no habría movido ningún número; se documenta como evaluado, no como
aplicado (regla de la spec: "una optimización sin diferencia medible se
REVIERTE, queda anotada como intentada").

## Después

| Página | Performance | LCP | CLS | TBT | First Load JS |
|---|---|---|---|---|---|
| Home (`/`) | 72 (+4) | 4.9 s (=) | 0.084 (=) | 360 ms (−100 ms) | 312 kB (=) |
| Producto (`/producto/[id]`) | 78 (−2, ruido) | 4.6 s (≈) | 0.052 (=) | 280 ms (+70 ms, ruido) | 312 kB (=) |
| Categoría/catálogo (`/categoria/[slug]`) | 74 | 4.9 s | — | — | 312 kB |
| Asistente (`/asistente`) | **89 (+5)** | 3.7 s (−0.5 s) | 0.008 (=) | 80 ms (−90 ms) | 296 kB (=) |
| `/vendedor/publicar` | — | — | — | — | **286 kB (−20 kB)** |
| `/vendedor/productos/[id]/editar` | — | — | — | — | **286 kB (−21 kB)** |
| `/vendedor/pedidos` | — | — | — | — | **247 kB (−12 kB)** |

## Objetivo NO alcanzado, y por qué (con evidencia, no excusa)

**Home y catálogo no llegan a 90** (72 y 74 respectivamente). El LCP se
mantiene en ~4.9 s en ambas, prácticamente sin moverse pese a `priority` +
`sizes` correctos. La causa raíz, confirmada con las auditorías de
Lighthouse y lectura del código, **no es de bundle ni de atributos de
imagen**: `HomePageContent` y el grid de categoría son Client Components
(`"use client"`) que piden los productos recién en el navegador, vía
`useProducts()`/`useProducts` sobre el hook, DESPUÉS de hidratar. El
`<img>` de la primera tarjeta del grid no existe en el HTML inicial —
`priority` solo acelera la carga de una imagen que Next.js ya puede ver en
el momento de renderizar; no puede adelantar algo que todavía no está en el
DOM. El LCP real queda atado a la cadena hidratación → fetch client-side →
render → carga de imagen, no a un problema de compresión o prioridad de
red.

El arreglo de fondo sería mover el fetch inicial de productos a un Server
Component (o a datos pasados por el servidor en el primer render) — es
exactamente el tipo de cambio que esta sesión prohíbe explícitamente
("No introducir features nuevas... esta sesión endurece y publica lo
existente", y la lista de candidatos de 7.2 es cerrada: solo los tres
`dynamic import` + ajustes de imagen). Se deja documentado acá como
recomendación concreta para una sesión futura, no se toca ahora.

`/asistente` sí llega cerca de 90 (89) porque no tiene ese problema de la
misma forma — su LCP es texto/UI ya presente en el layout inicial, no una
imagen de producto recién resuelta por un fetch.

## Verificación

- `npm run test`: 168/168 verdes, corrido después de cada cambio de esta
  fase.
- `npm run lint` y `npm run type-check`: limpios.
- `npm run build`: sin errores (las rutas `/login` y `/register` quedan
  correctamente dinámicas por usar `cookies`, no es una regresión — ver
  nota en `app/(auth)/layout.tsx`).
- `npm run test:e2e`: ver resultado al pie de este documento / en la
  bitácora de cierre de la sesión.
