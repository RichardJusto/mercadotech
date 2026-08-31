---
name: mercadotech-e2e-patterns
description: Revisión de tests E2E (Playwright, e2e/) NUEVOS o modificados en MercadoTech contra los patrones que ya rompieron CI o el entorno local al menos una vez. Úsala cuando el usuario pida "agregá un test E2E para X", "escribí el flujo de Y en Playwright", "¿por qué este test es flaky?", o esté por tocar e2e/pages/, e2e/tests/ o playwright.config.ts. No reemplaza a mercadotech-automatic-validator (que solo corre la suite y mira el resultado) — esta revisa CÓMO está escrito el test antes de que falle en CI.
---

# E2E Patterns — MercadoTech

Sos quien ya se comió cada uno de estos bugs una vez y no quiere que se
repitan. Revisás tests E2E nuevos o modificados contra patrones concretos
documentados en [`docs/DEBUGGING.md`](../../../docs/DEBUGGING.md) y
[`CLAUDE.md`](../../../CLAUDE.md) (sección "Convenciones de Testing"). No
corrés la suite vos misma (eso es `mercadotech-automatic-validator`) — leés
el código del test y señalás el riesgo antes de que llegue a fallar.

## Checklist de patrones aprendidos a las malas

1. **¿El test asume que corre AISLADO de los demás archivos de `e2e/tests/`?**
   Los specs de este proyecto comparten filas mutables del mismo seed A
   PROPÓSITO entre archivos (el carrito de `buyer1`, el pedido
   `d0000000-...-002` que `seller-flow` y `seller-negative` mueven por el
   kanban) — un test nuevo que asuma estado prístino sin chequearlo primero
   (ver el patrón "setup idempotente" de `seller-negative.spec.ts`) va a
   fallar según qué haya corrido antes. Y `playwright.config.ts` debe seguir
   con `workers: 1` SIN condicionarlo a `isCI` — un test nuevo no arregla
   esto, pero si alguien "optimiza" el config de vuelta a paralelo, citá el
   bug real: 3/8 tests fallando al azar en local (Fase 6.8).

2. **¿Alguna interacción de arrastre/teclado usa un número FIJO de
   repeticiones** (de tipo "apretá flecha 20 veces")? El paso en píxeles de
   `@dnd-kit/core` (`KeyboardSensor`) es una constante fija del paquete,
   pero la geometría real del layout no lo es — calibrar contra un solo
   entorno es frágil entre SO/CI. El patrón correcto mide con
   `boundingBox()` de origen y destino y deriva la cantidad exacta (ver
   `e2e/pages/SellerKanbanPage.ts`, método `moveToColumn`).

3. **¿Una aserción depende de un elemento que viene de un fetch client-side
   sin datos de SSR** (ej. un `<h1>` cuyo texto depende de un hook que
   fetchea después del render)? Priorizá verificar PRIMERO el contenido
   sustantivo que sí prueba el flujo (con timeout generoso), y recién
   después — si hace falta — el elemento derivado del fetch lento. Subir un
   timeout a ciegas sin reordenar qué se chequea primero no alcanza (ver el
   fix real en `buyer-flow.spec.ts`, paso "filtra 'Laptops'").

4. **¿El test usa un `data-testid` nuevo?** Confirmá que el componente
   real ya lo expone (no lo inventes en el test esperando que "ya debería
   estar") y que el nombre sigue la convención existente
   (`kanban-card-<id>`, `cart-count`, `navbar-user-menu`, etc. — grep en
   `components/` antes de asumir).

5. **¿Hay un timeout corto (~5s) en una aserción que sigue a una navegación
   a una ruta dinámica nunca visitada antes en la corrida** (ej.
   `/vendedor/productos/[id]/editar`)? En un dev server "frío" (recién
   levantado, sin esa ruta compilada por Turbopack todavía) la primera
   compilación puede tardar bastante más que el default. No es
   necesariamente un bug del test — si pasa reproducible SOLO en la primera
   corrida contra un server recién levantado y no en las siguientes, es
   este efecto, no una regresión. Señalalo como posible causa antes de
   tocar lógica de la app.

6. **¿El test corre contra la build de producción en CI y contra el dev
   server en local?** Es a propósito (`playwright.config.ts`,
   `webServer.command`) — CI valida paridad con lo que se despliega. Un
   test que solo pasa en uno de los dos entornos por asumir HMR o
   comportamiento de dev es un hallazgo.

## Cómo responder

- Por cada patrón que aplique: citá el archivo/línea del test bajo
  revisión y el ejemplo real ya resuelto en el código (Page Object o spec
  existente) que muestra la forma correcta.
- Si el test es nuevo y ninguno de estos patrones aplica, decilo y no
  inventes riesgos.
- Si encontrás un patrón NUEVO no listado acá que causó un fallo real,
  sugerí agregarlo tanto a esta Skill como a la tabla de
  `docs/DEBUGGING.md` — ambos documentos deben crecer juntos.
