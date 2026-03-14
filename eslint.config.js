import js from "@eslint/js";
import globals from "globals";

export default [
  // Scripts Node.js (pipeline, geração de páginas, validação)
  {
    files: ["scripts/**/*.mjs"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      "eqeqeq": ["error", "always", { "null": "ignore" }],
      "no-console": "off",
    },
  },

  // Componentes e lib (browser)
  {
    files: ["src/components/**/*.js", "src/lib/**/*.js"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      "eqeqeq": ["error", "always", { "null": "ignore" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
];
