# Revisión S5 — Lab de validación automática (Fase 5.6)

Aplicación de las 4 Skills de gobernanza (`.claude/skills/mercadotech-*`,
creadas en la Fase 5.1) sobre el código real de las Sesiones 2–4 y el
servidor MCP nuevo de esta sesión.

**Nota metodológica.** Las Skills recién creadas no se cargan en la misma
conversación de Claude Code que las creó — se descubren recién al
reiniciar la sesión (decisión 9 de `MercadoTech_sesion5.md`). Como esta
sesión no se pudo reiniciar a sí misma, los checklists de
`mercadotech-tech-lead` y `mercadotech-code-reviewer` se aplicaron
manualmente (por su autor, con el texto exacto de cada `SKILL.md` como
guía) en vez de invocarlos con la tool `Skill`: sobre `hooks/` y los 3
Route Handlers + `lib/ai/` mediante un agente con el checklist completo
embebido en su prompt; sobre `services/` y `mcp/src/` directamente por
quien escribió ambos. El resultado — hallazgo → severidad → veredicto →
evidencia — es el mismo que pide la spec. El cierre con
`mercadotech-automatic-validator` (checks automatizados: greps + lint +
type-check) sí se ejecutó literalmente, comando por comando.

## Alcance

1. `services/` completo (15 archivos) — checklist tech-lead.
2. `hooks/` completo (16 archivos) — checklist tech-lead.
3. `lib/ai/` (4 archivos) + los 3 Route Handlers de `app/api/v1/` —
   checklist code-reviewer.
4. `mcp/src/` completo (Sesión 5) — checklist code-reviewer, self-review.

## Hallazgos

| # | Hallazgo | Severidad | Veredicto | Evidencia |
|---|---|---|---|---|
| 1 | `hooks/useSellerOrders.ts` validaba "un paso adelante" en `orders.status` SOLO en el hook — el propio código lo marcaba como excepción a la regla de capas. Confirmado contra la RLS real (`orders_update_seller_advance_status`, `supabase/schema.sql:684-688`): solo bloquea `cancelado`, sin validar secuencia. Cualquier llamada directa a `seller.service.updateOrderStatus` podía saltar pasos. | Importante (acoplamiento de capas + integridad de datos) | **Corregido** | [services/seller.service.ts](../services/seller.service.ts), [hooks/useSellerOrders.ts](../hooks/useSellerOrders.ts) — commit `a5b152e` |
| 2 | `mcp/src/shared/stats.ts` hardcodeaba `.slice(0, 5)` (top vendidos) sin nombre ni justificación — viola la regla de tunables documentados. | Sugerencia | **Corregido** | [mcp/src/shared/stats.ts](../mcp/src/shared/stats.ts) — commit `e927e6f` |
| 3 | `eslint.config.mjs` no excluía `mcp/dist/` ni `mcp/node_modules/`: `npm run lint` desde la raíz reportaba 153 problemas (59 errores) — todos código de terceros minificado dentro del bundle de producción de `mcp/` (generado en la Fase 5.5), no código propio. | Importante (falso gate de calidad: el validator hubiera fallado por código ajeno) | **Corregido** | [eslint.config.mjs](../eslint.config.mjs) — commit `750d0de` |
| 4 | `hooks/useFavorite.ts:15` — `favoriteService.isFavorite(...).then(setIsFavorite)` sin `.catch`: unhandled promise rejection ante cualquier error de red/RLS, único hook de fetching del set que rompía el patrón `.then().catch()`. | Importante | **Corregido** | [hooks/useFavorite.ts](../hooks/useFavorite.ts) — commit `b65d346` |
| 5 | `hooks/useProduct.ts:40-44` — la promesa de `getCurrentUserId()` sin `.catch`, y el `.catch(() => {})` de `registerView` tragaba el error en silencio sin loggear. | Importante | **Corregido** | [hooks/useProduct.ts](../hooks/useProduct.ts) — commit `b65d346` |
| 6 | `hooks/useProductForm.ts` tenía `extractPositionFromPath()` reinterpretando a mano la convención de path `{seller_id}/{product_id}/{n}.{ext}` que `services/storage.service.ts` ya posee y documenta — el mismo formato codificado en dos capas. | Importante (acoplamiento entre capas) | **Corregido** | [services/storage.service.ts](../services/storage.service.ts), [hooks/useProductForm.ts](../hooks/useProductForm.ts) — commit `c665089` |
| 7 | `cart.service.updateQuantity` no clampea al stock actual como sí hace `addItem` (`Math.min(desiredQuantity, product.stock)`). | Sugerencia | **Aceptado como está** — la integridad real de stock la garantiza el RPC `create_order_from_cart` en el checkout (ver Fase 3.6, `docs/BITACORA.md`); esto es solo una inconsistencia menor de UX en el carrito, no una brecha de datos. No se toca en esta sesión. | [services/cart.service.ts](../services/cart.service.ts) |
| 8 | `hooks/useProductForm.ts` (283 líneas) mezcla estado de formulario, galería, validación de archivos y orquestación de subida/submit. | Sugerencia (mantenibilidad) | **Aceptado como deuda documentada** — no viola la regla de capas (todo pasa por los services correspondientes); candidato a partir en dos hooks si vuelve a crecer, no urgente hoy. | [hooks/useProductForm.ts](../hooks/useProductForm.ts) |
| 9 | `compare_products` (tool MCP #6) usa `.max(4)` como límite de zod — evaluado como posible "número mágico" fuera de constantes. | — | **Falso positivo** — no es un tunable de negocio que pueda cambiar independientemente: "2 a 4 productos" es la forma misma del tool, documentada en su propia descripción y en la tabla de la spec. | [mcp/src/tools/compare-products.ts](../mcp/src/tools/compare-products.ts) |
| 10 | Fetch directo a `/api/v1/*` desde `useSemanticSearch`/`useChat` sin pasar por un service. | — | **Falso positivo** — `CLAUDE.md` autoriza explícitamente esa ruta ("para lo que no puede correr en el navegador"); ambos hooks lo comentan en el código. | — |
| 11 | `useCart.ts` calcula `subtotal`/`count` con `reduce` sobre precios ya convertidos a `number`. | — | **Falso positivo** — agregación de vista sin reglas de dominio (sin descuentos/impuestos), mismo nivel que `grouped` en `useSellerOrders`. No es lógica de negocio. | — |

## Deuda ya documentada (contrastada, no re-corregida)

No apareció ningún hallazgo nuevo dentro de la deuda ya aceptada en
`docs/BITACORA.md` (ausencia de `public_profiles`, stock no restaurado al
cancelar, sin multi-vendedor por pedido, búsqueda con `ilike`,
vulnerabilidades transitivas de Next) — se verificó explícitamente que
ninguno de los archivos en alcance la reintroduce ni la agrava.

## Qué está bien hecho (reforzar)

- Separación deliberada SDK vs. fetch crudo entre `lib/ai/embeddings.ts` y
  `lib/ai/completion.ts`, sin mezclarse (lección de ReadHub, Sesión 4).
- `lib/ai/completion.ts` tiene el mejor manejo de errores accionables del
  repo (401 / cuota / modelo rotado / respuesta vacía, cada uno con
  mensaje distinto).
- `vector-search.service.searchKnowledge` evita duplicar el paso
  embedding+RPC entre `chat.service` y `searchProducts`.
- Los 3 Route Handlers son delgados: validación + delegación a
  `services/`, sin lógica de negocio propia.
- `mcp/`: cliente anon/admin consistente con la RLS real en las 10 tools
  y 7 resources (verificado cruzando cada uso de `admin` contra su
  comentario de justificación); ningún `any`; `resources/list` sobrevive
  a `supabase stop`.

## Build de producción

`npm run build` (Next/Turbopack) no pudo ejecutarse en este entorno: una
directiva de Control de aplicaciones de Windows bloquea el binario nativo
`@next/swc-win32-x64-msvc`, y el fallback a wasm no soporta
`turbo.createProject`. Es una restricción del entorno local, no del
código — `type-check` y `lint` (la señal que sí puede correr acá) están
limpios. Queda documentado para quien retome esta sesión en una máquina
sin esa política.

## Cierre — `mercadotech-automatic-validator`

Checklist fijo corrido sobre el estado final del repo (todas las
correcciones de arriba ya commiteadas):

1. **Reglas del enforcer**
   - `grep -rl "@/lib/supabase" components hooks` → vacío. PASA
   - `grep -rl 'from "@/services' components` → vacío. PASA
   - `grep -rln "@huggingface" --include="*.ts" . | grep -v node_modules | grep -v lib/ai` → vacío. PASA
   - `lib/supabase/admin.ts` solo importado desde Route Handlers, `scripts/` y `mcp/src/context.ts` (verificado; `mcp/src/context.ts` solo lo MENCIONA en un comentario explicando por qué NO lo importa). PASA
   - Sin tunables hardcodeados nuevos fuera de `lib/constants/` (hallazgo #2, corregido). PASA
   - `mcp/` sin lógica de negocio fuera de sí mismo, derivaciones documentadas en `shared/`. PASA
2. **Errores críticos del code-reviewer**: ninguno encontrado (los hallazgos 1, 4, 5, 6 son "importante", no "crítico" — ya corregidos de todas formas). PASA
3. **`npm run lint`** (raíz) → limpio, 0 problemas. PASA
4. **`npm run type-check`** (raíz y `mcp/`) → ambos limpios. PASA
5. **`npm run test`** → no existe todavía (Sesión 6). OMITIDO, no cuenta ni a favor ni en contra.

```
VALIDACIÓN APROBADA
```
