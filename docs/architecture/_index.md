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
- Summary: Current implementation baseline and accepted transition to an
  Active-Admin resource sidebar, URL-owned server-paginated collections,
  focused Course/Participant/Admin-User details, Course-owned Participant,
  Group, and Module routes, linked Course counts, responsive tables/cards,
  Google sign-in, the Cloudflare/Vite/D1 runtime, boundary enforcement, and
  still-deferred product and release surfaces.
- Read when: You need to distinguish decided architecture from current
  implementation or identify which application, browser, runtime, and
  persistence surfaces do not yet exist.
- Tags: architecture, status, browser, mui, accessibility,
  functional-programming, cloudflare, workers, vite, d1, nixos, implementation

### Architecture Decisions
- Path: `docs/architecture/_decisions.md`
- Summary: Rationale for Admin resource collections and focused details,
  URL-owned server-side collection state, responsive tables/cards, the
  booking application/package boundaries, one
  manifest per workspace, React, MUI, and browser-library responsibilities,
  functional composition, one same-origin Cloudflare Worker, D1 with SQLite
  semantics, signed Course Invite continuation, digest-only terminal Admin
  Invite authority and atomic signed onboarding, guarded current Admin User
  name editing, authority-only promotion, guarded lifecycle/deletion, and
  retained historical Admin attribution,
  Node/runtime and NixOS host-
  tooling separation, explicit ESLint enforcement, and deferred remote
  infrastructure.
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
- Summary: Defines application boundaries and the same-origin
  `apps/booking-system-web` workspace, including the Active-Admin resource
  layout, paginated top-level and Course-owned collections, focused detail and
  create routes, Participant and Assignment lifecycle, Course structure,
  invitations, Module Selection, Course archival, and Participant-facing
  access.
- Read when: A task adds, removes, deploys, or changes an application boundary
  or application manifest ownership.
- Tags: architecture, applications, deployment, composition, manifests

### Runtime And Hosting
- Path: `docs/architecture/runtime-and-hosting.md`
- Summary: Defines the local `booking-system-web` Cloudflare Worker and Vite
  composition, static assets, the Active-Admin resource and nested Course SPA
  routes with legacy participation redirects, public Invite routes,
  Participant routes, separate browser/Worker graphs, the NixOS host-tooling
  boundary, and the minimal hosting footprint.
- Read when: A task affects hosting, frontend/backend deployment shape, Worker
  runtime behavior, Vite delivery, runtime dependency inclusion, routes, or
  local developer tool provisioning, or infrastructure selection.
- Tags: architecture, cloudflare, workers, vite, hosting, runtime,
  dependency-graphs, nixos

### Persistence
- Path: `docs/architecture/persistence.md`
- Summary: Defines SQLite-compatible semantics, strict allowlisted Admin
  collection filtering/sorting/pagination and guarded counts, implemented
  local/test D1,
  first-Admin, Course, Group/Module, Participant, Course Assignment, Module
  Selection, Course Invite, digest-only terminal Admin Invite, and historical-
  Admin-attribution migrations,
  assigned Participant Course reads, atomic Admin Invite claim, and guarded
  focused Course-Participant reads, Admin User name updates,
  authority-only promotion, and guarded lifecycle,
  guarded Participant
  profile/lifecycle updates, retained Assignment lifecycle with atomic
  Selection retention, guarded Course and Group editing/lifecycle/deletion with
  Group/Selection/name and first-Module/timezone races, plus guarded Module
  descriptive/schedule/cancellation updates, reference-protected deletion,
  guarded no-rewrite Course archival, and
  current-time races,
  environment isolation, guarded acceptance, uniqueness, permanent scheduling
  history, and migration constraints.
- Read when: A task affects databases, D1, SQL semantics, environment data,
  migrations, or persistence safety.
- Tags: architecture, persistence, database, d1, sqlite, migrations

### Authentication And Sessions
- Path: `docs/architecture/authentication-and-sessions.md`
- Summary: Defines Better Auth as the application-owned authentication layer,
  the implemented Google provider, D1-backed opaque sessions, stable-principal
  mapping, lifecycle-sensitive contextual domain resolution, fixed Admin/
  Participant destinations, provider-linking policy, Course/Admin Invite
  continuation,
  manual local smoke, and fail-closed non-production authentication.
- Read when: A task affects authentication, sessions, external principals,
  provider integration or linking, Participant/Admin identity resolution,
  Invite continuation through sign-in, test authentication, or auth-related
  Worker and D1 integration.
- Tags: architecture, authentication, better-auth, sessions, identity, oauth,
  d1, testing

### Packages
- Path: `docs/architecture/packages.md`
- Summary: Defines conceptual package boundaries, the implemented
  `packages/booking` with first-bootstrap/Admin-Invite-administration/
  onboarding/Admin-User-directory/name-editing/promotion/lifecycle `admin-access`, Course
  editing and Course/Group/Module
  `course-structure` including Group lifecycle/deletion and Course archival,
  and Participant-registration/profile/lifecycle/Assignment-lifecycle/assigned-
  Active/Archived-Course and shared-Invite management/Join `course-access`
  plus Participant-Selection `module-participation` behavior, and why technical
  dependency segregation does not justify extraction.
- Read when: A task adds, removes, extracts, or changes a package boundary or
  proposes a package to segregate technical dependencies.
- Tags: architecture, packages, domains, ownership, manifests

### Module Organization
- Path: `docs/architecture/module-organization.md`
- Summary: Defines the implemented responsibility modules and the accepted
  second-level browser/Worker collection helpers, Course creation/editing,
  Group lifecycle/deletion and structure,
  Participant-registration/profile/lifecycle, Assignment-lifecycle, and
  assigned Active/Archived Participant Course plus shared-Course-Invite Join,
  Admin-Invite administration/onboarding, Admin-User directory/name editing/promotion/lifecycle,
  Module-Selection, and Course-archival slices,
  source roots,
  manifest ownership,
  browser/Worker/authentication separation, interfaces, entrypoints, adapters,
  and dependency direction.
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
- Summary: React-based browser ownership rules for the Active-Admin resource
  sidebar, nested resource routes, URL-owned paginated collection state,
  semantic responsive tables/cards, breadcrumbs, React Router, TanStack Query,
  React Hook Form, Material UI, responsive shell/Course structure and
  editing with permanent timezone-lock, Module editing/rescheduling/
  cancellation/deletion, and Group
  lifecycle/deletion and terminal Course-archival presentation plus
  Participant onboarding/profile/lifecycle/assigned-Course/directory/Course-
  Assignment-lifecycle/Module-Selection and Admin-Invite-onboarding navigation
  plus Admin-User-directory/name-edit/promotion/lifecycle navigation and accessible interaction,
  Better Auth session
  actions,
  classnames, debug, i18next, localization, routes, and vertical-slice
  placement.
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
  deny-by-default maps, including private second-level Admin collection
  helpers that do not alter the first-level map, profile maintenance, Assignment lifecycle,
  Participant lifecycle, and shared Course Invite management/Join within existing
  `course-access`, the booking
  `module-participation` responsibility, Course editing within existing
  `course-structure` including Group lifecycle/deletion and Module
  editing/rescheduling/cancellation/deletion plus Course archival, and exact
  workspace, third-party, composition, test-only, and runtime-graph
  distinctions.
- Read when: A task changes workspace dependencies, responsibility modules,
  composition permissions, namespaces, package exports, manifests, or runtime
  dependency graphs.
- Tags: architecture, boundaries, dependencies, manifests, runtime-graphs
