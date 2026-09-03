# MercadoTech

Marketplace de productos tecnológicos: catálogo, carrito y checkout,
panel de vendedor con gestión de pedidos por kanban, búsqueda semántica
con IA, y asistentes de compras/soporte que citan contenido real del
catálogo y la base de conocimiento.

**Producción**: [mercadotech-one.vercel.app](https://mercadotech-one.vercel.app)

> Este README es la documentación de producto. Si buscás el plan
> pedagógico original de las 8 sesiones que se usó para construir este
> proyecto, está en [`docs/PLAN_CURSO.md`](docs/PLAN_CURSO.md).

## Stack

Next.js 15 (App Router) · React 19 · TypeScript estricto · TailwindCSS v4
· shadcn/ui (sobre `@base-ui/react`) · Supabase (Postgres, Auth, Storage,
pgvector, RLS) · Hugging Face (embeddings + chat) · Model Context Protocol
· Vitest + Playwright · GitHub Actions · Vercel.

## Arquitectura, en una imagen

Un solo camino de datos, capas con responsabilidad única:

```
components/   Presentación pura — recibe props, no sabe que existe una base de datos.
    ↓
hooks/        Estado de cliente (React). Llama a services/, nunca a Supabase directo.
    ↓
services/     Lógica de negocio real. Recibe un cliente de Supabase INYECTABLE —
    ↓         la web y el servidor MCP comparten la misma función, sin duplicar.
Supabase      Postgres + Row Level Security + Storage + Auth. Última línea de
              defensa: ni un bug en services/ puede filtrar datos de otro usuario
              si la política RLS está bien escrita.
```

`lib/ai/` es la única capa que conoce al proveedor de IA (Hugging Face);
`lib/supabase/admin.ts` (service role, bypasea RLS) solo se usa en Route
Handlers, scripts y el servidor MCP — nunca en código que llegue al
navegador. Detalle completo, modelo relacional, RLS tabla por tabla y las
decisiones de cada capa posterior en
[`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

## Búsqueda semántica y asistentes (RAG)

```
Al publicar/editar → lib/ai/embeddings (SDK de HF) → knowledge_embeddings (pgvector)

Una consulta       → lib/ai/embeddings → match_knowledge (RPC) → lib/ai/context-builder (función pura)
                    → lib/ai/completion (fetch al router de HF) → respuesta citando fuentes reales
```

Los embeddings y el chat usan dos mecanismos DISTINTOS de Hugging Face a
propósito (SDK para embeddings, `fetch` crudo para chat) — mezclarlos fue
fuente de errores confusos en un proyecto anterior. Los 6 casos de prueba
del pipeline y la calibración de umbrales están en
[`docs/RAG.md`](docs/RAG.md).

## Puesta en marcha local

Requisitos: Node 22+, Docker Desktop (para Supabase local), una cuenta de
Hugging Face (opcional — sin token, la búsqueda con IA falla con un error
controlado, el resto de la app funciona igual).

```bash
git clone https://github.com/RichardJusto/mercadotech.git
cd mercadotech
npm install
```

Copiá `.env.example` a `.env.local` — para desarrollo local, los valores
de Supabase se generan solos en el siguiente paso (no hace falta un
proyecto en la nube):

```bash
cp .env.example .env.local
```

Levantá Supabase local (requiere Docker corriendo) y aplicá el esquema +
los datos de prueba:

```bash
supabase start        # Studio queda disponible en http://localhost:54323
supabase db reset      # migraciones + seed.sql (usuarios y catálogo de prueba)
```

`supabase start` imprime la URL y las claves del stack local — pegalas en
`.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`). Si querés que la búsqueda con IA y los
asistentes funcionen, agregá también `HUGGINGFACEHUB_API_TOKEN` (un token
de tipo "Read" desde [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)).

```bash
npm run dev            # http://localhost:3000, Turbopack
```

**Usuarios de prueba** (contraseña `MercadoTech123!` para todos):
`buyer1/2/3@mercadotech.test`, `seller1/2@mercadotech.test`,
`admin@mercadotech.test`.

## Comandos

```bash
npm run dev             # servidor de desarrollo (Turbopack)
npm run build            # build de producción — corré esto antes de dar por
                         # cerrada cualquier fase con páginas nuevas
npm run start             # sirve el build de producción
npm run lint             # ESLint
npm run type-check        # tsc --noEmit
npm run test              # Vitest — unitarios de services/lib, sin Docker
npm run test:coverage     # Vitest con cobertura
npm run test:e2e          # Playwright — requiere Supabase local arriba (ver abajo)
npm run db:types          # regenera types/database.ts desde el esquema real
```

Servidor MCP (`mcp/`, proceso Node aparte — comandos siempre desde la
raíz del repo):

```bash
npx tsx mcp/src/index.ts              # dev
npm run build --prefix mcp             # build de producción -> mcp/dist/
npm run type-check --prefix mcp         # tsc --noEmit propio de mcp/
```

Ver [`mcp/README.md`](mcp/README.md) para las 10 Tools, 7 Resources y 5
Prompts expuestos.

## Testing

**Unitarios (Vitest)** — no necesitan Docker ni red, mockean el cliente de
Supabase:

```bash
npm run test
```

**End-to-end (Playwright)** — corren contra la app real, sin mocks, con
los usuarios de prueba de arriba. **Prerrequisito: Supabase local tiene
que estar arriba con el seed cargado** (`supabase start` + `supabase db
reset`) antes de correrlos:

```bash
supabase start && supabase db reset
npm run test:e2e
```

Metodología completa de debugging (cómo diagnosticar un fallo, tabla de
errores típicos con su mensaje literal) en
[`docs/DEBUGGING.md`](docs/DEBUGGING.md).

## CI/CD y despliegue

Cada `push`/Pull Request corre `.github/workflows/ci.yml` (lint,
type-check, tests unitarios, tests E2E contra un Supabase efímero — sin
secretos). `main` está protegida: solo se actualiza por Pull Request con
el CI en verde, push directo incluido.

El despliegue a producción es 100% por la integración nativa de Vercel
con GitHub (sin CLI, sin tokens de deploy en el workflow): cada PR levanta
un preview con URL propia, cada merge a `main` redespliega producción
automáticamente sobre una base de datos Supabase hosted separada de la de
desarrollo local.

Gobernanza de variables de entorno, guía de despliegue paso a paso, el
smoke test completo y el plan de rollback están en
[`docs/DEPLOY.md`](docs/DEPLOY.md). Metodología y resultados de
performance (Core Web Vitals) en
[`docs/PERFORMANCE.md`](docs/PERFORMANCE.md).

## Estructura del proyecto

```
app/            Rutas (App Router), agrupadas por layout: (auth), (shop), (seller), api/v1/
components/     Presentación pura, por dominio (catalog/, cart/, chat/, seller/, ui/...)
hooks/          Estado de cliente — llaman a services/, nunca a Supabase directo
services/       Lógica de negocio — cliente de Supabase inyectable
lib/
  supabase/       Los 4 clientes (browser, server, middleware, admin)
  ai/             Único punto de contacto con Hugging Face
  validators/     Validación framework-agnóstica
  constants/      Todos los tunables, documentados
types/          Tipos de dominio + database.ts (generado desde el esquema real)
supabase/       Migraciones (fuente de verdad del esquema), seed.sql (laboratorio),
                seed.prod.sql (producción), tests de RLS
mcp/            Servidor MCP — reutiliza services/ y lib/ai/, nunca los reimplementa
e2e/            Specs y Page Objects de Playwright
scripts/        index-all.ts — indexación manual del RAG
.claude/skills/  7 Skills de gobernanza (arquitectura, review, validación, RAG, E2E, RLS)
docs/           Toda la documentación técnica — ver cada archivo enlazado arriba
```

Regla número uno del proyecto y detalle completo de cada capa en
[`CLAUDE.md`](CLAUDE.md) — es la guía que sigue Claude Code para trabajar
en este repo, y también la referencia más rápida para un desarrollador
humano nuevo.
