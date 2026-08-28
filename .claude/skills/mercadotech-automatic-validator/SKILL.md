---
name: mercadotech-automatic-validator
description: Portero binario de MercadoTech — VALIDACIÓN APROBADA o FALLIDA, sin términos medios. Úsala al CERRAR una tarea, una fase de una sesión, o antes de dar por terminado un conjunto de cambios, cuando el usuario pida "validá el repo", "¿esto está listo para cerrar la fase?", "corré el validator", o equivalentes. Combina las reglas del enforcer, los errores críticos del reviewer y los checks automáticos (lint, type-check, build/test). Un solo ítem fallido hace fallar TODO el veredicto — no reporta nada, solo pasa o no pasa.
---

# Automatic Validator — MercadoTech

Sos el portero binario: pasa o no pasa. Sin "aprobado con observaciones",
sin matices. Corrés una checklist FIJA sobre el estado actual del repo y
devolvés un veredicto único al final. No corregís nada — reportás QUÉ
falló y DÓNDE; la corrección es un paso aparte.

## Checklist fija (en este orden)

1. **Reglas del `mercadotech-architecture-enforcer`** sobre los archivos
   tocados en el alcance de la validación:
   - `grep -rl "@/lib/supabase" components hooks` → debe ser vacío.
   - `grep -rl 'from "@/services' components` → debe ser vacío.
   - `grep -rln "@huggingface" --include="*.ts" . | grep -v node_modules | grep -v lib/ai` → debe ser vacío.
   - Ningún componente con fetching directo; ningún service importando
     React o `app/`.
   - `lib/supabase/admin.ts` solo importado desde `app/api/**/route.ts`,
     `scripts/*.ts` o `mcp/src/context.ts`.
   - Ningún tunable hardcodeado fuera de `lib/constants/`.
   - Si existe `mcp/`: sin lógica de negocio fuera de `mcp/`, sin
     reimplementar un service dentro de `mcp/src/tools|resources|prompts`
     (las derivaciones legítimas viven en `mcp/src/shared/`).

2. **Errores CRÍTICOS del `mercadotech-code-reviewer`** sobre el mismo
   alcance: RLS esquivada sin justificación, precio leído en vivo en vez
   del snapshot en contexto de pedidos, mutación de stock fuera del RPC
   `create_order_from_cart`, `numeric` filtrado como string a un
   componente, orden búsqueda→contexto→completion roto en el pipeline RAG.
   (Los "importantes" y las sugerencias del reviewer NO hacen fallar el
   validator — son señal para el tech-lead, no un gate binario.)

3. **`npm run lint`** en la raíz — debe salir limpio.

4. **`npm run type-check`** en la raíz — debe salir limpio. Si el alcance
   incluye `mcp/`, también `npm run type-check` dentro de `mcp/`.

5. **`npm run test`** — solo aplica desde que exista (Sesión 6). Si el
   `package.json` de la raíz no tiene script `test` todavía, este ítem se
   OMITE explícitamente en el reporte (no cuenta ni a favor ni en contra).

## Formato de salida

Recorré los 5 ítems en orden y por cada uno anotá PASA / FALLA con la
evidencia concreta (el comando corrido y su salida relevante, o el archivo
y línea del hallazgo). Al final, una sola línea de veredicto:

```
VALIDACIÓN APROBADA
```

o

```
VALIDACIÓN FALLIDA
- <ítem que falló>: <por qué, con archivo/línea o comando>
- <ítem que falló>: ...
```

Un solo ítem en FALLA basta para que el veredicto global sea FALLIDA — no
hay término medio ni "aprobado con observaciones". Si algo no aplica al
alcance de esta validación (ej. no hay componentes en el diff), decilo y
seguí — no lo cuentes como fallo.
