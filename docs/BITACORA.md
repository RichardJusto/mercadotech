# Bitácora de MercadoTech

Registro acumulativo de decisiones, hallazgos y desviaciones de cada sesión
del curso. Cada sesión agrega su propia sección al final; no se reescribe lo
anterior.

---

## Sesión 2 — Arquitectura Escalable y Backend con Supabase

*(Retrospectiva breve; el detalle completo vive en
[`docs/ARQUITECTURA.md`](./ARQUITECTURA.md).)*

- Proyecto Next.js 15 + TypeScript estricto + TailwindCSS v4 + shadcn/ui
  (`base-nova`, sobre `@base-ui/react` en vez de Radix — relevante para la
  Sesión 3, ver más abajo).
- 14 tablas, RLS completo, Storage, seed y validación. Un bug real de
  producción se encontró y corrigió en la Fase 2.3: recursión infinita en
  RLS entre `orders` y `order_items` (cada política consultaba la tabla de
  la otra); se resolvió con dos funciones `SECURITY DEFINER`
  (`order_has_seller_item`, `order_belongs_to_buyer`) que bypasean RLS
  puertas adentro, igual que `is_admin()`.
- Entorno local: Docker Desktop tuvo dos rondas de problemas reales (sockets
  Unix huérfanos de intentos previos fallidos, resueltos renombrando el
  directorio `run` de Docker; WSL2 no estaba instalado inicialmente).

---

## Sesión 3 — UI Inteligente y Frontend Multimodal

**Estado al cierre**: las 8 fases (3.1–3.8) completas y verificadas contra
datos reales (login real con usuarios del seed, consultas SQL directas para
confirmar efectos en la base, no solo lectura de código).

### Fase 3.1 — Sistema visual y componentes base

`types/database.ts` generado (14 tablas + `create_order_from_cart`), tema
azul eléctrico en `globals.css`, 8 componentes compartidos (`Price`,
`RatingStars`, `ConditionBadge`, `ProductImage`, `EmptyState`, `ErrorState`,
`LoadingState`, `Container`). Verificado en `/dev/ui` (borrada en 3.8) con
toggle de tema claro/oscuro real (confirmado por `document.documentElement`
y el color de fondo computado).

### Fase 3.2 — Layouts y navegación

Los tres layouts, navbar/sidebar puros, 14 páginas placeholder. `npm run
build` sin colisión de rutas tras eliminar `app/page.tsx`. Único hallazgo:
un warning de accesibilidad de Base UI (`nativeButton`) en `UserMenu`,
corregido.

### Fase 3.3 — Autenticación

Migración nueva `handle_new_user_metadata` (lee `role`/`display_name` de
`raw_user_meta_data`, nunca acepta `'admin'` desde el registro — verificado
manipulando el payload directamente contra la API de Auth). Middleware de
rutas protegidas verificado por HTTP real (`307` a `/login?redirectTo=...`).

### Fase 3.4 — Catálogo

Primera fase con datos reales en pantalla: 14 productos activos del seed en
2 páginas, filtros que escriben en la URL, búsqueda por marca. Verificado
navegando con sesión real y leyendo el DOM renderizado, no solo la respuesta
de la API.

### Fase 3.5 — Detalle, preguntas, reseñas, favoritos

Verificado con login real como `buyer1` y `seller1`: el formulario de reseña
no aparece si ya reseñó, `isOwner` habilita/bloquea la respuesta a preguntas
correctamente, favoritos persiste en `favorites` y en `/favoritos`,
`product_views` registra la vista solo con sesión.

### Fase 3.6 — Carrito y checkout

Flujo de checkout completo probado de punta a punta contra el RPC real:
duplicar un producto en el carrito suma cantidad (no crea fila), checkout
exitoso descuenta stock y vacía el carrito, checkout con stock insuficiente
muestra el mensaje exacto de Postgres sin crear pedido, cancelar un pedido
`pendiente` funciona y un pedido `pagado` no ofrece la opción, y `buyer2` no
puede abrir el pedido de `buyer1` (RLS → `ErrorState`).

### Fase 3.7 — Panel del vendedor y drag & drop

La fase más grande. Publicar con 3 imágenes reales (subidas vía `File` API)
dejó los paths y `position` correctos en Storage y `product_images`.

**Dos bugs reales encontrados y corregidos aquí** (más los dos de la Fase
3.8, ver checklist):

1. **`deleteProduct` con ventas**: confirmado que devuelve el mensaje
   "tiene ventas; desactívalo" en vez de fallar en seco.
2. **Acceso a producto ajeno en `/editar`**: ver detalle en
   [`docs/SESION3_CHECKLIST.md`](./SESION3_CHECKLIST.md) — RLS protegía la
   escritura, pero la pantalla no avisaba antes de intentarlo.

El **drag & drop real** (arrastre con puntero) no se pudo ejercitar de forma
interactiva en el entorno de este agente — el pane del navegador no compone
frames reales. Se verificó todo lo demás (creación, listado, agrupación por
estado, aislamiento entre vendedores) con datos reales; la mecánica de
arrastre se apoya en `@dnd-kit` (biblioteca madura, con `KeyboardSensor`
habilitado) más revisión de código, no en una prueba en vivo. Si algo falla
ahí, es el primer lugar a mirar.

### Fase 3.8 — Responsive, accesibilidad y estados

Sin funcionalidad nueva. Encontró y corrigió:

- 2 violaciones reales de la regla de capas (hooks importando
  `lib/supabase` directo; componentes importando tipos de `services/`).
- El bug sistémico de `Select.Value` (ver checklist).
- **`useSearchParams()` sin `Suspense`**: `npm run build` fallaba en 5
  páginas — `npm run dev` nunca lo mostró. Lección para sesiones futuras:
  correr `build`, no solo `dev`/`type-check`, antes de dar una fase por
  cerrada.

Detalle completo, tabla por pantalla y greps de capas en
[`docs/SESION3_CHECKLIST.md`](./SESION3_CHECKLIST.md).

### Decisiones/hallazgos que valen para sesiones futuras

- **shadcn/ui de este proyecto usa `@base-ui/react`, no Radix.** La
  composición polimórfica es con la prop `render` (`<Trigger render={<Button
  />} />`), no `asChild`. `Select.Value` no auto-resuelve etiquetas: siempre
  pasarle una función `children` que mapee value→label.
- **El entorno de este agente no compone frames del navegador de forma
  fiable.** `screenshot` y `computer.click/key` fallan con "pane no
  desplegado". La verificación interactiva de toda la sesión se hizo con
  `javascript_tool` (DOM + `dispatchEvent`) — funciona bien para clics,
  formularios y navegación, pero NO para gestos de arrastre reales
  (pointerdown/move/up con distancia). Cualquier feature con drag & drop
  necesita, en sesiones futuras, verificación manual humana o un entorno de
  navegador con compositing real.
- **`npm run build` encuentra bugs que `dev`/`type-check` no encuentran**
  (el caso de `useSearchParams` sin `Suspense`). Correrlo antes de cerrar
  cualquier fase que agregue páginas nuevas.

---

## Sesión 4 — IA y RAG

**Estado al cierre**: Prompt 0 + las 8 fases (4.1–4.8) completas y
verificadas contra Hugging Face real y Supabase local real (sin mocks):
login real, publicaciones reales, `curl`/`fetch` real a los 3 endpoints
nuevos, y consultas SQL directas para confirmar cada efecto en
`knowledge_embeddings`. Detalle de los 6 casos de prueba y la calibración en
[`docs/RAG.md`](./RAG.md).

### Fase 4.1 — Infraestructura vectorial

`pgvector` habilitado, tabla `knowledge_embeddings` (`vector(384)`, índice
HNSW coseno), RPC `match_knowledge`, RLS (`SELECT` solo `authenticated`).
Tipos regenerados. Sin sorpresas.

### Fase 4.2 — Capa de IA

`lib/constants/ai.ts`, `lib/ai/embeddings.ts` (SDK de Hugging Face),
`lib/ai/completion.ts` (fetch crudo al router OpenAI-compatible —
deliberadamente dos mecanismos distintos, lección de ReadHub),
`lib/ai/prompts.ts`, `services/embedding.service.ts`. Verificado con un
script de humo real: 384 números, no un mock.

### Fase 4.3 — Indexación automática

Endpoint `/api/v1/reindex`, trigger fire-and-forget en publicar/editar/
desactivar/eliminar producto, `scripts/index-all.ts`.

**Bug real encontrado y corregido**: `service_role` no tenía NINGÚN
`GRANT` de tabla desde la Fase 2.3 de la Sesión 2 — la migración de esa
fase solo le dio privilegios a `anon`/`authenticated`. Nunca se había
notado porque hasta esta fase nada usaba el cliente admin para tocar una
tabla de negocio directamente (los triggers `SECURITY DEFINER` anteriores
corren como su dueño, no como `service_role`). `scripts/index-all.ts`
falló con "permission denied for table products" hasta agregar la
migración `20260825000400_grant_service_role.sql`. Queda documentado ahí
mismo: NUNCA modificar la migración de la Fase 2.3, esto se corrige con una
migración nueva.

**Verificado sin token** (caso límite explícito de la spec): con
`HUGGINGFACEHUB_API_TOKEN` deshabilitado, publicar un producto funcionó
igual (no rompe el flujo crítico), `/api/v1/reindex` devolvió 500, y quedó
registrado tanto en la consola del navegador
(`services/indexing-trigger.service.ts`) como en la terminal del servidor
— esto último no estaba en el diseño original del endpoint y se agregó acá
(`console.warn` en el `catch` de `app/api/v1/reindex/route.ts`) porque la
tabla de síntomas de la spec dice explícitamente "buscar el `console.warn`
en la terminal del server", y depender solo de la consola del navegador de
quien publica hace ese diagnóstico invisible para quien mira los logs del
server.

### Fase 4.4 — Búsqueda semántica en el catálogo

`services/vector-search.service.ts`, `/api/v1/search/semantic`, pestaña
"Resultados con IA" en `/buscar` (mismo `ProductGrid`, badge de similitud
opcional agregado a `ProductCard`). Verificado: anónimo ve el aviso de
login en la pestaña IA con la exacta intacta; con sesión, "algo para
conectar mi casa a internet" trae el router primero; "autos usados" da
`EmptyState` con sugerencia, no resultados forzados.

### Fase 4.5 — Constructor de contexto

`lib/ai/context-builder.ts`, función pura (sin red/Supabase/React).
Demostración en frío con 8 resultados de ejemplo documentada en
[`docs/RAG.md`](./RAG.md): filtra threshold, contenido corto y la fuente
que excede el presupuesto, en el orden esperado.

### Fase 4.6 — Servicio conversacional y endpoint

`types/chat.ts`, `services/chat.service.ts`, `/api/v1/chat`. Se refactorizó
`vector-search.service.ts` para extraer `searchKnowledge` (embedding +
RPC sin hidratar) y que `chat.service` y `searchProducts` compartan ese
paso en vez de duplicarlo. Verificado con `fetch` real desde el navegador
(cookie de sesión real, no `curl` con cookie copiada a mano): 401 sin
sesión, 400 body inválido/query vacía, 422 modo desconocido, 200 con
respuesta real citando productos.

### Fase 4.7 — Interfaz del asistente

`hooks/useChat.ts`, `services/ticket.service.ts` (`listMine`, solo
lectura), `components/chat/*`, páginas `/asistente` y `/soporte` (+ "Mis
tickets"), navbar y middleware ampliados.

Se extendió `metadata` de las fichas de producto (en
`embedding.service.ts`) para incluir `image_url` resuelta al indexar, y
`ContextSource`/`ChatSource` para llevar `price`/`image_url`/`category` —
la spec pide que las fuentes citadas de producto se vean como mini-card con
imagen y precio, y esa data no estaba disponible en la ficha original de la
Fase 4.1. Se corrió `index-all` de nuevo para backfillear las 24 fichas
existentes con el campo nuevo.

**Nota, no bug**: la spec decía "buyer1 ve sus tickets del seed... buyer3
ve los suyos" — en `seed.sql` los tickets pertenecen a **buyer2** y
**buyer3**, buyer1 no tiene ninguno. `ticket.service.listMine` filtra
correctamente por `user_id`; si alguien repite la verificación con buyer1 y
ve la lista vacía, es el seed, no el código.

### Fase 4.8 — Calibración, observabilidad y casos de prueba

Los 6 casos documentados con evidencia real en
[`docs/RAG.md`](./RAG.md). Decisión de calibración: el threshold
`VECTOR_SEARCH_DEFAULT_SIMILARITY_THRESHOLD` se queda en 0.3 — los datos
reales recolectados muestran que la banda de similitud de pares
relacionados (0.38–0.51) se solapa con la de pares NO relacionados
(0.40–0.51) para MiniLM con textos cortos en español; no hay un corte limpio
que mejore las cosas. La precisión real de las respuestas la da el system
prompt del LLM (cita solo lo relevante, admite cuando no sabe), no el
threshold de recuperación — confirmado en los casos 3 y 5.

### Decisiones/hallazgos que valen para sesiones futuras

- **`service_role` necesita `GRANT`s explícitos en este proyecto** — no
  tiene acceso implícito de tabla por más que bypasee RLS. Cualquier tabla
  nueva que el cliente admin necesite tocar debe estar cubierta por
  `ALTER DEFAULT PRIVILEGES` (ya configurado desde la Fase 4.3) o necesita
  su propio `GRANT`.
- **Dos mecanismos de Hugging Face, a propósito**: `lib/ai/embeddings.ts`
  usa el SDK (`InferenceClient.featureExtraction`); `lib/ai/completion.ts`
  usa `fetch` crudo al router OpenAI-compatible. No unificarlos — son APIs
  distintas del proveedor y mezclarlas fue la fuente de errores confusos en
  ReadHub (ver Guía Hugging Face en `MercadoTech_sesion4.md`).
- **`hasRelevantContext` no es lo mismo que "esto responde la pregunta"**:
  mide si algo superó el threshold de similitud, no si es correcto. La capa
  de precisión real es el LLM con las instrucciones del sistema. Antes de
  tocar el threshold por una respuesta rara, revisar el system prompt
  primero — ver Calibración en `docs/RAG.md`.
- **El token de Hugging Face nunca se pega en el repo ni en logs.** Si en
  algún momento se expuso por error en un canal no seguro, hay que
  revocarlo en huggingface.co → Settings → Access Tokens y generar uno
  nuevo antes de seguir usando la app.
- **Bug de tooling encontrado al cerrar la sesión (no de la app)**: tras
  varios `rm -rf .next` + reinicios de `next dev --turbopack` en la misma
  sesión larga de desarrollo, las páginas que envuelven un componente
  cliente con `useSearchParams()` en `<Suspense>` (`/`, `/buscar` — patrón
  de la Sesión 3) se quedaron colgadas indefinidamente en el navegador de
  este agente: el HTML del `<Suspense fallback>` nunca se resolvía, aunque
  el servidor respondía 200 y sin errores de consola. Aislado con
  `npm run build && npm run start`: la build de producción sirve esas
  mismas páginas perfecto, cero cuelgues — confirma que es un problema de
  Turbopack en modo dev (o de cómo este entorno de navegador automatizado
  conversa con su streaming), no un bug de `MercadoTech`. Si esto se repite
  en una sesión futura: no perseguir el código, primero probar
  `npm run build && npm run start` para descartar la app antes de seguir
  debuggeando.

---

## Sesión 5 — Custom Skills y Protocolo MCP

**Estado al cierre**: Prompt 0 + las 8 fases (5.1–5.6) completas. 4 Skills
de gobernanza commiteadas, servidor MCP con 10 Tools + 7 Resources + 5
Prompts registrado en `.mcp.json`, lab de validación con hallazgos reales
corregidos y `mercadotech-automatic-validator` en VALIDACIÓN APROBADA.
Detalle completo del lab en [`docs/REVISION_S5.md`](./REVISION_S5.md).

### Discrepancias encontradas entre la spec y el estado real del repo

La spec de la Sesión 5 (`MercadoTech_sesion5.md`) se escribió contra un
estado del repo ligeramente distinto al real. Ninguna bloqueó la sesión,
pero vale dejarlas explícitas para no repetir la sorpresa:

- **No había repositorio git** pese a que la spec da por hecho commits
  reales de sesiones anteriores (cita `feccd12`/`fb419eb`). Se inicializó
  al arrancar esta sesión (`git init` + commit inicial con el snapshot de
  las Sesiones 2–4), y desde ahí sí se siguió el patrón de commits
  pequeños por fase/corrección que pide la spec.
- **`PROMPTS_sesion5.md` no existe** (ni en la raíz ni en `mercadotech/`,
  que está vacía). No hizo falta: `MercadoTech_sesion5.md` ya trae el
  detalle completo de cada fase.
- **`product.service.ts` no tenía `getProductsByIds`**, que la tabla
  "Estado de partida" de la spec asumía existente como insumo directo de
  `compare_products`. Se resolvió componiendo `getProductById` (lección 6
  de la propia spec: derivar en `mcp/src/shared/` en vez de agregar un
  service nuevo al proyecto web) — ver `mcp/src/shared/products.ts`.
- **`lib/supabase/admin.ts` no importa `"server-only"`** (a diferencia de
  lo que decía la lección 8 de la spec, "comprobado en este repo" — ya no
  lo está). No cambió la decisión: `mcp/src/context.ts` igual construye
  sus propios clientes con `@supabase/supabase-js`, por las razones
  correctas (documentadas en el comentario del archivo), no por evitar un
  guard que en la práctica ya no está.
- El seed real solo tiene **una laptop activa** (Dell XPS 13) y los
  nombres de vendedores son **TechZone Perú** / **Digital World** (no
  "TecnoStore Perú" como decía el texto de ejemplo de la spec). Los
  ejemplos de verificación de `compare_products` se adaptaron a dos
  monitores en vez de dos laptops.

### Fase 5.1 — Skills de gobernanza

4 Skills en `.claude/skills/`, cada una un manual de puesto distinto:
`mercadotech-architecture-enforcer` (gate previo, 9 reglas de capas),
`mercadotech-code-reviewer` (informe /10, checklist de dominio: RLS,
snapshots de pedidos, stock vía RPC, pipeline RAG), `mercadotech-
automatic-validator` (binario APROBADA/FALLIDA) y `mercadotech-tech-lead`
(scorecard ponderado, deuda nueva vs. ya aceptada). Commiteadas desde el
primer commit, como exige la lección 1 (heredada de ReadHub, donde se
perdieron por no versionarlas).

### Fase 5.2 — Scaffolding del servidor MCP

`mcp/` como paquete propio (`@modelcontextprotocol/sdk ^1.29.0` →
resolvió 1.30.0, `zod ^3.25.76` exacto, `tsup ^8.5.1` exacto — versiones
pineadas por la lección 4). `console.log/info/warn` redirigidos a stderr
como primera línea de `index.ts` (stdout sagrado, lección 3);
`loadEnvLocal()` reutiliza el patrón de `scripts/index-all.ts` sobre la
`.env.local` de la raíz; `context.ts` fabrica `{anon, admin}` por llamada,
nunca singleton. Verificado con el MCP Inspector en modo `--cli`
(`npx @modelcontextprotocol/inspector --cli <comando> --method <m>` —
mucho más confiable para este entorno que la UI web del Inspector, que
requiere navegador).

### Fase 5.3 — 10 Tools

Una por archivo, registro central en `tools/index.ts`. Cliente anon por
defecto; admin solo en las 4 tools que tocan `knowledge_embeddings`
(sourceType semántico), `orders`/`order_items`, cruzado contra la RLS real
de cada tabla. Las 10 ejercitadas contra Supabase local con datos reales
del seed, incluidas las 3 que llaman a Hugging Face real (`semantic_
search_products`, `ask_assistant`, `find_related_products`) más
`summarize_reviews`. `get_order_status` expone solo estado/fecha/total/
ítems, nunca `buyer_id`.

### Fase 5.4 — 7 Resources y 5 Prompts

**Bug real encontrado y corregido durante la verificación**: `shared/
sellers.ts` y `resources/products.ts` usaban la página 1 de
`listActiveProducts` (12 productos, `PRODUCTS_PAGE_SIZE`) sin recorrer el
resto — con 14 productos activos en el seed, `resources/list` mostraba 12
en vez de 14 y el perfil de un vendedor con productos en la página 2
habría quedado incompleto. Se agregó `shared/products.getAllActiveProducts`
que recorre todas las páginas reutilizando el mismo service, sin
duplicar su query.

`safe.ts` también se ajustó: los errores de `@supabase/supabase-js` no
siempre son instancias de `Error` (un `fetch` fallido con Supabase caído
no lo es) — sin extraer `.message` de objetos no-`Error`, el mensaje
quedaba como el inútil `"[object Object]"`.

### Fase 5.5 — Registro y build

`.mcp.json` en la raíz, `mcp/README.md` con arquitectura y decisiones.
`npm run build` (tsup) produce `dist/index.js` (1.33MB, ESM, target
node20); verificado con el Inspector `--cli` apuntando a `node
mcp/dist/index.js` en vez de `tsx` — igual comportamiento. **Limitación de
esta sesión**: el paso "probar desde Claude Code reiniciado" no se pudo
ejecutar porque esta misma sesión no puede reiniciarse a sí misma; queda
para quien retome la sesión con `.mcp.json` y las Skills ya en el repo.

### Fase 5.6 — Lab de validación

Detalle completo en [`docs/REVISION_S5.md`](./REVISION_S5.md). Resumen:
11 hallazgos (6 nuevos corregidos en commits separados, 2 aceptados con
su porqué, 3 falsos positivos documentados). El más importante:
`hooks/useSellerOrders.ts` era, por comentario propio del código previo a
esta sesión, "la única lógica de negocio que vive en un hook" — la regla
de "un paso a la vez" en el estado de un pedido solo se validaba ahí,
nunca en la RLS (verificado: `orders_update_seller_advance_status` solo
bloquea `cancelado`) ni en el service. Se movió la validación a
`seller.service.updateOrderStatus`. Segundo hallazgo relevante: el propio
build de la Fase 5.5 (`mcp/dist/index.js`, con dependencias empaquetadas)
estaba siendo lint-eado por el ESLint de la raíz al no estar excluido —
153 falsos problemas que nada tenían que ver con código propio.

### Decisiones/hallazgos que valen para sesiones futuras

- **Las Skills de una sesión no se cargan en esa misma conversación.**
  Se descubren recién al reiniciar Claude Code (decisión 9 de la spec).
  Si una sesión futura crea o modifica Skills y necesita ejercitarlas de
  verdad (no solo aplicar su checklist a mano), hay que reiniciar la
  sesión o delegar en una conversación nueva.
- **El MCP Inspector tiene un modo `--cli` no interactivo**, muy superior
  al `--web` en este entorno: `npx @modelcontextprotocol/inspector --cli
  <comando-del-servidor> --method tools/call --tool-name X --tool-arg
  k=v` (o `--tool-args-json '{"k":[...]}'` para arrays/objetos). Permite
  scriptear la verificación de tools/resources/prompts sin navegador.
- **`eslint.config.mjs` debe excluir explícitamente cualquier `dist/` o
  `node_modules/` que no esté en la raíz** — el patrón `"node_modules/**"`
  sin `**/` por delante no alcanza paquetes anidados como `mcp/`.
- **`npm run build` (Next/Turbopack) puede fallar en Windows por una
  directiva de Control de aplicaciones** que bloquea el binario nativo
  `@next/swc-win32-x64-msvc` (el fallback wasm no soporta
  `turbo.createProject`). No es un bug de la app: si pasa, confirmar con
  `type-check`/`lint` (que sí corren) y dejarlo documentado, no perseguir
  código que no tiene el problema.

## Sesión 6 — Testing y CI con GitHub Actions

**Estado al cierre**: Fases 6.1–6.8 completas. Suite Vitest (159 tests
unitarios de `services/`/`lib/`), suite Playwright E2E (8 tests: flujos
comprador/vendedor y sus negativos, contra Supabase local con el seed
real), pipeline de CI en GitHub Actions (`.github/workflows/ci.yml`, jobs
`checks` + `e2e`) conectado al repo real
(`github.com/RichardJusto/mercadotech`) y verificado en verde en `push` a
`main` y en `pull_request`. `mercadotech-automatic-validator` actualizado:
`npm run test` ahora es obligatorio en el gate, y los E2E corren cuando el
stack local está arriba. `docs/DEBUGGING.md` nuevo, con la tabla de
errores típicos basada en incidentes reales de esta misma sesión.

### Fases 6.1–6.6 — Suites de test

Vitest para `services/`/`lib/` (mocks de `SupabaseClient`, sin red) y
Playwright para los flujos E2E de comprador y vendedor, con Page Objects
en `e2e/pages/` y usuarios de prueba reales. Sin cambios de lógica de
producción: la única excepción tocada fue agregar `data-testid` a
elementos que los tests necesitaban ubicar (la validación de "un paso a la
vez" del kanban ya vivía en `seller.service.ts` desde la Fase 5.6, no hizo
falta exportar nada nuevo).

### Fase 6.7 — CI real contra GitHub Actions

Tres bugs reales de CI, ninguno reproducible en local antes de esta
sesión — los tres están documentados con detalle en
[`docs/DEBUGGING.md`](./DEBUGGING.md):

1. **`tsconfig.json` de la raíz sin excluir `mcp/`**: en un checkout
   limpio (sin `mcp/node_modules` todavía), el `tsc --noEmit` de la raíz
   intentaba compilar `mcp/tsup.config.ts` y fallaba con
   `Cannot find module 'tsup'`. Invisible en local porque `mcp/node_modules`
   venía persistiendo de sesiones anteriores. Fix: `"mcp"` agregado a
   `exclude`.
2. **Flakiness del drag & drop por teclado del kanban**: un número fijo de
   `ArrowRight` (20, calibrado solo contra Windows local) resultó frágil en
   el runner Linux de CI — el paso de 25px de `@dnd-kit/core` es una
   constante fija del paquete, pero la geometría real del layout no lo es.
   Fix: `SellerKanbanPage.moveToColumn` mide `boundingBox()` de la tarjeta
   y la columna destino y deriva la cantidad exacta de repeticiones.
3. **Race de timing en el filtro de categoría**: el `<h1>` de
   `/categoria/laptops` depende de `useCategories()` (fetch client-side sin
   SSR) y en CI, justo tras un `supabase db reset`, podía tardar más que el
   timeout en pasar del fallback "Categoría" al nombre real — mientras que
   el producto filtrado (el dato que de verdad prueba el filtro) ya estaba
   listo hacía rato. Fix: reordenar el test para verificar primero el
   producto (timeout generoso) y recién después el `<h1>`.

**Verificación de la Fase 6.7 completa**: push a `main` verde, PR de humo
(`ci-smoke`) verde en el trigger `pull_request`, coverage descargable
desde un run verde, drag & drop cubierto por E2E de teclado real.

### Fase 6.8 — Gate binario + guía de debugging

- `mercadotech-automatic-validator` actualizado quirúrgicamente: el ítem 5
  pasó de "se omite si no existe `test`" a obligatorio; se agregó el ítem 6
  para E2E, condicional a que `supabase status` esté verde.
- `docs/DEBUGGING.md` nuevo: flujo de debugging (síntoma → reproducir con
  un test → leer el log correcto según dónde vive el bug → una hipótesis →
  fix → el test pasa), cómo pedirle ayuda a Claude, y una tabla de errores
  típicos con mensaje literal y primer paso — incluye los tres bugs de la
  Fase 6.7 como ejemplos reales, más el hallazgo de abajo.
- **Verificación del gate**: se rompió a propósito `lib/utils.test.ts`
  (`formatPrice(0)` esperando `"S/ 0.99"` en vez de `"S/ 0.00"`), se corrió
  `npm run test` y falló citando exactamente ese test
  (`lib/utils.test.ts > formatPrice > formatea 0`) — equivalente a
  VALIDACIÓN FALLIDA. Se revirtió y `lint` + `type-check` + `test`
  (159/159) + `type-check` de `mcp/` quedaron todos limpios — VALIDACIÓN
  APROBADA.
- **Bug real encontrado en esta misma verificación**: `npm run test:e2e`
  en local (sin `CI` seteado) fallaba de forma no determinística —
  distinto subconjunto de los 8 tests en cada corrida (`cart-count` en "4"
  en vez de "2", un carrito "vacío" con ítems, un kanban sin la tarjeta
  esperada). Causa: `playwright.config.ts` tenía `workers: isCI ? 1 :
  undefined` — los specs comparten filas mutables del mismo seed entre
  ARCHIVOS a propósito (el carrito de `buyer1`, el pedido
  `PAGADO_ORDER_ID`), así que solo son seguros en serie; en CI ya corrían
  con `workers: 1`, pero en local, sin esa variable, Playwright paraleliza
  por defecto y los archivos se pisan entre sí. Fix: `workers: 1` sin
  condicionar a `isCI`. Confirmado: con el fix, 8/8 en verde de forma
  consistente (antes, 3/8 fallaban al azar según el orden de scheduling).

### Decisiones/hallazgos que valen para sesiones futuras

- **Un `workers` o timeout condicionado a `isCI` es una señal de alerta**
  cuando los tests comparten estado mutable — si el comportamiento
  correcto depende de correr en serie, tiene que ser así en TODOS los
  entornos, no solo en CI. La asimetría es exactamente lo que hizo que este
  bug pasara semanas invisible (CI siempre estuvo en verde).
- **Los tres bugs de CI de la Fase 6.7 comparten un patrón**: ninguno era
  reproducible localmente ANTES de correr contra un entorno distinto
  (checkout limpio, runner Linux, timing bajo `db reset` reciente) — la
  lección no es "cómo se arregla cada uno" sino que un pipeline de CI real
  contra un entorno limpio encuentra clases de bugs que ningún test local
  bien intencionado detecta solo.
- **`git cherry-pick` es la herramienta correcta para recuperar un commit
  hecho por error en una rama descartable** (ej. una rama de humo para
  probar el trigger `pull_request`) antes de borrarla — `git branch -d`
  (no `-D`) se niega si hay commits no mergeados, lo cual es la señal para
  pausar y cherry-pickear en vez de forzar el borrado.

## Sesión 7 — Performance, Secretos y Despliegue en Vercel

**Estado al cierre**: Fases 7.2–7.5 completas. App desplegada en
producción real (`mercadotech-one.vercel.app`) sobre un proyecto Supabase
hosted separado del de desarrollo local, `main` protegida por Pull
Request + CI verde, y el flujo completo demostrado contra el repositorio
real (no en teoría) con dos PRs de humo. Documentación final: `README.md`
de producto, `docs/PLAN_CURSO.md`, `docs/ARQUITECTURA.md` ampliado con las
sesiones 3–7, y `docs/DEPLOY.md` completo con rollback.

### Fase 7.2 — Performance

Medición Lighthouse móvil (antes/después) contra build de producción real
(nunca `next dev`), documentada en `docs/PERFORMANCE.md`. Aplicados los
tres únicos candidatos autorizados por la spec: `dynamic import` de
`OrdersKanban` (-12KB First Load) y de `SortableImageGallery` (-20/-21KB
en las dos rutas más pesadas del sitio), más `sizes`/`priority` correctos
en las imágenes above-the-fold. `ChatWindow` se evaluó y se descartó: no
importa ninguna dependencia pesada, ya era la ruta más liviana del sitio
antes de tocar nada — documentado como "evaluado, no aplicado" en vez de
forzar un cambio sin beneficio medible.

**Objetivo Lighthouse ≥ 90 en home/catálogo NO alcanzado** (72 y 74). Causa
raíz identificada con las propias auditorías de Lighthouse, no adivinada:
el LCP depende de un fetch client-side que ocurre recién después de
hidratar (`useProducts()` en un Client Component) — ninguna optimización
de bundle o de atributos de imagen puede adelantar algo que todavía no
existe en el DOM. El arreglo de fondo (mover ese fetch a un Server
Component) es exactamente el tipo de cambio que esta sesión prohíbe
("no introducir features nuevas"); queda documentado como recomendación
concreta para una sesión futura, no forzado ahora con un cambio fuera de
alcance.

### Fase 7.3 — Gobernanza de secretos

Tabla de gobernanza de las 6 variables de entorno en `docs/DEPLOY.md`
(dónde vive cada una, quién la lee, pública o secreta) y greps anti-fuga
corridos sobre el código fuente — sin fugas reales. Dos falsos positivos
investigados y descartados: base64 de un screenshot de Lighthouse
pareciéndose a un JWT por azar, y el archivo de estado local del CLI de
Supabase (ya gitignoreado por el propio scaffold). `docs/lighthouse/`
(reportes ~5MB con capturas embebidas) agregado a `.gitignore` — el
resumen permanente vive en `PERFORMANCE.md`.

### Fase 7.4 — Despliegue en Vercel con base de datos remota

La fase con más pasos manuales del curso, y la que más hallazgos reales
produjo. Proyecto Supabase de producción migrado con `supabase db push` y
sembrado con `supabase/seed.prod.sql` (8 categorías + 10 FAQ reales, SIN
usuarios ni productos — el catálogo de producción nace vacío a propósito,
decisión de la spec). Vercel conectado por su integración nativa de Git,
sin CLI ni tokens de deploy.

**Cuatro hallazgos reales, cada uno con su fix documentado en
`docs/DEPLOY.md`**:

1. **`gen_salt`/`crypt` (pgcrypto) sin calificar de esquema** rompían el
   seed contra el proyecto hosted (`function gen_salt(unknown) does not
   exist`) aunque funcionaban perfecto en local — el stack local de
   Supabase trae `extensions` en el `search_path` por convención propia
   que el hosted no hereda. Fix: `extensions.crypt(...)` explícito.
2. **`support_articles` se duplicó (20 filas en vez de 10)** la primera
   vez que se aplicó `seed.prod.sql` sobre una base que ya tenía el seed
   de laboratorio: su `id` es autogenerado, así que reinsertar el mismo
   contenido crea filas nuevas en vez de chocar por clave primaria —a
   diferencia de `categories`, que usa IDs fijos. Se agregó `truncate` al
   script de limpieza antes de re-sembrar.
3. **Un usuario creado ANTES de desactivar "Confirm email" queda
   confirmado para siempre** — la desactivación no es retroactiva.
   Resuelto con la Admin API (`auth.admin.updateUserById(id, {
   email_confirm: true })`) en vez de perseguir el reenvío del correo.
4. **El proveedor de email gratuito de Supabase tiene un límite de envío
   muy bajo** (~2-4/hora) — varios registros seguidos dispararon `email
   rate limit exceeded`.

Smoke test completo contra producción real (no un preview): registro
como vendedor, login, catálogo vacío esperado, publicar producto demo con
imagen, aparece en el catálogo público, y el asistente de `/soporte`
respondiendo y citando la FAQ real indexada — las 5 fuentes correctas.

**Branch protection verificado con dos PRs de humo reales**: push directo
a `main` rechazado (`GH006: Protected branch update failed`) incluso desde
línea de comandos; `mergeable_state` de la API de GitHub pasando de
`"unstable"` (CI en curso, botón de merge deshabilitado) a `"clean"` (CI
verde, merge habilitado); producción reflejando el cambio del footer
segundos después del merge, confirmado leyendo el DOM en vivo. Hallazgo
real de configuración: la sub-opción "Require approvals" (activada por
defecto al tildar "Require a pull request before merging") bloquea a un
repo de un solo colaborador — se desactivó, dejando solo lo que la spec
pide.

### Fase 7.5 — Documentación final

`README.md` pasa a ser documentación de PRODUCTO (arquitectura en una
imagen, flujo RAG, puesta en marcha local paso a paso, testing con su
prerrequisito, CI/CD y deploy, estructura del proyecto); el plan original
de las 8 sesiones del curso se preserva intacto en `docs/PLAN_CURSO.md`
(decisión 11 de la spec — ambos documentos tienen valor propio, distinto
público). `docs/ARQUITECTURA.md` ampliado con las secciones 9–13 (una por
sesión posterior a la 2), enlazando a `RAG.md`/`DEBUGGING.md`/
`mcp/README.md` en vez de reexplicarlos, y corrigiendo datos que habían
quedado desactualizados (conteo de migraciones 19→25, estructura de
carpetas que todavía decía "vacío hasta sesión 3"). `docs/DEPLOY.md`
completado con el plan de rollback: qué SÍ revierte un rollback de Vercel
(código, env vars del build) y qué NO (la base de datos — las migraciones
nunca se deshacen con un clic, necesitan una migración nueva).

### Decisiones/hallazgos que valen para sesiones futuras

- **Un objetivo de performance no alcanzado, documentado con su causa
  raíz real, vale más que forzar un número.** La tentación ante un
  Lighthouse de 72 es "optimizar más hasta llegar a 90" — pero si la causa
  real excede el alcance autorizado de la sesión, la honestidad técnica es
  dejarlo documentado con el POR QUÉ y la recomendación concreta, no
  maquillar el síntoma con cambios fuera de alcance.
- **Una vez que `main` tiene branch protection, CUALQUIER cambio —
  incluidos los de documentación— necesita pasar por PR.** Un `git push`
  directo a main después de esta sesión siempre va a ser rechazado; el
  flujo (rama → push → PR → CI verde → merge) es ahora la única vía, sin
  excepciones para "es solo un typo en un doc".
- **Un `git commit` local no es lo mismo que tenerlo en `origin/main`.**
  Un olvido real de esta sesión: se comitearon localmente 3 fases
  completas de trabajo sin pushearlas antes de crear una rama nueva desde
  ahí — la rama nueva terminó trayendo ese trabajo pendiente al PR de
  prueba (inofensivo en este caso, porque era trabajo legítimo, pero
  confuso al revisar el diff). Conviene pushear main inmediatamente
  después de cada commit, no acumular varios antes de pushear.
- **Una desactivación de una opción de Supabase Auth (o cualquier
  configuración similar) nunca es retroactiva para estado ya creado bajo
  la configuración vieja.** Si algo se creó (un usuario, un registro)
  mientras una regla estaba activa, cambiar la regla después no lo altera
  — hay que corregir ese estado puntual aparte (Admin API, SQL directo),
  no asumir que el cambio de configuración alcanza.
