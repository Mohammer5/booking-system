# Architecture

Architecture docs define conceptual-domain-first source organization, the
accepted runtime, persistence, and authentication direction, browser and
JavaScript conventions, and ESLint-enforced dependency rules.

## Documents

### Architecture Overview
- Path: `docs/architecture/README.md`
- Summary: Human mental model for conceptual packages, application composition,
  private technical adapters, internal runtime separation, and enforcement.
- Read when: You need an architecture orientation.
- Tags: architecture, overview, mental-model

### Architecture Status
- Path: `docs/architecture/_status.md`
- Summary: Current implemented application/package foundation, Course
  structure-creation slice, React browser routes and responsive
  Admin/Participant shell, Google sign-in,
  browser-private MUI theme and accessibility baseline,
  functional-composition direction, Cloudflare/Vite/D1 runtime, NixOS
  developer tooling, boundary enforcement, and still-deferred product and
  release surfaces.
- Read when: You need to distinguish decided architecture from current
  implementation or identify which application, browser, runtime, and
  persistence surfaces do not yet exist.
- Tags: architecture, status, browser, mui, accessibility,
  functional-programming, cloudflare, workers, vite, d1, nixos, implementation

### Architecture Decisions
- Path: `docs/architecture/_decisions.md`
- Summary: Rationale for the booking application/package boundaries, one
  manifest per workspace, React, MUI, and browser-library responsibilities,
  functional composition, one same-origin Cloudflare Worker, D1 with SQLite
  semantics, Node/runtime and NixOS host-tooling separation, explicit ESLint
  enforcement, and deferred remote infrastructure.
- Read when: You need to understand why the project chose one web application,
  one booking domain package, browser libraries, functional composition,
  workspace-level manifest ownership, Cloudflare, D1, a non-Node production
  runtime, NixOS developer tooling, explicit boundaries, or
  real-application-triggered tooling.
- Tags: architecture, decisions, browser, mui, component-library,
  functional-programming, cloudflare, workers, d1, nodejs, nixos, tooling,
  eslint, manifests

### Architecture Principles
- Path: `docs/architecture/principles.md`
- Summary: Durable rules for conceptual primacy, simplicity, composition,
  abstraction timing, and machine-legible source.
- Read when: A task affects architecture philosophy, decomposition, ownership,
  or abstraction.
- Tags: architecture, principles, domains, simplicity

### Applications
- Path: `docs/architecture/applications.md`
- Summary: Defines application boundaries and the implemented
  `apps/booking-system-web` workspace with responsive Participant/Admin
  contexts plus Course/Group/Module creation as the complete initial
  same-origin application.
- Read when: A task adds, removes, deploys, or changes an application boundary
  or application manifest ownership.
- Tags: architecture, applications, deployment, composition, manifests

### Runtime And Hosting
- Path: `docs/architecture/runtime-and-hosting.md`
- Summary: Defines the implemented local `booking-system-web` Cloudflare Worker
  and Vite composition, static assets, direct Participant/Admin/Course SPA
  routing, compatibility, separate browser/Worker graphs, NixOS host-tooling
  boundary, and minimal hosting footprint.
- Read when: A task affects hosting, frontend/backend deployment shape, Worker
  runtime behavior, Vite delivery, runtime dependency inclusion, routes, or
  local developer tool provisioning, or infrastructure selection.
- Tags: architecture, cloudflare, workers, vite, hosting, runtime,
  dependency-graphs, nixos

### Persistence
- Path: `docs/architecture/persistence.md`
- Summary: Defines SQLite-compatible semantics, implemented local/test D1,
  first-Admin, Course, and Group/Module migrations, environment isolation,
  guarded acceptance, permanent scheduling history, and migration constraints.
- Read when: A task affects databases, D1, SQL semantics, environment data,
  migrations, or persistence safety.
- Tags: architecture, persistence, database, d1, sqlite, migrations

### Authentication And Sessions
- Path: `docs/architecture/authentication-and-sessions.md`
- Summary: Defines Better Auth as the application-owned authentication layer,
  the implemented Google provider, D1-backed opaque sessions, stable-principal
  mapping, contextual domain resolution, provider-linking policy, Invite
  continuation, and fail-closed non-production authentication.
- Read when: A task affects authentication, sessions, external principals,
  provider integration or linking, Participant/Admin identity resolution,
  Invite continuation through sign-in, test authentication, or auth-related
  Worker and D1 integration.
- Tags: architecture, authentication, better-auth, sessions, identity, oauth,
  d1, testing

### Packages
- Path: `docs/architecture/packages.md`
- Summary: Defines conceptual package boundaries, the implemented
  `packages/booking` with `admin-access` and Course/Group/Module
  `course-structure` behavior, accepted later modules, and why technical
  dependency segregation does not justify extraction.
- Read when: A task adds, removes, extracts, or changes a package boundary or
  proposes a package to segregate technical dependencies.
- Tags: architecture, packages, domains, ownership, manifests

### Module Organization
- Path: `docs/architecture/module-organization.md`
- Summary: Defines the implemented responsibility modules and Course-structure
  slices, source roots, manifest ownership, browser/Worker/authentication
  separation, interfaces, entrypoints, adapters, and dependency direction.
- Read when: A task affects source placement, workspace manifests, modules,
  runtime responsibilities, slices, imports, interfaces, or tests.
- Tags: architecture, modules, source-layout, manifests, runtime-boundaries

### JavaScript Conventions
- Path: `docs/architecture/javascript-conventions.md`
- Summary: JavaScript rules for plain data, domain-oriented functional
  composition, explicit capability injection, visible decisions, Ramda,
  classes, names, JSDoc, and exports.
- Read when: A task affects JavaScript source shape, functional composition,
  dependency injection, async workflows, Ramda, or conventions.
- Tags: architecture, javascript, functional-programming, ramda, jsdoc

### Browser Conventions
- Path: `docs/architecture/browser-conventions.md`
- Summary: React-based browser ownership rules for React Router, TanStack Query,
  React Hook Form, Material UI, responsive shell/Course structure navigation
  and accessible interaction, Better Auth session actions, classnames, debug,
  i18next, localization, routes, and vertical-slice placement.
- Read when: A task affects browser routing, navigation, server state, forms,
  frontend validation, conditional classes, diagnostics, localization, or
  browser dependency choices.
- Tags: architecture, browser, react, react-dom, mui, accessibility,
  react-router, tanstack-query, react-hook-form, better-auth, authentication,
  i18n, debug

### ESLint Enforcement
- Path: `docs/architecture/eslint.md`
- Summary: Sole mechanical architecture enforcement, local rules, and explicit
  workspace-map integration.
- Read when: A task changes ESLint, local rules, budgets, imports, or
  exceptions.
- Tags: architecture, eslint, enforcement

### Dependency Boundaries
- Path: `docs/architecture/boundaries.md`
- Summary: Canonical human counterpart to the two implemented per-workspace
  deny-by-default maps, including exact module, workspace, third-party,
  composition, test-only, and runtime-graph distinctions.
- Read when: A task changes workspace dependencies, responsibility modules,
  composition permissions, namespaces, package exports, manifests, or runtime
  dependency graphs.
- Tags: architecture, boundaries, dependencies, manifests, runtime-graphs
