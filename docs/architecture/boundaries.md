# Dependency Boundaries

## Purpose

Every [workspace](../DICTIONARY.md#workspace) owns one deny-by-default
`boundaries.config.mjs`. An edge permits an import; it does not grant behavioral
authority. Package manifests never grant architectural permission.

## Current Workspace Dependencies

No workspace or local boundary map has been implemented, so there are no
package dependency edges. The accepted `apps/booking-system-web` and
`packages/booking` targets do not pre-authorize a JavaScript import.

## Three Dependency Layers

Keep three distinct questions explicit:

1. A workspace package manifest declares that a dependency is available to
   that workspace's build, runtime, or tooling environment.
2. The workspace's explicit boundary map declares which source responsibility
   modules may import which other modules or workspaces.
3. The source/build graph rooted at a runtime entrypoint determines whether a
   dependency is included in that runtime's output.

A manifest declaration grants no architectural import permission, and it does
not put the dependency into every output. This distinction is especially
important for the planned `apps/booking-system-web`, whose one application
manifest may declare both browser and Worker/API dependencies while their
architectural permissions and runtime graphs remain separate.

## Current Responsibility Modules

`admin-access`, `course-structure`, `course-access`, and `module-participation`
are accepted as conceptual responsibility modules within the planned booking
package. No source module, dependency edge, boundary-map entry, or composition
file exists yet; those permissions require the concrete implementation change.

When `apps/booking-system-web` is implemented, its local deny-by-default map
must model the chosen browser-facing and Worker/API-facing responsibility
modules and reject inappropriate cross-responsibility implementation imports.
Both sides may consume only explicitly allowed conceptual booking interfaces,
and composition receives only the permissions needed to join them. Exact
application module names, composition files, and dependency edges remain
undeclared.

## Map Shape

Each map explicitly declares:

- `workspaceName`;
- `workspacePackagePattern`, the package namespace whose undeclared imports are
  rejected;
- `sourceRoot`;
- `allowedWorkspaceDependencies`;
- first-level `modules` and their allowed outgoing module edges; and
- root `compositionFiles` and the modules each may import.

Cross-workspace imports use the exact destination package root. Relative
traversal, package subpaths, undeclared workspace packages, unknown local files,
cross-module implementation imports, and production-to-test imports are
rejected.

## Activation Rule

When adding a workspace:

1. Create its package manifest and local `boundaries.config.mjs` map.
2. Import that map explicitly in `eslint.config.mjs`.
3. Add one explicit `createWorkspaceBoundaryConfig` call for its path.
4. Document the workspace and all permitted edges here.

Never scan workspace folders or package manifests to generate registrations or
permissions.

## Change Rule

Update a workspace map and this document in the same conceptual change when:

- a workspace appears or disappears;
- a first-level `src/` responsibility appears or disappears;
- an internal dependency edge changes;
- a workspace dependency is introduced or removed;
- the package namespace pattern changes; or
- a composition file's permission changes.
