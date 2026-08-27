# Module Organization

## Accepted Initial Conceptual Target

The `packages/booking` workspace currently contains `admin-access` for first
Admin bootstrap and `course-structure` for minimal Course creation. The
accepted later package scope also names `course-access` and
`module-participation`; they do not exist until their product behavior is
implemented. These concepts remain modules inside one domain package rather
than separate workspaces. Both implemented modules own product policy, not
authentication-provider SDK, HTTP, D1, or Admin UI mechanics.

The `apps/booking-system-web` workspace is the single application composition
boundary. Its first-level source responsibilities are `browser`, `worker`, and
`authentication`; its explicit maps, public interfaces, and thin browser and
Worker composition files exist with the first Admin slice.

## Workspace Roots

Production code lives under each [workspace's](../DICTIONARY.md#workspace)
`src/` directory. Package manifests, boundary maps, and build configuration
remain at the workspace root.

One workspace has one package manifest. Internal responsibility modules do not
receive separate `package.json` files merely because their technical
dependencies differ. The implemented ownership shape is:

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
admit exactly the two direct-child workspaces currently present.

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
boundary map explicitly permits those imports. Application
composition may join the responsibilities only where required.

This separation is a durable responsibility rule. The implemented maps enforce
the first slice's exact module edges, interfaces, and composition files.

Authentication and session establishment are application-owned technical
responsibilities. The application boundary map makes their
allowed browser, Worker, composition, and booking-interface edges explicit,
while preventing Better Auth, provider, cookie/session, Cloudflare-auth, and
test-authentication implementation imports from entering `packages/booking`.
The first slice uses `browser`, `worker`, and `authentication` as its initial
first-level names, introduced together with real source and map declarations.

The implemented Admin and Course slices preserve three application roles: the
browser sign-in/bootstrap and Course routes, Worker-side Admin/Course HTTP and
D1 handling, and application-private authentication. The browser slice may use
Better Auth's browser client for session initiation and termination while
Google provider configuration stays in the authentication and Worker
composition roles. A thin composition entry may join only the roles required
for its executable graph. The browser communicates with Worker behavior
through same-origin HTTP rather than importing Worker implementation to share
transport data.

## Vertical Slices

Second-level folders name use cases or focused change paths. A slice may contain
presentation, validation, policy invocation, and local adapter translation when
they change together, while domain behavior stays in its owning package.

Admin-facing and Participant-facing audiences do not by themselves establish
permanent `browser/admin` and `browser/participant` buckets. Browser queries,
mutations, forms, and translation resources stay with the use case that owns
them rather than creating technical-first source trees. See [browser
conventions](browser-conventions.md).

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
