# Docs

This repository uses an indexed global documentation system.

## Documents And Areas

### Docs Overview
- Path: `docs/README.md`
- Summary: Human entrypoint for the reusable documentation tree and its area
  mental models.
- Read when: You need to understand how the repository documentation is
  organized.
- Tags: docs, overview, mental-model

### Docs Status
- Path: `docs/_status.md`
- Summary: Present accepted product and technical direction, the implemented
  first local application foundation, live tooling, and intentionally deferred
  release surfaces.
- Read when: You need the current documentation or repository baseline.
- Tags: docs, status, template

### Docs Decisions
- Path: `docs/_decisions.md`
- Summary: Rationale for the documentation structure and template boundary.
- Read when: You need to understand why documentation roles are separated or
  why accepted technology stays outside product-domain specifications.
- Tags: docs, decisions, rationale, template

### Dictionary
- Path: `docs/DICTIONARY.md`
- Summary: Canonical definitions for booking-system concepts and reusable
  repository architecture and process terminology.
- Read when: A task depends on stable terminology or introduces, changes, or
  removes a term.
- Tags: docs, dictionary, terminology

### Product
- Path: `docs/product/_index.md`
- Summary: Implementation-agnostic booking-system domain, behavior,
  lifecycle, permissions, rationale, scenarios, and explicit non-goals.
- Read when: A task affects Courses, Groups, Modules, Participants, membership,
  invitations, bookings, product permissions, or product scope.
- Tags: product, booking, domain, specification

### Process
- Path: `docs/process/_index.md`
- Summary: Documentation workflow, Markplane tracking, verification, CI, and
  release rules.
- Read when: A task affects documentation, Markplane, tests, CI, releases,
  routing, indexes, or terminology maintenance.
- Tags: process, docs, tracking, verification, ci, release

### Architecture
- Path: `docs/architecture/_index.md`
- Summary: Conceptual-domain-first source organization, JavaScript functional
  composition and browser conventions, accepted runtime, persistence, and
  authentication direction, ESLint enforcement, and explicit dependency
  boundaries.
- Read when: A task affects source layout, dependencies, modules, exports,
  applications, packages, JavaScript or browser conventions, runtime,
  persistence, authentication, sessions, ESLint, or boundary maps.
- Tags: architecture, modules, runtime, persistence, authentication, sessions,
  browser, functional-programming, boundaries, eslint
