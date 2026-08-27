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
  },
  compositionFiles: {
    "index.js": {
      modules: ["admin-access"],
      thirdPartyDependencies: [],
      workspaceDependencies: [],
    },
  },
  testCompositionFiles: ["index.js"],
  testDependencies: ["vitest"],
};
