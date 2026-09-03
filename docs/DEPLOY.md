# Deploy — Sesión 7

Manual de despliegue de MercadoTech: dónde vive cada secreto, cómo se
publica un cambio, y cómo se vuelve atrás si algo sale mal. Este documento
se completa en tres pasadas (Fases 7.3, 7.4 y 7.5) — lo que sigue es la
Fase 7.3.

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
