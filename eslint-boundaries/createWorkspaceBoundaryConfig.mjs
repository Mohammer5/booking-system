import path from "node:path";

const externalPackagePatterns = ["*", "@*/*"];
const testFilePattern = "**/*.{test,spec}.{js,jsx,mjs}";

/**
 * Convert one explicit workspace map into a flat ESLint configuration.
 *
 * @param {object} options Conversion options.
 * @param {object} options.boundaryMap The explicit workspace dependency map.
 * @param {string} options.workspacePath Repository-relative workspace path.
 * @param {object} options.boundariesPlugin The installed boundaries plugin.
 * @returns {object} A workspace-scoped flat ESLint configuration.
 */
export function createWorkspaceBoundaryConfig({
  boundaryMap,
  workspacePath,
  boundariesPlugin,
}) {
  const workspaceRoot = path.resolve(import.meta.dirname, "..", workspacePath);
  const workspaceFiles = `${workspacePath}/src/**/*.{js,jsx,mjs}`;
  const elementDescriptors = createElementDescriptors(boundaryMap);
  const fileDescriptors = createFileDescriptors(boundaryMap);
  const policies = createDependencyPolicies(boundaryMap);

  return {
    files: [workspaceFiles],
    plugins: {
      boundaries: boundariesPlugin,
    },
    settings: {
      "boundaries/root-path": workspaceRoot,
      "boundaries/flag-as-external": {
        outsideRootPath: true,
        customSourcePatterns: [boundaryMap.workspacePackagePattern],
      },
      "boundaries/elements": elementDescriptors,
      "boundaries/files": fileDescriptors,
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          checkAllOrigins: true,
          checkUnknownLocals: true,
          checkInternals: true,
          policies,
        },
      ],
      "boundaries/no-unknown-files": "error",
    },
  };
}

/**
 * Create declared responsibility-module element descriptors.
 *
 * @param {object} boundaryMap The explicit workspace dependency map.
 * @returns {object[]} Boundaries element descriptors.
 */
function createElementDescriptors(boundaryMap) {
  return Object.keys(boundaryMap.modules).map((moduleName) => ({
    type: moduleName,
    pattern: `${boundaryMap.sourceRoot}/${moduleName}`,
    partialMatch: false,
  }));
}

/**
 * Create descriptors only for declared composition and test files.
 *
 * @param {object} boundaryMap The explicit workspace dependency map.
 * @returns {object[]} Boundaries file descriptors.
 */
function createFileDescriptors(boundaryMap) {
  const compositionDescriptors = Object.keys(boundaryMap.compositionFiles).map(
    (filePath) => ({
      pattern: `${boundaryMap.sourceRoot}/${filePath}`,
      category: compositionCategory(filePath),
    }),
  );

  return [
    ...compositionDescriptors,
    {
      pattern: testFilePattern,
      category: "test",
    },
  ];
}

/**
 * Create dependency policies without adding undeclared edges.
 *
 * @param {object} boundaryMap The explicit workspace dependency map.
 * @returns {object[]} Boundaries dependency policies.
 */
function createDependencyPolicies(boundaryMap) {
  return [
    ...createExternalPolicies(boundaryMap),
    ...createSameModulePolicies(boundaryMap),
    ...createCrossModulePolicies(boundaryMap),
    ...createCompositionPolicies(boundaryMap),
    {
      from: {
        element: {
          type: "*",
        },
      },
      disallow: {
        to: {
          file: {
            categories: "test",
          },
        },
      },
      message: "Production code may not import test files.",
    },
    ...createCompositionTestPolicies(boundaryMap),
  ];
}

/**
 * Allow third-party packages while enforcing the workspace package allow-list.
 *
 * @param {object} boundaryMap The explicit workspace dependency map.
 * @returns {object[]} External-module dependency policies.
 */
function createExternalPolicies(boundaryMap) {
  const allowedWorkspacePolicies =
    boundaryMap.allowedWorkspaceDependencies.map((packageName) => ({
      allow: {
        to: {
          module: {
            origin: "external",
            source: packageName,
            internalPath: null,
          },
        },
      },
      message: `Import ${packageName} only through its package root.`,
    }));

  return [
    {
      allow: {
        to: {
          module: {
            origin: "core",
          },
        },
      },
    },
    {
      allow: {
        to: {
          module: {
            origin: "external",
            source: externalPackagePatterns,
          },
        },
      },
    },
    {
      disallow: {
        to: {
          module: {
            origin: "external",
            source: boundaryMap.workspacePackagePattern,
          },
        },
      },
      message: "This workspace package dependency is not explicitly allowed.",
    },
    ...allowedWorkspacePolicies,
  ];
}

/**
 * Permit local implementation imports but reject imports of the parent index.
 *
 * @param {object} boundaryMap The explicit workspace dependency map.
 * @returns {object[]} Same-module dependency policies.
 */
function createSameModulePolicies(boundaryMap) {
  return Object.keys(boundaryMap.modules).flatMap((moduleName) => [
    {
      from: {
        element: {
          type: moduleName,
        },
      },
      allow: {
        to: {
          element: {
            type: moduleName,
          },
        },
      },
    },
    {
      from: {
        element: {
          type: moduleName,
        },
      },
      disallow: {
        to: {
          element: {
            type: moduleName,
            fileInternalPath: "index.js",
          },
        },
      },
      message: "Module implementations may not import their parent index.js.",
    },
  ]);
}

/**
 * Permit only declared cross-module edges through public index files.
 *
 * @param {object} boundaryMap The explicit workspace dependency map.
 * @returns {object[]} Cross-module dependency policies.
 */
function createCrossModulePolicies(boundaryMap) {
  return Object.entries(boundaryMap.modules).flatMap(
    ([sourceModule, targetModules]) =>
      targetModules.map((targetModule) => ({
        from: {
          element: {
            type: sourceModule,
          },
        },
        allow: {
          to: {
            element: {
              type: targetModule,
              fileInternalPath: "index.js",
            },
          },
        },
        message: `Module ${sourceModule} may import ${targetModule} only through index.js.`,
      })),
  );
}

/**
 * Permit only each composition file's explicitly listed modules.
 *
 * @param {object} boundaryMap The explicit workspace dependency map.
 * @returns {object[]} Composition dependency policies.
 */
function createCompositionPolicies(boundaryMap) {
  return Object.entries(boundaryMap.compositionFiles).flatMap(
    ([filePath, targetModules]) =>
      targetModules.map((targetModule) => ({
        from: {
          file: {
            categories: compositionCategory(filePath),
          },
        },
        allow: {
          to: {
            element: {
              type: targetModule,
              fileInternalPath: "index.js",
            },
          },
        },
        message: `Composition file ${filePath} may import ${targetModule} only through index.js.`,
      })),
  );
}

/**
 * Prevent declared root composition files from importing tests.
 *
 * @param {object} boundaryMap The explicit workspace dependency map.
 * @returns {object[]} Composition-to-test denial policies.
 */
function createCompositionTestPolicies(boundaryMap) {
  return Object.keys(boundaryMap.compositionFiles).map((filePath) => ({
    from: {
      file: {
        categories: compositionCategory(filePath),
      },
    },
    disallow: {
      to: {
        file: {
          categories: "test",
        },
      },
    },
    message: "Production composition files may not import test files.",
  }));
}

/**
 * Return the stable file category for one declared composition file.
 *
 * @param {string} filePath Source-root-relative composition file path.
 * @returns {string} Its boundaries file category.
 */
function compositionCategory(filePath) {
  return `composition:${filePath}`;
}
