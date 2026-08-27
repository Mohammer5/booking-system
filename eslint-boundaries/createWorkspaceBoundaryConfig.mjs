import path from "node:path";

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
 * Allow only explicitly declared external package imports.
 *
 * @param {object} boundaryMap The explicit workspace dependency map.
 * @returns {object[]} External-module dependency policies.
 */
function createExternalPolicies(boundaryMap) {
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
    ...createModuleExternalPolicies(boundaryMap),
    ...createCompositionExternalPolicies(boundaryMap),
    ...createTestExternalPolicies(boundaryMap),
  ];
}

/**
 * Create exact external import policies for responsibility modules.
 *
 * @param {object} boundaryMap The explicit workspace dependency map.
 * @returns {object[]} Module-scoped external dependency policies.
 */
function createModuleExternalPolicies(boundaryMap) {
  return Object.entries(boundaryMap.modules).flatMap(
    ([moduleName, moduleDeclaration]) => {
      const externalDependencies = [
        ...moduleDeclaration.thirdPartyDependencies,
        ...allowedWorkspaceDependencies(boundaryMap, moduleDeclaration),
      ];

      return externalDependencies.map((specifier) => ({
        from: {
          element: {
            type: moduleName,
          },
        },
        allow: {
          to: {
            module: createExternalModuleTarget(specifier),
          },
        },
        message: `Module ${moduleName} may import only the declared external specifier ${specifier}.`,
      }));
    },
  );
}

/**
 * Create exact external import policies for composition files.
 *
 * @param {object} boundaryMap The explicit workspace dependency map.
 * @returns {object[]} Composition-scoped external dependency policies.
 */
function createCompositionExternalPolicies(boundaryMap) {
  return Object.entries(boundaryMap.compositionFiles).flatMap(
    ([filePath, compositionDeclaration]) => {
      const externalDependencies = [
        ...compositionDeclaration.thirdPartyDependencies,
        ...allowedWorkspaceDependencies(boundaryMap, compositionDeclaration),
      ];

      return externalDependencies.map((specifier) => ({
        from: {
          file: {
            categories: compositionCategory(filePath),
          },
        },
        allow: {
          to: {
            module: createExternalModuleTarget(specifier),
          },
        },
        message: `Composition file ${filePath} may import only the declared external specifier ${specifier}.`,
      }));
    },
  );
}

/**
 * Keep local declarations within the workspace-wide exact dependency list.
 *
 * @param {object} boundaryMap The explicit workspace dependency map.
 * @param {object} declaration One module or composition declaration.
 * @returns {string[]} Workspace dependencies allowed at both levels.
 */
function allowedWorkspaceDependencies(boundaryMap, declaration) {
  return declaration.workspaceDependencies.filter((specifier) =>
    boundaryMap.allowedWorkspaceDependencies.includes(specifier),
  );
}

/**
 * Create exact external import policies that apply only to test files.
 *
 * @param {object} boundaryMap The explicit workspace dependency map.
 * @returns {object[]} Test-only external dependency policies.
 */
function createTestExternalPolicies(boundaryMap) {
  return boundaryMap.testDependencies.map((specifier) => ({
    from: {
      file: {
        categories: "test",
      },
    },
    allow: {
      to: {
        module: createExternalModuleTarget(specifier),
      },
    },
    message: `Tests may import only the declared external specifier ${specifier}.`,
  }));
}

/**
 * Convert an exact npm import specifier to a boundaries module target.
 *
 * @param {string} specifier The exact package root or exported subpath.
 * @returns {{origin: string, source: string, internalPath: string | null}} A dependency target.
 */
function createExternalModuleTarget(specifier) {
  const segments = specifier.split("/");
  const packageSegmentCount = specifier.startsWith("@") ? 2 : 1;
  const source = segments.slice(0, packageSegmentCount).join("/");
  const internalPath = segments.slice(packageSegmentCount).join("/") || null;

  return {
    origin: "external",
    source,
    internalPath,
  };
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
    ([sourceModule, moduleDeclaration]) =>
      moduleDeclaration.modules.map((targetModule) => ({
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
    ([filePath, compositionDeclaration]) => [
      ...compositionDeclaration.modules.map((targetModule) => ({
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
      ...(compositionDeclaration.moduleInterfaces ?? []).map(
        ({ module: targetModule, fileInternalPath }) => ({
          from: {
            file: {
              categories: compositionCategory(filePath),
            },
          },
          allow: {
            to: {
              element: {
                type: targetModule,
                fileInternalPath,
              },
            },
          },
          message: `Composition file ${filePath} may import only the declared ${targetModule} interface ${fileInternalPath}.`,
        }),
      ),
    ],
  );
}

/**
 * Prevent declared root composition files from importing tests.
 *
 * @param {object} boundaryMap The explicit workspace dependency map.
 * @returns {object[]} Composition-to-test denial policies.
 */
function createCompositionTestPolicies(boundaryMap) {
  return [
    ...Object.keys(boundaryMap.compositionFiles).map((filePath) => ({
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
    })),
    ...(boundaryMap.testCompositionFiles ?? []).map((filePath) => ({
      from: {
        file: {
          categories: "test",
        },
      },
      allow: {
        to: {
          file: {
            categories: compositionCategory(filePath),
          },
        },
      },
      message: `Tests may import the declared composition file ${filePath}.`,
    })),
  ];
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
