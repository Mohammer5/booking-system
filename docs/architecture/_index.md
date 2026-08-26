# Architecture

Architecture docs define conceptual-domain-first source organization,
JavaScript conventions, and ESLint-enforced dependency rules.

## Documents

### Architecture Overview
- Path: `docs/architecture/README.md`
- Summary: Human mental model for conceptual packages, application composition,
  private technical adapters, and enforcement.
- Read when: You need an architecture orientation.
- Tags: architecture, overview, mental-model

### Architecture Status
- Path: `docs/architecture/_status.md`
- Summary: Current product-neutral template baseline and deferred project
  declarations.
- Read when: You need present architecture state rather than future project
  intent.
- Tags: architecture, status, baseline, template

### Architecture Decisions
- Path: `docs/architecture/_decisions.md`
- Summary: Rationale for conceptual packages, application-owned technology,
  late extraction, empty template inventory, and ESLint-only enforcement.
- Read when: You need architecture tradeoffs or ownership rationale.
- Tags: architecture, decisions, rationale

### Architecture Principles
- Path: `docs/architecture/principles.md`
- Summary: Durable rules for conceptual primacy, simplicity, composition,
  abstraction timing, and machine-legible source.
- Read when: A task affects architecture philosophy, decomposition, ownership,
  or abstraction.
- Tags: architecture, principles, domains, simplicity

### Applications
- Path: `docs/architecture/applications.md`
- Summary: Defines application boundaries and the currently empty inventory.
- Read when: A task adds, removes, deploys, or changes an application boundary.
- Tags: architecture, applications, deployment, composition

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
