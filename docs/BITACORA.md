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
