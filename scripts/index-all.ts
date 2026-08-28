// One-shot: indexa TODOS los productos activos y artículos de soporte
// publicados. Correr con `npx tsx scripts/index-all.ts`.
//
// Si el admin edita un artículo de soporte por SQL directo (fuera de la UI,
// que todavía no tiene pantalla de edición de FAQ), este script es la única
// vía para refichar ese cambio — no hay trigger automático para
// support_articles, solo para products (Fase 4.3, vía useProductForm /
// useSellerProducts).

import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnvLocal() {
  try {
    const content = readFileSync(join(process.cwd(), ".env.local"), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // Sin .env.local: fallará más abajo con un mensaje claro sobre las
    // variables de Supabase/Hugging Face faltantes.
  }
}

loadEnvLocal();

async function main() {
  // Import dinámico DESPUÉS de cargar .env.local: lib/supabase/admin.ts y
  // lib/ai/embeddings.ts leen process.env al momento de llamarse, no al
  // importarse, pero mantener el orden explícito evita sorpresas.
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { indexSource } = await import("@/services/embedding.service");

  const supabase = createAdminClient();

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, title")
    .eq("is_active", true);
  if (productsError) throw productsError;

  const { data: articles, error: articlesError } = await supabase
    .from("support_articles")
    .select("id, title")
    .eq("is_published", true);
  if (articlesError) throw articlesError;

  let productCount = 0;
  for (const product of products ?? []) {
    const result = await indexSource("producto", product.id, supabase);
    console.log(`  [producto] ${product.title} — ${result.indexed ? "indexado" : result.reason}`);
    if (result.indexed) productCount++;
  }

  let articleCount = 0;
  for (const article of articles ?? []) {
    const result = await indexSource("articulo_soporte", article.id, supabase);
    console.log(`  [artículo] ${article.title} — ${result.indexed ? "indexado" : result.reason}`);
    if (result.indexed) articleCount++;
  }

  console.log(
    `\nListo: ${productCount} productos + ${articleCount} artículos = ${productCount + articleCount} fichas.`,
  );
}

main().catch((err) => {
  console.error("index-all falló:", err.message);
  process.exit(1);
});
