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
    // Third-party and generated code:
    "Peckham Bauhaus Design System/**",
    "public/interactive/vendor/**",
    "public/lander/jszip.min.js",
    "public/lander/FileSaver.min.js",
  ]),
]);

export default eslintConfig;
