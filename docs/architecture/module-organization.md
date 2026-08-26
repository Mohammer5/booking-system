# Module Organization

## Accepted Initial Conceptual Target

The planned `packages/booking` workspace contains focused responsibility modules
named `admin-access`, `course-structure`, `course-access`, and
`module-participation`. They own distinct product concepts inside one domain
package and MUST NOT become separate workspace packages merely because the
product specification uses separate focused documents. `admin-access` owns
Admin User and Admin Invite product policy, not authentication-provider SDK or
Admin UI mechanics.

The planned `apps/booking-system-web` workspace is the single application
composition boundary. No workspace or source directory has been created, and
the target does not yet declare dependency edges, composition-file names,
public exports, or detailed internal files.

## Workspace Roots

Production code lives under each [workspace's](../DICTIONARY.md#workspace)
`src/` directory. Package manifests, boundary maps, and build configuration
remain at the workspace root.

One workspace has one package manifest. Internal responsibility modules do not
receive separate `package.json` files merely because their technical
dependencies differ. The intended ownership shape, once implementation creates
the accepted workspaces, is:

```text
/
  package.json                    # repository tooling and orchestration
apps/
  booking-system-web/
    package.json                  # the complete deployable application
packages/
  booking/
    package.json                  # the conceptual booking package
```

The root manifest is not the normal owner of application-specific runtime
dependencies or dependencies owned only by the booking domain package. The
current root manifest follows this direction by owning repository-wide tooling
and orchestration only. The current `apps/*` and `packages/*` workspace globs
already admit the planned direct-child workspaces; they do not create those
workspaces or their manifests.

## Conceptual Packages

Code that expresses product language, policy, invariants, commands, events,
schemas, or outcomes belongs to its conceptual package. A package root exposes
only the language other owners need.

Do not create packages for workflow engines, storage, databases, transports,
providers, browser tools, agents, all contracts, or generic shared code.

## Application Responsibility Modules

First-level application `src/` folders name product capabilities or explicit
application roles. Private technical adapters live beneath the conceptual
responsibility they implement or behind the application's composition root.

Do not organize first by `controllers`, `services`, `helpers`, `utils`,
`models`, `views`, `common`, `core`, `infrastructure`, or provider name.

Within `apps/booking-system-web`, browser-facing code and Worker/API-facing
code are distinct internal application responsibilities. Browser-facing code
MUST NOT import Worker/API implementation details, and Worker/API-facing code
MUST NOT import browser or UI implementation details. Both may depend inward
on the appropriate conceptual interfaces from `packages/booking` when the
eventual boundary map explicitly permits those imports. Application
composition may join the responsibilities only where required.

This separation is a durable responsibility rule, not a decision about exact
folder names, entrypoint names, composition filenames, public exports, or
dependency edges. Those remain deferred until the real application and its
boundary map are introduced.

## Vertical Slices

Second-level folders name use cases or focused change paths. A slice may contain
presentation, validation, policy invocation, and local adapter translation when
they change together, while domain behavior stays in its owning package.

## Keep Conceptual Flow Visible

A bounded use case prefers a primary pass-shaped file whose non-trivial
function reads like instructions: gather inputs, name intermediate values,
branch on predicates, invoke the next operation, and return the result.

Extract a helper only when it independently clarifies the flow, is already
reused, or hides one truly imperative boundary.

## Public Interfaces

Every production source directory exposes `index.js`. It contains only explicit
named re-exports, has no behavior or side effects, and exports only what callers
need.

Cross-module imports target the destination module interface. Imports inside a
module stay local and do not import their parent interface. Cross-workspace
imports use only an explicitly exported package root.

## Executable Entrypoints And Composition

`main.js` and `main.jsx` own startup and export nothing. Declared composition
files may join only the responsibility modules explicitly allowed in that
workspace's boundary map.

Composition translates technical implementations into narrow conceptual
capabilities. It does not contain product policy or expose a service locator.

## Dependency Direction

- Dependencies are explicit, one-way, and cycle-free.
- Technical implementations depend toward conceptual language.
- Domain packages never import application or provider code.
- Relative traversal between workspaces is forbidden.
- Package subpaths are forbidden unless explicitly exported and documented.
- Production code never imports tests.

## Tests

Keep focused tests with the behavior they verify. Tests may receive size-budget
exceptions but remain subject to syntax, import, and boundary linting.
