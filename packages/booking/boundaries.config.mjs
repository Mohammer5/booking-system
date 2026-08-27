export const bookingBoundaryMap = {
  workspaceName: "@booking-system/booking",
  workspacePackagePattern: "@booking-system/*",
  sourceRoot: "src",
  allowedWorkspaceDependencies: [],
  modules: {
    "admin-access": {
      modules: [],
      thirdPartyDependencies: [],
      workspaceDependencies: [],
    },
    "course-structure": {
      modules: [],
      thirdPartyDependencies: [],
      workspaceDependencies: [],
    },
  },
  compositionFiles: {
    "index.js": {
      modules: ["admin-access", "course-structure"],
      thirdPartyDependencies: [],
      workspaceDependencies: [],
    },
  },
  testCompositionFiles: ["index.js"],
  testDependencies: ["vitest"],
};
