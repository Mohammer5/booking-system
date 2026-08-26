import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import globals from "globals";

import { localPlugin } from "./eslint-local-rules/index.mjs";

const productionFiles = [
  "apps/*/src/**/*.{js,jsx,mjs}",
  "packages/*/src/**/*.{js,jsx,mjs}",
];

const testFiles = [
  "**/*.{test,spec}.{js,jsx,mjs}",
  "eslint-local-rules.test.js",
];

const toolingFiles = [
  "*.js",
  "*.mjs",
  "apps/*/*.mjs",
  "packages/*/*.mjs",
  "eslint-boundaries/**/*.mjs",
  "eslint-local-rules/**/*.mjs",
];

export default [
  {
    ignores: ["**/node_modules/**", "**/coverage/**", "**/dist/**"],
  },
  js.configs.recommended,
  {
    files: productionFiles,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      import: importPlugin,
      local: localPlugin,
    },
    rules: {
      "max-lines": [
        "warn",
        { max: 300, skipBlankLines: true, skipComments: true },
      ],
      "max-lines-per-function": [
        "warn",
        { max: 60, skipBlankLines: true, skipComments: true },
      ],
      "max-params": ["warn", { max: 3 }],
      "max-statements": ["warn", { max: 15 }],
      "import/no-cycle": "error",
      "import/no-default-export": "error",
      "local/index-reexports-only": "error",
      "local/main-no-exports": "error",
      "local/no-classes-for-data": "error",
      "local/predicate-boolean-names": "error",
      "local/primary-export-name": "error",
      "local/require-directory-index": "error",
      "local/require-function-jsdoc": "error",
    },
  },
  {
    files: testFiles,
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "max-lines": "off",
      "max-lines-per-function": "off",
      "max-params": "off",
      "max-statements": "off",
    },
  },
  {
    files: toolingFiles,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      "import/no-cycle": "error",
      "import/no-default-export": "error",
    },
  },
  {
    files: ["eslint.config.mjs"],
    rules: {
      "import/no-default-export": "off",
    },
  },
];
