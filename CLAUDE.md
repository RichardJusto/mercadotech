# CLAUDE.md — MercadoTech

Guía operativa para Claude Code en este repo. El plan completo del proyecto
(8 sesiones) está en [README.md](README.md); la spec detallada de la sesión
activa está en `MercadoTech_sesionN.md`.

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
npm run db:types       # supabase gen types typescript --local > types/database.ts
```

Supabase (stack local, requiere Docker):

```bash
supabase start        # levanta Supabase local (Docker) — Studio en :54323
supabase db reset      # reconstruye la BD desde cero: migraciones + seed.sql
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

## Estado actual

Sesión 4 completa (Prompt 0 + Fases 4.1–4.8): infraestructura vectorial
(pgvector, `knowledge_embeddings`, RPC `match_knowledge`), indexación
automática al publicar/editar/eliminar productos, búsqueda semántica en
`/buscar` (pestaña "Resultados con IA"), asistente de compras (`/asistente`)
y de soporte (`/soporte`, con "Mis tickets"). Los 6 casos de prueba del RAG
y la calibración de thresholds están documentados en
[`docs/RAG.md`](docs/RAG.md). Ver [`docs/BITACORA.md`](docs/BITACORA.md)
para el registro detallado por fase (Sesiones 2–4) y
[`docs/SESION3_CHECKLIST.md`](docs/SESION3_CHECKLIST.md) para la pasada de
calidad de la Sesión 3. Pendiente: Sesiones 5–8 del plan (ver
[README.md](README.md); la sesión 8 amplía `/soporte` con voz, ya con el
layout preparado para el botón de micrófono).
