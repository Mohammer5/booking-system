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

## Use ESLint As The Sole Enforcement Surface

Normal `pnpm lint` checks source shape, imports, cycles, public interfaces, and
every explicitly registered workspace map. The boundary converter is tested
separately through the same ESLint integration. No secondary architecture
checker or inferred dependency graph exists.

## Keep Framework Exceptions Narrow

Only exact tool configuration files that require default exports receive an
exception. Product source uses named exports, and provider or framework
exceptions remain private and documented.
