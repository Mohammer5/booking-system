# Dependency Boundaries

## Purpose

Every [workspace](../DICTIONARY.md#workspace) owns one deny-by-default
`boundaries.config.mjs`. An edge permits an import; it does not grant behavioral
authority. Package manifests never grant architectural permission.

## Current Workspace Dependencies

Two local maps are implemented and registered explicitly in root ESLint:

- `@booking-system/booking` has no workspace dependency; and
- `@booking-system/booking-system-web` may import only the exact
  `@booking-system/booking` package root. Package subpaths remain denied.

React, MUI Core and its Emotion styling dependencies, browser libraries,
Better Auth, and test tooling are declared only in the manifest that uses them
and permitted only from their owning source responsibility, composition file,
or tests. Optional `classnames`, `debug`, and `ramda` are not installed or
permitted because current source does not use them.

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
important for `apps/booking-system-web`, whose one application
manifest may declare both browser and Worker/API dependencies while their
architectural permissions and runtime graphs remain separate.

## Current Responsibility Modules

The booking map declares `admin-access`, `course-access`, `course-structure`,
and `module-participation` modules, each with no sibling, third-party, or
workspace edges. Its root `src/index.js` composition may import only those four
module interfaces. Tests may import
Vitest and the declared root composition. Booking production code cannot
import application, Worker/Cloudflare, D1, Better Auth, HTTP, or browser/UI
implementation.

The application map declares:

- `browser` with no local or workspace edge and exact third-party permission
  for `@mui/material`, `@mui/material/styles`, TanStack Query, the
  `better-auth/react` browser client, i18next, React, React Hook Form,
  react-i18next, and React Router;
- `worker -> authentication`, plus the exact `@booking-system/booking` root;
- `authentication` with no local or booking edge and exact `better-auth` and
  `better-auth/plugins` permissions;
- `src/index.js -> worker`;
- `src/main.jsx -> browser`, with only the MUI Core root and its exact
  React/provider dependencies;
- `src/productionWorker.js -> worker + authentication`;
- `src/nonProductionWorker.js -> worker + authentication`, plus the exact
  nested `authentication/fixture-session/index.js` interface; and
- test-only `vitest` and `cloudflare:test` permissions, with exact access to
  the two Worker composition files needed by the structural regression.

Emotion is the selected MUI styling engine but current source does not import
its packages directly, so the map grants no direct Emotion specifier. The
`@axe-core/playwright` development dependency is used only by browser tests
under `test/e2e`; it creates no production-source edge.

Production composition has no edge to the fixture-session interface. Browser
source cannot import Worker, the local `authentication` module, D1,
Cloudflare, or the booking package; its narrow Better Auth client import talks
to the same-origin authentication HTTP surface rather than crossing a source
module edge. Authentication cannot import booking policy or browser source. No
generic shared or contracts package exists for the small HTTP shapes.

The Course creation/editing and Group/Module creation changes add second-level
`course-structure` slices within the existing browser and Worker
responsibilities. They change no first-level application-module edge: Worker
source continues to use only the exact booking package root, and browser
source continues to reach Course-structure behavior only over same-origin
HTTP. The local-time resolver adds no date/time or MUI X dependency.
Guarded Course editing and its two-sided first-Module/timezone acceptance add
no workspace, first-level module, third-party, or composition edge.
Group editing/archival/reactivation/deletion follows the same boundary: focused
domain factories stay in booking `course-structure`, while D1/HTTP, German MUI
forms and Dialogs, cache reconciliation, and browser tests stay application-private.
Participant history presentation continues consuming only the existing
same-origin selected-Group representation. No dependency, map permission,
composition file, workspace, or first-level responsibility changes.

Module descriptive editing and pre-start rescheduling also remain inside the
existing `course-structure` slices. Shared booking-domain text and Course-local
time resolution stay dependency-free; guarded D1/HTTP adapters and separate
German MUI forms remain application-private. The added root exports are
already permitted public `course-structure` interfaces and introduce no map,
dependency, composition, workspace, or first-level responsibility change.

Terminal Module cancellation remains in those same `course-structure` slices.
The dependency-free booking factory owns before-`endsAt` policy; application-
private D1/HTTP and German MUI adapters own guarded acceptance, transport,
confirmation, and cache reconciliation. Participant history continues through
the existing `course-access` read and `module-participation` derivation. The
new public factory export is already permitted and adds no map, dependency,
composition, workspace, or first-level responsibility edge.

Permanent Module deletion follows the same existing boundary. The booking
factory owns retained-reference eligibility; application-private D1/HTTP and
German MUI adapters own guarded deletion, restrictive-reference arbitration,
transport, confirmation, and cache reconciliation. The Course history bit and
Participant Selection foreign key stay inside existing persistence. The new
public factory export requires no map, dependency, composition, workspace, or
first-level responsibility edge.

Participant registration introduces the accepted dependency-free
`course-access` responsibility inside the booking package. Its root interface
exposes Participant registration, fresh Participant-context, distinct
self-service and Admin Participant-profile update factories, Participant
Disable/Re-enable factories, and Course Assignment creation/revocation/
reactivation operation factories. It has no edge to `admin-access`,
authentication, Worker, D1, Better Auth, HTTP, or browser code; the application
continues to consume only the exact booking package root.

The application implements Participant registration through second-level
`course-access` inside `worker` and `participant-entry` inside `browser`.
Direct Assignment adds a matching second-level browser `course-access` slice
without changing any first-level edge: Worker remains the only application
responsibility importing the booking package root, and browser still reaches
the capability through same-origin HTTP. Both production and non-production
composition now inject narrow Participant and Assignment persistence plus
identity-creation capabilities.

Participant profile maintenance remains inside these existing second-level
`course-access` slices. It adds no first-level module, workspace, third-party,
or composition edge: Worker still imports only the booking package root, and
browser still reaches profile behavior only through same-origin HTTP.

Participant lifecycle remains in those same `course-access` slices. Atomic
Disable, retained-row Re-enable, browser confirmation, and query invalidation
add no first-level module, workspace, third-party, boundary-map, or composition
edge.

Assignment lifecycle also remains inside the existing second-level
`course-access` slices. Retained-row reactivation, atomic revocation, browser
confirmation, and query invalidation add no first-level module, workspace,
third-party, boundary-map, or composition edge.

Participant-managed Module Selection introduces the dependency-free
`module-participation` responsibility inside the booking package. Its root
interface exposes only Selection policy and derived presentation operations,
with no sibling-module edge. The application implements persistence and HTTP
through a second-level `module-participation` Worker slice and presents the
capability through the existing browser `course-access` slice. This adds the
booking first-level module and root-composition permission but changes no
first-level application edge or third-party permission.

## Map Shape

Each map explicitly declares:

- `workspaceName`;
- `workspacePackagePattern`, the package namespace whose undeclared imports are
  rejected;
- `sourceRoot`;
- `allowedWorkspaceDependencies`;
- first-level `modules` and each module's allowed outgoing modules, exact
  third-party specifiers, and exact workspace dependencies;
- root `compositionFiles` and each file's exact modules, nested public module
  interfaces, third-party specifiers, and workspace dependencies;
- `testDependencies`, which apply only to test files; and
- `testCompositionFiles`, which let tests import only named executable
  compositions.

Cross-workspace imports use the exact destination package root. Relative
traversal, package subpaths, undeclared workspace packages, unknown local files,
cross-module implementation imports, and production-to-test imports are
rejected. A module-level workspace declaration is effective only when the same
specifier is present in the map's workspace-wide allow-list. Ordinary
third-party imports are denied from production by default and are never
inferred from `package.json`.

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
