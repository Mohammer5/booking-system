import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import boundariesPlugin from "eslint-plugin-boundaries";
import globals from "globals";
import reactPlugin from "eslint-plugin-react";

import { bookingSystemWebBoundaryMap } from "./apps/booking-system-web/boundaries.config.mjs";
import { createWorkspaceBoundaryConfig } from "./eslint-boundaries/createWorkspaceBoundaryConfig.mjs";
import { localPlugin } from "./eslint-local-rules/index.mjs";
import { bookingBoundaryMap } from "./packages/booking/boundaries.config.mjs";

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
  "apps/*/*.{js,mjs}",
  "apps/*/test/**/*.js",
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
      react: reactPlugin,
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
      "react/jsx-uses-vars": "error",
    },
  },
  {
    files: [
      "apps/booking-system-web/src/browser/**/*.{js,jsx}",
      "apps/booking-system-web/src/main.jsx",
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: [
      "apps/booking-system-web/src/authentication/**/*.js",
      "apps/booking-system-web/src/worker/**/*.js",
      "apps/booking-system-web/src/productionWorker.js",
      "apps/booking-system-web/src/nonProductionWorker.js",
    ],
    languageOptions: {
      globals: globals.serviceworker,
    },
  },
  {
    files: testFiles,
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals["shared-node-browser"],
      },
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
    files: [
      "eslint.config.mjs",
      "apps/booking-system-web/vite.config.js",
      "apps/booking-system-web/vite.non-production.config.js",
      "apps/booking-system-web/vitest.worker.config.js",
      "apps/booking-system-web/playwright.config.js",
    ],
    rules: {
      "import/no-default-export": "off",
    },
  },
  createWorkspaceBoundaryConfig({
    boundaryMap: bookingBoundaryMap,
    workspacePath: "packages/booking",
    boundariesPlugin,
  }),
  createWorkspaceBoundaryConfig({
    boundaryMap: bookingSystemWebBoundaryMap,
    workspacePath: "apps/booking-system-web",
    boundariesPlugin,
  }),
  {
    files: [
      "apps/booking-system-web/src/productionWorker.js",
      "apps/booking-system-web/src/nonProductionWorker.js",
    ],
    rules: {
      "import/no-default-export": "off",
    },
  },
];
