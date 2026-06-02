import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // next-pwa generated service worker artifacts
    "public/sw.js",
    "public/workbox-*.js",
    "public/worker-*.js",
    "public/fallback-*.js",
  ]),
  {
    rules: {
      // The dashboard pages are client components that intentionally load
      // their data inside an effect (the data layer is protected by RLS).
      // The newer react-hooks advisory rule flags this standard
      // setState-in-effect fetch pattern; disable it rather than refactor
      // every page's data-loading approach.
      "react-hooks/set-state-in-effect": "off",
      // Allow the idiomatic "omit a field via rest" destructure, e.g.
      // `const { _id, ...rest } = item`, and underscore-prefixed placeholders.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { ignoreRestSiblings: true, argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
