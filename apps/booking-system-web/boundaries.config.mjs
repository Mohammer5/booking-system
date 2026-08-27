export const bookingSystemWebBoundaryMap = {
  workspaceName: "@booking-system/booking-system-web",
  workspacePackagePattern: "@booking-system/*",
  sourceRoot: "src",
  allowedWorkspaceDependencies: ["@booking-system/booking"],
  modules: {
    authentication: {
      modules: [],
      thirdPartyDependencies: ["better-auth", "better-auth/plugins"],
      workspaceDependencies: [],
    },
    browser: {
      modules: [],
      thirdPartyDependencies: [
        "@tanstack/react-query",
        "i18next",
        "react-hook-form",
        "react-i18next",
        "react-router",
      ],
      workspaceDependencies: [],
    },
    worker: {
      modules: ["authentication"],
      thirdPartyDependencies: [],
      workspaceDependencies: ["@booking-system/booking"],
    },
  },
  compositionFiles: {
    "index.js": {
      modules: ["worker"],
      thirdPartyDependencies: [],
      workspaceDependencies: [],
    },
    "main.jsx": {
      modules: ["browser"],
      thirdPartyDependencies: [
        "@tanstack/react-query",
        "react",
        "react-dom/client",
        "react-i18next",
        "react-router",
      ],
      workspaceDependencies: [],
    },
    "nonProductionWorker.js": {
      modules: ["authentication", "worker"],
      moduleInterfaces: [
        {
          module: "authentication",
          fileInternalPath: "fixture-session/index.js",
        },
      ],
      thirdPartyDependencies: [],
      workspaceDependencies: [],
    },
    "productionWorker.js": {
      modules: ["authentication", "worker"],
      thirdPartyDependencies: [],
      workspaceDependencies: [],
    },
  },
  testCompositionFiles: ["nonProductionWorker.js", "productionWorker.js"],
  testDependencies: ["cloudflare:test", "vitest"],
};
