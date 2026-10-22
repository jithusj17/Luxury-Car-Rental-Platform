import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/*
 * Module boundaries (see docs/engineering-guidelines.md §5):
 *   app/     → thin routes; may import anything below
 *   shell/   → layouts & navigation; may import domains + shared
 *   domains/ → business features; may import shared and other domains, never shell or app
 *   shared/  → design system & infrastructure; imports nothing app-specific
 */
const restrict = (patterns) => ({
  "no-restricted-imports": ["error", { patterns: patterns.map((group) => ({ group, message: "Breaks module boundaries — see eslint.config.mjs." })) }],
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }],
    },
  },
  { files: ["src/shared/**"], rules: restrict([["@/domains/*", "@/shell/*", "@/app/*"]]) },
  { files: ["src/domains/**"], rules: restrict([["@/shell/*", "@/app/*"]]) },
  { files: ["src/shell/**"], rules: restrict([["@/app/*"]]) },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "playwright-report/**", "test-results/**"]),
]);

export default eslintConfig;
