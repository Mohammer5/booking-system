# Architecture

Architecture docs define conceptual-domain-first source organization, the
accepted runtime and persistence direction, JavaScript conventions, and
ESLint-enforced dependency rules.

## Documents

### Architecture Overview
- Path: `docs/architecture/README.md`
- Summary: Human mental model for conceptual packages, application composition,
  private technical adapters, and enforcement.
- Read when: You need an architecture orientation.
- Tags: architecture, overview, mental-model

### Architecture Status
- Path: `docs/architecture/_status.md`
- Summary: Current distinction between accepted Cloudflare, Vite, and D1
  direction and the application and runtime surfaces still not implemented.
- Read when: You need to distinguish decided architecture from current
  implementation or identify which application, runtime, and persistence
  surfaces do not yet exist.
- Tags: architecture, status, cloudflare, workers, vite, d1, implementation

### Architecture Decisions
- Path: `docs/architecture/_decisions.md`
- Summary: Rationale for conceptual packages and ESLint enforcement, one
  same-origin Cloudflare Worker, D1 with SQLite semantics, Node/runtime
  separation, and deferred runtime tooling.
- Read when: You need to understand why the project chose Cloudflare, one
  Worker, D1, a non-Node production runtime, explicit boundaries, or
  real-application-triggered tooling.
- Tags: architecture, decisions, cloudflare, workers, d1, nodejs, tooling,
  eslint

### Architecture Principles
- Path: `docs/architecture/principles.md`
- Summary: Durable rules for conceptual primacy, simplicity, composition,
  abstraction timing, and machine-legible source.
- Read when: A task affects architecture philosophy, decomposition, ownership,
  or abstraction.
- Tags: architecture, principles, domains, simplicity

### Applications
- Path: `docs/architecture/applications.md`
- Summary: Defines application boundaries, the empty implemented inventory,
  and the accepted initial booking-system web application boundary.
- Read when: A task adds, removes, deploys, or changes an application boundary.
- Tags: architecture, applications, deployment, composition

### Runtime And Hosting
- Path: `docs/architecture/runtime-and-hosting.md`
- Summary: Defines the intended Cloudflare Worker deployment, Vite static
  assets, same-origin composition, runtime distinction, and minimal hosting
  footprint.
- Read when: A task affects hosting, frontend/backend deployment shape, Worker
  runtime behavior, Vite delivery, routes, or infrastructure selection.
- Tags: architecture, cloudflare, workers, vite, hosting, runtime

### Persistence
- Path: `docs/architecture/persistence.md`
- Summary: Defines SQLite-compatible semantics, D1 persistence, environment
  isolation, migration constraints, and current unimplemented state.
- Read when: A task affects databases, D1, SQL semantics, environment data,
  migrations, or persistence safety.
- Tags: architecture, persistence, database, d1, sqlite, migrations

### Packages
- Path: `docs/architecture/packages.md`
- Summary: Defines conceptual package boundaries and the currently empty
  inventory.
- Read when: A task adds, removes, extracts, or changes a package boundary.
- Tags: architecture, packages, domains, ownership

### Module Organization
- Path: `docs/architecture/module-organization.md`
- Summary: Defines source roots, responsibility modules, vertical slices,
  interfaces, entrypoints, adapters, and dependency direction.
- Read when: A task affects source placement, modules, slices, imports,
  interfaces, or tests.
- Tags: architecture, modules, source-layout

### JavaScript Conventions
- Path: `docs/architecture/javascript-conventions.md`
- Summary: JavaScript rules for data, classes, names, functions, JSDoc, and
  exports.
- Read when: A task affects JavaScript source shape or conventions.
- Tags: architecture, javascript, jsdoc

### ESLint Enforcement
- Path: `docs/architecture/eslint.md`
- Summary: Sole mechanical architecture enforcement, local rules, and explicit
  workspace-map integration.
- Read when: A task changes ESLint, local rules, budgets, imports, or
  exceptions.
- Tags: architecture, eslint, enforcement

### Dependency Boundaries
- Path: `docs/architecture/boundaries.md`
- Summary: Canonical human counterpart to explicit per-workspace
  deny-by-default dependency maps.
- Read when: A task changes workspace dependencies, responsibility modules,
  composition permissions, namespaces, or package exports.
- Tags: architecture, boundaries, dependencies
