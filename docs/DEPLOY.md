# Deploy — Sesión 7

Manual de despliegue de MercadoTech: dónde vive cada secreto, cómo se
publica un cambio, y cómo se vuelve atrás si algo sale mal.

**URL de producción**: [mercadotech-one.vercel.app](https://mercadotech-one.vercel.app)

## 1. Variables y secretos

### Regla de oro

**Los valores de las claves nunca pasan por el chat con Claude ni por el
repositorio.** Claude indica QUÉ variable cargar y DÓNDE; los valores se
pegan a mano en la interfaz de Vercel. `NEXT_PUBLIC_*` viaja al navegador
(no protege nada — cualquiera puede leerla con las herramientas de
desarrollador); un secreto real solo vive en el servidor. Confundir estas
dos categorías es el error más caro de todo el despliegue.

### Tabla de gobernanza

| Variable | Dónde vive | Quién la lee | Pública/Secreta |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel (Production + Preview), a mano | navegador y servidor | pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel (ambos entornos), a mano | navegador y servidor (RLS gobierna) | pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (ambos), a mano — solo runtime de servidor | `lib/supabase/admin.ts`, usado desde Route Handlers | **SECRETA** |
| `HUGGINGFACEHUB_API_TOKEN` | Vercel (ambos), a mano | `lib/ai/`, vía Route Handlers | **SECRETA** |
| `NEXT_PUBLIC_SITE_URL` | Vercel, por entorno (prod = URL real; preview = auto) | redirects de auth | pública |
| `HUGGINGFACE_EMBEDDING_MODEL` / `HUGGINGFACE_CHAT_MODEL` (opcionales) | Vercel solo si hace falta rotar de modelo | `lib/ai/` | pública |

Y la fila que **no existe a propósito**: **GitHub Actions — ninguna
variable, ningún secreto.** El CI de la Sesión 6 (`.github/workflows/ci.yml`)
corre contra un stack de Supabase efímero (Docker, levantado y destruido en
cada run) — nunca contra el proyecto hosted, así que nunca necesita ni debe
recibir sus credenciales.

### Reglas

- **`.env*.local` nunca se commitea.** Ya está en `.gitignore` (línea
  `.env*` con excepción explícita de `.env.example`) — verificado con
  `git log --all -p -- .env.local`: sin resultados, nunca se commiteó.
- **Rotación inmediata si una clave se expone.** Si `SUPABASE_SERVICE_ROLE_KEY`
  o `HUGGINGFACEHUB_API_TOKEN` aparecen en un lugar no seguro (un commit, un
  log público, un chat no cifrado), se regeneran de inmediato desde el
  dashboard de Supabase (Project Settings → API → "Reset service_role
  secret") o de Hugging Face (Settings → Access Tokens → Revoke) — no se
  espera a que "quizás nadie la vio".
- **Los previews de Vercel comparten el proyecto de producción** (un solo
  proyecto Supabase por alumno, plan free). Riesgo real y documentado: un
  PR de prueba puede tocar datos reales del catálogo de producción. Mejora
  para un producto real (fuera de alcance de este curso): un proyecto de
  Supabase de *staging* separado para previews.
- **Cambiar una variable en Vercel no afecta deploys ya hechos.** Las
  variables `NEXT_PUBLIC_*` de Next.js se inlinean en el JavaScript en el
  momento del BUILD, no se leen en caliente — después de cambiar cualquier
  variable hace falta un **Redeploy** explícito (Deployments → `...` →
  Redeploy). Confirmado con un incidente real de esta misma sesión: la app
  en producción quedó apuntando a `http://127.0.0.1:54321` (Supabase local)
  incluso después de "guardar" la variable nueva en Vercel, porque el
  build vigente todavía tenía el valor viejo inlineado.

### Greps anti-fuga (corridos sobre el código fuente, excluyendo `node_modules`, lockfiles y esta documentación)

```
grep -rn "hf_[A-Za-z0-9]\{20,\}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.md" .
→ vacío

grep -rn "sb_secret_[A-Za-z0-9_]\{10,\}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.md" .
→ vacío

grep -rln "eyJ[A-Za-z0-9_-]\{20,\}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.md" --include="*.json" .
→ 3 coincidencias, las 3 en docs/lighthouse/*.report.json (reportes de la
  Fase 7.2, generados localmente) — inspeccionadas a mano: son datos de
  imagen en base64 (screenshots del audit de Lighthouse) donde la
  substring "eyJ" aparece por azar, NO un JWT real. Ese directorio además
  quedó agregado a .gitignore por su peso (~5MB con capturas embebidas),
  así que ni siquiera llega a un commit.

grep -rln "egarmbboyomnimzualjg" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.md" --include="*.json" .
→ 1 coincidencia, en supabase/.temp/linked-project.json — es el archivo de
  estado del propio CLI de Supabase (`supabase link`), y supabase/.temp/
  ya está gitignoreado por supabase/.gitignore (línea propia del scaffold
  de Supabase, no algo que este proyecto tuviera que agregar).
```

**Resultado: sin fugas reales.** Los dos hallazgos iniciales fueron falsos
positivos investigados y descartados, no vulnerabilidades.

## 2. Despliegue

### Proyecto de Supabase de producción

- Referencia: `egarmbboyomnimzualjg` (`https://egarmbboyomnimzualjg.supabase.co`).
- Esquema migrado con `supabase link --project-ref egarmbboyomnimzualjg` +
  `supabase db push` (autenticado con un Personal Access Token de
  `supabase.com/dashboard/account/tokens`, pasado como
  `SUPABASE_ACCESS_TOKEN` — nunca con la contraseña de la base).
- Sembrado con `supabase/seed.prod.sql` (8 categorías + 10 artículos de
  FAQ, sin usuarios ni productos) vía **SQL Editor del dashboard** — `db
  push --include-seed` solo sabe aplicar `supabase/seed.sql` (el de
  laboratorio, fijado en `config.toml`), así que el seed de producción se
  pega a mano, tal como pide la spec.
- FAQ indexada con `scripts/index-all.ts`, corrido UNA vez con
  `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` /
  `HUGGINGFACEHUB_API_TOKEN` de producción pasadas inline en el comando —
  nunca tocando `.env.local` (que sigue apuntando a Supabase local).

### Vercel

- Proyecto conectado al repositorio de GitHub por su integración nativa
  (sin CLI de Vercel, sin tokens de deploy en el workflow — decisión 2 de
  la spec).
- Variables de entorno cargadas a mano en **Settings → Environment
  Variables** (Production + Preview), con los nombres de la tabla de la
  Sección 1.
- **Confirmación de email**: el proyecto hosted trae "Confirm email"
  activado por defecto (a diferencia de local). Se desactivó en
  **Authentication → Sign In / Up → Email → User Signups → "Confirm
  email"** — ojo, esta pantalla es DISTINTA de **Authentication → Sign In
  / Providers → Email → "Configure email provider"** (que solo tiene
  "Enable email provider", límites de contraseña, OTP, etc., sin el
  toggle de confirmación) — es fácil confundirlas, los nombres de sección
  cambian entre versiones del dashboard de Supabase.

### Hallazgos reales de esta puesta en marcha

1. **`gen_salt`/`crypt` (pgcrypto) sin calificar de esquema** rompían
   `supabase/seed.sql` contra el proyecto hosted (`function gen_salt(unknown)
   does not exist`) aunque funcionaban perfecto en local — el stack local
   de Supabase trae `extensions` en el `search_path` por convención propia
   que el proyecto hosted no hereda. Fix: `extensions.crypt(...)` /
   `extensions.gen_salt(...)` explícitos (commit de la Fase 7.4).
2. **`support_articles` quedó duplicado (20 filas en vez de 10)** la
   primera vez que se aplicó `seed.prod.sql`: su `id` es autogenerado, así
   que reinsertar el mismo contenido sobre una tabla no vacía crea filas
   nuevas en vez de chocar por clave primaria — a diferencia de
   `categories`, que usa IDs fijos e idénticos en ambos seeds y por eso no
   se duplica. Se agregó `truncate table support_articles` al script de
   limpieza antes de re-sembrar.
3. **Un usuario creado ANTES de desactivar "Confirm email" queda
   confirmado para siempre — la desactivación no es retroactiva.** El
   primer usuario demo de prueba (`vendedor.demo@mercadotech.app`) quedó
   con `email_confirmed_at` nulo permanentemente. Se resolvió con la
   Admin API (`supabase.auth.admin.updateUserById(id, { email_confirm:
   true })`, usando `SUPABASE_SERVICE_ROLE_KEY`) en vez de perseguir el
   reenvío del correo — más directo y no depende del límite de envíos.
4. **El proveedor de email gratuito de Supabase tiene un límite de envío
   muy bajo** (~2-4 emails/hora) — varios intentos de registro seguidos
   dispararon `email rate limit exceeded`. Si se necesita registrar varias
   cuentas reales de prueba seguidas, conviene espaciarlas o usar la Admin
   API para confirmar directamente en vez de depender del correo.

## 3. Smoke test post-deploy

Ejecutado contra `https://mercadotech-one.vercel.app` (producción real, no
un preview):

| Paso | Resultado |
|---|---|
| Home carga | ✅ Catálogo vacío con `EmptyState` — esperado (decisión 6: producción nace sin productos falsos) |
| Categorías (`/categoria/laptops`) | ✅ Las 8 categorías del seed de producción están disponibles |
| Registro como vendedor real | ✅ `vendedor.demo@mercadotech.app`, rol `seller` |
| Login | ✅ (tras confirmar el email — ver hallazgo 3 arriba) |
| Publicar producto demo con imagen | ✅ "Producto Demo — Smoke Test Sesión 7", S/ 199.90, categoría Accesorios, imagen subida a Storage |
| Aparece en el catálogo público | ✅ |
| `/soporte` responde citando la FAQ real | ✅ Pregunta "¿Cuánto tarda en llegar mi pedido?" → respuesta correcta citando el artículo indexado, con 5 fuentes listadas |
| Logout/login | ✅ |
| Favicon | ✅ (heredado del layout raíz, sin cambios de esta sesión) |

**Veredicto: smoke test completo, sin hallazgos pendientes.**
