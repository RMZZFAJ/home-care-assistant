import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import ts from "typescript-eslint";
import react from "@eslint-react/eslint-plugin";
import hooks from "eslint-plugin-react-hooks";
import next from "@next/eslint-plugin-next";

const eslintConfig = defineConfig([
  globalIgnores([".next/**", ".next-e2e/**", "out/**", "build/**", "next-env.d.ts", "playwright-report/**", "test-results/**", "output/**"]),
  {
    files: ["**/*.{js,mjs,ts,tsx,mts}"],
    languageOptions: { globals: Object.fromEntries(["process", "console", "Buffer", "URL", "URLSearchParams", "Request", "Response", "Headers", "fetch", "AbortController", "AbortSignal", "setTimeout", "clearTimeout", "crypto", "TextEncoder", "TextDecoder"].map((name) => [name, "readonly"])) },
  },
  { files: ["**/*.{js,mjs}"], extends: [js.configs.recommended] },
  {
    files: ["**/*.{ts,tsx,mts}"],
    extends: [js.configs.recommended, ts.configs.recommended, react.configs["recommended-typescript"], hooks.configs.flat.recommended],
    plugins: { "@next/next": next },
    languageOptions: { parser: ts.parser, parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: { ...next.configs.recommended.rules, ...next.configs["core-web-vitals"].rules },
  },
]);

export default eslintConfig;
