# CLAUDE.md — MercadoTech

Guía operativa para Claude Code en este repo. [`README.md`](README.md) es
la documentación de PRODUCTO (desde la Sesión 7); el plan completo del
proyecto (8 sesiones) vive en [`docs/PLAN_CURSO.md`](docs/PLAN_CURSO.md), y
la spec detallada de la sesión activa está en `MercadoTech_sesionN.md`.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript estricto · TailwindCSS v4 ·
shadcn/ui · Supabase (Postgres, Auth, Storage, RLS) · Supabase CLI.

## Comandos

```bash
npm run dev          # servidor de desarrollo (Turbopack), http://localhost:3000
npm run build         # build de producción (Turbopack) — corre esto antes de dar
                      # por cerrada una fase con páginas nuevas: encuentra errores
                      # (ej. useSearchParams sin Suspense) que dev/type-check no ven
npm run start          # sirve el build de producción
npm run lint          # ESLint (flat config, eslint-config-next)
npm run type-check     # tsc --noEmit
npm run test           # Vitest — unitarios de services/lib, sin Docker
npm run test:coverage  # Vitest con cobertura (usado en CI)
npm run test:e2e       # Playwright — requiere Supabase local arriba (supabase start + db reset)
npm run db:types       # supabase gen types typescript --local > types/database.ts
```

Supabase (stack local, requiere Docker):

```bash
supabase start        # levanta Supabase local (Docker) — Studio en :54323
supabase db reset      # reconstruye la BD desde cero: migraciones + seed.sql
```

Servidor MCP (`mcp/`, desde la Sesión 5 — comandos SIEMPRE desde la RAÍZ):

```bash
npx tsx mcp/src/index.ts             # dev
npm run build --prefix mcp            # build de producción -> mcp/dist/
node mcp/dist/index.js                # producción
npm run type-check --prefix mcp        # tsc --noEmit propio de mcp/
npx @modelcontextprotocol/inspector --cli <comando-arriba> --method tools/list
                                      # Inspector sin navegador — ver mcp/README.md
```

Usuarios de prueba (contraseña `MercadoTech123!`): `buyer1/2/3@mercadotech.test`,
`seller1/2@mercadotech.test`, `admin@mercadotech.test`.

## Variables de entorno

Copiar `.env.example` a `.env.local` y completar con las credenciales del
proyecto Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`). `.env.local` nunca se
commitea (ver `.gitignore`); `.env.example` sí, como documentación.

## Regla número uno: independencia de capas

```
components/       Presentación PURA. Reciben props, no hacen fetching, no conocen Supabase.
hooks/             Estado de cliente. Llaman a services. Cero lógica de negocio propia.
services/         Lógica de negocio. Cada función acepta un SupabaseClient INYECTABLE
                  (default: cliente de navegador) — así hooks y Route Handlers comparten
                  la misma lógica, y los tests la mockean sin red.
lib/supabase/     Clientes: client.ts (browser, anon), server.ts (cookies+RLS),
                  middleware.ts (refresco de sesión), admin.ts (service role,
                  BYPASEA RLS — solo servidor, nunca importar desde código cliente).
lib/ai/           ÚNICOS archivos que conocen la API del proveedor de IA (sesión 4).
lib/voice/        ÚNICOS archivos que conocen la API de voz del navegador/proveedor (sesión 8).
lib/validators/   Validación framework-agnóstica, compartida entre UI y servidor.
lib/constants/    Todos los tunables (roles, estados, límites) centralizados y documentados.
types/            Tipos de dominio + database.ts generado por Supabase CLI.
app/api/v1/       Route Handlers DELGADOS, solo para lo que no puede correr en el
                  navegador (secretos de IA, service role, cookies de sesión).
mcp/              Servidor MCP (sesión 5, proceso Node aparte de la app Next).
                  Reutiliza services/ y lib/ai/, NUNCA los reimplementa — ver
                  mcp/README.md. Nunca importa app/, components/ ni hooks/.
.claude/skills/   Skills de gobernanza del proyecto (sesión 5): enforcement,
                  code review, gate binario y juicio de tech-lead — ver
                  "Skills de gobernanza" más abajo.
```

Reglas derivadas:

1. Un archivo, una responsabilidad (`product.service.ts` no sabe de pedidos).
2. Sin barrels: se importa el archivo específico, nunca "todo el módulo".
3. **Ni componentes NI hooks importan `lib/supabase/*` directo** — siempre
   pasan por `services/` (verificado con
   `grep -rl "@/lib/supabase" components hooks`, debe ser vacío). Tampoco
   importan tipos desde `services/*` para tipar props: cada componente
   define su propia interfaz local estructuralmente equivalente
   (`grep -rl 'from "@/services' components`, debe ser vacío).
4. Un solo camino de datos: hooks → services → Supabase (RLS). No se construye
   una API REST paralela "por si acaso".
5. Todo tunable vive en `lib/constants/` con un comentario que justifica su valor.

## Convenciones de UI (desde la Sesión 3)

- **shadcn/ui de este proyecto corre sobre `@base-ui/react`, no Radix.**
  Composición polimórfica con la prop `render`, no `asChild`:
  `<DialogTrigger render={<Button>Abrir</Button>} />` (nunca
  `<DialogTrigger asChild><Button>...</Button></DialogTrigger>`). Si `render`
  apunta a un elemento que no es un `<button>` real (ej. un `<Link>`), hay
  que pasar `nativeButton={false}` o Base UI tira un warning en consola.
- **`<Select.Value />` NO resuelve la etiqueta sola.** Muestra el `value`
  crudo salvo que se le pase una función `children` que lo mapee:
  `<SelectValue>{(v) => LABELS[v]}</SelectValue>`. Repetir este patrón en
  cualquier `Select` nuevo — es fácil no notar el bug cuando value y label
  se parecen.
- **Verificación interactiva del navegador**: el entorno de este agente no
  compone frames reales (`screenshot`/`computer.click` fallan). Usar
  `javascript_tool` con `dispatchEvent`/`.click()`/inputs nativos para
  probar flujos — funciona para clics, forms y navegación, pero NO permite
  ejercitar gestos de arrastre (drag & drop) de forma confiable.

## Convenciones de IA (desde la Sesión 4)

- **Dos mecanismos de Hugging Face, a propósito, no unificar.**
  `lib/ai/embeddings.ts` usa el SDK (`InferenceClient.featureExtraction`);
  `lib/ai/completion.ts` usa `fetch` crudo al router OpenAI-compatible
  (`https://router.huggingface.co/v1/chat/completions`). Mezclarlos fue
  fuente de errores confusos en el proyecto de referencia (ReadHub).
- **La UI nunca importa `lib/ai/` ni `@huggingface/*`.** El navegador llega
  a la IA solo por hook → `fetch` a `app/api/v1/*` → service → `lib/ai/`
  (verificado con
  `grep -rln "@huggingface" --include="*.ts" . | grep -v node_modules | grep -v lib/ai`,
  debe ser vacío).
- **`service_role` necesita `GRANT`s explícitos en este proyecto** — no
  tiene acceso implícito de tabla por bypasear RLS. Cualquier tabla nueva
  que el cliente admin (`lib/supabase/admin.ts`) necesite tocar debe estar
  cubierta por `ALTER DEFAULT PRIVILEGES` (ya configurado) o necesita su
  propio `GRANT` — ver la migración `20260825000400_grant_service_role.sql`
  para el bug real que esto causó en la Sesión 4.
- **`hasRelevantContext` (umbral de similitud) no es "esto responde la
  pregunta".** La precisión real de las respuestas la da el system prompt
  del LLM (cita solo lo relevante, admite cuando no sabe), no el threshold
  de recuperación — ver la sección de Calibración en
  [`docs/RAG.md`](docs/RAG.md) antes de tocar
  `VECTOR_SEARCH_DEFAULT_SIMILARITY_THRESHOLD`.
- Todos los tunables de IA viven en `lib/constants/ai.ts`, cada uno con el
  comentario que justifica su valor — nunca hardcodear un umbral o modelo
  en otro archivo.

## Convenciones de Testing (desde la Sesión 6)

- **Ciclo de cierre de cualquier feature: reviewer → correcciones → validator.**
  `mercadotech-code-reviewer` primero (informe /10, errores críticos e
  importantes), se corrige lo que aplique, y recién ENTONCES
  `mercadotech-automatic-validator` como gate final — que desde esta sesión
  también corre `npm run test` (obligatorio) y los E2E si el stack local
  está arriba. No se saltea el validator asumiendo que "el reviewer ya lo
  vio": el reviewer opina, el validator es binario.
- **Vitest (`npm run test`) no necesita Docker/Supabase arriba** — son tests
  unitarios de `services/`, `lib/validators/` y helpers puros con mocks de
  `SupabaseClient`, no integración real.
- **Playwright E2E (`npm run test:e2e`) SÍ necesita el stack local completo**
  (`supabase start` + `supabase db reset` con el seed) — corren contra la
  app real, sin mocks, con los usuarios de prueba de este README.
- **CI (`.github/workflows/ci.yml`)** tiene dos jobs: `checks` (lint +
  type-check + test:coverage + type-check de `mcp/`) y `e2e` (Supabase
  efímero + Playwright chromium), en `pull_request`, `push` a `main` y
  `workflow_dispatch`. `package.json` fija `"packageManager"` a la versión
  REAL de npm local (no una asumida) — un mismatch produce
  `Missing: <paquete>@<versión> from lock file` en `npm ci`, ver
  [`docs/DEBUGGING.md`](docs/DEBUGGING.md).
- **El `tsconfig.json` de la raíz excluye `mcp/`** — sin esto, un checkout
  limpio sin `mcp/node_modules` todavía rompe el `tsc --noEmit` de la raíz
  intentando compilar archivos de `mcp/` (bug real de la Fase 6.7).
- **Interacciones de teclado en E2E (dnd-kit) se miden con `boundingBox()`,
  nunca con un número fijo de teclas.** El paso en píxeles de
  `@dnd-kit/core` (`KeyboardSensor`) es una constante fija del paquete, pero
  cuántas veces hace falta apretar la flecha depende del layout real —
  calibrar ese número contra un solo entorno lo vuelve frágil entre SO/CI
  (bug real de la Fase 6.7, ver `e2e/pages/SellerKanbanPage.ts`).
- Ante cualquier fallo real (local o en CI), seguir el flujo de
  [`docs/DEBUGGING.md`](docs/DEBUGGING.md): reproducir con un test, leer el
  log correcto según dónde vive el bug, una sola hipótesis a la vez.

## Skills de gobernanza y servidor MCP (desde la Sesión 5)

- **7 Skills en `.claude/skills/`**, cada una con un rol distinto. Las 4
  de la Sesión 5: `mercadotech-architecture-enforcer` (gate PREVIO a
  crear/mover archivos, checklist de capas), `mercadotech-code-reviewer`
  (informe /10 sobre código ya escrito), `mercadotech-automatic-validator`
  (gate binario APROBADA/FALLIDA: enforcer + críticos del reviewer + lint
  + type-check + test + E2E) y `mercadotech-tech-lead` (scorecard
  ponderado, deuda nueva vs. ya aceptada en `docs/BITACORA.md`). Tres más,
  agregadas después de la Sesión 6, cada una auditando una zona con bugs
  reales ya documentados: `mercadotech-rag-auditor` (trampas específicas
  del pipeline de IA — mezclar mecanismos de HF, dimensión del embedding,
  threshold vs. precisión, ver `docs/RAG.md`), `mercadotech-e2e-patterns`
  (patrones de tests E2E que ya rompieron CI o el entorno local — ver
  `docs/DEBUGGING.md`) y `mercadotech-rls-auditor` (RLS/permisos de
  migraciones nuevas, no del código que las consume). Se cargan recién al
  REINICIAR la sesión de Claude Code que las crea o modifica — no están
  disponibles en la misma conversación que las escribe.
- **El servidor MCP (`mcp/`) es de SOLO LECTURA** y reutiliza `services/`
  y `lib/ai/` existentes — nunca reimplementa una consulta de negocio.
  Cuando algo no existe como service (agregados, un `getById` que falta),
  se deriva componiendo funciones existentes en `mcp/src/shared/`,
  documentado en el comentario del archivo — nunca se agrega un service
  nuevo al proyecto web "para el MCP". `mcp/src/context.ts` arma sus
  propios clientes Supabase con `@supabase/supabase-js` directo (no
  `lib/supabase/client.ts` ni `admin.ts`, pensados para Next) POR LLAMADA,
  nunca singleton. Cliente anon por defecto; admin solo donde la RLS real
  de la tabla lo exige (`knowledge_embeddings`, `orders`/`order_items`,
  `profiles`) — la tabla completa está en `mcp/README.md`.
- **`console.log`/`info`/`warn` están redirigidos a stderr** como primera
  línea de `mcp/src/index.ts`: con transporte stdio, stdout transporta
  JSON-RPC y un solo log lo corrompe.
- **`eslint.config.mjs` excluye `mcp/dist/` y `mcp/node_modules/`** — un
  bundle de producción de `mcp/` sin excluir contamina el lint de la raíz
  con código de terceros minificado (bug real de la Sesión 5, ver
  `docs/REVISION_S5.md`).
- Verificar el servidor MCP con el **MCP Inspector en modo `--cli`**
  (`npx @modelcontextprotocol/inspector --cli <comando> --method <m>`),
  no con `--web`: no requiere navegador y es scripteable.

## Convenciones de Despliegue (desde la Sesión 7)

- **`main` está protegida — CUALQUIER cambio pasa por Pull Request**, un
  `git push` directo se rechaza incluso desde línea de comandos
  (`GH006: Protected branch update failed`). Flujo: rama nueva → commit →
  push → PR en GitHub (lo crea el usuario, no hay sesión de GitHub
  autenticada disponible para crearlo por API) → esperar `checks` + `e2e`
  en verde → el usuario mergea → sincronizar `main` local
  (`git checkout main && git pull`) antes de seguir trabajando.
- **Pushear cada commit apenas se hace, no acumular varios antes de
  pushear** — un commit local que no llegó a `origin/main` antes de
  crear una rama nueva termina arrastrado sin querer al próximo PR
  (bug real de la Fase 7.4, inofensivo esa vez pero confuso al revisar
  el diff).
- **Dos proyectos de Supabase, nunca confundirlos**: uno LOCAL (Docker,
  `.env.local`, seed de laboratorio con usuarios de contraseña conocida)
  para desarrollo, y uno HOSTED (producción, `supabase/seed.prod.sql` —
  sin usuarios, sin productos, catálogo vacío a propósito) para
  `mercadotech-one.vercel.app`. El local se resetea libremente
  (`supabase db reset`); el hosted solo se toca con `supabase db push`
  (migraciones) o el SQL Editor del dashboard (seed de producción) —
  nunca con `db reset`.
- **Los valores de secretos no deberían pasar por el chat** (regla de oro
  de `docs/DEPLOY.md`) — la vía preferida es que el usuario los pegue
  directo en la interfaz de Vercel/Supabase. Cuando una tarea puntual
  realmente lo exige (ej. correr `scripts/index-all.ts` contra producción,
  confirmar un usuario por la Admin API) y no hay otra vía funcional,
  tratarlos con el mismo cuidado que un token de proveedor de IA: nunca
  ecoarlos en la salida, nunca escribirlos a un archivo del repo, usarlos
  solo inline como variable de entorno de ese comando puntual.
- **`NEXT_PUBLIC_*` se inlinea en el momento del BUILD**, no se lee en
  caliente — cambiar una variable en Vercel sin hacer Redeploy después dejó
  la app en producción apuntando a Supabase local por un rato (incidente
  real de la Fase 7.4). Después de cualquier cambio de variables:
  Redeploy, siempre.
- **Medir performance SIEMPRE contra build de producción**
  (`npm run build && npm run start`, o la URL real de Vercel) — nunca
  contra `next dev`, que da números de Lighthouse falsos.

## Estado actual

Sesión 7 completa (Fases 7.2–7.5): app desplegada en producción real —
[mercadotech-one.vercel.app](https://mercadotech-one.vercel.app) — sobre
un proyecto Supabase hosted migrado y sembrado con `seed.prod.sql`
(catálogo vacío a propósito, sin usuarios de laboratorio). `main`
protegida por Pull Request + CI verde, verificado con dos PRs de humo
reales (push directo rechazado, merge bloqueado con CI en curso, producción
actualizada al mergear). Performance medida contra build de producción con
Lighthouse (`docs/PERFORMANCE.md`) — el objetivo ≥90 en home/catálogo no
se alcanzó (72/74) por una causa raíz documentada (fetch client-side que
retrasa el LCP) fuera del alcance autorizado de la sesión, dejado como
recomendación para el futuro en vez de forzado. Documentación completa:
`README.md` de producto, `docs/PLAN_CURSO.md` (plan original preservado),
`docs/ARQUITECTURA.md` ampliado con las 5 sesiones posteriores a la 2, y
`docs/DEPLOY.md` con gobernanza de secretos, flujo de despliegue, smoke
test y plan de rollback.

Sesión 6: suite Vitest (unitarios de `services/`/`lib/`), suite Playwright
E2E (flujos comprador, vendedor y sus negativos, con usuarios de prueba
reales contra Supabase local) y pipeline de CI en GitHub Actions
(`.github/workflows/ci.yml`, jobs `checks` + `e2e`) verificado en verde en
`push` y `pull_request` contra el repo real. Tres bugs reales de CI
encontrados y corregidos (exclusión de `mcp/` en el `tsconfig.json` raíz,
flakiness de teclado en el kanban, race de timing en un fetch
client-side) — documentados en [`docs/DEBUGGING.md`](docs/DEBUGGING.md).
El gate de `mercadotech-automatic-validator` incluye `npm run test`
(obligatorio) y los E2E cuando el stack local está arriba.

Sesión 5: 7 Skills de gobernanza commiteadas (4 iniciales + 3 agregadas
tras la Sesión 6: RAG, E2E, RLS), servidor MCP (`mcp/`) con 10 Tools + 7
Resources + 5 Prompts registrado en `.mcp.json`, y el lab de la Fase 5.6
con [`docs/REVISION_S5.md`](docs/REVISION_S5.md) en VALIDACIÓN APROBADA.

Sesión 4: infraestructura vectorial (pgvector, `knowledge_embeddings`, RPC
`match_knowledge`), indexación automática al publicar/editar/eliminar
productos, búsqueda semántica en `/buscar` (pestaña "Resultados con IA"),
asistente de compras (`/asistente`) y de soporte (`/soporte`, con "Mis
tickets"). Los 6 casos de prueba del RAG y la calibración de thresholds
están documentados en [`docs/RAG.md`](docs/RAG.md).

Ver [`docs/BITACORA.md`](docs/BITACORA.md) para el registro detallado por
fase (Sesiones 2–7) y [`docs/SESION3_CHECKLIST.md`](docs/SESION3_CHECKLIST.md)
para la pasada de calidad de la Sesión 3. Pendiente: Sesión 8 del plan
(ver [`docs/PLAN_CURSO.md`](docs/PLAN_CURSO.md); amplía `/soporte` con voz,
ya con el layout preparado para el botón de micrófono, y reutiliza la tool
MCP `get_order_status`).
