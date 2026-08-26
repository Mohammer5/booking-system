# Architecture Decisions

## Make Conceptual Domains First-Class

Conceptual packages represent stable product areas and own their domain
language, rules, and contracts. Distinct responsibilities within one coherent
area remain focused internal modules when separate workspace boundaries would
add no independent ownership. Technical mechanisms do not become peer packages
merely because several callers use them.

## Let Applications Own Technical Composition

Applications are deployable boundaries. They translate transport, process,
provider, persistence, and runtime mechanics into conceptual capabilities and
inject those capabilities at composition roots. Domain packages do not import
provider SDKs.

## Deploy One Same-Origin Worker Application Initially

`apps/booking-system-web` will compose the browser/Vite experience, frontend
assets, Worker request handling, `/api/*`, technical adapters, and the
composition root inside one Cloudflare Worker deployment. This avoids an
unproven `apps/api` deployment boundary and its independent release and CORS
coordination. The application keeps a product-facing identity; Cloudflare,
Vite, and D1 remain private technical mechanisms.

## Align Package Manifests With Workspace Boundaries

One workspace owns one package manifest. Internal responsibility modules do
not receive separate manifests merely because they use different technical
dependencies. The root manifest owns repository-wide tooling and orchestration;
the planned `apps/booking-system-web` manifest will own dependencies for the
whole deployable application; and the planned `packages/booking` manifest will
own only dependencies consistent with the booking domain package.

Browser and Worker/API dependencies may therefore coexist in the one
application manifest. That shared declaration means only that the workspace's
build, runtime, and tooling environment can resolve them. It neither permits
every source module to import them nor places them in every output: the
workspace boundary map will grant architectural import permission, while the
source/build graph rooted at each runtime determines output inclusion.
Dependency segregation by itself does not justify frontend, API, browser,
server, or other technical workspaces; application extraction requires an
independent runtime or deployment boundary, and package extraction remains
driven by stable conceptual ownership and change pressure.

## Start With One Booking Domain Package

`packages/booking` is the initial conceptual package. It owns booking-system
language, rules, and contracts while Admin access, Course structure, Course
access, and Module participation remain distinct internal responsibility
modules. Admin User and Admin Invite policy has its own change pressure from
Participant Course access, but both responsibilities remain part of the same
coherent booking domain. Making each focused specification a workspace package
would confuse documentation boundaries with deployment and package ownership.

## Use Cloudflare As The Initial Runtime Boundary

Cloudflare Workers, Workers Static Assets, and D1 form the smallest accepted
hosting footprint. Designing for small-scale use within Cloudflare's free
hosting and database quotas constrains unnecessary infrastructure without
turning changeable quota numbers or unrelated external costs into correctness
rules.

## Use D1 With SQLite Semantics For Deployed Persistence

SQLite-compatible SQL gives the relational model one clear semantic basis,
while D1 provides durable storage in the Workers environment. Separate local,
staging, and production data protects production from destructive regression
tests and makes pre-production verification meaningful.

## Keep Node Tooling Separate From The Worker Runtime

Node.js remains the repository tooling, build, and CI runtime. Application
JavaScript may use Node-compatible packages when justified, but production is
not modeled as a conventional long-running Node server. This prevents local
Node execution from being mistaken for proof of Workers-runtime behavior.

## Keep Contracts With Their Concepts

Each conceptual package owns the schemas, commands, results, and events that
express its language. A central contracts package would braid unrelated
domains and make serialization concerns appear architecturally primary.

## Prefer Late Package Extraction

Shared technical helpers remain local until repeated concrete use proves one
owner and change pressure. `shared`, `core`, `utils`, and provider-named
packages are not default escape hatches. A crowded manifest or differing
technical dependency sets are not evidence of an independent package owner.

## Keep Boundary Maps Local, Explicit, And Deny-By-Default

Each workspace owns an allow-list and explicitly declares the package namespace
whose undeclared imports it rejects. Package manifests and folders never grant
an architectural edge. Composition files receive explicit permissions.

## Declare Workspaces Only From Accepted Product Boundaries

Example applications, packages, or domain names can look authoritative before
a product boundary is accepted. The repository therefore kept its implemented
workspace inventory empty and tests enforcement with synthetic names. The now
accepted `apps/booking-system-web` and `packages/booking` targets are documented
without creating scaffolding; implementation still requires explicit
authorization.

## Introduce Runtime Tooling With A Real Application

Runtime and test dependencies, bindings, migrations, and deployment workflows
arrive with code and tests that use them. Deferring empty scaffolding keeps the
current repository honest while requiring the first deployable application to
bring its applicable verification and release infrastructure with it.

## Use ESLint As The Sole Enforcement Surface

Normal `pnpm lint` checks source shape, imports, cycles, public interfaces, and
every explicitly registered workspace map. The boundary converter is tested
separately through the same ESLint integration. No secondary architecture
checker or inferred dependency graph exists.

## Keep Framework Exceptions Narrow

Only exact tool configuration files that require default exports receive an
exception. Product source uses named exports, and provider or framework
exceptions remain private and documented.
