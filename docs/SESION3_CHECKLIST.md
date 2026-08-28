# Checklist — Fase 3.8 (Sesión 3)

Pasada de calidad sobre las 14 pantallas del mapa de rutas. No hay
funcionalidad nueva en esta fase; solo cierre de lo que quedó a medias y
verificación de la separación de capas.

## Metodología

- **Responsive**: medido con `document.documentElement.scrollWidth` vs
  `clientWidth` en 375 px (mobile) contra las pantallas de mayor riesgo de
  overflow (home con filtros, tabla de productos, kanban de pedidos). 768 px
  y 1280 px se verifican por diseño (mismos componentes con breakpoints
  `sm`/`lg` de Tailwind ya usados en toda la sesión).
- **Carga / Vacío / Error**: verificado por lectura de código — todas las
  pantallas de lista/detalle pasan por `LoadingState`/`ProductCardSkeleton`,
  `EmptyState` o `ErrorState` de `components/shared/`, nunca un spinner
  genérico ni una pantalla en blanco.
- **Drag & drop por teclado**: `KeyboardSensor` de `@dnd-kit` está habilitado
  en ambos casos (`SortableImageGallery`, `OrdersKanban`). El drag real
  (eventos de puntero) no se pudo ejercitar de forma confiable en el entorno
  de este agente (el pane del navegador no compone frames, ver nota abajo);
  la cobertura de teclado se apoya en el comportamiento documentado de
  dnd-kit más revisión de código, no en una prueba interactiva en vivo.

> **Nota del entorno**: el navegador de este agente no renderiza frames
> reales (falla `screenshot`/`computer.click` con "pane no desplegado"), así
> que toda la verificación interactiva de esta sesión se hizo con
> `javascript_tool` (DOM + eventos sintéticos) en vez de clics/arrastres
> reales. Esto cubrió con confianza clics, envío de formularios y
> navegación, pero no gestos de arrastre genuinos.

## Por pantalla

| Ruta | Responsive (375px, sin overflow) | Carga | Vacío | Error | Imágenes con alt |
|---|---|---|---|---|---|
| `/` | ✅ verificado en navegador | ✅ `ProductGrid` skeleton | ✅ `EmptyState` | ✅ `ErrorState` | ✅ `ProductImage` |
| `/buscar` | ✅ mismo layout que `/` | ✅ | ✅ | ✅ | ✅ |
| `/categoria/[slug]` | ✅ mismo layout que `/` | ✅ | ✅ | ✅ | ✅ |
| `/producto/[id]` | ✅ (grid a 1 columna <lg) | ✅ `LoadingState` | — (siempre hay producto o error) | ✅ `ErrorState` | ✅ galería + miniaturas |
| `/favoritos` | ✅ mismo `ProductGrid` | ✅ | ✅ "Explorar productos" | ✅ | ✅ |
| `/carrito` | ✅ (columna única <lg) | ✅ | ✅ "Explorar productos" | ✅ | ✅ |
| `/pedidos` | ✅ | ✅ | ✅ "Explorar productos" | ✅ | — (sin imágenes) |
| `/pedidos/[id]` | ✅ | ✅ | — | ✅ (404 RLS → ErrorState) | — |
| `/vendedor/productos` | ✅ (tabla con scroll propio) | ✅ | ✅ "Publicar producto" | ✅ | ✅ portadas |
| `/vendedor/publicar` | ✅ | — (formulario vacío) | — | — (errores de campo, no ErrorState) | ✅ miniaturas |
| `/vendedor/productos/[id]/editar` | ✅ | ✅ `LoadingState` | — | ✅ (`isOwner=false` → ErrorState) | ✅ |
| `/vendedor/pedidos` | ✅ (kanban con scroll propio) | ✅ | ✅ "Todavía no tienes pedidos" | ✅ | — |
| `/login` | ✅ | — | — | — (errores de campo) | — |
| `/register` | ✅ | — | — | — (errores de campo) | — |

## Limpieza

- [x] `app/dev/ui/page.tsx` borrado (y `app/dev/` completo, quedó vacío).
- [x] Ningún placeholder "Próximamente" sobrevivió — las 14 rutas tienen
  implementación real (verificado con `grep -r "Próximamente" app/`, vacío).

## Verificación de capas

```bash
grep -rl "@/lib/supabase" components hooks
```
Resultado: **vacío**. (Se encontraron y corrigieron 2 violaciones reales:
`useAuth.ts` y `useProduct.ts` importaban `lib/supabase/client` directo en
vez de pasar por `services/auth.service.ts` — se agregaron
`onAuthStateChange()` y `getCurrentUserId()` a ese service.)

```bash
grep -rl "from \"@/services" components
```
Resultado: **vacío**. (Se encontraron y corrigieron 3 violaciones: 3
componentes importaban *tipos* directo de `services/` para tipar sus props —
`CartItemRow.tsx`, `OrdersKanban.tsx`, `OrderKanbanCard.tsx`. Se reemplazaron
por interfaces locales estructuralmente equivalentes.)

## Bugs reales encontrados y corregidos en esta fase

1. **`Select.Value` de Base UI no resuelve la etiqueta automáticamente**:
   muestra el `value` crudo (ej. un UUID de categoría) salvo que se le pase
   una función `children` que mapee valor→etiqueta. Afectaba el selector de
   categoría/condición (`ProductForm`) y el de orden (`FiltersPanel`, de la
   Fase 3.4 — no se había notado porque `value` y `label` coincidían
   visualmente para algunos valores). Corregido en los tres.
2. **`/vendedor/productos/[id]/editar` no verificaba dueño**: como los
   productos activos son públicos para lectura (RLS), la página cargaba el
   formulario con los datos de un producto de OTRO vendedor sin aviso — el
   guardado fallaba silenciosamente por RLS, pero la UX era engañosa. Se
   agregó `isOwner` a `useProductForm` y un `ErrorState` explícito en la
   página cuando el producto no pertenece al vendedor autenticado.
3. **`useSearchParams()` sin límite `Suspense`**: `npm run build` (no
   `npm run dev`) fallaba en las 5 páginas que leen filtros/redirectTo de la
   URL (`/`, `/buscar`, `/categoria/[slug]`, `/login`, `/register`) porque
   Next.js 15 exige un `<Suspense>` para poder prerenderizar. Corregido
   envolviendo el contenido de cada página.

## Cómo verificar al terminar (de la spec)

- [x] Checklist completo (esta tabla).
- [x] `npm run lint` — limpio.
- [x] `npm run type-check` — limpio.
- [x] `npm run build` — limpio, 14 rutas generadas.
- [x] Los dos greps de capas devuelven vacío.
