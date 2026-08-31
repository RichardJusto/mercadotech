# Debugging — Sesión 6

Guía práctica para cuando algo falla: cómo encararlo paso a paso y cómo
pedirle ayuda a Claude de forma que la primera respuesta ya sea útil. Los
tres ejemplos de la tabla final son incidentes REALES de este mismo
proyecto (Fase 6.7, pipeline de CI) — no casos inventados.

## El flujo de debugging

Siempre en este orden. Saltarse un paso (sobre todo el 2) es la forma más
común de perder tiempo arreglando lo que no era.

1. **Síntoma.** Anotá literalmente qué pasó y qué esperabas que pasara.
   "no funciona" no es un síntoma; "el botón Agregar al carrito no hace
   nada, no aparece el toast" sí lo es.

2. **Reproducir con un test que falla.** Antes de tocar código de
   producción, escribí (o encontrá) un test que falle DE LA MISMA MANERA
   que el síntoma. Si no podés hacer que un test falle reproduciendo el
   bug, todavía no entendiste el bug — seguís en el paso 1. Este paso es
   el que más se salta bajo presión, y es el que evita "arreglar" algo
   que en realidad no era el problema.

3. **Leer los logs, no adivinar.** Según dónde vive el bug:
   - **Next.js (servidor)**: la terminal de `npm run dev` — errores de
     Route Handlers, RSC, y cualquier `console.error` del lado servidor
     aparecen ahí, no en la consola del navegador.
   - **Endpoints de IA** (`/api/v1/asistente`, `/api/v1/soporte`, `/api/v1/buscar`):
     mismo lugar (terminal de `npm run dev`), pero fijate también en el
     Network tab del navegador — el body de una respuesta 4xx/5xx casi
     siempre trae el mensaje real del proveedor (Hugging Face) o de
     Supabase, no solo el status code.
   - **Supabase local**: `supabase logs` (o Studio en `:54323` → Logs) para
     ver el SQL real que llegó a Postgres, útil sobre todo para RLS y
     `GRANT`.
   - **CI (GitHub Actions)**: no alcanza con ver "Failed" en rojo — hay que
     entrar al job específico (`checks` o `e2e`), abrir el step que falló,
     y si es el job `e2e`, bajar el artefacto `playwright-report` (queda
     linkeado al final del run) para ver el trace y la screenshot del
     momento exacto del fallo.
   - **MCP** (`mcp/`): stdout está reservado para JSON-RPC — cualquier log
     de diagnóstico tiene que ir a stderr (ver la nota en `mcp/src/index.ts`)
     o no vas a ver nada, vas a ver una respuesta corrupta.

4. **Una sola hipótesis a la vez.** Con el log real en mano, elegí LA
   explicación más probable y probala. Cambiar tres cosas a la vez porque
   "una de estas seguro es" hace que cuando el test pasa no sepas cuál era
   el problema real — y la próxima vez que aparezca, no vas a reconocerlo.

5. **El test pasa.** El mismo test del paso 2, sin tocarlo, ahora en verde.
   Si tuviste que modificar el test para que pase, no arreglaste el bug:
   moviste la meta.

## Cómo pedirle ayuda a Claude

Una descripción completa en el primer mensaje ahorra 2-3 idas y vueltas.
Incluí siempre:

- **El síntoma exacto**, con el mensaje de error LITERAL (copiado, no
  parafraseado — "algo de permisos" y "permission denied for table orders"
  son pistas completamente distintas).
- **Los pasos para reproducirlo**, idealmente el comando o la URL exacta.
- **El log relevante**, pegado tal cual (terminal de dev, Network tab,
  `supabase logs`, o el step de Actions que falló).
- **Qué ya descartaste.** "ya probé X y seguía igual" evita que Claude
  proponga lo mismo que ya no sirvió.

Cuanto más se parezca tu mensaje a la Tabla de abajo (síntoma + mensaje
literal), más rápido se llega al fix real.

## Tabla de errores típicos

| Síntoma / mensaje literal | Qué significa | Primer paso concreto |
|---|---|---|
| Página de producto o pedido vacía, pero el mismo `select` funciona en Studio con el service role | RLS está bloqueando la fila para el usuario actual — según la ruta, se ve como 0 filas (cliente/anon) o un 401 (Route Handler) | Revisá qué policy de `orders`/`products`/etc. aplica a `auth.uid()` del usuario logueado; probá el mismo `select` en Studio pero como ese rol, no como service role |
| `permission denied for table X` desde código que usa `lib/supabase/admin.ts` | El service role bypasea RLS pero en este proyecto NO tiene acceso implícito de tabla — necesita `GRANT` explícito (ver la nota de CLAUDE.md sobre `20260825000400_grant_service_role.sql`) | Revisá si la tabla nueva está cubierta por `ALTER DEFAULT PRIVILEGES` o si necesita su propio `GRANT service_role` en una migración |
| Un fetch a Hugging Face falla, pero el error no dice "clave inválida" ni nada de config | Con HF, un modelo sin proveedor activo para inferencia falla la REQUEST, no la config — no es que la API key esté mal | Probá el mismo modelo desde el Playground de HF; si falla igual ahí, es el modelo/proveedor, no tu código |
| Error de pgvector sobre dimensión del embedding (algo como "expected N dimensions") | El vector que estás insertando o comparando no tiene la misma dimensión que la columna `knowledge_embeddings.embedding` | Confirmá qué modelo generó ese embedding — un cambio de modelo en `lib/ai/embeddings.ts` sin migrar la columna produce exactamente esto |
| CI (`checks` o `e2e`) falla en `npm ci` con `Missing: <paquete>@<versión> from lock file` | La versión de npm que generó `package-lock.json` localmente no coincide con la que corre en el runner de CI — el lockfile tiene un formato ligado a la versión de npm | Confirmá tu versión real con `npm -v` y fijala en `package.json` → `"packageManager"` (fue exactamente el bug de la Fase 6.7: el spec asumía `11.6.2`, la real era `10.9.8`) |
| El servidor MCP responde con un JSON corrupto o el cliente MCP no puede parsear la respuesta | Algo escribió en `stdout` además del JSON-RPC — con transporte stdio, stdout es el canal de protocolo, no de logging | Confirmá que `console.log`/`info`/`warn` están redirigidos a stderr al inicio de `mcp/src/index.ts`; cualquier `console.log` nuevo agregado después rompe esto de nuevo |
| `tsc --noEmit` en la raíz falla compilando algo dentro de `mcp/` (ej. "Cannot find module 'tsup'") | El `tsconfig.json` de la raíz no excluye `mcp/`, así que en un checkout limpio (sin `mcp/node_modules` todavía) intenta compilar los archivos de `mcp/` como si fueran parte de la app Next | Confirmá que `tsconfig.json` de la raíz tiene `"mcp"` en `exclude` — es justo el bug real que rompió el primer run de CI de la Fase 6.7 |
| Un test E2E de teclado (drag & drop del kanban) pasa siempre en local pero flaquea solo en CI | Un número fijo de "apretá la flecha N veces" está calibrado contra la geometría/velocidad de un solo entorno — el paso en píxeles de dnd-kit es fijo, pero cuántas veces hace falta apretar depende del layout real, que puede variar entre SO/runner | Medí la posición real de origen y destino con `boundingBox()` en el test y derivá la cantidad de repeticiones en vez de hardcodearla (ver `e2e/pages/SellerKanbanPage.ts`, método `moveToColumn`) |
| Un test que depende de un fetch client-side (ej. una categoría cuyo nombre viene de `useCategories()`) falla por timeout justo después de un `supabase db reset`, pero el dato subyacente es correcto | Race de timing, no un bug de la app: el fetch todavía no resolvió cuando el test ya está mirando el DOM, sobre todo en un runner más lento recién después de resetear la base | Priorizá verificar el contenido sustantivo (ej. el producto filtrado) con un timeout generoso ANTES del elemento derivado del fetch lento (ej. el `<h1>`) — no subas el timeout a ciegas, reordená QUÉ se verifica primero |
| `npm run test:e2e` local falla de forma DISTINTA en cada corrida (ej. `cart-count` da "4" en vez de "2", o un negativo de carrito vacío ve ítems) sin tocar nada de código, mientras que CI viene pasando en verde | Los specs de E2E comparten filas mutables del mismo seed ENTRE ARCHIVOS a propósito (mismo carrito de `buyer1`, mismo pedido `PAGADO_ORDER_ID`) — solo es seguro correrlos en serie. `playwright.config.ts` limitaba `workers: 1` solo cuando `CI` está seteado; en local, sin esa variable, Playwright paraleliza por defecto y los archivos pisan el estado del seed entre sí | Confirmá corriendo con `--workers=1` si el fallo desaparece; si es así, el problema es paralelismo, no la app — fijar `workers: 1` sin condicionarlo a `isCI` (bug real encontrado en el cierre de la Fase 6.8) |

## Verificación de esta guía

Un chequeo simple: alguien sin contexto previo del proyecto que vea
`Missing: <paquete>@<versión> from lock file` en un log de CI debería
poder, con solo esta tabla, llegar a "revisar `packageManager` en
`package.json` contra `npm -v` real" sin necesitar preguntar nada más.
