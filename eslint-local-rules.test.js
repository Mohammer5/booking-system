import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { RuleTester } from "eslint";

import { repoJsRules } from "./eslint-local-rules/repo-js-rules.mjs";
import {
  repoRoot,
  resetReportedDirectories,
} from "./eslint-local-rules/shared.mjs";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
});

/**
 * Create a temporary workspace source file path inside the repository.
 *
 * @param {string} relativeWorkspaceRoot A workspace `src` directory.
 * @param {string} fileName The file name to create.
 * @returns {{filePath: string, cleanup: () => void}} The file and cleanup hook.
 */
function createWorkspaceFile(relativeWorkspaceRoot, fileName) {
  const workspaceRoot = path.join(repoRoot, relativeWorkspaceRoot);
  const createdDirectories = [];
  let directoryToCheck = workspaceRoot;

  while (
    directoryToCheck !== repoRoot &&
    !fs.existsSync(directoryToCheck)
  ) {
    createdDirectories.push(directoryToCheck);
    directoryToCheck = path.dirname(directoryToCheck);
  }

  fs.mkdirSync(workspaceRoot, { recursive: true });

  const directory = fs.mkdtempSync(
    path.join(workspaceRoot, ".tmp-eslint-rules-"),
  );
  const filePath = path.join(directory, fileName);

  fs.writeFileSync(filePath, "export function sample() { return 1; }\n");

  return {
    filePath,
    cleanup() {
      fs.rmSync(directory, { force: true, recursive: true });

      for (const createdDirectory of createdDirectories) {
        fs.rmdirSync(createdDirectory);
      }
    },
  };
}

test("index-reexports-only rejects wildcard re-exports", () => {
  ruleTester.run(
    "local/index-reexports-only",
    repoJsRules["index-reexports-only"],
    {
      valid: [
        {
          code: 'export { createThing } from "./createThing.js";',
          filename: "apps/example/src/index.js",
        },
      ],
      invalid: [
        {
          code: 'export * from "./createThing.js";',
          filename: "apps/example/src/index.js",
          errors: [{ messageId: "namedReexportsOnly" }],
        },
      ],
    },
  );
});

test("require-directory-index reports production directories without interfaces", () => {
  resetReportedDirectories();
  const workspaceFile = createWorkspaceFile("apps/example/src", "sample.js");

  try {
    ruleTester.run(
      "local/require-directory-index",
      repoJsRules["require-directory-index"],
      {
        valid: [],
        invalid: [
          {
            code: "export function sample() { return 1; }\n",
            filename: workspaceFile.filePath,
            errors: [{ messageId: "missingIndex" }],
          },
        ],
      },
    );
  } finally {
    workspaceFile.cleanup();
  }
});

test("require-directory-index accepts a JavaScript index", () => {
  resetReportedDirectories();
  const workspaceFile = createWorkspaceFile("apps/example/src", "sample.js");
  const indexPath = path.join(path.dirname(workspaceFile.filePath), "index.js");

  fs.writeFileSync(indexPath, 'export { sample } from "./sample.js";\n');

  try {
    ruleTester.run(
      "local/require-directory-index",
      repoJsRules["require-directory-index"],
      {
        valid: [
          {
            code: "export function sample() { return 1; }\n",
            filename: workspaceFile.filePath,
          },
        ],
        invalid: [],
      },
    );
  } finally {
    workspaceFile.cleanup();
  }
});

test("main-no-exports rejects exported main entrypoints", () => {
  ruleTester.run("local/main-no-exports", repoJsRules["main-no-exports"], {
    valid: [
      {
        code: 'console.log("boot");',
        filename: "apps/example/src/main.js",
      },
    ],
    invalid: [
      {
        code: "export function boot() {}\n",
        filename: "apps/example/src/main.js",
        errors: [{ messageId: "noExports" }],
      },
    ],
  });
});

test("primary-export-name aligns files and exported functions", () => {
  ruleTester.run(
    "local/primary-export-name",
    repoJsRules["primary-export-name"],
    {
      valid: [
        {
          code: "export function createRecord() {}\n",
          filename: "apps/example/src/feature/createRecord.js",
        },
      ],
      invalid: [
        {
          code: "export function createRuntime() {}\n",
          filename: "apps/example/src/feature/runtime.js",
          errors: [{ messageId: "filenameMismatch" }],
        },
      ],
    },
  );
});

test("predicate-boolean-names uses Boolean JSDoc as its trigger", () => {
  ruleTester.run(
    "local/predicate-boolean-names",
    repoJsRules["predicate-boolean-names"],
    {
      valid: [
        {
          code: [
            "/**",
            " * Return whether a job can run.",
            " * @returns {boolean} Whether the job is runnable.",
            " */",
            "export function isTaskReady() { return true; }",
          ].join("\n"),
          filename: "packages/example/src/feature/isTaskReady.js",
        },
      ],
      invalid: [
        {
          code: [
            "/**",
            " * Return whether a job can run.",
            " * @returns {boolean} Whether the job is runnable.",
            " */",
            "export function canStartTask() { return true; }",
          ].join("\n"),
          filename: "packages/example/src/feature/canStartTask.js",
          errors: [{ messageId: "predicateStyle" }],
        },
      ],
    },
  );
});

test("require-function-jsdoc enforces module-scope function docs", () => {
  ruleTester.run(
    "local/require-function-jsdoc",
    repoJsRules["require-function-jsdoc"],
    {
      valid: [
        {
          code: "/** Create a record. */\nexport function createRecord() {}",
          filename: "apps/example/src/feature/createRecord.js",
        },
      ],
      invalid: [
        {
          code: "export function createRecord() {}\n",
          filename: "apps/example/src/feature/createRecord.js",
          errors: [{ messageId: "missingJsdoc" }],
        },
      ],
    },
  );
});

test("no-classes-for-data requires an explicit class exception tag", () => {
  ruleTester.run(
    "local/no-classes-for-data",
    repoJsRules["no-classes-for-data"],
    {
      valid: [
        {
          code: "/** @statefulResource */\nexport class WorkerConnection {}",
          filename: "apps/example/src/feature/WorkerConnection.js",
        },
      ],
      invalid: [
        {
          code: "export class SessionRecord {}\n",
          filename: "packages/example/src/feature/Record.js",
          errors: [{ messageId: "noClasses" }],
        },
      ],
    },
  );
});

test("require-directory-index helper cleans up its temporary workspace", () => {
  const sourceRoot = path.join(repoRoot, "apps/example/src");
  const tempEntries = fs.existsSync(sourceRoot)
    ? fs
        .readdirSync(sourceRoot, { recursive: true })
        .filter((entry) => entry.includes(".tmp-eslint-rules-"))
    : [];

  assert.deepEqual(tempEntries, []);
});
