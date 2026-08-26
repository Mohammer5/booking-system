# Architecture Decisions

## Make Conceptual Domains First-Class

Top-level packages represent stable product responsibilities. They own domain
language, rules, and contracts. Technical mechanisms do not become peer
packages merely because several callers use them.

## Let Applications Own Technical Composition

Applications are deployable boundaries. They translate transport, process,
provider, persistence, and runtime mechanics into conceptual capabilities and
inject those capabilities at composition roots. Domain packages do not import
provider SDKs.

## Deploy One Same-Origin Worker Application Initially

One application will compose Vite-built frontend assets and `/api/*` handling
inside a Cloudflare Worker deployment. This avoids an unproven frontend/API
deployment boundary and its independent release and CORS coordination. The
application keeps a product-facing identity; Cloudflare, Vite, and D1 remain
private technical mechanisms.

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
packages are not default escape hatches.

## Keep Boundary Maps Local, Explicit, And Deny-By-Default

Each workspace owns an allow-list and explicitly declares the package namespace
whose undeclared imports it rejects. Package manifests and folders never grant
an architectural edge. Composition files receive explicit permissions.

## Keep The Template Free Of Example Workspaces

Example applications, packages, or domain names can look authoritative after a
template is copied. The template therefore keeps the workspace inventory empty
and tests enforcement with synthetic names. A project declares only the
workspaces justified by its accepted product model.

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
