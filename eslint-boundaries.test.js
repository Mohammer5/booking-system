import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { ESLint } from "eslint";
import boundariesPlugin from "eslint-plugin-boundaries";

import { createWorkspaceBoundaryConfig } from "./eslint-boundaries/createWorkspaceBoundaryConfig.mjs";

const workspacePath = "packages/example";

/**
 * Create an ESLint instance for one synthetic explicit boundary map.
 *
 * @param {string[]} allowedWorkspaceDependencies Exact package roots to allow.
 * @returns {ESLint} The configured lint instance.
 */
function createBoundaryLinter(allowedWorkspaceDependencies) {
  const boundaryMap = {
    workspaceName: "@example/example",
    workspacePackagePattern: "@example/*",
    sourceRoot: "src",
    allowedWorkspaceDependencies,
    modules: {
      feature: [],
    },
    compositionFiles: {},
  };

  return new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ["**/*.js"],
        languageOptions: {
          ecmaVersion: "latest",
          sourceType: "module",
        },
      },
      createWorkspaceBoundaryConfig({
        boundaryMap,
        workspacePath,
        boundariesPlugin,
      }),
    ],
  });
}

/**
 * Lint source as a file inside the synthetic feature responsibility.
 *
 * @param {ESLint} eslint The configured lint instance.
 * @param {string} source JavaScript source to inspect.
 * @param {string} [relativeFile] Source-root-relative file path.
 * @returns {Promise<import("eslint").ESLint.LintResult>} The lint result.
 */
async function lintFeatureSource(
  eslint,
  source,
  relativeFile = "feature/example.js",
) {
  const [result] = await eslint.lintText(source, {
    filePath: path.resolve(workspacePath, "src", relativeFile),
  });

  return result;
}

test("undeclared workspace packages are denied", async () => {
  const eslint = createBoundaryLinter([]);
  const result = await lintFeatureSource(
    eslint,
    'import { useCapability } from "@example/capability";\n',
  );

  assert.equal(result.errorCount, 1);
  assert.equal(result.messages[0].ruleId, "boundaries/dependencies");
  assert.match(result.messages[0].message, /not explicitly allowed/u);
});

test("an explicitly allowed workspace package root is accepted", async () => {
  const eslint = createBoundaryLinter(["@example/capability"]);
  const result = await lintFeatureSource(
    eslint,
    'import { useCapability } from "@example/capability";\n',
  );

  assert.equal(result.errorCount, 0);
});

test("an allowed workspace package cannot be imported through a subpath", async () => {
  const eslint = createBoundaryLinter(["@example/capability"]);
  const result = await lintFeatureSource(
    eslint,
    'import { useCapability } from "@example/capability/private.js";\n',
  );

  assert.equal(result.errorCount, 1);
  assert.equal(result.messages[0].ruleId, "boundaries/dependencies");
});

test("undeclared responsibility modules are unknown files", async () => {
  const eslint = createBoundaryLinter([]);
  const result = await lintFeatureSource(
    eslint,
    "const draft = {};\n",
    "undeclared/example.js",
  );

  assert.equal(result.errorCount, 1);
  assert.equal(result.messages[0].ruleId, "boundaries/no-unknown-files");
});
