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
- Summary: Present template state and the intentionally absent project-specific
  surfaces.
- Read when: You need the current documentation or repository baseline.
- Tags: docs, status, template

### Docs Decisions
- Path: `docs/_decisions.md`
- Summary: Rationale for the documentation structure and template boundary.
- Read when: You need to understand why documentation roles are separated or
  why project-specific content is absent.
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
- Summary: Documentation workflow, Markplane tracking, routing, and maintenance
  rules.
- Read when: A task affects documentation, Markplane, routing, indexes, or
  terminology maintenance.
- Tags: process, docs, tracking, markplane

### Architecture
- Path: `docs/architecture/_index.md`
- Summary: Conceptual-domain-first source organization, JavaScript conventions,
  ESLint enforcement, and explicit dependency boundaries.
- Read when: A task affects source layout, dependencies, modules, exports,
  applications, packages, ESLint, or boundary maps.
- Tags: architecture, modules, boundaries, eslint
