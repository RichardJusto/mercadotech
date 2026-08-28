import { defineConfig } from "tsup";
import path from "node:path";

// Alias @/* -> raíz del repo (decisión 7 de la spec de la Sesión 5): el
// mismo alias que usa el proyecto Next para que services/ y lib/ai/
// resuelvan igual en dev (tsx) y en el build empaquetado.
export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["esm"],
  target: "node20",
  platform: "node",
  clean: true,
  sourcemap: true,
  esbuildOptions(options) {
    options.alias = {
      "@": path.resolve(__dirname, ".."),
    };
  },
});
