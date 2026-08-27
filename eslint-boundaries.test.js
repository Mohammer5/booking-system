import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test, { after, before } from "node:test";

import { ESLint } from "eslint";
import boundariesPlugin from "eslint-plugin-boundaries";

import { createWorkspaceBoundaryConfig } from "./eslint-boundaries/createWorkspaceBoundaryConfig.mjs";

const workspacePath = "packages/example";

before(async () => {
  const sourceRoot = path.resolve(workspacePath, "src");

  await fs.mkdir(path.join(sourceRoot, "feature", "fixture-session"), {
    recursive: true,
  });
  await Promise.all(
    [
      "feature/fixture-session/index.js",
      "feature/fixture-session/private.js",
      "production.js",
      "nonProduction.js",
    ].map((relativePath) =>
      fs.writeFile(path.join(sourceRoot, relativePath), "export {};\n"),
    ),
  );
});

after(async () => {
  await fs.rm(path.resolve(workspacePath), { recursive: true, force: true });
});

/**
 * Create an ESLint instance for one synthetic explicit boundary map.
 *
 * @param {object} [options] Synthetic boundary-map overrides.
 * @returns {ESLint} The configured lint instance.
 */
function createBoundaryLinter(options = {}) {
  const {
    allowedWorkspaceDependencies = [],
    compositionFiles = {},
    featureDependencies = {},
    testCompositionFiles = [],
    testDependencies = [],
  } = options;
  const boundaryMap = {
    workspaceName: "@example/example",
    workspacePackagePattern: "@example/*",
    sourceRoot: "src",
    allowedWorkspaceDependencies,
    modules: {
      feature: {
        modules: [],
        thirdPartyDependencies:
          featureDependencies.thirdPartyDependencies ?? [],
        workspaceDependencies:
          featureDependencies.workspaceDependencies ?? [],
      },
      reporting: {
        modules: [],
        thirdPartyDependencies: [],
        workspaceDependencies: [],
      },
    },
    compositionFiles,
    testCompositionFiles,
    testDependencies,
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
  const eslint = createBoundaryLinter();
  const result = await lintFeatureSource(
    eslint,
    'import { useCapability } from "@example/capability";\n',
  );

  assert.equal(result.errorCount, 1);
  assert.equal(result.messages[0].ruleId, "boundaries/dependencies");
  assert.match(result.messages[0].message, /not explicitly allowed/u);
});

test("an explicitly allowed workspace package root is accepted", async () => {
  const eslint = createBoundaryLinter({
    allowedWorkspaceDependencies: ["@example/capability"],
    featureDependencies: {
      workspaceDependencies: ["@example/capability"],
    },
  });
  const result = await lintFeatureSource(
    eslint,
    'import { useCapability } from "@example/capability";\n',
  );

  assert.equal(result.errorCount, 0);
});

test("a local workspace declaration cannot bypass the workspace allow-list", async () => {
  const eslint = createBoundaryLinter({
    featureDependencies: {
      workspaceDependencies: ["@example/capability"],
    },
  });
  const result = await lintFeatureSource(
    eslint,
    'import { useCapability } from "@example/capability";\n',
  );

  assert.equal(result.errorCount, 1);
  assert.equal(result.messages[0].ruleId, "boundaries/dependencies");
});

test("an allowed workspace package cannot be imported through a subpath", async () => {
  const eslint = createBoundaryLinter({
    allowedWorkspaceDependencies: ["@example/capability"],
    featureDependencies: {
      workspaceDependencies: ["@example/capability"],
    },
  });
  const result = await lintFeatureSource(
    eslint,
    'import { useCapability } from "@example/capability/private.js";\n',
  );

  assert.equal(result.errorCount, 1);
  assert.equal(result.messages[0].ruleId, "boundaries/dependencies");
});

test("undeclared responsibility modules are unknown files", async () => {
  const eslint = createBoundaryLinter();
  const result = await lintFeatureSource(
    eslint,
    "const draft = {};\n",
    "undeclared/example.js",
  );

  assert.equal(result.errorCount, 1);
  assert.equal(result.messages[0].ruleId, "boundaries/no-unknown-files");
});

test("undeclared third-party dependencies are denied", async () => {
  const eslint = createBoundaryLinter();
  const result = await lintFeatureSource(
    eslint,
    'import React from "react";\n',
  );

  assert.equal(result.errorCount, 1);
  assert.equal(result.messages[0].ruleId, "boundaries/dependencies");
});

test("an owning responsibility may import an exact third-party dependency", async () => {
  const eslint = createBoundaryLinter({
    featureDependencies: {
      thirdPartyDependencies: ["react"],
    },
  });
  const result = await lintFeatureSource(
    eslint,
    'import React from "react";\n',
  );

  assert.equal(result.errorCount, 0);
});

test("another responsibility may not import the dependency", async () => {
  const eslint = createBoundaryLinter({
    featureDependencies: {
      thirdPartyDependencies: ["react"],
    },
  });
  const result = await lintFeatureSource(
    eslint,
    'import React from "react";\n',
    "reporting/example.js",
  );

  assert.equal(result.errorCount, 1);
  assert.equal(result.messages[0].ruleId, "boundaries/dependencies");
});

test("composition-file third-party permissions are exact", async () => {
  const eslint = createBoundaryLinter({
    compositionFiles: {
      "main.js": {
        modules: [],
        thirdPartyDependencies: ["react-dom/client"],
        workspaceDependencies: [],
      },
    },
  });
  const allowedResult = await lintFeatureSource(
    eslint,
    'import { createRoot } from "react-dom/client";\n',
    "main.js",
  );
  const deniedResult = await lintFeatureSource(
    eslint,
    'import ReactDOM from "react-dom";\n',
    "main.js",
  );

  assert.equal(allowedResult.errorCount, 0);
  assert.equal(deniedResult.errorCount, 1);
  assert.equal(deniedResult.messages[0].ruleId, "boundaries/dependencies");
});

test("composition-file module interfaces are exact", async () => {
  const eslint = createBoundaryLinter({
    compositionFiles: {
      "main.js": {
        modules: [],
        moduleInterfaces: [
          {
            module: "feature",
            fileInternalPath: "fixture-session/index.js",
          },
        ],
        thirdPartyDependencies: [],
        workspaceDependencies: [],
      },
    },
  });
  const allowedResult = await lintFeatureSource(
    eslint,
    'import { establish } from "./feature/fixture-session/index.js";\n',
    "main.js",
  );
  const deniedResult = await lintFeatureSource(
    eslint,
    'import { establish } from "./feature/fixture-session/private.js";\n',
    "main.js",
  );

  assert.equal(allowedResult.errorCount, 0);
  assert.equal(deniedResult.errorCount, 1);
  assert.equal(deniedResult.messages[0].ruleId, "boundaries/dependencies");
});

test("tests import only declared composition files", async () => {
  const eslint = createBoundaryLinter({
    compositionFiles: {
      "production.js": {
        modules: [],
        thirdPartyDependencies: [],
        workspaceDependencies: [],
      },
      "nonProduction.js": {
        modules: [],
        thirdPartyDependencies: [],
        workspaceDependencies: [],
      },
    },
    testCompositionFiles: ["production.js"],
  });
  const allowedResult = await lintFeatureSource(
    eslint,
    'import worker from "../production.js";\n',
    "feature/example.test.js",
  );
  const deniedResult = await lintFeatureSource(
    eslint,
    'import worker from "../nonProduction.js";\n',
    "feature/example.test.js",
  );

  assert.equal(allowedResult.errorCount, 0);
  assert.equal(deniedResult.errorCount, 1);
  assert.equal(deniedResult.messages[0].ruleId, "boundaries/dependencies");
});

test("test-only dependencies are unavailable to production files", async () => {
  const eslint = createBoundaryLinter({
    testDependencies: ["vitest"],
  });
  const testResult = await lintFeatureSource(
    eslint,
    'import { expect } from "vitest";\n',
    "feature/example.test.js",
  );
  const productionResult = await lintFeatureSource(
    eslint,
    'import { expect } from "vitest";\n',
  );

  assert.equal(testResult.errorCount, 0);
  assert.equal(productionResult.errorCount, 1);
});
