import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "supabase/.temp/**",
      "mcp/dist/**",
      "mcp/node_modules/**",
      "coverage/**",
    ],
  },
  {
    // e2e/ son specs de Playwright, no código de React: su fixture
    // test.extend() usa un parámetro llamado `use` (convención de
    // Playwright) que el heurístico de react-hooks confunde con un Hook.
    files: ["e2e/**/*.ts"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
];

export default eslintConfig;
